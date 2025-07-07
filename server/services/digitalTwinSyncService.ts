import { EventEmitter } from 'events';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';

/**
 * Digital Twin Real-time Synchronization Service
 * Handles bidirectional state synchronization between physical and virtual twins
 * Implements message queuing, conflict resolution, and reliability mechanisms
 */

export interface SyncMessage {
  id: string;
  timestamp: number;
  source: 'physical' | 'virtual' | 'control';
  componentId: string;
  property: string;
  value: any;
  metadata: {
    quality: 'good' | 'bad' | 'uncertain';
    priority: 'critical' | 'high' | 'normal' | 'low';
    ttl?: number; // Time to live in ms
    sequenceNumber: number;
  };
}

export interface SyncAcknowledgment {
  messageId: string;
  status: 'received' | 'processed' | 'failed';
  timestamp: number;
  error?: string;
}

export interface SyncConfiguration {
  maxRetries: number;
  retryDelay: number;
  messageTimeout: number;
  batchSize: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface ConnectionMetrics {
  connected: boolean;
  lastHeartbeat: number;
  latency: number;
  messagesSent: number;
  messagesReceived: number;
  messagesLost: number;
  reconnections: number;
  uptime: number;
}

class DigitalTwinSyncService extends EventEmitter {
  private io: Server | null = null;
  private redis: Redis | null = null;
  private redisSubscriber: Redis | null = null;
  private connections: Map<string, Socket> = new Map();
  private messageQueue: Map<string, SyncMessage[]> = new Map();
  private pendingAcks: Map<string, SyncMessage> = new Map();
  private sequenceNumbers: Map<string, number> = new Map();
  private connectionMetrics: Map<string, ConnectionMetrics> = new Map();
  private config: SyncConfiguration;
  private syncInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<SyncConfiguration>) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      messageTimeout: 5000,
      batchSize: 100,
      compressionEnabled: true,
      encryptionEnabled: false,
      ...config
    };
  }

  /**
   * Initialize the synchronization service
   */
  async initialize(io: Server): Promise<void> {
    this.io = io;
    
    // Initialize Redis for message queuing
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    this.redisSubscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    // Subscribe to Redis channels for distributed messaging
    await this.setupRedisSubscriptions();

    // Setup Socket.io event handlers
    this.setupSocketHandlers();

    // Start sync and heartbeat intervals
    this.startSyncInterval();
    this.startHeartbeatInterval();

    console.log('Digital Twin Sync Service initialized');
  }

  /**
   * Setup Redis pub/sub for distributed synchronization
   */
  private async setupRedisSubscriptions(): Promise<void> {
    if (!this.redisSubscriber) return;

    // Subscribe to state update channels
    await this.redisSubscriber.subscribe(
      'twin:state:physical',
      'twin:state:virtual',
      'twin:state:control',
      'twin:sync:request'
    );

    this.redisSubscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.handleRedisMessage(channel, data);
      } catch (error) {
        console.error('Error parsing Redis message:', error);
      }
    });
  }

  /**
   * Handle messages from Redis pub/sub
   */
  private handleRedisMessage(channel: string, data: any): void {
    switch (channel) {
      case 'twin:state:physical':
        this.broadcastStateUpdate(data, 'physical');
        break;
      case 'twin:state:virtual':
        this.broadcastStateUpdate(data, 'virtual');
        break;
      case 'twin:state:control':
        this.handleControlCommand(data);
        break;
      case 'twin:sync:request':
        this.handleSyncRequest(data);
        break;
    }
  }

  /**
   * Setup Socket.io connection handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Initialize connection metrics
      this.connectionMetrics.set(socket.id, {
        connected: true,
        lastHeartbeat: Date.now(),
        latency: 0,
        messagesSent: 0,
        messagesReceived: 0,
        messagesLost: 0,
        reconnections: 0,
        uptime: Date.now()
      });

      // Store connection
      this.connections.set(socket.id, socket);

      // Setup event handlers
      socket.on('twin:subscribe', (componentIds: string[]) => {
        this.handleSubscription(socket, componentIds);
      });

      socket.on('twin:state:update', (message: SyncMessage) => {
        this.handleStateUpdate(socket, message);
      });

      socket.on('twin:sync:ack', (ack: SyncAcknowledgment) => {
        this.handleAcknowledgment(socket, ack);
      });

      socket.on('twin:heartbeat', () => {
        this.handleHeartbeat(socket);
      });

      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });

      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });

      // Send initial sync data
      this.sendInitialSync(socket);
    });
  }

  /**
   * Handle component subscription
   */
  private handleSubscription(socket: Socket, componentIds: string[]): void {
    // Join rooms for each component
    componentIds.forEach(componentId => {
      socket.join(`component:${componentId}`);
    });

    // Send current state for subscribed components
    this.sendComponentStates(socket, componentIds);
  }

  /**
   * Handle state update from client
   */
  private async handleStateUpdate(socket: Socket, message: SyncMessage): Promise<void> {
    const metrics = this.connectionMetrics.get(socket.id);
    if (metrics) {
      metrics.messagesReceived++;
    }

    // Validate message
    if (!this.validateMessage(message)) {
      socket.emit('twin:sync:error', {
        messageId: message.id,
        error: 'Invalid message format'
      });
      return;
    }

    // Add to processing queue
    this.queueMessage(message);

    // Send acknowledgment
    const ack: SyncAcknowledgment = {
      messageId: message.id,
      status: 'received',
      timestamp: Date.now()
    };
    socket.emit('twin:sync:ack', ack);

    // Process message
    try {
      await this.processMessage(message);
      
      // Broadcast to other clients
      socket.broadcast.to(`component:${message.componentId}`).emit('twin:state:update', message);
      
      // Publish to Redis for distributed sync
      if (this.redis) {
        await this.redis.publish(`twin:state:${message.source}`, JSON.stringify(message));
      }

      // Send processed acknowledgment
      socket.emit('twin:sync:ack', {
        messageId: message.id,
        status: 'processed',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('twin:sync:ack', {
        messageId: message.id,
        status: 'failed',
        timestamp: Date.now(),
        error: error.message
      });
    }
  }

  /**
   * Process a sync message
   */
  private async processMessage(message: SyncMessage): Promise<void> {
    // Store in time-series database (to be implemented with InfluxDB)
    await this.storeInTimeSeries(message);

    // Apply any transformations or validations
    const processed = await this.applyBusinessRules(message);

    // Update internal state
    this.emit('stateUpdate', processed);
  }

  /**
   * Queue message for processing
   */
  private queueMessage(message: SyncMessage): void {
    const queueKey = `${message.componentId}:${message.property}`;
    if (!this.messageQueue.has(queueKey)) {
      this.messageQueue.set(queueKey, []);
    }
    this.messageQueue.get(queueKey)!.push(message);
  }

  /**
   * Process queued messages in batches
   */
  private async processMessageQueue(): Promise<void> {
    for (const [key, messages] of this.messageQueue.entries()) {
      if (messages.length === 0) continue;

      // Process batch
      const batch = messages.splice(0, this.config.batchSize);
      
      try {
        await this.processBatch(batch);
      } catch (error) {
        console.error(`Error processing batch for ${key}:`, error);
        // Re-queue failed messages
        messages.unshift(...batch);
      }
    }
  }

  /**
   * Process a batch of messages
   */
  private async processBatch(messages: SyncMessage[]): Promise<void> {
    // Sort by timestamp and sequence number
    messages.sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.metadata.sequenceNumber - b.metadata.sequenceNumber;
      }
      return a.timestamp - b.timestamp;
    });

    // Process in order
    for (const message of messages) {
      await this.processMessage(message);
    }
  }

  /**
   * Validate message format
   */
  private validateMessage(message: SyncMessage): boolean {
    return !!(
      message.id &&
      message.timestamp &&
      message.source &&
      message.componentId &&
      message.property &&
      message.metadata &&
      message.metadata.quality &&
      message.metadata.priority &&
      typeof message.metadata.sequenceNumber === 'number'
    );
  }

  /**
   * Handle acknowledgment from client
   */
  private handleAcknowledgment(socket: Socket, ack: SyncAcknowledgment): void {
    const pending = this.pendingAcks.get(ack.messageId);
    if (pending) {
      this.pendingAcks.delete(ack.messageId);
      this.emit('messageAcknowledged', ack);
    }
  }

  /**
   * Handle heartbeat from client
   */
  private handleHeartbeat(socket: Socket): void {
    const metrics = this.connectionMetrics.get(socket.id);
    if (metrics) {
      const now = Date.now();
      metrics.latency = now - metrics.lastHeartbeat;
      metrics.lastHeartbeat = now;
    }
    
    socket.emit('twin:heartbeat:ack', { timestamp: Date.now() });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket): void {
    console.log(`Client disconnected: ${socket.id}`);
    
    const metrics = this.connectionMetrics.get(socket.id);
    if (metrics) {
      metrics.connected = false;
    }
    
    this.connections.delete(socket.id);
    
    // Clean up any pending messages for this client
    this.cleanupPendingMessages(socket.id);
  }

  /**
   * Send initial sync data to newly connected client
   */
  private async sendInitialSync(socket: Socket): Promise<void> {
    // Send current sync configuration
    socket.emit('twin:sync:config', this.config);
    
    // Send connection established event
    socket.emit('twin:sync:connected', {
      serverId: process.env.SERVER_ID || 'main',
      timestamp: Date.now()
    });
  }

  /**
   * Send current component states
   */
  private async sendComponentStates(socket: Socket, componentIds: string[]): Promise<void> {
    for (const componentId of componentIds) {
      // Fetch current state from storage
      const state = await this.fetchComponentState(componentId);
      if (state) {
        socket.emit('twin:state:snapshot', {
          componentId,
          state,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Broadcast state update to relevant clients
   */
  private broadcastStateUpdate(data: any, source: 'physical' | 'virtual'): void {
    if (!this.io) return;
    
    const message: SyncMessage = {
      ...data,
      source,
      timestamp: Date.now()
    };
    
    this.io.to(`component:${data.componentId}`).emit('twin:state:update', message);
  }

  /**
   * Handle control commands
   */
  private handleControlCommand(data: any): void {
    this.emit('controlCommand', data);
  }

  /**
   * Handle sync requests
   */
  private async handleSyncRequest(data: any): Promise<void> {
    const { componentId, properties } = data;
    
    // Fetch and broadcast current state
    const state = await this.fetchComponentState(componentId);
    if (state) {
      this.broadcastStateUpdate({
        componentId,
        properties: properties || Object.keys(state),
        state
      }, 'virtual');
    }
  }

  /**
   * Start sync interval for batch processing
   */
  private startSyncInterval(): void {
    this.syncInterval = setInterval(() => {
      this.processMessageQueue();
      this.checkPendingAcknowledgments();
      this.updateMetrics();
    }, 1000); // Process every second
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeatInterval(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeats();
    }, 5000); // Send heartbeat every 5 seconds
  }

  /**
   * Send heartbeats to all connected clients
   */
  private sendHeartbeats(): void {
    const now = Date.now();
    this.connections.forEach((socket) => {
      socket.emit('twin:heartbeat', { timestamp: now });
    });
  }

  /**
   * Check for pending acknowledgments and retry if needed
   */
  private checkPendingAcknowledgments(): void {
    const now = Date.now();
    
    this.pendingAcks.forEach((message, messageId) => {
      if (now - message.timestamp > this.config.messageTimeout) {
        // Message timeout - retry or mark as failed
        this.handleMessageTimeout(message);
      }
    });
  }

  /**
   * Handle message timeout
   */
  private handleMessageTimeout(message: SyncMessage): void {
    this.pendingAcks.delete(message.id);
    
    // Increment retry count
    const retryCount = (message as any).retryCount || 0;
    
    if (retryCount < this.config.maxRetries) {
      // Retry message
      (message as any).retryCount = retryCount + 1;
      setTimeout(() => {
        this.queueMessage(message);
      }, this.config.retryDelay * (retryCount + 1));
    } else {
      // Max retries reached - emit failure event
      this.emit('messageFailed', message);
      
      // Update metrics
      this.connections.forEach((socket, socketId) => {
        const metrics = this.connectionMetrics.get(socketId);
        if (metrics) {
          metrics.messagesLost++;
        }
      });
    }
  }

  /**
   * Update connection metrics
   */
  private updateMetrics(): void {
    this.connectionMetrics.forEach((metrics, socketId) => {
      if (metrics.connected) {
        const socket = this.connections.get(socketId);
        if (socket) {
          socket.emit('twin:metrics', metrics);
        }
      }
    });
  }

  /**
   * Clean up pending messages for disconnected client
   */
  private cleanupPendingMessages(socketId: string): void {
    // Remove from pending acks
    const toRemove: string[] = [];
    this.pendingAcks.forEach((message, messageId) => {
      if ((message as any).socketId === socketId) {
        toRemove.push(messageId);
      }
    });
    toRemove.forEach(messageId => this.pendingAcks.delete(messageId));
  }

  /**
   * Store message in time-series database (placeholder)
   */
  private async storeInTimeSeries(message: SyncMessage): Promise<void> {
    // This will be implemented when InfluxDB is integrated
    // For now, emit event for external storage
    this.emit('storeMessage', message);
  }

  /**
   * Apply business rules to message (placeholder)
   */
  private async applyBusinessRules(message: SyncMessage): Promise<SyncMessage> {
    // Apply any transformations, validations, or business logic
    // This can be extended based on specific requirements
    return message;
  }

  /**
   * Fetch component state from storage (placeholder)
   */
  private async fetchComponentState(componentId: string): Promise<any> {
    // This will be implemented with actual storage integration
    // For now, return null
    return null;
  }

  /**
   * Get next sequence number for component
   */
  public getNextSequenceNumber(componentId: string): number {
    const current = this.sequenceNumbers.get(componentId) || 0;
    const next = current + 1;
    this.sequenceNumbers.set(componentId, next);
    return next;
  }

  /**
   * Send state update
   */
  public async sendStateUpdate(
    componentId: string,
    property: string,
    value: any,
    metadata: Partial<SyncMessage['metadata']>
  ): Promise<void> {
    const message: SyncMessage = {
      id: `${componentId}-${property}-${Date.now()}`,
      timestamp: Date.now(),
      source: 'virtual',
      componentId,
      property,
      value,
      metadata: {
        quality: 'good',
        priority: 'normal',
        sequenceNumber: this.getNextSequenceNumber(componentId),
        ...metadata
      }
    };

    // Queue for processing
    this.queueMessage(message);
    
    // Broadcast immediately for low latency
    if (metadata.priority === 'critical') {
      this.broadcastStateUpdate(message, 'virtual');
    }
  }

  /**
   * Shutdown the service
   */
  public async shutdown(): Promise<void> {
    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close Redis connections
    if (this.redis) {
      await this.redis.quit();
    }
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }

    // Disconnect all sockets
    this.connections.forEach(socket => {
      socket.disconnect();
    });

    console.log('Digital Twin Sync Service shut down');
  }
}

// Export singleton instance
export const digitalTwinSyncService = new DigitalTwinSyncService();

// Export types and class for testing
export { DigitalTwinSyncService };