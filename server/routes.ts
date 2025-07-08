import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { SCADASimulator } from "./services/scadaSimulator";
import { TankMonitorService } from "./services/tankMonitor";
import { MLPredictionService } from "./services/mlPredictionService";
import { digitalTwinSyncService } from "./services/digitalTwinSyncService";
import { scadaProtocolService } from "./services/scadaProtocolService";
import { historianInterfaceService } from "./services/historianInterfaceService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  // Initialize services
  const scadaSimulator = new SCADASimulator();
  const tankMonitor = new TankMonitorService();
  const mlService = new MLPredictionService();

  // Initialize Digital Twin Foundation services
  try {
    await digitalTwinSyncService.initialize(io);
    await scadaProtocolService.initialize();
    
    // Register historian connections
    await historianInterfaceService.registerHistorian('main', {
      type: 'pi',
      host: process.env.PI_SERVER_HOST || 'localhost',
      port: parseInt(process.env.PI_SERVER_PORT || '443'),
      apiPath: '/piwebapi',
      authentication: {
        type: 'basic',
        username: process.env.PI_USERNAME,
        password: process.env.PI_PASSWORD
      },
      ssl: true,
      timeout: 30000
    });

    console.log('Digital Twin Foundation services initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize some Digital Twin services:', error);
    // Continue with basic functionality
  }

  // Set up SCADA callbacks
  scadaSimulator.setUpdateCallback((tanks) => {
    tankMonitor.updateTanks(tanks);

    // Broadcast tank updates to all clients
    io.emit('tankUpdate', tanks);

    // Broadcast system metrics
    const metrics = tankMonitor.getSystemMetrics();
    io.emit('systemMetrics', metrics);

    // Broadcast enhanced system data
    io.emit('hotOilSystemUpdate', scadaSimulator.getHotOilSystem());
    io.emit('loadingStationsUpdate', scadaSimulator.getLoadingStations());
    io.emit('systemOverviewUpdate', scadaSimulator.getSystemOverview());
    io.emit('pipeNetworksUpdate', scadaSimulator.getPipeNetworks());
    io.emit('pipeFlowUpdate', scadaSimulator.getPipeFlowCalculations());

    // Broadcast pipe alarms if any
    const pipeAlarms = scadaSimulator.getPipeAlarms().filter(alarm => !alarm.acknowledged);
    if (pipeAlarms.length > 0) {
      io.emit('pipeAlarmsUpdate', pipeAlarms);
    }

    // Broadcast SCADA sensor data and alarms
    io.emit('scadaSensorDataUpdate', scadaSimulator.getSCADASensorData());
    const scadaAlarms = scadaSimulator.getSCADAAlarms().filter((alarm: any) => !alarm.acknowledged);
    if (scadaAlarms.length > 0) {
      io.emit('scadaAlarmsUpdate', scadaAlarms);
    }
    io.emit('scadaSensorReportUpdate', scadaSimulator.getSCADASensorReport());

    // Broadcast asphalt flow simulation data
    io.emit('asphaltFlowStateUpdate', scadaSimulator.getAsphaltFlowState());
    io.emit('asphaltFlowEfficiencyUpdate', { efficiency: scadaSimulator.getAsphaltFlowEfficiency() });

    // Broadcast thermal simulation data
    io.emit('coilThermalStatesUpdate', scadaSimulator.getCoilThermalStates());

    // Broadcast boiler simulation data
    io.emit('boilerStateUpdate', scadaSimulator.getBoilerSimulationState());
    const boilerAlarms = scadaSimulator.getBoilerAlarms();
    const activeBoilerAlarms = Object.entries(boilerAlarms).filter(([_, active]) => active);
    if (activeBoilerAlarms.length > 0) {
      io.emit('boilerAlarmsUpdate', boilerAlarms);
    }
    io.emit('boilerPerformanceUpdate', scadaSimulator.getBoilerPerformanceMetrics());

    // Broadcast loading station operations data
    io.emit('loadingStationOperationsUpdate', scadaSimulator.getLoadingStationOperations());

    // Broadcast thermal dynamics data
    io.emit('thermalDynamicsUpdate', scadaSimulator.getThermalDynamicsState());
    io.emit('ambientConditionsUpdate', scadaSimulator.getAmbientConditions());
  });

  scadaSimulator.setAlertCallback((alert) => {
    // Broadcast alert to all clients
    io.emit('newAlert', alert);
  });

  // Start simulation
  scadaSimulator.startSimulation();

  // API Routes
  app.get('/api/tanks', (req, res) => {
    res.json(scadaSimulator.getTanks());
  });

  app.get('/api/metrics', (req, res) => {
    res.json(tankMonitor.getSystemMetrics());
  });

  app.get('/api/report', (req, res) => {
    res.json(tankMonitor.generateReport());
  });

  // Hot-oil system API routes
  app.get('/api/hot-oil-system', (req, res) => {
    res.json(scadaSimulator.getHotOilSystem());
  });

  // Loading stations API routes
  app.get('/api/loading-stations', (req, res) => {
    res.json(scadaSimulator.getLoadingStations());
  });

  // System overview API route
  app.get('/api/system-overview', (req, res) => {
    res.json(scadaSimulator.getSystemOverview());
  });

  // Pipe routing API routes
  app.get('/api/pipe-networks', (req, res) => {
    res.json(scadaSimulator.getPipeNetworks());
  });

  app.get('/api/pipe-flow-calculations', (req, res) => {
    res.json(scadaSimulator.getPipeFlowCalculations());
  });

  app.get('/api/pipe-alarms', (req, res) => {
    res.json(scadaSimulator.getPipeAlarms());
  });

  app.post('/api/pipe-alarms/:alarmId/acknowledge', (req, res) => {
    const { alarmId } = req.params;
    const success = scadaSimulator.acknowledgePipeAlarm(alarmId);
    res.json({ success, alarmId });
  });

  // SCADA sensor mapping API routes
  app.get('/api/scada-sensors', (req, res) => {
    const { tagName } = req.query;
    res.json(scadaSimulator.getSCADASensorData(tagName as string));
  });

  app.get('/api/scada-alarms', (req, res) => {
    res.json(scadaSimulator.getSCADAAlarms());
  });

  app.post('/api/scada-alarms/:alarmId/acknowledge', (req, res) => {
    const { alarmId } = req.params;
    const { acknowledgedBy } = req.body;
    const success = scadaSimulator.acknowledgeSCADAAlarm(alarmId, acknowledgedBy || 'operator');
    res.json({ success, alarmId, acknowledgedBy });
  });

  app.get('/api/scada-sensor-mappings', (req, res) => {
    res.json(scadaSimulator.getSCADASensorMappings());
  });

  app.get('/api/scada-tag-groups', (req, res) => {
    res.json(scadaSimulator.getSCADATagGroups());
  });

  app.get('/api/scada-sensor-report', (req, res) => {
    res.json(scadaSimulator.getSCADASensorReport());
  });

  // Hot-oil physics API routes
  app.get('/api/hot-oil-physics', (req, res) => {
    res.json(scadaSimulator.getHotOilPhysicsState());
  });

  app.get('/api/energy-balance', (req, res) => {
    res.json(scadaSimulator.getSystemEnergyBalance());
  });

  app.get('/api/system-efficiency', (req, res) => {
    res.json({ efficiency: scadaSimulator.getSystemEfficiency() });
  });

  app.post('/api/pump-control/:pumpId', (req, res) => {
    const { pumpId } = req.params;
    const { speed } = req.body;
    const success = scadaSimulator.setPumpSpeed(pumpId, speed);
    res.json({ success, pumpId, speed });
  });

  app.post('/api/valve-control/:valveId', (req, res) => {
    const { valveId } = req.params;
    const { position } = req.body;
    const success = scadaSimulator.setValvePosition(valveId, position);
    res.json({ success, valveId, position });
  });

  // Thermal simulation API routes
  app.get('/api/coil-thermal-states', (req, res) => {
    res.json(scadaSimulator.getCoilThermalStates());
  });

  app.get('/api/coil-thermal-state/:tankId', (req, res) => {
    const tankId = parseInt(req.params.tankId);
    const thermalState = scadaSimulator.getCoilThermalState(tankId);
    if (thermalState) {
      res.json(thermalState);
    } else {
      res.status(404).json({ error: 'Tank not found' });
    }
  });

  app.post('/api/optimize-coil-flow/:tankId', (req, res) => {
    const tankId = parseInt(req.params.tankId);
    const { targetHeatTransfer } = req.body;
    const optimalFlowRate = scadaSimulator.optimizeCoilFlowRate(tankId, targetHeatTransfer);
    res.json({ tankId, targetHeatTransfer, optimalFlowRate });
  });

  // Asphalt flow simulation API routes
  app.get('/api/asphalt-flow-state', (req, res) => {
    res.json(scadaSimulator.getAsphaltFlowState());
  });

  app.get('/api/asphalt-properties', (req, res) => {
    res.json(scadaSimulator.getAsphaltProperties());
  });

  app.get('/api/asphalt-flow-efficiency', (req, res) => {
    res.json({ efficiency: scadaSimulator.getAsphaltFlowEfficiency() });
  });

  app.post('/api/asphalt-valve-control/:valveId', (req, res) => {
    const { valveId } = req.params;
    const { position } = req.body;
    const success = scadaSimulator.setAsphaltValvePosition(valveId, position);
    res.json({ success, valveId, position });
  });

  app.post('/api/asphalt-pump-control/:pumpId', (req, res) => {
    const { pumpId } = req.params;
    const { speed } = req.body;
    const success = scadaSimulator.setAsphaltPumpSpeed(pumpId, speed);
    res.json({ success, pumpId, speed });
  });

  app.post('/api/optimize-asphalt-temperature', (req, res) => {
    const { targetViscosity } = req.body;
    const optimalTemperature = scadaSimulator.calculateOptimalAsphaltTemperature(targetViscosity);
    res.json({ targetViscosity, optimalTemperature });
  });

  // Boiler simulation API routes
  app.get('/api/boiler-state', (req, res) => {
    res.json(scadaSimulator.getBoilerSimulationState());
  });

  app.get('/api/boiler-alarms', (req, res) => {
    res.json(scadaSimulator.getBoilerAlarms());
  });

  app.get('/api/boiler-specifications', (req, res) => {
    res.json(scadaSimulator.getBoilerSpecifications());
  });

  app.get('/api/boiler-performance', (req, res) => {
    res.json(scadaSimulator.getBoilerPerformanceMetrics());
  });

  app.post('/api/boiler-setpoint', (req, res) => {
    const { setpoint } = req.body;
    const success = scadaSimulator.setBoilerTemperatureSetpoint(setpoint);
    res.json({ success, setpoint });
  });

  app.post('/api/boiler-acknowledge-alarm/:alarmType', (req, res) => {
    const { alarmType } = req.params;
    const success = scadaSimulator.acknowledgeBoilerAlarm(alarmType);
    res.json({ success, alarmType });
  });

  app.post('/api/boiler-emergency-shutdown', (req, res) => {
    scadaSimulator.emergencyShutdownBoiler();
    res.json({ success: true, message: 'Emergency shutdown activated' });
  });

  app.post('/api/boiler-reset-emergency', (req, res) => {
    const success = scadaSimulator.resetBoilerEmergencyShutdown();
    res.json({ success, message: success ? 'Emergency reset successful' : 'Emergency reset failed' });
  });

  // Loading station operations API routes
  app.get('/api/loading-station-operations', (req, res) => {
    res.json(scadaSimulator.getLoadingStationOperations());
  });

  app.get('/api/loading-station-operation/:stationId', (req, res) => {
    const { stationId } = req.params;
    const operation = scadaSimulator.getLoadingStationOperation(stationId);
    if (operation) {
      res.json(operation);
    } else {
      res.status(404).json({ error: 'Loading station not found' });
    }
  });

  app.get('/api/loading-station-metrics/:stationId', (req, res) => {
    const { stationId } = req.params;
    const metrics = scadaSimulator.getLoadingStationMetrics(stationId);
    if (metrics) {
      res.json(metrics);
    } else {
      res.status(404).json({ error: 'Loading station not found' });
    }
  });

  app.post('/api/start-loading-sequence/:stationId', (req, res) => {
    const { stationId } = req.params;
    const { truck, operatorId } = req.body;
    const sequence = scadaSimulator.startLoadingSequence(stationId, truck, operatorId);
    if (sequence) {
      res.json(sequence);
    } else {
      res.status(400).json({ error: 'Failed to start loading sequence' });
    }
  });

  app.post('/api/loading-station-acknowledge-emergency/:stationId', (req, res) => {
    const { stationId } = req.params;
    const { emergencyId } = req.body;
    const success = scadaSimulator.acknowledgeLoadingStationEmergency(stationId, emergencyId || 'emergency-001');
    res.json({ success, stationId, emergencyId });
  });

  app.post('/api/loading-station-reset/:stationId', (req, res) => {
    const { stationId } = req.params;
    scadaSimulator.resetLoadingStation(stationId);
    res.json({ success: true, stationId, message: 'Loading station reset' });
  });

  // Thermal dynamics API routes
  app.get('/api/thermal-dynamics', (req, res) => {
    res.json(scadaSimulator.getThermalDynamicsState());
  });

  app.get('/api/thermal-dynamics/:tankId', (req, res) => {
    const tankId = parseInt(req.params.tankId);
    const thermalState = scadaSimulator.getThermalDynamicsState(tankId);
    if (thermalState) {
      res.json(thermalState);
    } else {
      res.status(404).json({ error: 'Tank not found' });
    }
  });

  app.get('/api/ambient-conditions', (req, res) => {
    res.json(scadaSimulator.getAmbientConditions());
  });

  app.get('/api/weather-history', (req, res) => {
    res.json(scadaSimulator.getWeatherHistory());
  });

  app.get('/api/tank-thermal-properties/:tankId', (req, res) => {
    const tankId = parseInt(req.params.tankId);
    const properties = scadaSimulator.getTankThermalProperties(tankId);
    if (properties) {
      res.json(properties);
    } else {
      res.status(404).json({ error: 'Tank not found' });
    }
  });

  app.post('/api/optimal-heating-strategy/:tankId', (req, res) => {
    const tankId = parseInt(req.params.tankId);
    const { targetTemperature } = req.body;
    try {
      const strategy = scadaSimulator.calculateOptimalHeatingStrategy(tankId, targetTemperature);
      res.json(strategy);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post('/api/simulate-weather-impact', (req, res) => {
    const { weatherScenario, durationHours } = req.body;
    const impact = scadaSimulator.simulateWeatherImpact(weatherScenario, durationHours);
    res.json(impact);
  });

  app.post('/api/update-ambient-conditions', (req, res) => {
    const conditions = req.body;
    scadaSimulator.updateAmbientConditionsManual(conditions);
    res.json({ success: true, conditions });
  });

  app.post('/api/tanks/:id/thresholds', (req, res) => {
    const tankId = parseInt(req.params.id);
    const thresholds = req.body;
    
    scadaSimulator.updateTankThresholds(tankId, thresholds);
    res.json({ success: true });
  });

  // ML Prediction API routes
  app.get('/api/ml/models', (req, res) => {
    res.json(mlService.getModelStatus());
  });

  app.post('/api/ml/retrain/:modelId', (req, res) => {
    const modelId = req.params.modelId;
    const success = mlService.retrain(modelId);
    res.json({ success, message: success ? 'Model retraining started' : 'Model not found' });
  });

  app.get('/api/tanks/:id/prediction', (req, res) => {
    const tankId = parseInt(req.params.id);
    const tanks = scadaSimulator.getTanks();
    const tank = tanks.find(t => t.id === tankId);
    
    if (!tank) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    
    const prediction = mlService.generatePrediction(tank);
    res.json(prediction);
  });

  app.get('/api/digital-twin/comparison/:id', (req, res) => {
    const tankId = parseInt(req.params.id);
    const tanks = scadaSimulator.getTanks();
    const tank = tanks.find(t => t.id === tankId);
    
    if (!tank) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    
    // Simulate digital twin comparison data
    const comparison = {
      realData: tank,
      twinData: { ...tank, temperature: tank.temperature + (Math.random() - 0.5) * 2 },
      variance: Math.abs(Math.random() * 3),
      syncStatus: Math.random() > 0.1 ? 'synced' : 'drift',
      lastSync: new Date()
    };
    
    res.json(comparison);
  });

  // Socket.IO event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial data
    socket.emit('tankUpdate', scadaSimulator.getTanks());
    socket.emit('systemMetrics', tankMonitor.getSystemMetrics());

    socket.on('requestTankData', () => {
      socket.emit('tankUpdate', scadaSimulator.getTanks());
      socket.emit('systemMetrics', tankMonitor.getSystemMetrics());
    });

    socket.on('acknowledgeAlert', (alertId: string) => {
      console.log('Alert acknowledged:', alertId);
      // In a real system, update alert status in database
    });

    socket.on('updateThresholds', ({ tankId, thresholds }) => {
      scadaSimulator.updateTankThresholds(tankId, thresholds);
      
      // Broadcast updated tank data
      socket.emit('tankUpdate', scadaSimulator.getTanks());
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down SCADA simulation...');
    scadaSimulator.stopSimulation();
  });

  return httpServer;
}
