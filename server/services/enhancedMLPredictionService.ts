import { TankData, PredictionData, MLModel } from '../../shared/types';
import { MLPredictionService } from './mlPredictionService';
import { PhysicsNeMoService, PhysicsSimulationResult } from './physicsNemoService';
import { PhysicsInformedMLService, PINNPrediction, PINNConfig } from './physicsInformedMLService';

export interface PhysicsInformedPredictionData extends PredictionData {
  physicsMetrics: {
    heatTransferEfficiency: number;
    reynoldsNumber: number;
    nusseltNumber: number;
    pressureDrop: number;
    thermalStability: number;
    energyLoss: number;
  };
  hybridConfidence: number;
  physicsContribution: number;
  mlContribution: number;
  validationScore: number;
  pinnPrediction?: PINNPrediction[];
  modelDiagnostics: {
    pinnModelHealth: boolean;
    physicsCompliance: number;
    adaptationCount: number;
    driftScore: number;
  };
}

export interface EnsembleWeights {
  mlWeight: number;
  physicsWeight: number;
  pinnWeight: number;
  adaptiveWeight: number;
}

export class EnhancedMLPredictionService extends MLPredictionService {
  private physicsService: PhysicsNeMoService;
  private pinnService: PhysicsInformedMLService;
  private ensembleWeights: EnsembleWeights;
  private physicsValidationHistory: Map<number, PhysicsSimulationResult[]> = new Map();
  private hybridModelPerformance: Map<string, number> = new Map();
  private lastPhysicsUpdate: Map<number, Date> = new Map();
  private lastPINNUpdate: Map<number, Date> = new Map();

  constructor() {
    super();
    this.physicsService = new PhysicsNeMoService();
    this.pinnService = new PhysicsInformedMLService();
    this.ensembleWeights = {
      mlWeight: 0.4,
      physicsWeight: 0.3,
      pinnWeight: 0.3,
      adaptiveWeight: 0.0
    };
    
    this.initializePhysicsIntegration();
    this.initializePINNIntegration();
  }

  private async initializePhysicsIntegration(): Promise<void> {
    // Wait for physics service to initialize
    this.physicsService.on('initialized', () => {
      console.log('Enhanced ML service: Physics integration ready');
    });

    this.physicsService.on('error', (error) => {
      console.error('Enhanced ML service: Physics integration error:', error);
      // Fallback to ML + PINN predictions
      this.ensembleWeights = { mlWeight: 0.7, physicsWeight: 0.0, pinnWeight: 0.3, adaptiveWeight: 0.0 };
    });

    // Initialize hybrid model performance tracking
    this.hybridModelPerformance.set('temperature_prediction', 0.85);
    this.hybridModelPerformance.set('energy_optimization', 0.78);
    this.hybridModelPerformance.set('failure_prediction', 0.92);
    this.hybridModelPerformance.set('pinn_prediction', 0.90);
  }

  private async initializePINNIntegration(): Promise<void> {
    // Configure PINN service for industrial tank applications
    const pinnConfig: Partial<PINNConfig> = {
      networkArchitecture: {
        hiddenLayers: [128, 256, 256, 128],
        activationFunction: 'tanh',
        dropoutRate: 0.1,
        batchNormalization: true
      },
      physicsConstraints: {
        heatEquationWeight: 1.2,
        massConservationWeight: 0.8,
        energyConservationWeight: 1.0,
        boundaryConditionWeight: 1.5
      },
      adaptationConfig: {
        enableOnlineLearning: true,
        adaptationRate: 0.005,
        forgettingFactor: 0.98,
        retrainingThreshold: 0.12,
        validationWindow: 150
      }
    };

    this.pinnService.updateConfiguration(pinnConfig);

    // Listen for PINN events
    this.pinnService.on('model_adapted', (event) => {
      console.log(`PINN model adapted to version ${event.version}`);
      this.hybridModelPerformance.set('pinn_prediction', 0.95); // Boost confidence after adaptation
    });

    this.pinnService.on('training_completed', (event) => {
      console.log(`PINN training completed: ${event.epochs} epochs, final loss: ${event.finalLoss}`);
    });

    this.pinnService.on('adaptation_error', (error) => {
      console.error('PINN adaptation error:', error);
      // Reduce PINN weight temporarily
      this.ensembleWeights.pinnWeight *= 0.8;
      this.ensembleWeights.mlWeight += 0.1;
    });

    console.log('Enhanced ML service: PINN integration ready');
  }

  public async generatePhysicsInformedPrediction(tank: TankData): Promise<PhysicsInformedPredictionData> {
    try {
      // Get traditional ML prediction
      const mlPrediction = this.generatePrediction(tank);
      
      // Check if physics simulation is needed
      const needsPhysicsUpdate = this.shouldUpdatePhysics(tank.id);
      const needsPINNUpdate = this.shouldUpdatePINN(tank.id);
      
      let physicsResult: PhysicsSimulationResult | null = null;
      let pinnPrediction: PINNPrediction[] | null = null;
      
      // Get physics-based prediction if needed
      if (needsPhysicsUpdate && this.physicsService.isReady()) {
        physicsResult = await this.getPhysicsSimulation(tank);
        
        if (physicsResult) {
          this.storePhysicsValidation(tank.id, physicsResult);
          this.lastPhysicsUpdate.set(tank.id, new Date());
        }
      }
      
      // Get PINN-based prediction if needed
      if (needsPINNUpdate) {
        pinnPrediction = await this.getPINNPrediction(tank);
        
        if (pinnPrediction) {
          this.lastPINNUpdate.set(tank.id, new Date());
        }
      }
      
      // Combine all predictions using advanced ensemble method
      const hybridPrediction = this.combineTripleEnsemble(mlPrediction, physicsResult, pinnPrediction);
      
      // Calculate physics metrics
      const physicsMetrics = this.calculatePhysicsMetrics(tank, physicsResult);
      
      // Calculate ensemble confidence
      const hybridConfidence = this.calculateTripleEnsembleConfidence(mlPrediction, physicsResult, pinnPrediction);
      
      // Calculate contribution weights
      const contributions = this.calculateTripleContributions(physicsResult, pinnPrediction);
      
      // Validation score based on historical accuracy
      const validationScore = this.calculateValidationScore(tank.id, hybridPrediction);
      
      // Get model diagnostics
      const modelDiagnostics = this.getModelDiagnostics();
      
      return {
        ...hybridPrediction,
        physicsMetrics,
        hybridConfidence,
        physicsContribution: contributions.physics,
        mlContribution: contributions.ml,
        validationScore,
        pinnPrediction: pinnPrediction || undefined,
        modelDiagnostics
      };
      
    } catch (error) {
      console.error('Error in physics-informed prediction:', error);
      
      // Fallback to pure ML prediction
      const mlPrediction = this.generatePrediction(tank);
      return {
        ...mlPrediction,
        physicsMetrics: this.getDefaultPhysicsMetrics(),
        hybridConfidence: mlPrediction.actionConfidence * 0.9, // Slightly reduced confidence
        physicsContribution: 0,
        mlContribution: 1,
        validationScore: 0.8,
        modelDiagnostics: {
          pinnModelHealth: false,
          physicsCompliance: 0.0,
          adaptationCount: 0,
          driftScore: 0.0
        }
      };
    }
  }

  private shouldUpdatePINN(tankId: number): boolean {
    const lastUpdate = this.lastPINNUpdate.get(tankId);
    if (!lastUpdate) return true;
    
    const timeSinceUpdate = Date.now() - lastUpdate.getTime();
    const updateInterval = 2 * 60 * 1000; // 2 minutes (more frequent than physics)
    
    return timeSinceUpdate > updateInterval;
  }

  private async getPINNPrediction(tank: TankData): Promise<PINNPrediction[] | null> {
    try {
      // Create spatial points around the tank for temperature field prediction
      const spatialPoints = this.generateSpatialPoints(tank);
      
      // Get PINN prediction with 1-hour time horizon
      const pinnPredictions = await this.pinnService.predictTemperatureField(
        tank,
        spatialPoints,
        3600 // 1 hour
      );
      
      return pinnPredictions;
    } catch (error) {
      console.error('PINN prediction failed:', error);
      return null;
    }
  }

  private generateSpatialPoints(tank: TankData): number[][] {
    // Generate spatial points for the tank volume
    // Simplified 3D grid for tank interior
    const points: number[][] = [];
    
    // Tank dimensions (normalized coordinates)
    const tankRadius = 5.0; // meters
    const tankHeight = 8.0; // meters
    
    // Generate points in cylindrical coordinates
    for (let r = 0; r <= tankRadius; r += tankRadius / 3) {
      for (let theta = 0; theta < 2 * Math.PI; theta += Math.PI / 4) {
        for (let z = 0; z <= tankHeight; z += tankHeight / 3) {
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);
          points.push([x, y, z]);
        }
      }
    }
    
    return points;
  }

  private combineTripleEnsemble(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult | null,
    pinnPrediction: PINNPrediction[] | null
  ): PredictionData {
    if (!physicsResult && !pinnPrediction) {
      return mlPrediction;
    }

    // Calculate adaptive weights for triple ensemble
    const adaptiveWeights = this.calculateTripleAdaptiveWeights(mlPrediction, physicsResult, pinnPrediction);
    
    // Combine temperature predictions
    const combinedTemperature = this.combineTripleTemperaturePredictions(
      mlPrediction.predictedTemperature,
      physicsResult?.predictedStates,
      pinnPrediction,
      adaptiveWeights
    );
    
    // Combine boiler actions with PINN physics constraints
    const combinedAction = this.combineTripleBoilerActions(
      mlPrediction,
      physicsResult,
      pinnPrediction,
      adaptiveWeights
    );
    
    // Enhanced energy optimization with PINNs
    const enhancedEnergyOptimization = this.enhanceTripleEnergyOptimization(
      mlPrediction.energyOptimization,
      physicsResult,
      pinnPrediction,
      adaptiveWeights
    );
    
    // Improved failure risk with physics-informed constraints
    const improvedFailureRisk = this.improveTripleFailureRisk(
      mlPrediction.failureRisk,
      physicsResult,
      pinnPrediction,
      adaptiveWeights
    );
    
    // Calculate combined confidence
    const combinedConfidence = this.calculateTripleEnsembleConfidence(
      mlPrediction,
      physicsResult,
      pinnPrediction
    );

    return {
      nextBoilerAction: combinedAction.action,
      actionConfidence: combinedConfidence,
      predictedTemperature: combinedTemperature,
      timeToTarget: this.calculateTimeToTarget(
        { temperature: combinedTemperature[0], targetTemperature: 150 } as TankData,
        combinedTemperature
      ),
      energyOptimization: enhancedEnergyOptimization,
      failureRisk: improvedFailureRisk,
      maintenanceWindow: mlPrediction.maintenanceWindow
    };
  }

  private calculateTripleAdaptiveWeights(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult | null,
    pinnPrediction: PINNPrediction[] | null
  ): EnsembleWeights {
    const mlPerformance = this.hybridModelPerformance.get('temperature_prediction') || 0.85;
    const physicsPerformance = physicsResult?.confidence || 0.0;
    const pinnPerformance = pinnPrediction?.[0]?.confidence || 0.0;
    
    const totalPerformance = mlPerformance + physicsPerformance + pinnPerformance;
    
    if (totalPerformance === 0) {
      return { mlWeight: 1.0, physicsWeight: 0.0, pinnWeight: 0.0, adaptiveWeight: 0.0 };
    }
    
    const adaptiveMLWeight = mlPerformance / totalPerformance;
    const adaptivePhysicsWeight = physicsPerformance / totalPerformance;
    const adaptivePINNWeight = pinnPerformance / totalPerformance;
    
    // Blend with default weights
    const blendFactor = 0.3;
    
    return {
      mlWeight: this.ensembleWeights.mlWeight * (1 - blendFactor) + adaptiveMLWeight * blendFactor,
      physicsWeight: this.ensembleWeights.physicsWeight * (1 - blendFactor) + adaptivePhysicsWeight * blendFactor,
      pinnWeight: this.ensembleWeights.pinnWeight * (1 - blendFactor) + adaptivePINNWeight * blendFactor,
      adaptiveWeight: blendFactor
    };
  }

  private combineTripleTemperaturePredictions(
    mlTemperatures: number[],
    physicsStates: number[][] | undefined,
    pinnPrediction: PINNPrediction[] | null,
    weights: EnsembleWeights
  ): number[] {
    const combinedTemperatures: number[] = [];
    
    for (let i = 0; i < mlTemperatures.length; i++) {
      const mlTemp = mlTemperatures[i];
      const physicsTemp = physicsStates?.[i]?.[0] || mlTemp;
      const pinnTemp = pinnPrediction?.[0]?.temperature || mlTemp;
      
      // Triple weighted combination
      const combined = mlTemp * weights.mlWeight + 
                      physicsTemp * weights.physicsWeight + 
                      pinnTemp * weights.pinnWeight;
      
      // Physics-informed bounds checking from PINN
      const pinnBounded = pinnPrediction?.[0] ? 
        Math.max(140, Math.min(200, combined)) : 
        Math.max(100, Math.min(200, combined));
      
      combinedTemperatures.push(pinnBounded);
    }
    
    return combinedTemperatures;
  }

  private combineTripleBoilerActions(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult | null,
    pinnPrediction: PINNPrediction[] | null,
    weights: EnsembleWeights
  ): { action: 'start' | 'stop' | 'maintain' | 'no_action' } {
    let action = mlPrediction.nextBoilerAction;
    
    // Apply physics constraints
    if (physicsResult) {
      const physicsEfficiency = physicsResult.efficiency;
      const energyConsumption = physicsResult.energyConsumption;
      
      if (physicsEfficiency < 0.6 && energyConsumption > 50) {
        action = 'stop';
      } else if (physicsEfficiency > 0.9 && energyConsumption < 20) {
        action = action === 'stop' ? 'maintain' : action;
      }
    }
    
    // Apply PINN physics compliance constraints
    if (pinnPrediction && pinnPrediction.length > 0) {
      const avgPhysicsCompliance = pinnPrediction.reduce((sum, p) => sum + p.physicsCompliance, 0) / pinnPrediction.length;
      const avgTemperature = pinnPrediction.reduce((sum, p) => sum + p.temperature, 0) / pinnPrediction.length;
      
      // If physics compliance is low, be more conservative
      if (avgPhysicsCompliance < 0.7) {
        action = 'maintain';
      }
      
      // Use PINN temperature predictions for action decisions
      if (avgTemperature < 140 && avgPhysicsCompliance > 0.8) {
        action = 'start';
      } else if (avgTemperature > 180 && avgPhysicsCompliance > 0.8) {
        action = 'stop';
      }
    }
    
    return { action };
  }

  private enhanceTripleEnergyOptimization(
    mlOptimization: number,
    physicsResult: PhysicsSimulationResult | null,
    pinnPrediction: PINNPrediction[] | null,
    weights: EnsembleWeights
  ): number {
    let optimization = mlOptimization;
    
    // Physics-based optimization
    if (physicsResult) {
      const physicsEfficiency = physicsResult.efficiency * 100;
      const energyConsumption = physicsResult.energyConsumption;
      
      const physicsOptimization = Math.max(0, Math.min(100, 
        physicsEfficiency - (energyConsumption / 10) * 20
      ));
      
      optimization = optimization * weights.mlWeight + physicsOptimization * weights.physicsWeight;
    }
    
    // PINN-based optimization
    if (pinnPrediction && pinnPrediction.length > 0) {
      const avgHeatFlux = pinnPrediction.reduce((sum, p) => 
        sum + p.heatFlux.reduce((hsum, h) => hsum + Math.abs(h), 0), 0) / pinnPrediction.length;
      const avgPhysicsCompliance = pinnPrediction.reduce((sum, p) => sum + p.physicsCompliance, 0) / pinnPrediction.length;
      
      // PINN-based optimization score
      const pinnOptimization = Math.max(0, Math.min(100,
        avgPhysicsCompliance * 100 - (avgHeatFlux > 5000 ? 10 : 0)
      ));
      
      optimization = optimization * (weights.mlWeight + weights.physicsWeight) + pinnOptimization * weights.pinnWeight;
    }
    
    return Math.max(0, Math.min(100, optimization));
  }

  private improveTripleFailureRisk(
    mlRisk: number,
    physicsResult: PhysicsSimulationResult | null,
    pinnPrediction: PINNPrediction[] | null,
    weights: EnsembleWeights
  ): number {
    let risk = mlRisk;
    
    // Physics-based risk factors
    if (physicsResult) {
      let physicsRisk = 0;
      
      if (physicsResult.efficiency < 0.7) physicsRisk += 0.3;
      if (physicsResult.energyConsumption > 100) physicsRisk += 0.2;
      if (physicsResult.confidence < 0.8) physicsRisk += 0.1;
      
      risk = risk * weights.mlWeight + physicsRisk * weights.physicsWeight;
    }
    
    // PINN-based risk assessment
    if (pinnPrediction && pinnPrediction.length > 0) {
      let pinnRisk = 0;
      
      const avgPhysicsCompliance = pinnPrediction.reduce((sum, p) => sum + p.physicsCompliance, 0) / pinnPrediction.length;
      const avgUncertainty = pinnPrediction.reduce((sum, p) => sum + p.uncertainty, 0) / pinnPrediction.length;
      
      // Low physics compliance indicates potential issues
      if (avgPhysicsCompliance < 0.7) pinnRisk += 0.25;
      
      // High uncertainty indicates model confidence issues
      if (avgUncertainty > 0.15) pinnRisk += 0.2;
      
      // Temperature gradient risk
      const tempGradients = pinnPrediction.flatMap(p => p.temperatureGradient);
      const maxGradient = Math.max(...tempGradients.map(Math.abs));
      if (maxGradient > 20) pinnRisk += 0.15; // High thermal stress
      
      risk = risk * (weights.mlWeight + weights.physicsWeight) + pinnRisk * weights.pinnWeight;
    }
    
    return Math.max(0, Math.min(1, risk));
  }

  private calculateTripleEnsembleConfidence(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult | null,
    pinnPrediction: PINNPrediction[] | null
  ): number {
    const mlConfidence = mlPrediction.actionConfidence;
    const physicsConfidence = physicsResult?.confidence || 0.0;
    const pinnConfidence = pinnPrediction?.[0]?.confidence || 0.0;
    
    // Weighted average
    const weights = this.calculateTripleAdaptiveWeights(mlPrediction, physicsResult, pinnPrediction);
    const weightedConfidence = mlConfidence * weights.mlWeight + 
                              physicsConfidence * weights.physicsWeight + 
                              pinnConfidence * weights.pinnWeight;
    
    // Boost confidence when all models agree
    let agreementBonus = 0;
    if (physicsResult && pinnPrediction) {
      const mlPhysicsAgreement = 1 - Math.abs(mlConfidence - physicsConfidence);
      const mlPinnAgreement = 1 - Math.abs(mlConfidence - pinnConfidence);
      const physicssPinnAgreement = 1 - Math.abs(physicsConfidence - pinnConfidence);
      
      const avgAgreement = (mlPhysicsAgreement + mlPinnAgreement + physicssPinnAgreement) / 3;
      if (avgAgreement > 0.8) agreementBonus = 0.05;
    }
    
    return Math.max(0.5, Math.min(0.99, weightedConfidence + agreementBonus));
  }

  private calculateTripleContributions(
    physicsResult: PhysicsSimulationResult | null,
    pinnPrediction: PINNPrediction[] | null
  ): { ml: number; physics: number; pinn?: number } {
    const mlQuality = this.hybridModelPerformance.get('temperature_prediction') || 0.85;
    const physicsQuality = physicsResult?.confidence || 0.0;
    const pinnQuality = pinnPrediction?.[0]?.confidence || 0.0;
    
    const total = mlQuality + physicsQuality + pinnQuality;
    
    if (total === 0) {
      return { ml: 1.0, physics: 0.0, pinn: 0.0 };
    }
    
    return {
      ml: mlQuality / total,
      physics: physicsQuality / total,
      pinn: pinnQuality / total
    };
  }

  private getModelDiagnostics(): PhysicsInformedPredictionData['modelDiagnostics'] {
    const pinnDiagnostics = this.pinnService.getModelDiagnostics();
    
    return {
      pinnModelHealth: pinnDiagnostics.isHealthy,
      physicsCompliance: pinnDiagnostics.physicsCompliance,
      adaptationCount: pinnDiagnostics.lastAdaptation ? 1 : 0,
      driftScore: pinnDiagnostics.driftScore
    };
  }

  private shouldUpdatePhysics(tankId: number): boolean {
    const lastUpdate = this.lastPhysicsUpdate.get(tankId);
    if (!lastUpdate) return true;
    
    const timeSinceUpdate = Date.now() - lastUpdate.getTime();
    const updateInterval = 5 * 60 * 1000; // 5 minutes
    
    return timeSinceUpdate > updateInterval;
  }

  private async getPhysicsSimulation(tank: TankData): Promise<PhysicsSimulationResult | null> {
    try {
      const coilGeometry = this.physicsService.getDefaultCoilGeometry();
      const oilProperties = this.physicsService.getDefaultOilProperties();
      
      // Primary physics simulation - hot oil circulation
      const physicsResult = await this.physicsService.simulateHotOilCirculation(
        tank,
        coilGeometry,
        oilProperties
      );
      
      return physicsResult;
    } catch (error) {
      console.error('Physics simulation failed:', error);
      return null;
    }
  }

  private combineMLAndPhysics(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult | null
  ): PredictionData {
    if (!physicsResult) {
      return mlPrediction;
    }

    // Dynamic weight adjustment based on historical performance
    const adaptiveWeights = this.calculateAdaptiveWeights(mlPrediction, physicsResult);
    
    // Combine temperature predictions
    const combinedTemperature = this.combineTemperaturePredictions(
      mlPrediction.predictedTemperature,
      physicsResult.predictedStates,
      adaptiveWeights
    );
    
    // Combine boiler action recommendations
    const combinedAction = this.combineBoilerActions(
      mlPrediction,
      physicsResult,
      adaptiveWeights
    );
    
    // Enhanced energy optimization using physics
    const enhancedEnergyOptimization = this.enhanceEnergyOptimization(
      mlPrediction.energyOptimization,
      physicsResult,
      adaptiveWeights
    );
    
    // Improved failure risk assessment
    const improvedFailureRisk = this.improveFailureRisk(
      mlPrediction.failureRisk,
      physicsResult,
      adaptiveWeights
    );
    
    // Calculate combined confidence
    const combinedConfidence = this.calculateCombinedConfidence(
      mlPrediction.actionConfidence,
      physicsResult.confidence,
      adaptiveWeights
    );

    return {
      nextBoilerAction: combinedAction.action,
      actionConfidence: combinedConfidence,
      predictedTemperature: combinedTemperature,
      timeToTarget: this.calculateTimeToTarget(
        { temperature: combinedTemperature[0], targetTemperature: 150 } as TankData,
        combinedTemperature
      ),
      energyOptimization: enhancedEnergyOptimization,
      failureRisk: improvedFailureRisk,
      maintenanceWindow: mlPrediction.maintenanceWindow
    };
  }

  private calculateAdaptiveWeights(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult
  ): EnsembleWeights {
    // Historical performance-based weight adjustment
    const mlPerformance = this.hybridModelPerformance.get('temperature_prediction') || 0.85;
    const physicsPerformance = physicsResult.confidence;
    
    const totalPerformance = mlPerformance + physicsPerformance;
    const adaptiveMLWeight = mlPerformance / totalPerformance;
    const adaptivePhysicsWeight = physicsPerformance / totalPerformance;
    
    // Blend with default weights
    const blendFactor = 0.3;
    
    return {
      mlWeight: this.ensembleWeights.mlWeight * (1 - blendFactor) + adaptiveMLWeight * blendFactor,
      physicsWeight: this.ensembleWeights.physicsWeight * (1 - blendFactor) + adaptivePhysicsWeight * blendFactor,
      adaptiveWeight: blendFactor
    };
  }

  private combineTemperaturePredictions(
    mlTemperatures: number[],
    physicsStates: number[][],
    weights: EnsembleWeights
  ): number[] {
    const combinedTemperatures: number[] = [];
    
    for (let i = 0; i < mlTemperatures.length; i++) {
      const mlTemp = mlTemperatures[i];
      const physicsTemp = physicsStates[i]?.[0] || mlTemp;
      
      // Weighted combination
      const combined = mlTemp * weights.mlWeight + physicsTemp * weights.physicsWeight;
      
      // Physics-informed bounds checking
      const bounded = Math.max(100, Math.min(200, combined));
      combinedTemperatures.push(bounded);
    }
    
    return combinedTemperatures;
  }

  private combineBoilerActions(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult,
    weights: EnsembleWeights
  ): { action: 'start' | 'stop' | 'maintain' | 'no_action' } {
    // Use physics-informed decision making
    const physicsEfficiency = physicsResult.efficiency;
    const energyConsumption = physicsResult.energyConsumption;
    
    let action = mlPrediction.nextBoilerAction;
    
    // Physics-informed overrides
    if (physicsEfficiency < 0.6 && energyConsumption > 50) {
      // Low efficiency, high energy consumption
      action = 'stop';
    } else if (physicsEfficiency > 0.9 && energyConsumption < 20) {
      // High efficiency, low energy consumption
      action = action === 'stop' ? 'maintain' : action;
    }
    
    // Optimal setpoint adjustments
    if (physicsResult.optimalSetpoints) {
      const currentTemp = physicsResult.predictedStates[0]?.[0] || 150;
      const optimalTemp = physicsResult.optimalSetpoints.temperature;
      
      if (Math.abs(currentTemp - optimalTemp) > 5) {
        action = currentTemp < optimalTemp ? 'start' : 'stop';
      }
    }
    
    return { action };
  }

  private enhanceEnergyOptimization(
    mlOptimization: number,
    physicsResult: PhysicsSimulationResult,
    weights: EnsembleWeights
  ): number {
    // Physics-informed energy optimization
    const physicsEfficiency = physicsResult.efficiency * 100;
    const energyConsumption = physicsResult.energyConsumption;
    
    // Calculate physics-based optimization score
    const physicsOptimization = Math.max(0, Math.min(100, 
      physicsEfficiency - (energyConsumption / 10) * 20
    ));
    
    // Weighted combination
    const combined = mlOptimization * weights.mlWeight + physicsOptimization * weights.physicsWeight;
    
    // Bonus for low energy consumption and high efficiency
    const bonus = physicsResult.efficiency > 0.85 ? 5 : 0;
    
    return Math.max(0, Math.min(100, combined + bonus));
  }

  private improveFailureRisk(
    mlRisk: number,
    physicsResult: PhysicsSimulationResult,
    weights: EnsembleWeights
  ): number {
    // Physics-informed failure risk assessment
    const efficiency = physicsResult.efficiency;
    const energyConsumption = physicsResult.energyConsumption;
    
    // Physics-based risk factors
    let physicsRisk = 0;
    
    if (efficiency < 0.7) physicsRisk += 0.3;
    if (energyConsumption > 100) physicsRisk += 0.2;
    if (physicsResult.confidence < 0.8) physicsRisk += 0.1;
    
    // Heat transfer efficiency risk
    if (physicsResult.heatFlux && physicsResult.heatFlux.length > 0) {
      const avgHeatFlux = physicsResult.heatFlux.reduce((a, b) => a + b, 0) / physicsResult.heatFlux.length;
      if (avgHeatFlux < 1000) physicsRisk += 0.15;
    }
    
    // Combine risks
    const combinedRisk = mlRisk * weights.mlWeight + physicsRisk * weights.physicsWeight;
    
    return Math.max(0, Math.min(1, combinedRisk));
  }

  private calculateCombinedConfidence(
    mlConfidence: number,
    physicsConfidence: number,
    weights: EnsembleWeights
  ): number {
    const combined = mlConfidence * weights.mlWeight + physicsConfidence * weights.physicsWeight;
    
    // Boost confidence when both models agree
    const agreement = 1 - Math.abs(mlConfidence - physicsConfidence);
    const agreementBonus = agreement > 0.8 ? 0.05 : 0;
    
    return Math.max(0.5, Math.min(0.99, combined + agreementBonus));
  }

  private calculatePhysicsMetrics(
    tank: TankData,
    physicsResult: PhysicsSimulationResult | null
  ): PhysicsInformedPredictionData['physicsMetrics'] {
    if (!physicsResult) {
      return this.getDefaultPhysicsMetrics();
    }
    
    return {
      heatTransferEfficiency: physicsResult.efficiency,
      reynoldsNumber: physicsResult.additionalMetrics?.reynoldsNumber || 1000,
      nusseltNumber: physicsResult.additionalMetrics?.nusseltNumber || 50,
      pressureDrop: physicsResult.additionalMetrics?.pressureDrop || 0.5,
      thermalStability: this.calculateThermalStability(physicsResult),
      energyLoss: this.calculateEnergyLoss(physicsResult)
    };
  }

  private calculateThermalStability(physicsResult: PhysicsSimulationResult): number {
    if (!physicsResult.temperatureField || physicsResult.temperatureField.length === 0) {
      return 0.85;
    }
    
    const tempField = physicsResult.temperatureField[0];
    const variance = this.calculateVariance(tempField);
    
    // Lower variance = higher stability
    return Math.max(0, Math.min(1, 1 - variance / 100));
  }

  private calculateEnergyLoss(physicsResult: PhysicsSimulationResult): number {
    // Energy loss based on efficiency and consumption
    const efficiency = physicsResult.efficiency;
    const consumption = physicsResult.energyConsumption;
    
    return consumption * (1 - efficiency);
  }

  private calculateHybridConfidence(
    mlPrediction: PredictionData,
    physicsResult: PhysicsSimulationResult | null
  ): number {
    if (!physicsResult) {
      return mlPrediction.actionConfidence * 0.9;
    }
    
    const mlConfidence = mlPrediction.actionConfidence;
    const physicsConfidence = physicsResult.confidence;
    
    // Weight based on historical performance
    const mlWeight = this.hybridModelPerformance.get('temperature_prediction') || 0.85;
    const physicsWeight = physicsConfidence;
    
    const totalWeight = mlWeight + physicsWeight;
    const weightedConfidence = (mlConfidence * mlWeight + physicsConfidence * physicsWeight) / totalWeight;
    
    // Boost confidence when both models are confident
    const confidenceBoost = (mlConfidence > 0.8 && physicsConfidence > 0.8) ? 0.05 : 0;
    
    return Math.max(0.5, Math.min(0.99, weightedConfidence + confidenceBoost));
  }

  private calculateContributions(physicsResult: PhysicsSimulationResult | null): { ml: number; physics: number } {
    if (!physicsResult) {
      return { ml: 1.0, physics: 0.0 };
    }
    
    const physicsQuality = physicsResult.confidence;
    const mlQuality = this.hybridModelPerformance.get('temperature_prediction') || 0.85;
    
    const total = physicsQuality + mlQuality;
    
    return {
      ml: mlQuality / total,
      physics: physicsQuality / total
    };
  }

  private calculateValidationScore(tankId: number, prediction: PredictionData): number {
    const history = this.physicsValidationHistory.get(tankId) || [];
    
    if (history.length < 5) {
      return 0.8; // Default score for insufficient data
    }
    
    // Calculate validation based on historical accuracy
    const recentHistory = history.slice(-5);
    const avgConfidence = recentHistory.reduce((sum, result) => sum + result.confidence, 0) / recentHistory.length;
    
    // Penalize for high variance in predictions
    const confidenceVariance = this.calculateVariance(recentHistory.map(r => r.confidence));
    const stabilityScore = Math.max(0, 1 - confidenceVariance);
    
    return Math.max(0.5, Math.min(1.0, avgConfidence * 0.7 + stabilityScore * 0.3));
  }

  private storePhysicsValidation(tankId: number, result: PhysicsSimulationResult): void {
    if (!this.physicsValidationHistory.has(tankId)) {
      this.physicsValidationHistory.set(tankId, []);
    }
    
    const history = this.physicsValidationHistory.get(tankId)!;
    history.push(result);
    
    // Keep only recent results
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  private getDefaultPhysicsMetrics(): PhysicsInformedPredictionData['physicsMetrics'] {
    return {
      heatTransferEfficiency: 0.85,
      reynoldsNumber: 1000,
      nusseltNumber: 50,
      pressureDrop: 0.5,
      thermalStability: 0.85,
      energyLoss: 5.0
    };
  }

  public async simulateAsphaltFlow(tank: TankData): Promise<PhysicsSimulationResult | null> {
    try {
      const pipeGeometry = {
        pipeRadius: 0.1,
        pipeLength: 50,
        roughness: 0.001
      };
      
      const asphaltProperties = this.physicsService.getDefaultAsphaltProperties();
      
      return await this.physicsService.simulateAsphaltFlow(
        tank,
        pipeGeometry,
        asphaltProperties
      );
    } catch (error) {
      console.error('Asphalt flow simulation failed:', error);
      return null;
    }
  }

  public async simulateFluidDynamics(tank: TankData): Promise<PhysicsSimulationResult | null> {
    try {
      const systemGeometry = {
        pipeRadius: 0.05,
        pipeLength: 20,
        roughness: 0.0001
      };
      
      const fluidProperties = this.physicsService.getDefaultOilProperties();
      
      return await this.physicsService.simulateFluidDynamics(
        tank,
        systemGeometry,
        fluidProperties
      );
    } catch (error) {
      console.error('Fluid dynamics simulation failed:', error);
      return null;
    }
  }

  public getPhysicsServiceStatus(): { ready: boolean; queue: { pending: number; processing: number } } {
    return {
      ready: this.physicsService.isReady(),
      queue: this.physicsService.getQueueStatus()
    };
  }

  public updateEnsembleWeights(mlWeight: number, physicsWeight: number, pinnWeight?: number): void {
    const pWeight = pinnWeight || this.ensembleWeights.pinnWeight;
    const total = mlWeight + physicsWeight + pWeight;
    this.ensembleWeights = {
      mlWeight: mlWeight / total,
      physicsWeight: physicsWeight / total,
      pinnWeight: pWeight / total,
      adaptiveWeight: this.ensembleWeights.adaptiveWeight
    };
  }

  public async trainPINNModel(trainingData: Array<{ inputs: number[]; targets: number[] }>): Promise<boolean> {
    try {
      console.log('Starting PINN model training with enhanced ML service');
      const trainingMetrics = await this.pinnService.trainPINN(trainingData);
      
      if (trainingMetrics.length > 0) {
        const finalMetrics = trainingMetrics[trainingMetrics.length - 1];
        console.log(`PINN training completed: ${trainingMetrics.length} epochs, final loss: ${finalMetrics.totalLoss}`);
        
        // Update performance based on training success
        if (finalMetrics.physicsCompliance > 0.8) {
          this.hybridModelPerformance.set('pinn_prediction', 0.95);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PINN training failed:', error);
      return false;
    }
  }

  public exportPINNModel(): string | null {
    try {
      return this.pinnService.exportModel();
    } catch (error) {
      console.error('Failed to export PINN model:', error);
      return null;
    }
  }

  public async loadPINNModel(modelData: string): Promise<boolean> {
    try {
      return await this.pinnService.loadModel(modelData);
    } catch (error) {
      console.error('Failed to load PINN model:', error);
      return false;
    }
  }

  public getAdvancedPerformanceMetrics(): {
    ensembleWeights: EnsembleWeights;
    modelPerformance: Map<string, number>;
    physicsServiceStatus: { ready: boolean; queue: { pending: number; processing: number } };
    pinnServiceStatus: {
      isHealthy: boolean;
      modelVersion: string;
      physicsCompliance: number;
      driftScore: number;
    };
  } {
    return {
      ensembleWeights: { ...this.ensembleWeights },
      modelPerformance: new Map(this.hybridModelPerformance),
      physicsServiceStatus: this.getPhysicsServiceStatus(),
      pinnServiceStatus: this.pinnService.getModelDiagnostics()
    };
  }

  public async simulateWithAllModels(tank: TankData): Promise<{
    mlPrediction: PredictionData;
    physicsResult: PhysicsSimulationResult | null;
    pinnPrediction: PINNPrediction[] | null;
    hybridPrediction: PhysicsInformedPredictionData;
  }> {
    const mlPrediction = this.generatePrediction(tank);
    const physicsResult = await this.getPhysicsSimulation(tank);
    const pinnPrediction = await this.getPINNPrediction(tank);
    const hybridPrediction = await this.generatePhysicsInformedPrediction(tank);

    return {
      mlPrediction,
      physicsResult,
      pinnPrediction,
      hybridPrediction
    };
  }

  public async shutdown(): Promise<void> {
    await this.physicsService.shutdown();
    this.pinnService.shutdown();
    this.physicsValidationHistory.clear();
    this.hybridModelPerformance.clear();
    this.lastPhysicsUpdate.clear();
    this.lastPINNUpdate.clear();
  }
}