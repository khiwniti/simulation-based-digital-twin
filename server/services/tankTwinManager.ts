import { EventEmitter } from 'events';
import { TankData } from '@shared/types';

// Enhanced interfaces for the digital twin
export interface TankConfiguration {
  id: number;
  name: string;
  position: {
    x: number; // Real-world coordinates in meters
    y: number;
    z: number;
  };
  dimensions: {
    diameter: number; // meters
    height: number; // meters
    wallThickness: number; // meters
    bottomType: 'flat' | 'conical' | 'dished';
  };
  capacity: {
    total: number; // liters
    working: number; // liters
    minimum: number; // liters
  };
  materials: {
    shell: string; // e.g., 'carbon_steel', 'stainless_steel'
    insulation: string;
    coating: string;
  };
  operatingConditions: {
    maxTemperature: number; // Celsius
    minTemperature: number; // Celsius
    maxPressure: number; // bar
    designPressure: number; // bar
  };
  heatingSystem: HotOilCoilConfiguration;
  sensors: SensorConfiguration[];
  safetyDevices: SafetyDeviceConfiguration[];
}

export interface HotOilCoilConfiguration {
  coilType: 'spiral' | 'serpentine' | 'helical';
  turns: number; // Number of coil turns (3 for this plant)
  diameter: number; // Coil diameter in meters
  tubeSize: {
    outerDiameter: number; // mm
    wallThickness: number; // mm
    material: string;
  };
  heatTransferArea: number; // m²
  designFlow: number; // L/min
  designTemperature: number; // Celsius
  thermalEfficiency: number; // %
}

export interface LoadingStationConfiguration {
  id: number;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  loadingBays: LoadingBayConfiguration[];
  pumpSystem: PumpConfiguration;
  safetyFeatures: string[];
  maxLoadingRate: number; // L/min
  connectedTanks: number[]; // Tank IDs that can supply this station
}

export interface LoadingBayConfiguration {
  id: number;
  type: 'truck' | 'rail' | 'ship';
  maxCapacity: number; // liters
  loadingArm: {
    reach: number; // meters
    swivel: number; // degrees
    verticalRange: number; // meters
  };
  meteringSystem: {
    accuracy: number; // %
    flowRange: [number, number]; // [min, max] L/min
  };
}

export interface PumpConfiguration {
  id: string;
  type: 'centrifugal' | 'positive_displacement' | 'gear';
  maxFlow: number; // L/min
  maxPressure: number; // bar
  efficiency: number; // %
  variableSpeed: boolean;
  motor: {
    power: number; // kW
    voltage: number; // V
    frequency: number; // Hz
  };
}

export interface PipeNetworkConfiguration {
  segments: PipeSegmentConfiguration[];
  junctions: PipeJunctionConfiguration[];
  valves: ValveConfiguration[];
  instruments: PipeInstrumentConfiguration[];
}

export interface PipeSegmentConfiguration {
  id: string;
  type: 'hot_oil' | 'asphalt' | 'steam' | 'condensate' | 'utility';
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  controlPoints?: { x: number; y: number; z: number }[]; // For curved pipes
  specifications: {
    nominalDiameter: number; // inches
    schedule: string; // e.g., 'SCH40', 'SCH80'
    material: string;
    insulation: {
      type: string;
      thickness: number; // mm
      jacketMaterial: string;
    };
  };
  operatingConditions: {
    designPressure: number; // bar
    designTemperature: number; // Celsius
    normalFlow: number; // L/min
    maxFlow: number; // L/min
  };
  heatTracing?: {
    type: 'electric' | 'steam';
    power: number; // W/m
    controlType: 'manual' | 'automatic';
  };
}

export interface PipeJunctionConfiguration {
  id: string;
  position: { x: number; y: number; z: number };
  type: 'tee' | 'cross' | 'reducer' | 'elbow';
  connectedSegments: string[];
  fittingDetails: {
    material: string;
    rating: string; // e.g., '150#', '300#'
  };
}

export interface ValveConfiguration {
  id: string;
  position: { x: number; y: number; z: number };
  type: 'gate' | 'globe' | 'ball' | 'butterfly' | 'check' | 'relief';
  size: number; // inches
  material: string;
  actuator?: {
    type: 'manual' | 'electric' | 'pneumatic' | 'hydraulic';
    controlSignal?: string; // e.g., '4-20mA', 'digital'
  };
  setPoint?: number; // For relief valves (bar)
  position_feedback?: boolean;
}

export interface SensorConfiguration {
  id: string;
  type: 'temperature' | 'pressure' | 'level' | 'flow' | 'density' | 'viscosity';
  position: { x: number; y: number; z: number };
  range: [number, number];
  accuracy: number; // %
  units: string;
  signalType: '4-20mA' | 'digital' | 'hart' | 'fieldbus';
  calibrationDate: Date;
  maintenanceInterval: number; // days
}

export interface SafetyDeviceConfiguration {
  id: string;
  type: 'pressure_relief' | 'temperature_switch' | 'level_switch' | 'fire_suppression';
  position: { x: number; y: number; z: number };
  setPoint: number;
  action: 'alarm' | 'shutdown' | 'interlock';
  testInterval: number; // days
  lastTest: Date;
}

export interface PlantLayoutConfiguration {
  name: string;
  location: {
    latitude: number;
    longitude: number;
    elevation: number; // meters above sea level
  };
  scaleRatio: number; // 1:20 means 1 unit = 20 meters
  coordinateSystem: {
    origin: { x: number; y: number; z: number };
    orientation: number; // degrees from north
  };
  tanks: TankConfiguration[];
  loadingStations: LoadingStationConfiguration[];
  hotOilSystem: HotOilSystemConfiguration;
  pipeNetwork: PipeNetworkConfiguration;
  utilities: UtilityConfiguration[];
  safetyZones: SafetyZoneConfiguration[];
}

export interface HotOilSystemConfiguration {
  heater: {
    id: string;
    type: 'fired' | 'electric' | 'steam';
    capacity: number; // kW
    efficiency: number; // %
    fuelType?: string;
    maxTemperature: number; // Celsius
  };
  circulationPumps: PumpConfiguration[];
  expansionTank: {
    capacity: number; // liters
    position: { x: number; y: number; z: number };
  };
  heatExchanger?: {
    type: string;
    area: number; // m²
    efficiency: number; // %
  };
  controlSystem: {
    type: 'PID' | 'cascade' | 'feedforward';
    setPoints: { [tankId: number]: number }; // Target temperatures
    deadband: number; // Celsius
  };
}

export interface UtilityConfiguration {
  type: 'electrical' | 'steam' | 'compressed_air' | 'nitrogen' | 'water';
  specifications: any; // Utility-specific details
}

export interface SafetyZoneConfiguration {
  id: string;
  type: 'hazardous_area' | 'fire_zone' | 'confined_space' | 'high_temperature';
  boundary: { x: number; y: number; z: number }[]; // Polygon vertices
  classification?: string; // e.g., 'Zone 1', 'Class I Div 1'
  safetyMeasures: string[];
}

// Real-time operational data interfaces
export interface TankOperationalData extends TankData {
  heatingCoil: {
    inletTemperature: number;
    outletTemperature: number;
    flowRate: number;
    pressure: number;
    efficiency: number;
  };
  thermalProfile: {
    topTemperature: number;
    middleTemperature: number;
    bottomTemperature: number;
    averageTemperature: number;
    stratification: number; // Temperature difference top-bottom
  };
  materialProperties: {
    viscosity: number; // cP
    density: number; // kg/m³
    specificHeat: number; // kJ/kg·K
    thermalConductivity: number; // W/m·K
  };
  energyBalance: {
    heatInput: number; // kW
    heatLoss: number; // kW
    netHeatTransfer: number; // kW
    efficiency: number; // %
  };
  qualityParameters: {
    penetration: number; // dmm
    softeningPoint: number; // Celsius
    ductility: number; // cm
    flashPoint: number; // Celsius
  };
}

export interface LoadingOperationData {
  stationId: number;
  bayId: number;
  isActive: boolean;
  currentFlow: number; // L/min
  totalLoaded: number; // liters
  targetQuantity: number; // liters
  loadingRate: number; // L/min
  temperature: number; // Celsius
  pressure: number; // bar
  startTime: Date;
  estimatedCompletion: Date;
  sourceTank: number;
  customerInfo: {
    name: string;
    orderNumber: string;
    productGrade: string;
  };
}

export interface SystemPerformanceMetrics {
  overall: {
    efficiency: number; // %
    availability: number; // %
    throughput: number; // L/day
    energyConsumption: number; // kWh/day
  };
  tanks: {
    [tankId: number]: {
      efficiency: number;
      utilization: number;
      heatLoss: number;
      maintenanceScore: number;
    };
  };
  hotOilSystem: {
    efficiency: number;
    circulation: number; // L/min
    heatDuty: number; // kW
    fuelConsumption: number; // kg/day or kWh/day
  };
  loadingStations: {
    [stationId: number]: {
      utilization: number;
      averageLoadingTime: number; // minutes
      throughput: number; // L/day
    };
  };
}

/**
 * Enterprise-grade TankTwinManager for comprehensive plant management
 * Integrates real-time data, physics simulation, and advanced analytics
 */
export class TankTwinManager extends EventEmitter {
  private plantConfig: PlantLayoutConfiguration;
  private tankOperationalData: Map<number, TankOperationalData> = new Map();
  private loadingOperations: Map<string, LoadingOperationData> = new Map();
  private systemMetrics: SystemPerformanceMetrics;
  private isInitialized: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private simulationEngine: any; // Physics simulation engine
  private dataLogger: any; // Historical data logging service

  constructor(plantConfig: PlantLayoutConfiguration) {
    super();
    this.plantConfig = plantConfig;
    this.initializeSystem();
  }

  /**
   * Initialize the tank twin management system
   */
  private async initializeSystem(): Promise<void> {
    try {
      // Initialize tank operational data
      this.plantConfig.tanks.forEach(tank => {
        this.tankOperationalData.set(tank.id, this.createInitialTankData(tank));
      });

      // Initialize system metrics
      this.systemMetrics = this.createInitialSystemMetrics();

      // Start real-time data updates
      this.startRealTimeUpdates();

      this.isInitialized = true;
      this.emit('initialized', { timestamp: new Date() });
    } catch (error) {
      this.emit('error', { error, timestamp: new Date() });
      throw error;
    }
  }

  /**
   * Create initial tank operational data from configuration
   */
  private createInitialTankData(config: TankConfiguration): TankOperationalData {
    return {
      id: config.id,
      name: config.name,
      currentLevel: config.capacity.working * 0.7, // 70% initial fill
      capacity: config.capacity.total,
      temperature: 150, // Initial temperature
      targetTemperature: 160,
      status: 'normal' as const,
      boilerStatus: 'active' as const,
      lastUpdate: new Date(),
      heatingCoil: {
        inletTemperature: 280,
        outletTemperature: 270,
        flowRate: 500,
        pressure: 3.5,
        efficiency: 85
      },
      thermalProfile: {
        topTemperature: 155,
        middleTemperature: 150,
        bottomTemperature: 145,
        averageTemperature: 150,
        stratification: 10
      },
      materialProperties: {
        viscosity: 200,
        density: 1000,
        specificHeat: 2.1,
        thermalConductivity: 0.15
      },
      energyBalance: {
        heatInput: 150,
        heatLoss: 25,
        netHeatTransfer: 125,
        efficiency: 83
      },
      qualityParameters: {
        penetration: 60,
        softeningPoint: 52,
        ductility: 100,
        flashPoint: 230
      }
    };
  }

  /**
   * Create initial system performance metrics
   */
  private createInitialSystemMetrics(): SystemPerformanceMetrics {
    const tankMetrics: { [tankId: number]: any } = {};
    const loadingMetrics: { [stationId: number]: any } = {};

    this.plantConfig.tanks.forEach(tank => {
      tankMetrics[tank.id] = {
        efficiency: 85,
        utilization: 70,
        heatLoss: 25,
        maintenanceScore: 95
      };
    });

    this.plantConfig.loadingStations.forEach(station => {
      loadingMetrics[station.id] = {
        utilization: 60,
        averageLoadingTime: 45,
        throughput: 50000
      };
    });

    return {
      overall: {
        efficiency: 85,
        availability: 98,
        throughput: 500000,
        energyConsumption: 2500
      },
      tanks: tankMetrics,
      hotOilSystem: {
        efficiency: 88,
        circulation: 2000,
        heatDuty: 1500,
        fuelConsumption: 300
      },
      loadingStations: loadingMetrics
    };
  }

  /**
   * Start real-time data updates
   */
  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateTankData();
      this.updateSystemMetrics();
      this.performPhysicsSimulation();
      this.emit('dataUpdated', {
        tanks: Array.from(this.tankOperationalData.values()),
        metrics: this.systemMetrics,
        timestamp: new Date()
      });
    }, 1000); // Update every second
  }

  /**
   * Update tank operational data with simulated real-time values
   */
  private updateTankData(): void {
    this.tankOperationalData.forEach((tankData, tankId) => {
      // Simulate temperature control
      const tempError = tankData.targetTemperature - tankData.temperature;
      const heatInput = Math.max(0, tempError * 10); // Simple proportional control
      
      // Update heating coil data
      tankData.heatingCoil.flowRate = 400 + Math.random() * 200;
      tankData.heatingCoil.inletTemperature = 275 + Math.random() * 10;
      tankData.heatingCoil.outletTemperature = tankData.heatingCoil.inletTemperature - 5 - Math.random() * 5;
      
      // Update thermal profile
      tankData.thermalProfile.averageTemperature = tankData.temperature;
      tankData.thermalProfile.topTemperature = tankData.temperature + 2 + Math.random() * 3;
      tankData.thermalProfile.bottomTemperature = tankData.temperature - 2 - Math.random() * 3;
      tankData.thermalProfile.stratification = tankData.thermalProfile.topTemperature - tankData.thermalProfile.bottomTemperature;
      
      // Update energy balance
      tankData.energyBalance.heatInput = heatInput;
      tankData.energyBalance.heatLoss = 20 + Math.random() * 10;
      tankData.energyBalance.netHeatTransfer = tankData.energyBalance.heatInput - tankData.energyBalance.heatLoss;
      tankData.energyBalance.efficiency = (tankData.energyBalance.netHeatTransfer / tankData.energyBalance.heatInput) * 100;
      
      // Update material properties based on temperature
      tankData.materialProperties.viscosity = this.calculateViscosity(tankData.temperature);
      tankData.materialProperties.density = 1050 - (tankData.temperature - 20) * 0.7; // Thermal expansion
      
      tankData.lastUpdate = new Date();
    });
  }

  /**
   * Calculate asphalt viscosity based on temperature
   */
  private calculateViscosity(temperature: number): number {
    // Simplified viscosity-temperature relationship for asphalt
    const A = 10.5; // Material constant
    const VTS = -3.5; // Viscosity Temperature Susceptibility
    return Math.exp(A + VTS * Math.log(temperature + 273.15));
  }

  /**
   * Update system performance metrics
   */
  private updateSystemMetrics(): void {
    // Calculate overall system efficiency
    const tankEfficiencies = Array.from(this.tankOperationalData.values())
      .map(tank => tank.energyBalance.efficiency);
    this.systemMetrics.overall.efficiency = tankEfficiencies.reduce((sum, eff) => sum + eff, 0) / tankEfficiencies.length;
    
    // Update individual tank metrics
    this.tankOperationalData.forEach((tankData, tankId) => {
      if (this.systemMetrics.tanks[tankId]) {
        this.systemMetrics.tanks[tankId].efficiency = tankData.energyBalance.efficiency;
        this.systemMetrics.tanks[tankId].utilization = (tankData.currentLevel / tankData.capacity) * 100;
        this.systemMetrics.tanks[tankId].heatLoss = tankData.energyBalance.heatLoss;
      }
    });
  }

  /**
   * Perform physics simulation updates
   */
  private performPhysicsSimulation(): void {
    // Placeholder for advanced physics simulation
    // This would integrate with OpenFOAM, FEniCS, or other simulation engines
    this.tankOperationalData.forEach((tankData, tankId) => {
      // Simulate heat transfer
      const ambientTemp = 25; // Celsius
      const heatLossCoeff = 0.5; // W/m²·K
      const tankConfig = this.plantConfig.tanks.find(t => t.id === tankId);
      
      if (tankConfig) {
        const surfaceArea = Math.PI * tankConfig.dimensions.diameter * tankConfig.dimensions.height;
        const heatLoss = heatLossCoeff * surfaceArea * (tankData.temperature - ambientTemp) / 1000; // kW
        tankData.energyBalance.heatLoss = heatLoss;
      }
    });
  }

  /**
   * Get current tank data
   */
  public getTankData(tankId?: number): TankOperationalData | TankOperationalData[] {
    if (tankId !== undefined) {
      const data = this.tankOperationalData.get(tankId);
      if (!data) {
        throw new Error(`Tank ${tankId} not found`);
      }
      return data;
    }
    return Array.from(this.tankOperationalData.values());
  }

  /**
   * Get system performance metrics
   */
  public getSystemMetrics(): SystemPerformanceMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * Get plant configuration
   */
  public getPlantConfiguration(): PlantLayoutConfiguration {
    return { ...this.plantConfig };
  }

  /**
   * Start loading operation
   */
  public async startLoadingOperation(
    stationId: number,
    bayId: number,
    sourceTankId: number,
    targetQuantity: number,
    customerInfo: any
  ): Promise<string> {
    const operationId = `LOAD-${stationId}-${bayId}-${Date.now()}`;
    
    const operation: LoadingOperationData = {
      stationId,
      bayId,
      isActive: true,
      currentFlow: 0,
      totalLoaded: 0,
      targetQuantity,
      loadingRate: 800, // L/min
      temperature: 0,
      pressure: 0,
      startTime: new Date(),
      estimatedCompletion: new Date(Date.now() + (targetQuantity / 800) * 60 * 1000),
      sourceTank: sourceTankId,
      customerInfo
    };

    this.loadingOperations.set(operationId, operation);
    this.emit('loadingStarted', { operationId, operation });
    
    return operationId;
  }

  /**
   * Stop loading operation
   */
  public async stopLoadingOperation(operationId: string): Promise<void> {
    const operation = this.loadingOperations.get(operationId);
    if (operation) {
      operation.isActive = false;
      this.emit('loadingStopped', { operationId, operation });
    }
  }

  /**
   * Get active loading operations
   */
  public getActiveLoadingOperations(): LoadingOperationData[] {
    return Array.from(this.loadingOperations.values()).filter(op => op.isActive);
  }

  /**
   * Set tank target temperature
   */
  public setTankTargetTemperature(tankId: number, targetTemperature: number): void {
    const tankData = this.tankOperationalData.get(tankId);
    if (tankData) {
      tankData.targetTemperature = targetTemperature;
      this.emit('targetTemperatureChanged', { tankId, targetTemperature });
    }
  }

  /**
   * Get tank thermal efficiency
   */
  public getTankThermalEfficiency(tankId: number): number {
    const tankData = this.tankOperationalData.get(tankId);
    return tankData ? tankData.energyBalance.efficiency : 0;
  }

  /**
   * Get hot-oil system status
   */
  public getHotOilSystemStatus(): any {
    return {
      circulation: this.systemMetrics.hotOilSystem.circulation,
      efficiency: this.systemMetrics.hotOilSystem.efficiency,
      heatDuty: this.systemMetrics.hotOilSystem.heatDuty,
      fuelConsumption: this.systemMetrics.hotOilSystem.fuelConsumption,
      status: 'running'
    };
  }

  /**
   * Perform predictive maintenance analysis
   */
  public performPredictiveMaintenanceAnalysis(): any {
    const maintenanceNeeds: any[] = [];
    
    this.tankOperationalData.forEach((tankData, tankId) => {
      const efficiency = tankData.energyBalance.efficiency;
      const heatLoss = tankData.energyBalance.heatLoss;
      
      if (efficiency < 75) {
        maintenanceNeeds.push({
          tankId,
          priority: 'high',
          issue: 'Low thermal efficiency',
          recommendation: 'Inspect heating coil and insulation'
        });
      }
      
      if (heatLoss > 40) {
        maintenanceNeeds.push({
          tankId,
          priority: 'medium',
          issue: 'High heat loss',
          recommendation: 'Check insulation integrity'
        });
      }
    });
    
    return maintenanceNeeds;
  }

  /**
   * Generate comprehensive system report
   */
  public generateSystemReport(): any {
    return {
      timestamp: new Date(),
      plantConfiguration: this.plantConfig.name,
      systemMetrics: this.systemMetrics,
      tankData: Array.from(this.tankOperationalData.values()),
      loadingOperations: Array.from(this.loadingOperations.values()),
      maintenanceNeeds: this.performPredictiveMaintenanceAnalysis(),
      recommendations: this.generateOptimizationRecommendations()
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(): any[] {
    const recommendations: any[] = [];
    
    // Energy efficiency recommendations
    const avgEfficiency = this.systemMetrics.overall.efficiency;
    if (avgEfficiency < 80) {
      recommendations.push({
        type: 'energy',
        priority: 'high',
        description: 'System efficiency below optimal range',
        action: 'Review heating system settings and insulation'
      });
    }
    
    // Tank utilization recommendations
    this.tankOperationalData.forEach((tankData, tankId) => {
      const utilization = (tankData.currentLevel / tankData.capacity) * 100;
      if (utilization > 95) {
        recommendations.push({
          type: 'capacity',
          priority: 'medium',
          tankId,
          description: 'Tank near capacity',
          action: 'Schedule product transfer or loading'
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Shutdown the tank twin manager
   */
  public shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.emit('shutdown', { timestamp: new Date() });
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): any {
    const criticalTanks = Array.from(this.tankOperationalData.values())
      .filter(tank => tank.status === 'critical').length;
    
    const avgEfficiency = this.systemMetrics.overall.efficiency;
    const availability = this.systemMetrics.overall.availability;
    
    let healthStatus = 'good';
    if (criticalTanks > 0 || avgEfficiency < 70 || availability < 95) {
      healthStatus = 'warning';
    }
    if (criticalTanks > 2 || avgEfficiency < 60 || availability < 90) {
      healthStatus = 'critical';
    }
    
    return {
      status: healthStatus,
      criticalTanks,
      efficiency: avgEfficiency,
      availability,
      lastUpdate: new Date()
    };
  }
}

// Export default configuration for Tipco Asphalt Plant
export const TipcoAsphaltPlantConfig: PlantLayoutConfiguration = {
  name: 'Tipco Asphalt Public Company Limited',
  location: {
    latitude: 13.7563, // Bangkok coordinates (example)
    longitude: 100.5018,
    elevation: 2
  },
  scaleRatio: 20, // 1:20 scale
  coordinateSystem: {
    origin: { x: 0, y: 0, z: 0 },
    orientation: 0
  },
  tanks: [
    // Tank configuration based on aerial view - 10 tanks in specific layout
    {
      id: 1,
      name: 'Tank-01',
      position: { x: -40, y: 0, z: 40 },
      dimensions: { diameter: 20, height: 12, wallThickness: 0.012, bottomType: 'flat' },
      capacity: { total: 3000000, working: 2700000, minimum: 300000 },
      materials: { shell: 'carbon_steel', insulation: 'mineral_wool', coating: 'epoxy' },
      operatingConditions: { maxTemperature: 180, minTemperature: 120, maxPressure: 1.5, designPressure: 2.0 },
      heatingSystem: {
        coilType: 'spiral',
        turns: 3,
        diameter: 18,
        tubeSize: { outerDiameter: 100, wallThickness: 5, material: 'carbon_steel' },
        heatTransferArea: 150,
        designFlow: 500,
        designTemperature: 280,
        thermalEfficiency: 85
      },
      sensors: [],
      safetyDevices: []
    },
    // Add remaining 9 tanks with similar configuration...
    // This would be expanded with all 10 tanks from the plant layout
  ],
  loadingStations: [
    {
      id: 1,
      name: 'Loading Station A',
      position: { x: 80, y: 0, z: -40 },
      loadingBays: [
        {
          id: 1,
          type: 'truck',
          maxCapacity: 30000,
          loadingArm: { reach: 8, swivel: 180, verticalRange: 4 },
          meteringSystem: { accuracy: 0.5, flowRange: [100, 1000] }
        }
      ],
      pumpSystem: {
        id: 'PUMP-LS1',
        type: 'centrifugal',
        maxFlow: 1000,
        maxPressure: 10,
        efficiency: 85,
        variableSpeed: true,
        motor: { power: 75, voltage: 415, frequency: 50 }
      },
      safetyFeatures: ['emergency_stop', 'overflow_protection', 'fire_suppression'],
      maxLoadingRate: 800,
      connectedTanks: [1, 2, 3, 4, 5]
    }
  ],
  hotOilSystem: {
    heater: {
      id: 'HOH-001',
      type: 'fired',
      capacity: 2000,
      efficiency: 88,
      fuelType: 'natural_gas',
      maxTemperature: 300
    },
    circulationPumps: [
      {
        id: 'HOP-001',
        type: 'centrifugal',
        maxFlow: 2000,
        maxPressure: 8,
        efficiency: 85,
        variableSpeed: false,
        motor: { power: 150, voltage: 415, frequency: 50 }
      }
    ],
    expansionTank: {
      capacity: 5000,
      position: { x: -60, y: 8, z: 0 }
    },
    controlSystem: {
      type: 'cascade',
      setPoints: { 1: 160, 2: 160, 3: 160, 4: 160, 5: 160 },
      deadband: 2
    }
  },
  pipeNetwork: {
    segments: [],
    junctions: [],
    valves: [],
    instruments: []
  },
  utilities: [],
  safetyZones: []
};