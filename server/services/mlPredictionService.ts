import { TankData, PredictionData, MLModel, SensorReading } from '@shared/types';

export class MLPredictionService {
  private models: Map<string, MLModel> = new Map();
  private historicalData: Map<number, TankData[]> = new Map();
  private maxHistorySize = 1000; // Keep last 1000 readings per tank

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    // Temperature prediction model
    const tempModel: MLModel = {
      id: 'temp-prediction-v1',
      name: 'Temperature Prediction Model',
      accuracy: 94.2,
      lastTrained: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      status: 'active',
      parameters: {
        lookbackWindow: 30, // 30 data points
        predictionHorizon: 10, // Predict 10 steps ahead
        features: ['temperature', 'targetTemperature', 'boilerStatus', 'currentLevel', 'ambientTemp']
      }
    };

    // Boiler control model
    const boilerModel: MLModel = {
      id: 'boiler-control-v2',
      name: 'Boiler Control Optimization',
      accuracy: 89.7,
      lastTrained: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      status: 'active',
      parameters: {
        lookbackWindow: 20,
        predictionHorizon: 5,
        features: ['temperature', 'targetTemperature', 'energyConsumption', 'efficiency', 'ambientTemp']
      }
    };

    // Maintenance prediction model
    const maintenanceModel: MLModel = {
      id: 'maintenance-predict-v1',
      name: 'Predictive Maintenance',
      accuracy: 92.1,
      lastTrained: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      status: 'active',
      parameters: {
        lookbackWindow: 100,
        predictionHorizon: 1,
        features: ['temperature', 'efficiency', 'energyConsumption', 'vibration', 'pressure']
      }
    };

    this.models.set(tempModel.id, tempModel);
    this.models.set(boilerModel.id, boilerModel);
    this.models.set(maintenanceModel.id, maintenanceModel);
  }

  public updateHistoricalData(tanks: TankData[]) {
    tanks.forEach(tank => {
      if (!this.historicalData.has(tank.id)) {
        this.historicalData.set(tank.id, []);
      }

      const history = this.historicalData.get(tank.id)!;
      history.push({ ...tank, lastUpdated: new Date() });

      // Keep only recent data
      if (history.length > this.maxHistorySize) {
        history.splice(0, history.length - this.maxHistorySize);
      }
    });
  }

  public generatePrediction(tank: TankData): PredictionData {
    const history = this.historicalData.get(tank.id) || [];
    
    // Simulate deep learning predictions based on historical patterns
    const prediction = this.simulateMLPrediction(tank, history);
    
    return prediction;
  }

  private simulateMLPrediction(tank: TankData, history: TankData[]): PredictionData {
    const now = Date.now();
    
    // Temperature prediction using simulated LSTM
    const predictedTemperature = this.predictTemperatureSequence(tank, history);
    
    // Boiler action prediction using simulated reinforcement learning
    const boilerAction = this.predictBoilerAction(tank, history);
    
    // Energy optimization using simulated optimization algorithm
    const energyOptimization = this.calculateEnergyOptimization(tank, history);
    
    // Failure risk assessment using simulated ensemble methods
    const failureRisk = this.assessFailureRisk(tank, history);
    
    // Maintenance window prediction
    const maintenanceWindow = this.predictMaintenanceWindow(tank, history);

    return {
      nextBoilerAction: boilerAction.action,
      actionConfidence: boilerAction.confidence,
      predictedTemperature,
      timeToTarget: this.calculateTimeToTarget(tank, predictedTemperature),
      energyOptimization,
      failureRisk,
      maintenanceWindow
    };
  }

  private predictTemperatureSequence(tank: TankData, history: TankData[]): number[] {
    const sequence: number[] = [];
    const lookback = Math.min(10, history.length);
    
    if (lookback < 5) {
      // Not enough data, use simple prediction
      for (let i = 0; i < 10; i++) {
        sequence.push(tank.temperature + (tank.targetTemperature - tank.temperature) * 0.1 * i);
      }
      return sequence;
    }

    // Simulate LSTM prediction
    const recentTemps = history.slice(-lookback).map(h => h.temperature);
    const tempTrend = (recentTemps[recentTemps.length - 1] - recentTemps[0]) / lookback;
    
    let currentTemp = tank.temperature;
    const boilerEffect = tank.boilerStatus === 'active' ? 0.8 : -0.3;
    const targetPull = (tank.targetTemperature - currentTemp) * 0.15;
    
    for (let i = 0; i < 10; i++) {
      const noise = (Math.random() - 0.5) * 0.5;
      const prediction = currentTemp + tempTrend + boilerEffect + targetPull + noise;
      sequence.push(Math.max(100, Math.min(200, prediction)));
      currentTemp = prediction;
    }

    return sequence;
  }

  private predictBoilerAction(tank: TankData, history: TankData[]): { action: 'start' | 'stop' | 'maintain' | 'no_action', confidence: number } {
    const tempDiff = tank.temperature - tank.targetTemperature;
    const recentHistory = history.slice(-5);
    
    // Simulate Q-learning decision
    let action: 'start' | 'stop' | 'maintain' | 'no_action' = 'no_action';
    let confidence = 0.5;

    if (tank.boilerStatus === 'maintenance') {
      return { action: 'maintain', confidence: 0.95 };
    }

    // Analyze recent temperature trends
    if (recentHistory.length >= 3) {
      const trends = recentHistory.map((h, i) => 
        i > 0 ? h.temperature - recentHistory[i - 1].temperature : 0
      ).slice(1);
      
      const avgTrend = trends.reduce((a, b) => a + b, 0) / trends.length;
      
      if (tempDiff < -8 && avgTrend < -0.5) {
        // Temperature dropping too fast
        action = 'start';
        confidence = Math.min(0.95, 0.7 + Math.abs(tempDiff) * 0.02);
      } else if (tempDiff > 8 && avgTrend > 0.5) {
        // Temperature rising too fast
        action = 'stop';
        confidence = Math.min(0.95, 0.7 + Math.abs(tempDiff) * 0.02);
      } else if (Math.abs(tempDiff) < 3 && tank.boilerStatus === 'active') {
        // Near target, consider stopping
        action = 'stop';
        confidence = 0.75;
      } else if (Math.abs(tempDiff) > 5 && tank.boilerStatus === 'inactive') {
        // Far from target, consider starting
        action = 'start';
        confidence = 0.8;
      }
    }

    return { action, confidence };
  }

  private calculateEnergyOptimization(tank: TankData, history: TankData[]): number {
    const recentHistory = history.slice(-20);
    if (recentHistory.length < 5) return 75; // Default value

    // Simulate energy efficiency calculation
    const avgBoilerOnTime = recentHistory.filter(h => h.boilerStatus === 'active').length / recentHistory.length;
    const tempVariance = this.calculateVariance(recentHistory.map(h => h.temperature));
    
    // Lower variance and optimal boiler usage = higher efficiency
    const baseEfficiency = 100 - (tempVariance * 2) - (Math.abs(avgBoilerOnTime - 0.4) * 50);
    
    return Math.max(20, Math.min(100, baseEfficiency));
  }

  private assessFailureRisk(tank: TankData, history: TankData[]): number {
    const recentHistory = history.slice(-50);
    if (recentHistory.length < 10) return 0.1; // Low risk if not enough data

    // Simulate ensemble failure prediction
    let riskScore = 0;

    // Temperature stability risk
    const tempVariance = this.calculateVariance(recentHistory.map(h => h.temperature));
    riskScore += tempVariance * 0.001;

    // Boiler cycling frequency risk
    const boilerSwitches = recentHistory.reduce((count, h, i) => 
      i > 0 && h.boilerStatus !== recentHistory[i - 1].boilerStatus ? count + 1 : count, 0
    );
    riskScore += (boilerSwitches / recentHistory.length) * 0.3;

    // Efficiency degradation risk
    const avgEfficiency = tank.efficiency || 85;
    if (avgEfficiency < 70) riskScore += 0.2;
    if (avgEfficiency < 50) riskScore += 0.3;

    return Math.max(0, Math.min(1, riskScore));
  }

  private predictMaintenanceWindow(tank: TankData, history: TankData[]): Date | null {
    const failureRisk = this.assessFailureRisk(tank, history);
    
    if (failureRisk > 0.7) {
      // High risk - maintenance needed within 3 days
      return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    } else if (failureRisk > 0.4) {
      // Medium risk - maintenance within 2 weeks
      return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    } else if (failureRisk > 0.2) {
      // Low risk - maintenance within a month
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    return null; // No immediate maintenance needed
  }

  protected calculateTimeToTarget(tank: TankData, predictedSequence: number[]): number {
    const targetTemp = tank.targetTemperature;
    const tolerance = 2; // ±2°C tolerance
    
    for (let i = 0; i < predictedSequence.length; i++) {
      if (Math.abs(predictedSequence[i] - targetTemp) <= tolerance) {
        return (i + 1) * 2; // Assuming 2-minute intervals
      }
    }
    
    return -1; // Target not reached in prediction window
  }

  protected calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  public getModelStatus(): MLModel[] {
    return Array.from(this.models.values());
  }

  public retrain(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;

    // Simulate retraining
    model.status = 'training';
    
    setTimeout(() => {
      model.status = 'active';
      model.lastTrained = new Date();
      model.accuracy = Math.min(99, model.accuracy + Math.random() * 2 - 1);
    }, 5000);

    return true;
  }

  public simulateRealtimeSensorData(tank: TankData): TankData {
    const now = new Date();
    
    // Simulate realistic sensor readings with noise and occasional faults
    const tempNoise = (Math.random() - 0.5) * 0.8;
    const levelNoise = (Math.random() - 0.5) * 50;
    const pressureBase = 2.5 + (tank.temperature - 150) * 0.01;
    const flowBase = tank.boilerStatus === 'active' ? 15 + Math.random() * 5 : 2 + Math.random() * 3;

    return {
      ...tank,
      sensors: {
        temperatureSensor: {
          value: tank.temperature + tempNoise,
          timestamp: now,
          status: Math.random() > 0.05 ? 'online' : 'maintenance',
          accuracy: 99.2 + Math.random() * 0.6,
          lastCalibration: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        },
        levelSensor: {
          value: tank.currentLevel + levelNoise,
          timestamp: now,
          status: Math.random() > 0.03 ? 'online' : 'maintenance',
          accuracy: 98.8 + Math.random() * 1.0,
          lastCalibration: new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000)
        },
        pressureSensor: {
          value: pressureBase + (Math.random() - 0.5) * 0.2,
          timestamp: now,
          status: Math.random() > 0.02 ? 'online' : 'offline',
          accuracy: 99.5 + Math.random() * 0.4,
          lastCalibration: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        },
        flowSensor: {
          value: flowBase,
          timestamp: now,
          status: Math.random() > 0.04 ? 'online' : 'maintenance',
          accuracy: 97.2 + Math.random() * 2.0,
          lastCalibration: new Date(now.getTime() - Math.random() * 21 * 24 * 60 * 60 * 1000)
        }
      },
      efficiency: 85 + Math.random() * 10 - (tank.status === 'critical' ? 15 : 0),
      maintenanceScore: Math.random() * 100,
      energyConsumption: tank.boilerStatus === 'active' ? 25 + Math.random() * 10 : 5 + Math.random() * 3
    };
  }
}