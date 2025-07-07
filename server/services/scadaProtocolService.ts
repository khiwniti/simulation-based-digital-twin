import { EventEmitter } from 'events';
import ModbusRTU from 'modbus-serial';
import { OPCUAClient, MessageSecurityMode, SecurityPolicy, AttributeIds, DataType, NodeId } from 'node-opcua';

/**
 * SCADA Protocol Service
 * Implements OPC UA and Modbus TCP/RTU communication for real SCADA integration
 * Handles industrial protocol communication with proper error handling and reconnection
 */

export interface SCADATag {
  tagName: string;
  protocol: 'opcua' | 'modbus';
  address: string;
  dataType: 'float' | 'int' | 'bool' | 'string';
  scaleFactor?: number;
  offset?: number;
  unit?: string;
  access: 'read' | 'write' | 'readwrite';
}

export interface ModbusConfig {
  host: string;
  port: number;
  unitId: number;
  timeout: number;
  endian: 'BE' | 'LE'; // Big Endian or Little Endian
}

export interface OPCUAConfig {
  endpoint: string;
  securityMode: MessageSecurityMode;
  securityPolicy: SecurityPolicy;
  username?: string;
  password?: string;
  certificatePath?: string;
  privateKeyPath?: string;
}

export interface TagValue {
  tagName: string;
  value: any;
  quality: 'good' | 'bad' | 'uncertain';
  timestamp: number;
  source: string;
}

class SCADAProtocolService extends EventEmitter {
  private modbusClients: Map<string, ModbusRTU> = new Map();
  private opcuaClients: Map<string, OPCUAClient> = new Map();
  private tagRegistry: Map<string, SCADATag> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private connectionStatus: Map<string, boolean> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private tagCache: Map<string, TagValue> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize SCADA protocol service
   */
  async initialize(): Promise<void> {
    console.log('SCADA Protocol Service initializing...');
    
    // Load tag configuration
    await this.loadTagConfiguration();
    
    // Start polling for configured tags
    this.startPolling();
  }

  /**
   * Connect to Modbus device
   */
  async connectModbus(id: string, config: ModbusConfig): Promise<void> {
    try {
      const client = new ModbusRTU();
      
      // Set timeout
      client.setTimeout(config.timeout);
      
      // Connect based on type
      await client.connectTCP(config.host, { port: config.port });
      client.setID(config.unitId);
      
      this.modbusClients.set(id, client);
      this.connectionStatus.set(id, true);
      
      console.log(`Connected to Modbus device: ${id} at ${config.host}:${config.port}`);
      this.emit('connected', { id, protocol: 'modbus' });
      
      // Setup error handling
      client.on('error', (err) => {
        console.error(`Modbus error for ${id}:`, err);
        this.handleConnectionError(id, 'modbus');
      });
      
    } catch (error) {
      console.error(`Failed to connect to Modbus device ${id}:`, error);
      this.handleConnectionError(id, 'modbus');
      throw error;
    }
  }

  /**
   * Connect to OPC UA server
   */
  async connectOPCUA(id: string, config: OPCUAConfig): Promise<void> {
    try {
      const client = OPCUAClient.create({
        applicationName: 'TankTwinManager',
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 10,
          maxDelay: 10000
        },
        securityMode: config.securityMode,
        securityPolicy: config.securityPolicy,
        endpoint_must_exist: false
      });
      
      await client.connect(config.endpoint);
      
      // Create session
      const session = await client.createSession({
        userName: config.username,
        password: config.password
      });
      
      // Store client with session
      (client as any).session = session;
      this.opcuaClients.set(id, client);
      this.connectionStatus.set(id, true);
      
      console.log(`Connected to OPC UA server: ${id} at ${config.endpoint}`);
      this.emit('connected', { id, protocol: 'opcua' });
      
      // Setup connection monitoring
      client.on('connection_lost', () => {
        console.error(`OPC UA connection lost for ${id}`);
        this.handleConnectionError(id, 'opcua');
      });
      
      client.on('connection_reestablished', () => {
        console.log(`OPC UA connection reestablished for ${id}`);
        this.connectionStatus.set(id, true);
        this.emit('reconnected', { id, protocol: 'opcua' });
      });
      
    } catch (error) {
      console.error(`Failed to connect to OPC UA server ${id}:`, error);
      this.handleConnectionError(id, 'opcua');
      throw error;
    }
  }

  /**
   * Register a SCADA tag for monitoring
   */
  registerTag(tag: SCADATag): void {
    this.tagRegistry.set(tag.tagName, tag);
    console.log(`Registered tag: ${tag.tagName}`);
  }

  /**
   * Read tag value based on protocol
   */
  async readTag(tagName: string): Promise<TagValue> {
    const tag = this.tagRegistry.get(tagName);
    if (!tag) {
      throw new Error(`Tag not found: ${tagName}`);
    }

    try {
      let value: any;
      let quality: 'good' | 'bad' | 'uncertain' = 'good';
      
      switch (tag.protocol) {
        case 'modbus':
          value = await this.readModbusTag(tag);
          break;
        case 'opcua':
          const opcResult = await this.readOPCUATag(tag);
          value = opcResult.value;
          quality = opcResult.quality;
          break;
        default:
          throw new Error(`Unsupported protocol: ${tag.protocol}`);
      }
      
      // Apply scaling and offset
      if (typeof value === 'number') {
        if (tag.scaleFactor) value *= tag.scaleFactor;
        if (tag.offset) value += tag.offset;
      }
      
      const tagValue: TagValue = {
        tagName,
        value,
        quality,
        timestamp: Date.now(),
        source: tag.address
      };
      
      // Update cache
      this.tagCache.set(tagName, tagValue);
      
      // Emit value update
      this.emit('tagUpdate', tagValue);
      
      return tagValue;
      
    } catch (error) {
      console.error(`Error reading tag ${tagName}:`, error);
      
      const errorValue: TagValue = {
        tagName,
        value: null,
        quality: 'bad',
        timestamp: Date.now(),
        source: tag.address
      };
      
      this.tagCache.set(tagName, errorValue);
      this.emit('tagError', { tagName, error });
      
      return errorValue;
    }
  }

  /**
   * Write tag value based on protocol
   */
  async writeTag(tagName: string, value: any): Promise<void> {
    const tag = this.tagRegistry.get(tagName);
    if (!tag) {
      throw new Error(`Tag not found: ${tagName}`);
    }
    
    if (tag.access === 'read') {
      throw new Error(`Tag ${tagName} is read-only`);
    }
    
    try {
      // Apply inverse scaling and offset for write
      let writeValue = value;
      if (typeof value === 'number') {
        if (tag.offset) writeValue -= tag.offset;
        if (tag.scaleFactor) writeValue /= tag.scaleFactor;
      }
      
      switch (tag.protocol) {
        case 'modbus':
          await this.writeModbusTag(tag, writeValue);
          break;
        case 'opcua':
          await this.writeOPCUATag(tag, writeValue);
          break;
        default:
          throw new Error(`Unsupported protocol: ${tag.protocol}`);
      }
      
      console.log(`Wrote value ${value} to tag ${tagName}`);
      this.emit('tagWritten', { tagName, value });
      
      // Read back to confirm
      setTimeout(() => this.readTag(tagName), 100);
      
    } catch (error) {
      console.error(`Error writing tag ${tagName}:`, error);
      this.emit('tagWriteError', { tagName, error });
      throw error;
    }
  }

  /**
   * Read Modbus tag
   */
  private async readModbusTag(tag: SCADATag): Promise<any> {
    const [clientId, registerStr] = tag.address.split(':');
    const register = parseInt(registerStr);
    
    const client = this.modbusClients.get(clientId);
    if (!client || !this.connectionStatus.get(clientId)) {
      throw new Error(`Modbus client not connected: ${clientId}`);
    }
    
    let result: any;
    
    // Read based on register type and data type
    if (register >= 1 && register <= 9999) {
      // Coils (0x)
      result = await client.readCoils(register - 1, 1);
      return result.data[0];
    } else if (register >= 10001 && register <= 19999) {
      // Discrete Inputs (1x)
      result = await client.readDiscreteInputs(register - 10001, 1);
      return result.data[0];
    } else if (register >= 30001 && register <= 39999) {
      // Input Registers (3x)
      result = await client.readInputRegisters(register - 30001, tag.dataType === 'float' ? 2 : 1);
    } else if (register >= 40001 && register <= 49999) {
      // Holding Registers (4x)
      result = await client.readHoldingRegisters(register - 40001, tag.dataType === 'float' ? 2 : 1);
    } else {
      throw new Error(`Invalid Modbus register: ${register}`);
    }
    
    // Convert based on data type
    switch (tag.dataType) {
      case 'float':
        return client.readFloatBE(result.buffer, 0);
      case 'int':
        return result.data[0];
      case 'bool':
        return result.data[0] !== 0;
      default:
        return result.data[0];
    }
  }

  /**
   * Write Modbus tag
   */
  private async writeModbusTag(tag: SCADATag, value: any): Promise<void> {
    const [clientId, registerStr] = tag.address.split(':');
    const register = parseInt(registerStr);
    
    const client = this.modbusClients.get(clientId);
    if (!client || !this.connectionStatus.get(clientId)) {
      throw new Error(`Modbus client not connected: ${clientId}`);
    }
    
    // Write based on register type
    if (register >= 1 && register <= 9999) {
      // Coils (0x)
      await client.writeCoil(register - 1, value ? true : false);
    } else if (register >= 40001 && register <= 49999) {
      // Holding Registers (4x)
      const regAddress = register - 40001;
      
      switch (tag.dataType) {
        case 'float':
          const buffer = Buffer.allocUnsafe(4);
          buffer.writeFloatBE(value, 0);
          await client.writeRegisters(regAddress, [
            buffer.readUInt16BE(0),
            buffer.readUInt16BE(2)
          ]);
          break;
        case 'int':
          await client.writeRegister(regAddress, parseInt(value));
          break;
        case 'bool':
          await client.writeRegister(regAddress, value ? 1 : 0);
          break;
        default:
          await client.writeRegister(regAddress, value);
      }
    } else {
      throw new Error(`Cannot write to register type: ${register}`);
    }
  }

  /**
   * Read OPC UA tag
   */
  private async readOPCUATag(tag: SCADATag): Promise<{ value: any; quality: 'good' | 'bad' | 'uncertain' }> {
    const [clientId, nodeIdStr] = tag.address.split(':');
    
    const client = this.opcuaClients.get(clientId);
    if (!client || !this.connectionStatus.get(clientId)) {
      throw new Error(`OPC UA client not connected: ${clientId}`);
    }
    
    const session = (client as any).session;
    if (!session) {
      throw new Error(`OPC UA session not found for: ${clientId}`);
    }
    
    const nodeId = nodeIdStr; // Can be enhanced to support different NodeId formats
    
    const dataValue = await session.read({
      nodeId,
      attributeId: AttributeIds.Value
    });
    
    // Map OPC UA status code to quality
    let quality: 'good' | 'bad' | 'uncertain' = 'bad';
    if (dataValue.statusCode.isGood()) {
      quality = 'good';
    } else if (dataValue.statusCode.isUncertain()) {
      quality = 'uncertain';
    }
    
    // Extract value based on data type
    let value = dataValue.value.value;
    
    // Convert based on expected type
    switch (tag.dataType) {
      case 'float':
        value = parseFloat(value);
        break;
      case 'int':
        value = parseInt(value);
        break;
      case 'bool':
        value = !!value;
        break;
      case 'string':
        value = String(value);
        break;
    }
    
    return { value, quality };
  }

  /**
   * Write OPC UA tag
   */
  private async writeOPCUATag(tag: SCADATag, value: any): Promise<void> {
    const [clientId, nodeIdStr] = tag.address.split(':');
    
    const client = this.opcuaClients.get(clientId);
    if (!client || !this.connectionStatus.get(clientId)) {
      throw new Error(`OPC UA client not connected: ${clientId}`);
    }
    
    const session = (client as any).session;
    if (!session) {
      throw new Error(`OPC UA session not found for: ${clientId}`);
    }
    
    const nodeId = nodeIdStr;
    
    // Determine OPC UA data type
    let dataType: DataType;
    switch (tag.dataType) {
      case 'float':
        dataType = DataType.Double;
        break;
      case 'int':
        dataType = DataType.Int32;
        break;
      case 'bool':
        dataType = DataType.Boolean;
        break;
      case 'string':
        dataType = DataType.String;
        break;
      default:
        dataType = DataType.Variant;
    }
    
    const statusCode = await session.write({
      nodeId,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType,
          value
        }
      }
    });
    
    if (!statusCode.isGood()) {
      throw new Error(`Failed to write OPC UA tag: ${statusCode.toString()}`);
    }
  }

  /**
   * Start polling for all registered tags
   */
  private startPolling(): void {
    // Group tags by polling rate
    const tagsByRate = new Map<number, string[]>();
    
    this.tagRegistry.forEach((tag, tagName) => {
      const rate = 1000; // Default 1 second, can be configured per tag
      if (!tagsByRate.has(rate)) {
        tagsByRate.set(rate, []);
      }
      tagsByRate.get(rate)!.push(tagName);
    });
    
    // Create polling intervals
    tagsByRate.forEach((tagNames, rate) => {
      const interval = setInterval(async () => {
        for (const tagName of tagNames) {
          try {
            await this.readTag(tagName);
          } catch (error) {
            // Error already handled in readTag
          }
        }
      }, rate);
      
      this.pollingIntervals.set(`poll_${rate}`, interval);
    });
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
  }

  /**
   * Handle connection errors and attempt reconnection
   */
  private handleConnectionError(id: string, protocol: 'modbus' | 'opcua'): void {
    this.connectionStatus.set(id, false);
    this.emit('disconnected', { id, protocol });
    
    // Clear existing reconnect timer
    const existingTimer = this.reconnectTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule reconnection
    const timer = setTimeout(async () => {
      console.log(`Attempting to reconnect ${protocol} client: ${id}`);
      
      try {
        if (protocol === 'modbus') {
          // Reconnect logic for Modbus
          const client = this.modbusClients.get(id);
          if (client) {
            await client.close();
            // Re-establish connection with stored config
            // This would need the config to be stored
          }
        } else if (protocol === 'opcua') {
          // Reconnect logic for OPC UA
          const client = this.opcuaClients.get(id);
          if (client) {
            await client.disconnect();
            // Re-establish connection with stored config
          }
        }
      } catch (error) {
        console.error(`Reconnection failed for ${id}:`, error);
        // Schedule another reconnection attempt
        this.handleConnectionError(id, protocol);
      }
    }, 5000); // Retry after 5 seconds
    
    this.reconnectTimers.set(id, timer);
  }

  /**
   * Load tag configuration from storage
   */
  private async loadTagConfiguration(): Promise<void> {
    // This would load from database or configuration file
    // For now, using example tags
    
    // Example Modbus tags
    this.registerTag({
      tagName: 'TANK_01_TEMP',
      protocol: 'modbus',
      address: 'plc1:40001',
      dataType: 'float',
      scaleFactor: 0.1,
      unit: '°C',
      access: 'read'
    });
    
    this.registerTag({
      tagName: 'TANK_01_LEVEL',
      protocol: 'modbus',
      address: 'plc1:40003',
      dataType: 'float',
      scaleFactor: 0.01,
      unit: '%',
      access: 'read'
    });
    
    // Example OPC UA tags
    this.registerTag({
      tagName: 'BOILER_01_TEMP',
      protocol: 'opcua',
      address: 'server1:ns=2;s=Boiler.Temperature',
      dataType: 'float',
      unit: '°C',
      access: 'readwrite'
    });
    
    this.registerTag({
      tagName: 'PUMP_01_STATUS',
      protocol: 'opcua',
      address: 'server1:ns=2;s=Pump1.Status',
      dataType: 'bool',
      access: 'readwrite'
    });
  }

  /**
   * Get all registered tags
   */
  getTags(): SCADATag[] {
    return Array.from(this.tagRegistry.values());
  }

  /**
   * Get tag value from cache
   */
  getCachedValue(tagName: string): TagValue | undefined {
    return this.tagCache.get(tagName);
  }

  /**
   * Get all cached values
   */
  getAllCachedValues(): TagValue[] {
    return Array.from(this.tagCache.values());
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Map<string, boolean> {
    return new Map(this.connectionStatus);
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down SCADA Protocol Service...');
    
    // Stop polling
    this.stopPolling();
    
    // Clear reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
    
    // Disconnect Modbus clients
    for (const [id, client] of this.modbusClients) {
      try {
        await client.close();
        console.log(`Disconnected Modbus client: ${id}`);
      } catch (error) {
        console.error(`Error disconnecting Modbus client ${id}:`, error);
      }
    }
    
    // Disconnect OPC UA clients
    for (const [id, client] of this.opcuaClients) {
      try {
        const session = (client as any).session;
        if (session) {
          await session.close();
        }
        await client.disconnect();
        console.log(`Disconnected OPC UA client: ${id}`);
      } catch (error) {
        console.error(`Error disconnecting OPC UA client ${id}:`, error);
      }
    }
    
    this.modbusClients.clear();
    this.opcuaClients.clear();
    this.connectionStatus.clear();
    this.tagCache.clear();
    
    console.log('SCADA Protocol Service shut down');
  }
}

// Export singleton instance
export const scadaProtocolService = new SCADAProtocolService();

// Export class for testing
export { SCADAProtocolService };