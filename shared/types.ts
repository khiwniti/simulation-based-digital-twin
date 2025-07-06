export interface TankData {
  id: number;
  name: string;
  temperature: number;
  targetTemperature: number;
  capacity: number;
  currentLevel: number;
  status: 'normal' | 'warning' | 'critical';
  boilerStatus: 'active' | 'inactive' | 'maintenance';
  lastUpdated: Date;
  position: [number, number, number];
}

export interface Alert {
  id: string;
  tankId: number;
  type: 'temperature' | 'level' | 'boiler' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface SystemMetrics {
  totalTanks: number;
  activeTanks: number;
  averageTemperature: number;
  totalCapacity: number;
  totalUsed: number;
  alertCount: number;
  lastUpdate: Date;
}

export interface TemperatureThresholds {
  tankId: number;
  minTemperature: number;
  maxTemperature: number;
  targetTemperature: number;
  warningRange: number;
  criticalRange: number;
}
