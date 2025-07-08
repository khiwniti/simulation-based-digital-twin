import { Router } from 'express';
import { TankTwinManager, TipcoAsphaltPlantConfig } from '../services/tankTwinManager';
import { plantLayoutService } from '../services/plantLayoutService';

const router = Router();

// Initialize TankTwinManager with Tipco plant configuration
const tankTwinManager = new TankTwinManager(TipcoAsphaltPlantConfig);

/**
 * GET /api/tank-twin/status
 * Get overall system status and health
 */
router.get('/status', (req, res) => {
  try {
    const systemHealth = tankTwinManager.getSystemHealth();
    const systemMetrics = tankTwinManager.getSystemMetrics();
    const hotOilStatus = tankTwinManager.getHotOilSystemStatus();

    res.json({
      success: true,
      data: {
        health: systemHealth,
        metrics: systemMetrics,
        hotOilSystem: hotOilStatus,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tank-twin/tanks
 * Get all tank operational data
 */
router.get('/tanks', (req, res) => {
  try {
    const tankData = tankTwinManager.getTankData();
    res.json({
      success: true,
      data: tankData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tank-twin/tanks/:id
 * Get specific tank operational data
 */
router.get('/tanks/:id', (req, res) => {
  try {
    const tankId = parseInt(req.params.id);
    if (isNaN(tankId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tank ID'
      });
    }

    const tankData = tankTwinManager.getTankData(tankId);
    res.json({
      success: true,
      data: tankData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/tank-twin/tanks/:id/target-temperature
 * Set tank target temperature
 */
router.put('/tanks/:id/target-temperature', (req, res) => {
  try {
    const tankId = parseInt(req.params.id);
    const { targetTemperature } = req.body;

    if (isNaN(tankId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tank ID'
      });
    }

    if (typeof targetTemperature !== 'number' || targetTemperature < 120 || targetTemperature > 180) {
      return res.status(400).json({
        success: false,
        error: 'Target temperature must be between 120°C and 180°C'
      });
    }

    tankTwinManager.setTankTargetTemperature(tankId, targetTemperature);
    
    res.json({
      success: true,
      message: `Tank ${tankId} target temperature set to ${targetTemperature}°C`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tank-twin/plant-layout
 * Get plant layout configuration
 */
router.get('/plant-layout', (req, res) => {
  try {
    const plantConfig = tankTwinManager.getPlantConfiguration();
    const plantStats = plantLayoutService.getPlantStatistics();
    const layoutValidation = plantLayoutService.validatePlantLayout();

    res.json({
      success: true,
      data: {
        configuration: plantConfig,
        statistics: plantStats,
        validation: layoutValidation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tank-twin/reports/system
 * Generate comprehensive system report
 */
router.get('/reports/system', (req, res) => {
  try {
    const systemReport = tankTwinManager.generateSystemReport();
    res.json({
      success: true,
      data: systemReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;