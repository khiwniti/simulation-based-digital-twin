import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, Text, Html } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Tank3D } from './Tank3D';
import { LoadingStation3D } from './LoadingStation3D';
import { HotOilBoiler3D } from './HotOilBoiler3D';
import { PipeRouting3D } from './PipeRouting3D';
import { HeatingCoil3D } from './HeatingCoil3D';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { socketManager } from '@/lib/socket';

// Enhanced interfaces for accurate plant representation
interface TankConfiguration {
  id: number;
  name: string;
  position: [number, number, number];
  dimensions: {
    diameter: number;
    height: number;
  };
  capacity: {
    total: number;
    working: number;
  };
  heatingSystem: {
    coilType: 'spiral';
    turns: number;
    diameter: number;
  };
}

interface LoadingStationConfig {
  id: number;
  name: string;
  position: [number, number, number];
  loadingBays: number;
  maxLoadingRate: number;
  connectedTanks: number[];
}

interface PipeSegmentConfig {
  id: string;
  type: 'hot_oil' | 'asphalt';
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  controlPoints?: [number, number, number][];
  diameter: number;
  isActive: boolean;
  flowRate: number;
  temperature: number;
  insulated: boolean;
  heatTraced: boolean;
}

// Tipco Asphalt Plant Configuration (Scale 1:20m)
const TIPCO_PLANT_CONFIG = {
  name: 'Tipco Asphalt Public Company Limited',
  scaleRatio: 20, // 1 unit = 20 meters
  
  // 10 tanks based on aerial view positioning
  tanks: [
    { id: 1, name: 'Tank-01', position: [-1.5, 0, 1.5] as [number, number, number], 
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 2, name: 'Tank-02', position: [0, 0, 1.5] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 3, name: 'Tank-03', position: [1.5, 0, 1.5] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 4, name: 'Tank-04', position: [3.0, 0, 1.5] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 5, name: 'Tank-05', position: [-1.5, 0, 0] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 6, name: 'Tank-06', position: [0, 0, 0] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 7, name: 'Tank-07', position: [1.5, 0, 0] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 8, name: 'Tank-08', position: [-0.75, 0, -1.5] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 9, name: 'Tank-09', position: [0.75, 0, -1.5] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } },
    { id: 10, name: 'Tank-10', position: [2.25, 0, -1.5] as [number, number, number],
      dimensions: { diameter: 1.0, height: 0.6 }, capacity: { total: 3000000, working: 2700000 },
      heatingSystem: { coilType: 'spiral' as const, turns: 3, diameter: 0.9 } }
  ],

  // Loading stations
  loadingStations: [
    { id: 1, name: 'Loading Station A', position: [4.0, 0, -0.5] as [number, number, number],
      loadingBays: 2, maxLoadingRate: 800, connectedTanks: [1,2,3,4,5,6,7,8,9,10] },
    { id: 2, name: 'Loading Station B', position: [4.0, 0, -1.5] as [number, number, number],
      loadingBays: 1, maxLoadingRate: 1000, connectedTanks: [1,2,3,4,5,6,7,8,9,10] }
  ],

  // Hot-oil heater location
  hotOilHeater: {
    position: [-3.0, 0, 0] as [number, number, number],
    capacity: 2000, // kW
    efficiency: 88
  }
};

// Enhanced Tank Component with accurate representation
function EnhancedTank3D({ 
  tank, 
  tankData, 
  isSelected, 
  onSelect, 
  showHeatingCoil = true,
  showThermalGradient = false 
}: {
  tank: TankConfiguration;
  tankData: any;
  isSelected: boolean;
  onSelect: () => void;
  showHeatingCoil?: boolean;
  showThermalGradient?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate fill level
  const fillLevel = tankData ? (tankData.currentLevel / tank.capacity.total) : 0.7;
  
  // Temperature-based color for thermal visualization
  const temperature = tankData?.temperature || 150;
  const tempColor = useMemo(() => {
    const normalizedTemp = Math.max(0, Math.min(1, (temperature - 120) / (180 - 120)));
    return new THREE.Color().setHSL(0.7 - normalizedTemp * 0.7, 0.8, 0.5);
  }, [temperature]);

  return (
    <group position={tank.position}>
      {/* Tank Shell */}
      <mesh
        ref={meshRef}
        onClick={onSelect}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[tank.dimensions.diameter/2, tank.dimensions.diameter/2, tank.dimensions.height, 32]} />
        <meshStandardMaterial 
          color={isSelected ? '#4ade80' : hovered ? '#60a5fa' : '#6b7280'}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={showThermalGradient ? 0.7 : 1.0}
        />
      </mesh>

      {/* Product Level Indicator */}
      <mesh position={[0, -tank.dimensions.height/2 + (fillLevel * tank.dimensions.height)/2, 0]}>
        <cylinderGeometry args={[tank.dimensions.diameter/2 - 0.02, tank.dimensions.diameter/2 - 0.02, fillLevel * tank.dimensions.height, 32]} />
        <meshStandardMaterial 
          color={showThermalGradient ? tempColor : '#1f2937'}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Heating Coil Visualization */}
      {showHeatingCoil && (
        <HeatingCoil3D
          coilConfig={tank.heatingSystem}
          isActive={tankData?.boilerStatus === 'active'}
          temperature={tankData?.heatingCoil?.inletTemperature || 280}
          flowRate={tankData?.heatingCoil?.flowRate || 500}
        />
      )}

      {/* Tank Label */}
      <Html position={[0, tank.dimensions.height/2 + 0.2, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {tank.name}
          {tankData && (
            <div className="text-xs">
              <div>Level: {Math.round(fillLevel * 100)}%</div>
              <div>Temp: {Math.round(temperature)}°C</div>
            </div>
          )}
        </div>
      </Html>

      {/* Selection Indicator */}
      {isSelected && (
        <mesh position={[0, tank.dimensions.height/2 + 0.1, 0]}>
          <ringGeometry args={[tank.dimensions.diameter/2 + 0.1, tank.dimensions.diameter/2 + 0.15, 32]} />
          <meshBasicMaterial color="#4ade80" />
        </mesh>
      )}

      {/* Temperature Sensors */}
      {tankData && (
        <>
          <mesh position={[tank.dimensions.diameter/2 + 0.05, tank.dimensions.height/4, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.1]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[tank.dimensions.diameter/2 + 0.05, 0, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.1]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh position={[tank.dimensions.diameter/2 + 0.05, -tank.dimensions.height/4, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.1]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </>
      )}
    </group>
  );
}

// Enhanced Hot-Oil Pipe Network
function HotOilPipeNetwork({ 
  isActive = true, 
  showFlow = true, 
  showTemperature = false 
}: {
  isActive?: boolean;
  showFlow?: boolean;
  showTemperature?: boolean;
}) {
  // Main supply header
  const supplyPipes: PipeSegmentConfig[] = [
    {
      id: 'HO-SUPPLY-MAIN',
      type: 'hot_oil',
      startPosition: [-3.0, 0.1, 0],
      endPosition: [4.0, 0.1, 2.0],
      controlPoints: [
        [-2.0, 0.1, 1.0],
        [0, 0.1, 2.0],
        [2.0, 0.1, 2.0]
      ],
      diameter: 0.15,
      isActive,
      flowRate: 2000,
      temperature: 280,
      insulated: true,
      heatTraced: true
    },
    {
      id: 'HO-RETURN-MAIN',
      type: 'hot_oil',
      startPosition: [4.0, 0.1, -2.0],
      endPosition: [-3.0, 0.1, 0],
      controlPoints: [
        [2.0, 0.1, -2.0],
        [0, 0.1, -2.0],
        [-2.0, 0.1, -1.0]
      ],
      diameter: 0.15,
      isActive,
      flowRate: 2000,
      temperature: 270,
      insulated: true,
      heatTraced: true
    }
  ];

  // Individual tank connections
  const tankConnections: PipeSegmentConfig[] = [];
  TIPCO_PLANT_CONFIG.tanks.forEach(tank => {
    // Supply to tank
    tankConnections.push({
      id: `HO-SUPPLY-T${tank.id.toString().padStart(2, '0')}`,
      type: 'hot_oil',
      startPosition: [tank.position[0], 0.1, tank.position[2] + 0.75],
      endPosition: [tank.position[0], -0.05, tank.position[2]],
      diameter: 0.08,
      isActive,
      flowRate: 200,
      temperature: 280,
      insulated: true,
      heatTraced: true
    });

    // Return from tank
    tankConnections.push({
      id: `HO-RETURN-T${tank.id.toString().padStart(2, '0')}`,
      type: 'hot_oil',
      startPosition: [tank.position[0], -0.05, tank.position[2]],
      endPosition: [tank.position[0], 0.1, tank.position[2] - 0.75],
      diameter: 0.08,
      isActive,
      flowRate: 200,
      temperature: 270,
      insulated: true,
      heatTraced: true
    });
  });

  const allPipes = [...supplyPipes, ...tankConnections];

  return (
    <group>
      {allPipes.map(pipe => (
        <PipeRouting3D
          key={pipe.id}
          id={pipe.id}
          type={pipe.type}
          startPosition={pipe.startPosition}
          endPosition={pipe.endPosition}
          controlPoints={pipe.controlPoints}
          diameter={pipe.diameter}
          isActive={pipe.isActive}
          flowRate={pipe.flowRate}
          temperature={pipe.temperature}
          showFlow={showFlow}
          showLabels={false}
          insulated={pipe.insulated}
          heatTraced={pipe.heatTraced}
        />
      ))}
    </group>
  );
}

// Enhanced Loading Station with accurate representation
function EnhancedLoadingStation3D({ 
  station, 
  isActive = true,
  loadingInProgress = false,
  currentFlowRate = 0,
  onSelect 
}: {
  station: LoadingStationConfig;
  isActive?: boolean;
  loadingInProgress?: boolean;
  currentFlowRate?: number;
  onSelect?: () => void;
}) {
  return (
    <group position={station.position}>
      {/* Loading Station Platform */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.0, 0.1, 0.8]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Loading Arms */}
      {Array.from({ length: station.loadingBays }, (_, i) => (
        <group key={i} position={[0, 0.2, -0.3 + i * 0.3]}>
          {/* Vertical Post */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
          
          {/* Horizontal Arm */}
          <mesh position={[0.3, 0.5, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
            <meshStandardMaterial color={isActive ? "#10b981" : "#6b7280"} />
          </mesh>
          
          {/* Loading Nozzle */}
          <mesh position={[0.6, 0.5, 0]}>
            <coneGeometry args={[0.03, 0.1, 8]} />
            <meshStandardMaterial color={loadingInProgress ? "#ef4444" : "#374151"} />
          </mesh>
        </group>
      ))}

      {/* Control Panel */}
      <mesh position={[0.4, 0.3, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.2]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Station Label */}
      <Html position={[0, 0.8, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs font-mono">
          {station.name}
          {loadingInProgress && (
            <div className="text-green-400">
              Loading: {currentFlowRate} L/min
            </div>
          )}
        </div>
      </Html>

      {/* Activity Indicator */}
      {loadingInProgress && (
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      )}
    </group>
  );
}

// Main Enhanced Tank System Component
export function EnhancedTankSystem3D() {
  const { tanks, selectedTank, setSelectedTank, setTanks, setConnectionStatus } = useTankSystem();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  
  // Visualization controls
  const [showHotOilPipes, setShowHotOilPipes] = useState(true);
  const [showAsphaltPipes, setShowAsphaltPipes] = useState(true);
  const [showHeatingCoils, setShowHeatingCoils] = useState(true);
  const [showThermalGradient, setShowThermalGradient] = useState(false);
  const [showPipeFlow, setShowPipeFlow] = useState(true);
  const [showLoadingOperations, setShowLoadingOperations] = useState(true);
  const [showSensorData, setShowSensorData] = useState(false);

  // Loading operations state
  const [loadingOperations, setLoadingOperations] = useState<Map<number, any>>(new Map());

  // Hot-oil system state
  const [hotOilSystemState, setHotOilSystemState] = useState({
    isRunning: true,
    circulation: 2000, // L/min
    supplyTemperature: 280, // °C
    returnTemperature: 270, // °C
    efficiency: 88 // %
  });

  // Initialize with Tipco plant configuration
  useEffect(() => {
    const initialTanks = TIPCO_PLANT_CONFIG.tanks.map(tankConfig => ({
      id: tankConfig.id,
      name: tankConfig.name,
      currentLevel: tankConfig.capacity.working * 0.7, // 70% fill
      capacity: tankConfig.capacity.total,
      temperature: 150 + Math.random() * 20, // 150-170°C
      targetTemperature: 160,
      status: 'normal' as const,
      boilerStatus: 'active' as const,
      lastUpdate: new Date(),
      // Enhanced properties
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
        bottomTemperature: 145
      },
      materialProperties: {
        viscosity: 200,
        density: 1000
      }
    }));

    setTanks(initialTanks);
  }, [setTanks]);

  // Socket connection for real-time data
  useEffect(() => {
    const handleTankUpdate = (data: any) => {
      setTanks(data.tanks || []);
      setConnectionStatus(true);
    };

    const handleLoadingUpdate = (data: any) => {
      setLoadingOperations(new Map(data.operations || []));
    };

    const handleHotOilUpdate = (data: any) => {
      setHotOilSystemState(data.hotOilSystem || hotOilSystemState);
    };

    socketManager.on('tankUpdate', handleTankUpdate);
    socketManager.on('loadingUpdate', handleLoadingUpdate);
    socketManager.on('hotOilUpdate', handleHotOilUpdate);

    return () => {
      socketManager.off('tankUpdate', handleTankUpdate);
      socketManager.off('loadingUpdate', handleLoadingUpdate);
      socketManager.off('hotOilUpdate', handleHotOilUpdate);
    };
  }, [setTanks, setConnectionStatus, hotOilSystemState]);

  // Camera controls
  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleFocusTank = (tankId: number) => {
    const tankConfig = TIPCO_PLANT_CONFIG.tanks.find(t => t.id === tankId);
    if (tankConfig && controlsRef.current) {
      controlsRef.current.setLookAt(
        tankConfig.position[0] + 2, tankConfig.position[1] + 2, tankConfig.position[2] + 2,
        tankConfig.position[0], tankConfig.position[1], tankConfig.position[2],
        true
      );
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 text-white p-4 rounded-lg space-y-2">
        <h3 className="font-bold text-sm">Tipco Asphalt Plant</h3>
        <div className="space-y-1 text-xs">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showHotOilPipes}
              onChange={(e) => setShowHotOilPipes(e.target.checked)}
              className="w-3 h-3"
            />
            <span>Hot-Oil Pipes</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showHeatingCoils}
              onChange={(e) => setShowHeatingCoils(e.target.checked)}
              className="w-3 h-3"
            />
            <span>Heating Coils</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showThermalGradient}
              onChange={(e) => setShowThermalGradient(e.target.checked)}
              className="w-3 h-3"
            />
            <span>Thermal Gradient</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showPipeFlow}
              onChange={(e) => setShowPipeFlow(e.target.checked)}
              className="w-3 h-3"
            />
            <span>Pipe Flow</span>
          </label>
        </div>
        
        <div className="border-t border-gray-600 pt-2">
          <div className="text-xs space-y-1">
            <div>Hot-Oil System:</div>
            <div className="ml-2">
              <div>Status: {hotOilSystemState.isRunning ? 'Running' : 'Stopped'}</div>
              <div>Flow: {hotOilSystemState.circulation} L/min</div>
              <div>Supply: {hotOilSystemState.supplyTemperature}°C</div>
              <div>Return: {hotOilSystemState.returnTemperature}°C</div>
            </div>
          </div>
        </div>

        <button
          onClick={handleResetView}
          className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Reset View
        </button>
      </div>

      {/* Tank Selection Panel */}
      <div className="absolute top-4 right-4 z-10 bg-black/80 text-white p-4 rounded-lg">
        <h3 className="font-bold text-sm mb-2">Tank Selection</h3>
        <div className="grid grid-cols-5 gap-1 text-xs">
          {TIPCO_PLANT_CONFIG.tanks.map(tank => {
            const tankData = tanks.find(t => t.id === tank.id);
            return (
              <button
                key={tank.id}
                onClick={() => {
                  setSelectedTank(selectedTank === tank.id ? null : tank.id);
                  handleFocusTank(tank.id);
                }}
                className={`p-1 rounded ${
                  selectedTank === tank.id 
                    ? 'bg-green-600' 
                    : tankData?.status === 'critical' 
                      ? 'bg-red-600' 
                      : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                T{tank.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Scene */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={60} />
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={20}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />

        {/* Environment */}
        <Environment preset="warehouse" />
        
        {/* Ground Grid */}
        <Grid
          position={[0, -0.1, 0]}
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#374151"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />

        {/* Plant Base Platform */}
        <mesh position={[0.75, -0.15, 0]} receiveShadow>
          <boxGeometry args={[8, 0.1, 4]} />
          <meshStandardMaterial color="#2d3748" />
        </mesh>

        {/* Tanks */}
        {TIPCO_PLANT_CONFIG.tanks.map(tankConfig => {
          const tankData = tanks.find(t => t.id === tankConfig.id);
          return (
            <EnhancedTank3D
              key={tankConfig.id}
              tank={tankConfig}
              tankData={tankData}
              isSelected={selectedTank === tankConfig.id}
              onSelect={() => setSelectedTank(selectedTank === tankConfig.id ? null : tankConfig.id)}
              showHeatingCoil={showHeatingCoils}
              showThermalGradient={showThermalGradient}
            />
          );
        })}

        {/* Hot-Oil Heater */}
        <HotOilBoiler3D
          position={TIPCO_PLANT_CONFIG.hotOilHeater.position}
          isActive={hotOilSystemState.isRunning}
          temperature={hotOilSystemState.supplyTemperature}
          efficiency={hotOilSystemState.efficiency}
          fuelFlow={150}
          onSelect={() => {}}
        />

        {/* Hot-Oil Pipe Network */}
        {showHotOilPipes && (
          <HotOilPipeNetwork
            isActive={hotOilSystemState.isRunning}
            showFlow={showPipeFlow}
            showTemperature={showThermalGradient}
          />
        )}

        {/* Loading Stations */}
        {TIPCO_PLANT_CONFIG.loadingStations.map(station => {
          const operation = loadingOperations.get(station.id);
          return (
            <EnhancedLoadingStation3D
              key={station.id}
              station={station}
              isActive={true}
              loadingInProgress={operation?.isActive || false}
              currentFlowRate={operation?.currentFlow || 0}
              onSelect={() => {}}
            />
          );
        })}

        {/* Plant Boundary */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(8, 0.1, 4)]} />
          <lineBasicMaterial color="#4ade80" />
        </lineSegments>

        {/* Coordinate System Indicator */}
        <group position={[-3.5, 0, -1.8]}>
          {/* X-axis (Red) */}
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.01, 0.01, 0.5, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Y-axis (Green) */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.5, 8]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          {/* Z-axis (Blue) */}
          <mesh position={[0, 0, 0.25]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.5, 8]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </group>
      </Canvas>
    </div>
  );
}