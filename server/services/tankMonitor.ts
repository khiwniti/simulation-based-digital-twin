import { SystemMetrics, TankData } from '@shared/types';

export class TankMonitorService {
  private tanks: TankData[] = [];

  public updateTanks(tanks: TankData[]) {
    this.tanks = tanks;
  }

  public getSystemMetrics(): SystemMetrics {
    if (this.tanks.length === 0) {
      return {
        totalTanks: 0,
        activeTanks: 0,
        averageTemperature: 0,
        totalCapacity: 0,
        totalUsed: 0,
        alertCount: 0,
        lastUpdate: new Date()
      };
    }

    const totalTanks = this.tanks.length;
    const activeTanks = this.tanks.filter(tank => tank.status !== 'critical').length;
    const averageTemperature = this.tanks.reduce((sum, tank) => sum + tank.temperature, 0) / totalTanks;
    const totalCapacity = this.tanks.reduce((sum, tank) => sum + tank.capacity, 0);
    const totalUsed = this.tanks.reduce((sum, tank) => sum + tank.currentLevel, 0);
    const alertCount = this.tanks.filter(tank => tank.status !== 'normal').length;

    return {
      totalTanks,
      activeTanks,
      averageTemperature,
      totalCapacity,
      totalUsed,
      alertCount,
      lastUpdate: new Date()
    };
  }

  public getTankEfficiency(): Array<{ tankId: number; efficiency: number }> {
    return this.tanks.map(tank => {
      const tempEfficiency = Math.max(0, 100 - Math.abs(tank.temperature - tank.targetTemperature) * 5);
      const levelEfficiency = (tank.currentLevel / tank.capacity) * 100;
      const boilerEfficiency = tank.boilerStatus === 'active' ? 100 : 50;
      
      const efficiency = (tempEfficiency + levelEfficiency + boilerEfficiency) / 3;
      
      return {
        tankId: tank.id,
        efficiency: Math.round(efficiency)
      };
    });
  }

  public predictMaintenanceNeeds(): Array<{ tankId: number; priority: 'low' | 'medium' | 'high'; reason: string }> {
    return this.tanks.map(tank => {
      let priority: 'low' | 'medium' | 'high' = 'low';
      let reason = 'Normal operation';

      const tempDiff = Math.abs(tank.temperature - tank.targetTemperature);
      const levelPercentage = (tank.currentLevel / tank.capacity) * 100;

      if (tank.boilerStatus === 'maintenance') {
        priority = 'high';
        reason = 'Boiler maintenance required';
      } else if (tempDiff > 15) {
        priority = 'high';
        reason = 'Temperature control issues';
      } else if (levelPercentage < 10) {
        priority = 'medium';
        reason = 'Low level requires attention';
      } else if (tempDiff > 8) {
        priority = 'medium';
        reason = 'Temperature variance above normal';
      }

      return {
        tankId: tank.id,
        priority,
        reason
      };
    });
  }

  public generateReport() {
    const metrics = this.getSystemMetrics();
    const efficiency = this.getTankEfficiency();
    const maintenance = this.predictMaintenanceNeeds();

    return {
      timestamp: new Date(),
      systemMetrics: metrics,
      tankEfficiency: efficiency,
      maintenanceNeeds: maintenance,
      summary: {
        averageEfficiency: efficiency.reduce((sum, e) => sum + e.efficiency, 0) / efficiency.length,
        criticalTanks: this.tanks.filter(tank => tank.status === 'critical').length,
        maintenanceRequired: maintenance.filter(m => m.priority === 'high').length
      }
    };
  }
}
