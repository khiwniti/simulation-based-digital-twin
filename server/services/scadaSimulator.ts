import { TankData, Alert } from '@shared/types';
import { nanoid } from 'nanoid';
import { MLPredictionService } from './mlPredictionService';

export class SCADASimulator {
  private tanks: TankData[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private alertCallback?: (alert: Alert) => void;
  private updateCallback?: (tanks: TankData[]) => void;
  private mlService: MLPredictionService;

  constructor() {
    this.mlService = new MLPredictionService();
    this.initializeTanks();
  }

  private initializeTanks() {
    // Initialize tanks based on real Tipco Asphalt plant layout from Google Earth
    // Realistic industrial positions mirroring the satellite image
    const tankPositions = [
      // Front row - 3 large tanks
      [-8, 0, -6],   // Tank 01 - Front left
      [-2, 0, -6],   // Tank 02 - Front center  
      [4, 0, -6],    // Tank 03 - Front right
      
      // Middle row - 4 tanks in staggered formation
      [-10, 0, 0],   // Tank 04 - Left side
      [-4, 0, 0],    // Tank 05 - Center left
      [2, 0, 0],     // Tank 06 - Center right
      [8, 0, 0],     // Tank 07 - Right side
      
      // Back row - 3 tanks
      [-6, 0, 6],    // Tank 08 - Back left
      [0, 0, 6],     // Tank 09 - Back center
      [6, 0, 6],     // Tank 10 - Back right
      
      // Additional tanks for realistic plant scale
      [-12, 0, 3],   // Tank 11 - Far left
      [10, 0, 3],    // Tank 12 - Far right
    ];

    for (let i = 1; i <= 12; i++) {
      const now = new Date();
      const position = tankPositions[i - 1] || [0, 0, 0];
      
      this.tanks.push({
        id: i,
        name: `ASP-${i.toString().padStart(2, '0')}`, // More realistic naming (Asphalt Plant)
        temperature: 140 + Math.random() * 20, // 140-160°C base
        targetTemperature: 150,
        capacity: 80000 + Math.random() * 40000, // 80k-120k liters (larger realistic tanks)
        currentLevel: 30000 + Math.random() * 60000, // 30k-90k liters
        status: 'normal',
        boilerStatus: Math.random() > 0.2 ? 'active' : 'inactive',
        lastUpdated: now,
        position: position as [number, number, number],
        sensors: {
          temperatureSensor: {
            value: 140 + Math.random() * 20,
            timestamp: now,
            status: 'online',
            accuracy: 99.0 + Math.random(),
            lastCalibration: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          },
          levelSensor: {
            value: 20000 + Math.random() * 40000,
            timestamp: now,
            status: 'online',
            accuracy: 98.5 + Math.random() * 1.5,
            lastCalibration: new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000)
          },
          pressureSensor: {
            value: 2.3 + Math.random() * 0.4,
            timestamp: now,
            status: 'online',
            accuracy: 99.2 + Math.random() * 0.6,
            lastCalibration: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          },
          flowSensor: {
            value: 12 + Math.random() * 8,
            timestamp: now,
            status: 'online',
            accuracy: 97.8 + Math.random() * 1.5,
            lastCalibration: new Date(now.getTime() - Math.random() * 21 * 24 * 60 * 60 * 1000)
          }
        },
        prediction: {
          nextBoilerAction: 'no_action',
          actionConfidence: 0.5,
          predictedTemperature: [],
          timeToTarget: -1,
          energyOptimization: 75,
          failureRisk: 0.1,
          maintenanceWindow: null
        },
        efficiency: 85 + Math.random() * 10,
        maintenanceScore: Math.random() * 100,
        energyConsumption: 20 + Math.random() * 15
      });
    }
  }

  public startSimulation(updateInterval: number = 2000) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.updateTanks();
      this.checkAlerts();
      
      if (this.updateCallback) {
        this.updateCallback([...this.tanks]);
      }
    }, updateInterval);

    console.log('SCADA simulation started');
  }

  public stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('SCADA simulation stopped');
  }

  private updateTanks() {
    this.tanks.forEach(tank => {
      // Add realistic sensor data simulation
      const enhancedTank = this.mlService.simulateRealtimeSensorData(tank);
      
      // Use ML prediction for temperature control
      const prediction = this.mlService.generatePrediction(enhancedTank);
      
      // Apply ML-driven temperature changes
      const tempDiff = tank.targetTemperature - tank.temperature;
      let tempChange = tempDiff * 0.1 + (Math.random() - 0.5) * 2;
      
      // Apply ML optimization if confidence is high
      if (prediction.actionConfidence > 0.8) {
        if (prediction.nextBoilerAction === 'start' && tank.boilerStatus === 'inactive') {
          tank.boilerStatus = 'active';
          tempChange += 1.5; // Faster heating when ML suggests starting
        } else if (prediction.nextBoilerAction === 'stop' && tank.boilerStatus === 'active') {
          tank.boilerStatus = 'inactive';
          tempChange -= 0.5; // Gradual cooling when ML suggests stopping
        }
      } else {
        // Fallback to traditional control
        if (tank.temperature < tank.targetTemperature - 5 && tank.boilerStatus === 'inactive') {
          tank.boilerStatus = 'active';
        } else if (tank.temperature > tank.targetTemperature + 5 && tank.boilerStatus === 'active') {
          tank.boilerStatus = 'inactive';
        }
      }
      
      tank.temperature = Math.max(100, Math.min(200, tank.temperature + tempChange));

      // Simulate level changes (consumption and refill)
      const levelChange = (Math.random() - 0.6) * 1000; // Slightly decreasing trend
      tank.currentLevel = Math.max(0, Math.min(tank.capacity, tank.currentLevel + levelChange));

      // Randomly set maintenance status
      if (Math.random() < 0.001) { // 0.1% chance per update
        tank.boilerStatus = 'maintenance';
      }

      // Apply enhanced fields from ML service
      tank.sensors = enhancedTank.sensors;
      tank.prediction = prediction;
      tank.efficiency = enhancedTank.efficiency;
      tank.maintenanceScore = enhancedTank.maintenanceScore;
      tank.energyConsumption = enhancedTank.energyConsumption;

      // Update status based on conditions and ML risk assessment
      tank.status = this.calculateTankStatus(tank);
      tank.lastUpdated = new Date();
    });

    // Update ML service with new data
    this.mlService.updateHistoricalData(this.tanks);
  }

  private calculateTankStatus(tank: TankData): 'normal' | 'warning' | 'critical' {
    const tempDiff = Math.abs(tank.temperature - tank.targetTemperature);
    const levelPercentage = (tank.currentLevel / tank.capacity) * 100;

    // Critical conditions
    if (tempDiff > 15 || levelPercentage < 10 || levelPercentage > 95 || tank.boilerStatus === 'maintenance') {
      return 'critical';
    }

    // Warning conditions
    if (tempDiff > 8 || levelPercentage < 20 || levelPercentage > 85) {
      return 'warning';
    }

    return 'normal';
  }

  private checkAlerts() {
    this.tanks.forEach(tank => {
      const tempDiff = Math.abs(tank.temperature - tank.targetTemperature);
      const levelPercentage = (tank.currentLevel / tank.capacity) * 100;

      // Temperature alerts
      if (tempDiff > 20) {
        this.createAlert(tank.id, 'temperature', 'critical', 
          `Critical temperature deviation: ${tempDiff.toFixed(1)}°C from target`);
      } else if (tempDiff > 10) {
        this.createAlert(tank.id, 'temperature', 'high', 
          `High temperature deviation: ${tempDiff.toFixed(1)}°C from target`);
      }

      // Level alerts
      if (levelPercentage < 5) {
        this.createAlert(tank.id, 'level', 'critical', 
          `Critically low level: ${levelPercentage.toFixed(1)}%`);
      } else if (levelPercentage < 15) {
        this.createAlert(tank.id, 'level', 'medium', 
          `Low level warning: ${levelPercentage.toFixed(1)}%`);
      } else if (levelPercentage > 95) {
        this.createAlert(tank.id, 'level', 'high', 
          `Tank nearly full: ${levelPercentage.toFixed(1)}%`);
      }

      // Boiler alerts
      if (tank.boilerStatus === 'maintenance') {
        this.createAlert(tank.id, 'boiler', 'high', 
          'Boiler requires maintenance');
      }
    });
  }

  private createAlert(tankId: number, type: Alert['type'], severity: Alert['severity'], message: string) {
    // Avoid duplicate alerts by checking recent alerts (simplified for demo)
    if (Math.random() < 0.05) { // 5% chance to create alert to avoid spam
      const alert: Alert = {
        id: nanoid(),
        tankId,
        type,
        severity,
        message,
        timestamp: new Date(),
        acknowledged: false
      };

      if (this.alertCallback) {
        this.alertCallback(alert);
      }
    }
  }

  public setAlertCallback(callback: (alert: Alert) => void) {
    this.alertCallback = callback;
  }

  public setUpdateCallback(callback: (tanks: TankData[]) => void) {
    this.updateCallback = callback;
  }

  public getTanks(): TankData[] {
    return [...this.tanks];
  }

  public updateTankThresholds(tankId: number, thresholds: any) {
    const tank = this.tanks.find(t => t.id === tankId);
    if (tank) {
      tank.targetTemperature = thresholds.targetTemperature;
      console.log(`Updated thresholds for tank ${tankId}:`, thresholds);
    }
  }
}
