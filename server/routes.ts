import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { SCADASimulator } from "./services/scadaSimulator";
import { TankMonitorService } from "./services/tankMonitor";

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

  // Set up SCADA callbacks
  scadaSimulator.setUpdateCallback((tanks) => {
    tankMonitor.updateTanks(tanks);
    
    // Broadcast tank updates to all clients
    io.emit('tankUpdate', tanks);
    
    // Broadcast system metrics
    const metrics = tankMonitor.getSystemMetrics();
    io.emit('systemMetrics', metrics);
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

  app.post('/api/tanks/:id/thresholds', (req, res) => {
    const tankId = parseInt(req.params.id);
    const thresholds = req.body;
    
    scadaSimulator.updateTankThresholds(tankId, thresholds);
    res.json({ success: true });
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
