import { TankData, Alert } from '@shared/types';
import { nanoid } from 'nanoid';

export class SCADASimulator {
  private tanks: TankData[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private alertCallback?: (alert: Alert) => void;
  private updateCallback?: (tanks: TankData[]) => void;

  constructor() {
    this.initializeTanks();
  }

  private initializeTanks() {
    // Initialize 9 asphalt tanks in a 3x3 grid
    for (let i = 1; i <= 9; i++) {
      const row = Math.floor((i - 1) / 3);
      const col = (i - 1) % 3;
      
      this.tanks.push({
        id: i,
        name: `Tank-${i.toString().padStart(2, '0')}`,
        temperature: 140 + Math.random() * 20, // 140-160°C base
        targetTemperature: 150,
        capacity: 50000 + Math.random() * 30000, // 50k-80k liters
        currentLevel: 20000 + Math.random() * 40000, // 20k-60k liters
        status: 'normal',
        boilerStatus: Math.random() > 0.2 ? 'active' : 'inactive',
        lastUpdated: new Date(),
        position: [col * 4 - 4, 0, row * 4 - 4] // 3x3 grid with 4-unit spacing
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
      // Simulate temperature changes
      const tempDiff = tank.targetTemperature - tank.temperature;
      const tempChange = tempDiff * 0.1 + (Math.random() - 0.5) * 2;
      tank.temperature = Math.max(100, Math.min(200, tank.temperature + tempChange));

      // Simulate level changes (consumption and refill)
      const levelChange = (Math.random() - 0.6) * 1000; // Slightly decreasing trend
      tank.currentLevel = Math.max(0, Math.min(tank.capacity, tank.currentLevel + levelChange));

      // Update boiler status based on temperature
      if (tank.temperature < tank.targetTemperature - 5 && tank.boilerStatus === 'inactive') {
        tank.boilerStatus = 'active';
      } else if (tank.temperature > tank.targetTemperature + 5 && tank.boilerStatus === 'active') {
        tank.boilerStatus = 'inactive';
      }

      // Randomly set maintenance status
      if (Math.random() < 0.001) { // 0.1% chance per update
        tank.boilerStatus = 'maintenance';
      }

      // Update status based on conditions
      tank.status = this.calculateTankStatus(tank);
      tank.lastUpdated = new Date();
    });
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
