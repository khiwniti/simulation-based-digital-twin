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
  // Enhanced fields for digital twin
  sensors: {
    temperatureSensor: SensorReading;
    levelSensor: SensorReading;
    pressureSensor: SensorReading;
    flowSensor: SensorReading;
  };
  prediction: PredictionData;
  efficiency: number;
  maintenanceScore: number;
  energyConsumption: number;
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

export interface SensorReading {
  value: number;
  timestamp: Date;
  status: 'online' | 'offline' | 'maintenance';
  accuracy: number;
  lastCalibration: Date;
}

export interface PredictionData {
  nextBoilerAction: 'start' | 'stop' | 'maintain' | 'no_action';
  actionConfidence: number;
  predictedTemperature: number[];
  timeToTarget: number;
  energyOptimization: number;
  failureRisk: number;
  maintenanceWindow: Date | null;
}

export interface MLModel {
  id: string;
  name: string;
  accuracy: number;
  lastTrained: Date;
  status: 'active' | 'training' | 'offline';
  parameters: {
    lookbackWindow: number;
    predictionHorizon: number;
    features: string[];
  };
}

export interface DigitalTwinState {
  realTimeData: TankData[];
  simulatedData: TankData[];
  variance: number;
  syncStatus: 'synced' | 'drift' | 'desync';
  lastSync: Date;
}
