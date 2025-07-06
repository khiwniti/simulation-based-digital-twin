import { io, Socket } from 'socket.io-client';
import { TankData, Alert, SystemMetrics } from '@shared/types';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      retries: 3
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    return this.socket;
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }

  onTankUpdate(callback: (data: TankData[]) => void) {
    this.socket?.on('tankUpdate', callback);
  }

  onAlert(callback: (alert: Alert) => void) {
    this.socket?.on('newAlert', callback);
  }

  onSystemMetrics(callback: (metrics: SystemMetrics) => void) {
    this.socket?.on('systemMetrics', callback);
  }

  acknowledgeAlert(alertId: string) {
    this.socket?.emit('acknowledgeAlert', alertId);
  }

  updateThresholds(tankId: number, thresholds: any) {
    this.socket?.emit('updateThresholds', { tankId, thresholds });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketManager = new SocketManager();
