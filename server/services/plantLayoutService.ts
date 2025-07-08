import { TipcoAsphaltPlantConfig, PlantLayoutConfiguration, TankConfiguration, PipeSegmentConfiguration } from './tankTwinManager';

/**
 * Plant Layout Service for managing accurate plant geometry and positioning
 * Based on the Tipco Asphalt facility aerial view (scale 1:20m)
 */
export class PlantLayoutService {
  private plantConfig: PlantLayoutConfiguration;

  constructor() {
    this.plantConfig = this.createTipcoAsphaltLayout();
  }

  /**
   * Create the complete Tipco Asphalt plant layout based on aerial imagery
   */
  private createTipcoAsphaltLayout(): PlantLayoutConfiguration {
    const config = { ...TipcoAsphaltPlantConfig };

    // Define all 10 tanks based on aerial view positioning
    config.tanks = this.createTankLayout();
    
    // Define hot-oil pipe network
    config.pipeNetwork.segments = this.createHotOilPipeNetwork();
    
    // Define asphalt loading pipe network
    config.pipeNetwork.segments.push(...this.createAsphaltPipeNetwork());
    
    // Define loading stations
    config.loadingStations = this.createLoadingStations();

    return config;
  }

  /**
   * Create tank layout based on aerial view
   * 10 tanks arranged in a specific pattern
   */
  private createTankLayout(): TankConfiguration[] {
    const baseTankConfig = {
      dimensions: { 
        diameter: 20, // 20m diameter tanks
        height: 12, 
        wallThickness: 0.012, 
        bottomType: 'flat' as const 
      },
      capacity: { 
        total: 3000000, // 3,000,000 liters
        working: 2700000, 
        minimum: 300000 
      },
      materials: { 
        shell: 'carbon_steel', 
        insulation: 'mineral_wool', 
        coating: 'epoxy' 
      },
      operatingConditions: { 
        maxTemperature: 180, 
        minTemperature: 120, 
        maxPressure: 1.5, 
        designPressure: 2.0 
      },
      heatingSystem: {
        coilType: 'spiral' as const,
        turns: 3, // 3 turns as specified
        diameter: 18,
        tubeSize: { outerDiameter: 100, wallThickness: 5, material: 'carbon_steel' },
        heatTransferArea: 150,
        designFlow: 500,
        designTemperature: 280,
        thermalEfficiency: 85
      },
      sensors: this.createTankSensors(),
      safetyDevices: this.createTankSafetyDevices()
    };

    // Tank positions based on aerial view (scale 1:20m)
    const tankPositions = [
      { id: 1, name: 'Tank-01', position: { x: -30, y: 0, z: 30 } },  // Top left
      { id: 2, name: 'Tank-02', position: { x: 0, y: 0, z: 30 } },    // Top center-left
      { id: 3, name: 'Tank-03', position: { x: 30, y: 0, z: 30 } },   // Top center-right
      { id: 4, name: 'Tank-04', position: { x: 60, y: 0, z: 30 } },   // Top right
      { id: 5, name: 'Tank-05', position: { x: -30, y: 0, z: 0 } },   // Middle left
      { id: 6, name: 'Tank-06', position: { x: 0, y: 0, z: 0 } },     // Center
      { id: 7, name: 'Tank-07', position: { x: 30, y: 0, z: 0 } },    // Middle right
      { id: 8, name: 'Tank-08', position: { x: -15, y: 0, z: -30 } }, // Bottom left
      { id: 9, name: 'Tank-09', position: { x: 15, y: 0, z: -30 } },  // Bottom center
      { id: 10, name: 'Tank-10', position: { x: 45, y: 0, z: -30 } }  // Bottom right
    ];

    return tankPositions.map(tank => ({
      ...baseTankConfig,
      id: tank.id,
      name: tank.name,
      position: tank.position
    }));
  }

  /**
   * Create sensor configuration for each tank
   */
  private createTankSensors(): any[] {
    return [
      {
        id: 'LT-001',
        type: 'level',
        position: { x: 0, y: 8, z: 0 },
        range: [0, 12],
        accuracy: 0.1,
        units: 'meters',
        signalType: '4-20mA',
        calibrationDate: new Date(),
        maintenanceInterval: 180
      },
      {
        id: 'TT-001',
        type: 'temperature',
        position: { x: 0, y: 6, z: 0 },
        range: [0, 200],
        accuracy: 0.5,
        units: 'Celsius',
        signalType: '4-20mA',
        calibrationDate: new Date(),
        maintenanceInterval: 90
      },
      {
        id: 'TT-002',
        type: 'temperature',
        position: { x: 0, y: 3, z: 0 },
        range: [0, 200],
        accuracy: 0.5,
        units: 'Celsius',
        signalType: '4-20mA',
        calibrationDate: new Date(),
        maintenanceInterval: 90
      },
      {
        id: 'TT-003',
        type: 'temperature',
        position: { x: 0, y: 1, z: 0 },
        range: [0, 200],
        accuracy: 0.5,
        units: 'Celsius',
        signalType: '4-20mA',
        calibrationDate: new Date(),
        maintenanceInterval: 90
      },
      {
        id: 'PT-001',
        type: 'pressure',
        position: { x: 0, y: 10, z: 0 },
        range: [0, 5],
        accuracy: 0.1,
        units: 'bar',
        signalType: '4-20mA',
        calibrationDate: new Date(),
        maintenanceInterval: 180
      }
    ];
  }

  /**
   * Create safety device configuration for each tank
   */
  private createTankSafetyDevices(): any[] {
    return [
      {
        id: 'PSV-001',
        type: 'pressure_relief',
        position: { x: 0, y: 12, z: 0 },
        setPoint: 2.0,
        action: 'relief',
        testInterval: 365,
        lastTest: new Date()
      },
      {
        id: 'TSH-001',
        type: 'temperature_switch',
        position: { x: 0, y: 8, z: 0 },
        setPoint: 185,
        action: 'alarm',
        testInterval: 180,
        lastTest: new Date()
      },
      {
        id: 'LSH-001',
        type: 'level_switch',
        position: { x: 0, y: 11, z: 0 },
        setPoint: 11,
        action: 'alarm',
        testInterval: 90,
        lastTest: new Date()
      }
    ];
  }

  /**
   * Create hot-oil circulation pipe network
   * Closed-loop system connecting all tanks
   */
  private createHotOilPipeNetwork(): PipeSegmentConfiguration[] {
    const hotOilPipes: PipeSegmentConfiguration[] = [];

    // Main hot-oil supply header
    hotOilPipes.push({
      id: 'HO-SUPPLY-MAIN',
      type: 'hot_oil',
      startPoint: { x: -60, y: 2, z: 0 }, // From heater
      endPoint: { x: 80, y: 2, z: 40 },   // To end of tank farm
      controlPoints: [
        { x: -40, y: 2, z: 20 },
        { x: 0, y: 2, z: 40 },
        { x: 40, y: 2, z: 40 }
      ],
      specifications: {
        nominalDiameter: 8,
        schedule: 'SCH40',
        material: 'carbon_steel',
        insulation: {
          type: 'mineral_wool',
          thickness: 100,
          jacketMaterial: 'aluminum'
        }
      },
      operatingConditions: {
        designPressure: 10,
        designTemperature: 300,
        normalFlow: 2000,
        maxFlow: 2500
      },
      heatTracing: {
        type: 'electric',
        power: 25,
        controlType: 'automatic'
      }
    });

    // Main hot-oil return header
    hotOilPipes.push({
      id: 'HO-RETURN-MAIN',
      type: 'hot_oil',
      startPoint: { x: 80, y: 2, z: -40 },
      endPoint: { x: -60, y: 2, z: 0 },
      controlPoints: [
        { x: 40, y: 2, z: -40 },
        { x: 0, y: 2, z: -40 },
        { x: -40, y: 2, z: -20 }
      ],
      specifications: {
        nominalDiameter: 8,
        schedule: 'SCH40',
        material: 'carbon_steel',
        insulation: {
          type: 'mineral_wool',
          thickness: 100,
          jacketMaterial: 'aluminum'
        }
      },
      operatingConditions: {
        designPressure: 10,
        designTemperature: 280,
        normalFlow: 2000,
        maxFlow: 2500
      },
      heatTracing: {
        type: 'electric',
        power: 25,
        controlType: 'automatic'
      }
    });

    // Individual tank hot-oil connections
    const tankPositions = [
      { x: -30, z: 30 }, { x: 0, z: 30 }, { x: 30, z: 30 }, { x: 60, z: 30 },
      { x: -30, z: 0 }, { x: 0, z: 0 }, { x: 30, z: 0 },
      { x: -15, z: -30 }, { x: 15, z: -30 }, { x: 45, z: -30 }
    ];

    tankPositions.forEach((pos, index) => {
      const tankId = index + 1;
      
      // Supply connection to tank
      hotOilPipes.push({
        id: `HO-SUPPLY-T${tankId.toString().padStart(2, '0')}`,
        type: 'hot_oil',
        startPoint: { x: pos.x, y: 2, z: pos.z + 15 },
        endPoint: { x: pos.x, y: -1, z: pos.z },
        specifications: {
          nominalDiameter: 4,
          schedule: 'SCH40',
          material: 'carbon_steel',
          insulation: {
            type: 'mineral_wool',
            thickness: 75,
            jacketMaterial: 'aluminum'
          }
        },
        operatingConditions: {
          designPressure: 10,
          designTemperature: 300,
          normalFlow: 200,
          maxFlow: 300
        },
        heatTracing: {
          type: 'electric',
          power: 20,
          controlType: 'automatic'
        }
      });

      // Return connection from tank
      hotOilPipes.push({
        id: `HO-RETURN-T${tankId.toString().padStart(2, '0')}`,
        type: 'hot_oil',
        startPoint: { x: pos.x, y: -1, z: pos.z },
        endPoint: { x: pos.x, y: 2, z: pos.z - 15 },
        specifications: {
          nominalDiameter: 4,
          schedule: 'SCH40',
          material: 'carbon_steel',
          insulation: {
            type: 'mineral_wool',
            thickness: 75,
            jacketMaterial: 'aluminum'
          }
        },
        operatingConditions: {
          designPressure: 10,
          designTemperature: 280,
          normalFlow: 200,
          maxFlow: 300
        },
        heatTracing: {
          type: 'electric',
          power: 20,
          controlType: 'automatic'
        }
      });
    });

    return hotOilPipes;
  }

  /**
   * Create asphalt loading pipe network
   * Separate from hot-oil system for product transfer
   */
  private createAsphaltPipeNetwork(): PipeSegmentConfiguration[] {
    const asphaltPipes: PipeSegmentConfiguration[] = [];

    // Main asphalt header to loading stations
    asphaltPipes.push({
      id: 'AS-MAIN-HEADER',
      type: 'asphalt',
      startPoint: { x: 0, y: -2, z: 0 },
      endPoint: { x: 80, y: -2, z: -20 },
      controlPoints: [
        { x: 20, y: -2, z: -5 },
        { x: 50, y: -2, z: -15 }
      ],
      specifications: {
        nominalDiameter: 6,
        schedule: 'SCH80',
        material: 'carbon_steel',
        insulation: {
          type: 'mineral_wool',
          thickness: 100,
          jacketMaterial: 'stainless_steel'
        }
      },
      operatingConditions: {
        designPressure: 15,
        designTemperature: 200,
        normalFlow: 800,
        maxFlow: 1200
      },
      heatTracing: {
        type: 'electric',
        power: 30,
        controlType: 'automatic'
      }
    });

    // Individual tank asphalt outlet connections
    const tankPositions = [
      { x: -30, z: 30 }, { x: 0, z: 30 }, { x: 30, z: 30 }, { x: 60, z: 30 },
      { x: -30, z: 0 }, { x: 0, z: 0 }, { x: 30, z: 0 },
      { x: -15, z: -30 }, { x: 15, z: -30 }, { x: 45, z: -30 }
    ];

    tankPositions.forEach((pos, index) => {
      const tankId = index + 1;
      
      asphaltPipes.push({
        id: `AS-OUTLET-T${tankId.toString().padStart(2, '0')}`,
        type: 'asphalt',
        startPoint: { x: pos.x, y: -2, z: pos.z },
        endPoint: { x: pos.x + 10, y: -2, z: pos.z - 5 },
        specifications: {
          nominalDiameter: 4,
          schedule: 'SCH80',
          material: 'carbon_steel',
          insulation: {
            type: 'mineral_wool',
            thickness: 75,
            jacketMaterial: 'stainless_steel'
          }
        },
        operatingConditions: {
          designPressure: 15,
          designTemperature: 200,
          normalFlow: 400,
          maxFlow: 600
        },
        heatTracing: {
          type: 'electric',
          power: 25,
          controlType: 'automatic'
        }
      });
    });

    return asphaltPipes;
  }

  /**
   * Create loading station configurations
   */
  private createLoadingStations(): any[] {
    return [
      {
        id: 1,
        name: 'Loading Station A',
        position: { x: 80, y: 0, z: -10 },
        loadingBays: [
          {
            id: 1,
            type: 'truck',
            maxCapacity: 30000,
            loadingArm: { reach: 8, swivel: 180, verticalRange: 4 },
            meteringSystem: { accuracy: 0.25, flowRange: [100, 1000] }
          },
          {
            id: 2,
            type: 'truck',
            maxCapacity: 30000,
            loadingArm: { reach: 8, swivel: 180, verticalRange: 4 },
            meteringSystem: { accuracy: 0.25, flowRange: [100, 1000] }
          }
        ],
        pumpSystem: {
          id: 'PUMP-LS1',
          type: 'positive_displacement',
          maxFlow: 1000,
          maxPressure: 15,
          efficiency: 90,
          variableSpeed: true,
          motor: { power: 100, voltage: 415, frequency: 50 }
        },
        safetyFeatures: [
          'emergency_stop',
          'overflow_protection',
          'fire_suppression',
          'vapor_recovery',
          'grounding_system'
        ],
        maxLoadingRate: 800,
        connectedTanks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      },
      {
        id: 2,
        name: 'Loading Station B',
        position: { x: 80, y: 0, z: -30 },
        loadingBays: [
          {
            id: 3,
            type: 'truck',
            maxCapacity: 40000,
            loadingArm: { reach: 10, swivel: 180, verticalRange: 5 },
            meteringSystem: { accuracy: 0.25, flowRange: [150, 1200] }
          }
        ],
        pumpSystem: {
          id: 'PUMP-LS2',
          type: 'positive_displacement',
          maxFlow: 1200,
          maxPressure: 15,
          efficiency: 90,
          variableSpeed: true,
          motor: { power: 120, voltage: 415, frequency: 50 }
        },
        safetyFeatures: [
          'emergency_stop',
          'overflow_protection',
          'fire_suppression',
          'vapor_recovery',
          'grounding_system'
        ],
        maxLoadingRate: 1000,
        connectedTanks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      }
    ];
  }

  /**
   * Get plant configuration
   */
  public getPlantConfiguration(): PlantLayoutConfiguration {
    return this.plantConfig;
  }

  /**
   * Get tank by ID
   */
  public getTankConfiguration(tankId: number): TankConfiguration | undefined {
    return this.plantConfig.tanks.find(tank => tank.id === tankId);
  }

  /**
   * Get tanks within a radius of a point
   */
  public getTanksInRadius(center: { x: number; y: number; z: number }, radius: number): TankConfiguration[] {
    return this.plantConfig.tanks.filter(tank => {
      const distance = Math.sqrt(
        Math.pow(tank.position.x - center.x, 2) +
        Math.pow(tank.position.y - center.y, 2) +
        Math.pow(tank.position.z - center.z, 2)
      );
      return distance <= radius;
    });
  }

  /**
   * Calculate distance between two tanks
   */
  public calculateTankDistance(tankId1: number, tankId2: number): number {
    const tank1 = this.getTankConfiguration(tankId1);
    const tank2 = this.getTankConfiguration(tankId2);
    
    if (!tank1 || !tank2) {
      throw new Error('Tank not found');
    }

    return Math.sqrt(
      Math.pow(tank1.position.x - tank2.position.x, 2) +
      Math.pow(tank1.position.y - tank2.position.y, 2) +
      Math.pow(tank1.position.z - tank2.position.z, 2)
    );
  }

  /**
   * Get pipe segments connected to a tank
   */
  public getTankPipeConnections(tankId: number): PipeSegmentConfiguration[] {
    const tankIdStr = tankId.toString().padStart(2, '0');
    return this.plantConfig.pipeNetwork.segments.filter(pipe => 
      pipe.id.includes(`T${tankIdStr}`)
    );
  }

  /**
   * Get loading stations that can access a specific tank
   */
  public getLoadingStationsForTank(tankId: number): any[] {
    return this.plantConfig.loadingStations.filter(station =>
      station.connectedTanks.includes(tankId)
    );
  }

  /**
   * Calculate total pipe length for a system type
   */
  public calculateTotalPipeLength(systemType: 'hot_oil' | 'asphalt'): number {
    return this.plantConfig.pipeNetwork.segments
      .filter(pipe => pipe.type === systemType)
      .reduce((total, pipe) => {
        const length = Math.sqrt(
          Math.pow(pipe.endPoint.x - pipe.startPoint.x, 2) +
          Math.pow(pipe.endPoint.y - pipe.startPoint.y, 2) +
          Math.pow(pipe.endPoint.z - pipe.startPoint.z, 2)
        );
        return total + length;
      }, 0);
  }

  /**
   * Get plant layout statistics
   */
  public getPlantStatistics(): any {
    return {
      totalTanks: this.plantConfig.tanks.length,
      totalCapacity: this.plantConfig.tanks.reduce((sum, tank) => sum + tank.capacity.total, 0),
      totalWorkingCapacity: this.plantConfig.tanks.reduce((sum, tank) => sum + tank.capacity.working, 0),
      loadingStations: this.plantConfig.loadingStations.length,
      loadingBays: this.plantConfig.loadingStations.reduce((sum, station) => sum + station.loadingBays.length, 0),
      hotOilPipeLength: this.calculateTotalPipeLength('hot_oil'),
      asphaltPipeLength: this.calculateTotalPipeLength('asphalt'),
      plantArea: {
        length: 140, // meters (from -60 to +80)
        width: 80,   // meters (from -40 to +40)
        area: 11200  // square meters
      }
    };
  }

  /**
   * Validate plant layout for engineering constraints
   */
  public validatePlantLayout(): any {
    const issues: any[] = [];

    // Check tank spacing
    for (let i = 0; i < this.plantConfig.tanks.length; i++) {
      for (let j = i + 1; j < this.plantConfig.tanks.length; j++) {
        const distance = this.calculateTankDistance(
          this.plantConfig.tanks[i].id,
          this.plantConfig.tanks[j].id
        );
        const minDistance = (this.plantConfig.tanks[i].dimensions.diameter + 
                           this.plantConfig.tanks[j].dimensions.diameter) / 2 + 5; // 5m clearance

        if (distance < minDistance) {
          issues.push({
            type: 'spacing',
            severity: 'warning',
            description: `Tanks ${this.plantConfig.tanks[i].id} and ${this.plantConfig.tanks[j].id} may be too close`,
            distance,
            minDistance
          });
        }
      }
    }

    // Check pipe routing
    this.plantConfig.pipeNetwork.segments.forEach(pipe => {
      const length = Math.sqrt(
        Math.pow(pipe.endPoint.x - pipe.startPoint.x, 2) +
        Math.pow(pipe.endPoint.y - pipe.startPoint.y, 2) +
        Math.pow(pipe.endPoint.z - pipe.startPoint.z, 2)
      );

      if (length > 100) {
        issues.push({
          type: 'pipe_length',
          severity: 'info',
          description: `Long pipe segment: ${pipe.id}`,
          length
        });
      }
    });

    return {
      isValid: issues.filter(issue => issue.severity === 'error').length === 0,
      issues,
      summary: {
        errors: issues.filter(issue => issue.severity === 'error').length,
        warnings: issues.filter(issue => issue.severity === 'warning').length,
        info: issues.filter(issue => issue.severity === 'info').length
      }
    };
  }
}

export const plantLayoutService = new PlantLayoutService();