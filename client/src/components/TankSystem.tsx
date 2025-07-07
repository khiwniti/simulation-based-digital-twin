import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { Tank3D } from './Tank3D';
import { LoadingStation3D } from './LoadingStation3D';
import { HotOilBoiler3D } from './HotOilBoiler3D';
import { PipeRouting3D } from './PipeRouting3D';
import { HeatingCoil3D } from './HeatingCoil3D';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { socketManager } from '@/lib/socket';

export function TankSystem() {
  const { tanks, selectedTank, setSelectedTank, setTanks, setConnectionStatus } = useTankSystem();
  const controlsRef = useRef();
  const [loadingStations, setLoadingStations] = useState([
    { id: 1, position: [8, -1, -10] as [number, number, number], isActive: true, loadingInProgress: false, currentFlowRate: 0 },
    { id: 2, position: [8, -1, -18] as [number, number, number], isActive: true, loadingInProgress: false, currentFlowRate: 0 }
  ]);

  const [boilerState, setBoilerState] = useState({
    isRunning: true,
    temperature: 280,
    efficiency: 85,
    fuelFlow: 150
  });

  const [showPipeFlow, setShowPipeFlow] = useState(true);
  const [showPipeLabels, setShowPipeLabels] = useState(false);
  const [showInsulation, setShowInsulation] = useState(true);
  const [showHeatingCoils, setShowHeatingCoils] = useState(true);
  const [showThermalGradient, setShowThermalGradient] = useState(false);
  const [selectedPipeId, setSelectedPipeId] = useState<string | undefined>();

  // Enhanced pipe routing based on real plant layout
  const pipeSegments = useMemo(() => [
    // Hot-oil supply main line
    {
      id: 'HO-MAIN-SUPPLY',
      type: 'hot_oil' as const,
      startPosition: [-15, -1, 15] as [number, number, number],
      endPosition: [15, -1, 15] as [number, number, number],
      controlPoints: [
        [-10, -1, 15] as [number, number, number],
        [0, -1, 12] as [number, number, number],
        [10, -1, 15] as [number, number, number]
      ],
      diameter: 0.3,
      isActive: boilerState.isRunning,
      flowRate: 1000,
      temperature: boilerState.temperature,
      pressure: 4.5
    },
    // Hot-oil return line
    {
      id: 'HO-MAIN-RETURN',
      type: 'hot_oil' as const,
      startPosition: [15, -1.2, -15] as [number, number, number],
      endPosition: [-15, -1.2, 15] as [number, number, number],
      controlPoints: [
        [10, -1.2, -10] as [number, number, number],
        [0, -1.2, -5] as [number, number, number],
        [-10, -1.2, 10] as [number, number, number]
      ],
      diameter: 0.3,
      isActive: boilerState.isRunning,
      flowRate: 950,
      temperature: boilerState.temperature - 20,
      pressure: 2.5
    },
    // Asphalt main distribution
    {
      id: 'ASP-MAIN-HEADER',
      type: 'asphalt' as const,
      startPosition: [-5, -1.4, 0] as [number, number, number],
      endPosition: [15, -1.4, 0] as [number, number, number],
      diameter: 0.2,
      isActive: true,
      flowRate: 600,
      temperature: 150,
      pressure: 3.5
    },
    // Asphalt to loading station 1
    {
      id: 'ASP-LOADING-01',
      type: 'asphalt' as const,
      startPosition: [8, -1.4, 0] as [number, number, number],
      endPosition: [8, -1.4, -10] as [number, number, number],
      controlPoints: [
        [8, -1.4, -5] as [number, number, number]
      ],
      diameter: 0.15,
      isActive: loadingStations[0]?.isActive || false,
      flowRate: loadingStations[0]?.currentFlowRate || 0,
      temperature: 150,
      pressure: 2.5
    },
    // Asphalt to loading station 2
    {
      id: 'ASP-LOADING-02',
      type: 'asphalt' as const,
      startPosition: [8, -1.4, -10] as [number, number, number],
      endPosition: [8, -1.4, -18] as [number, number, number],
      diameter: 0.15,
      isActive: loadingStations[1]?.isActive || false,
      flowRate: loadingStations[1]?.currentFlowRate || 0,
      temperature: 150,
      pressure: 2.5
    },
    // Fuel supply to boiler
    {
      id: 'FUEL-SUPPLY',
      type: 'fuel' as const,
      startPosition: [-25, -1.6, 10] as [number, number, number],
      endPosition: [-18, -1.6, 15] as [number, number, number],
      diameter: 0.1,
      isActive: boilerState.isRunning,
      flowRate: boilerState.fuelFlow,
      temperature: 20,
      pressure: 1.5
    }
  ], [boilerState, loadingStations]);

  useEffect(() => {
    // Connect to WebSocket
    const socket = socketManager.connect();
    
    if (socket) {
      setConnectionStatus(true);
      
      // Listen for tank updates
      socketManager.onTankUpdate((tankData) => {
        setTanks(tankData);
      });

      // Request initial data
      socket.emit('requestTankData');
    }

    return () => {
      socketManager.disconnect();
      setConnectionStatus(false);
    };
  }, [setTanks, setConnectionStatus]);

  return (
    <div className="w-full h-full relative">
      <Canvas shadows gl={{ antialias: true, powerPreference: "high-performance" }}>
        <PerspectiveCamera
          makeDefault
          position={[20, 12, 20]}
          fov={45}
          near={0.1}
          far={1000}
        />
        
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />

        {/* Environment */}
        <Environment preset="warehouse" />

        {/* Industrial Plant Ground */}
        <mesh receiveShadow position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 60]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        
        {/* Concrete pads under tanks */}
        {tanks.map((tank) => (
          <mesh key={`pad-${tank.id}`} rotation={[-Math.PI / 2, 0, 0]} position={[tank.position[0], -1.9, tank.position[2]]} receiveShadow>
            <circleGeometry args={[2.5]} />
            <meshStandardMaterial color="#404040" />
          </mesh>
        ))}
        
        {/* Access roads */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.95, -12]} receiveShadow>
          <planeGeometry args={[60, 4]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.95, 12]} receiveShadow>
          <planeGeometry args={[60, 4]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-18, -1.95, 0]} receiveShadow>
          <planeGeometry args={[4, 40]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
        
        {/* Control building (main office) */}
        <mesh position={[15, -0.5, -8]} castShadow>
          <boxGeometry args={[6, 3, 4]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>

        {/* Hot-oil boiler building */}
        <mesh position={[-18, -0.5, 15]} castShadow>
          <boxGeometry args={[6, 4, 8]} />
          <meshStandardMaterial color="#5a5a5a" />
        </mesh>

        {/* Boiler stack */}
        <mesh position={[-18, 2, 15]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 6]} />
          <meshStandardMaterial color="#666666" />
        </mesh>

        {/* Loading station 1 canopy */}
        <mesh position={[8, 1.5, -10]} castShadow>
          <boxGeometry args={[12, 0.3, 8]} />
          <meshStandardMaterial color="#7a7a7a" transparent opacity={0.8} />
        </mesh>

        {/* Loading station 2 canopy */}
        <mesh position={[8, 1.5, -18]} castShadow>
          <boxGeometry args={[12, 0.3, 8]} />
          <meshStandardMaterial color="#7a7a7a" transparent opacity={0.8} />
        </mesh>

        {/* Loading station support pillars */}
        <mesh position={[2, 0, -10]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
        <mesh position={[14, 0, -10]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
        <mesh position={[2, 0, -18]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
        <mesh position={[14, 0, -18]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 3]} />
          <meshStandardMaterial color="#666666" />
        </mesh>

        {/* Utility building */}
        <mesh position={[-15, -1, -8]} castShadow>
          <boxGeometry args={[5, 2.5, 4]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>

        {/* Enhanced pipe routing system */}
        <PipeRouting3D
          showFlow={showPipeFlow}
          showLabels={showPipeLabels}
          showInsulation={showInsulation}
          selectedPipeId={selectedPipeId}
          onPipeSelect={setSelectedPipeId}
        />

        {/* Tank grid */}
        {tanks.map((tank) => (
          <group key={tank.id}>
            <Tank3D
              tank={tank}
              selected={selectedTank === tank.id}
              onSelect={() => setSelectedTank(tank.id)}
            />
            
            {/* Heating coils under each tank */}
            {showHeatingCoils && (
              <HeatingCoil3D
                tankId={tank.id}
                position={[tank.position[0], tank.position[1] - 2.5, tank.position[2]]}
                tankRadius={2.25}
                coilTurns={3}
                coilDiameter={1.8}
                pipeDiameter={0.05}
                temperature={tank.temperature || 150}
                flowRate={100}
                isActive={tank.status !== 'offline'}
                showLabels={showPipeLabels}
                showThermalGradient={showThermalGradient}
              />
            )}
          </group>
        ))}

        {/* Loading stations */}
        {loadingStations.map((station) => (
          <LoadingStation3D
            key={station.id}
            stationId={station.id}
            position={station.position}
            isActive={station.isActive}
            loadingInProgress={station.loadingInProgress}
            currentFlowRate={station.currentFlowRate}
            onSelect={() => console.log(`Selected loading station ${station.id}`)}
          />
        ))}

        {/* Hot-oil boiler */}
        <HotOilBoiler3D
          position={[-18, -1, 15]}
          isRunning={boilerState.isRunning}
          temperature={boilerState.temperature}
          efficiency={boilerState.efficiency}
          fuelFlow={boilerState.fuelFlow}
          onSelect={() => console.log('Selected hot-oil boiler')}
        />

        {/* Reference grid lines */}
        <gridHelper args={[60, 40, '#444444', '#333333']} position={[0, -1.99, 0]} />
      </Canvas>

      {/* 3D Controls overlay - repositioned for floating UI */}
      <div className="absolute bottom-4 left-4 industrial-card p-4 text-sm">
        <div className="metric-label mb-3">3D Navigation</div>
        <div className="space-y-1 text-gray-300">
          <div>• <span className="text-white">Mouse:</span> Rotate view</div>
          <div>• <span className="text-white">Wheel:</span> Zoom in/out</div>
          <div>• <span className="text-white">Right click:</span> Pan</div>
          <div>• <span className="text-white">Click tank:</span> Select</div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="metric-label">Pipe Visualization</div>
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              checked={showPipeFlow}
              onChange={(e) => setShowPipeFlow(e.target.checked)}
              className="rounded"
            />
            <span>Show Flow</span>
          </label>
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              checked={showPipeLabels}
              onChange={(e) => setShowPipeLabels(e.target.checked)}
              className="rounded"
            />
            <span>Show Labels</span>
          </label>
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              checked={showInsulation}
              onChange={(e) => setShowInsulation(e.target.checked)}
              className="rounded"
            />
            <span>Show Insulation</span>
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <div className="metric-label">Heating System</div>
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              checked={showHeatingCoils}
              onChange={(e) => setShowHeatingCoils(e.target.checked)}
              className="rounded"
            />
            <span>Show Heating Coils</span>
          </label>
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              checked={showThermalGradient}
              onChange={(e) => setShowThermalGradient(e.target.checked)}
              className="rounded"
            />
            <span>Thermal Gradient</span>
          </label>
        </div>
      </div>

      {/* Mini-map */}
      <div className="absolute bottom-4 right-4 w-36 h-36 industrial-card p-3">
        <div className="metric-label mb-2">Tank Layout</div>
        <div className="grid grid-cols-3 gap-1.5 h-full">
          {tanks.map((tank) => (
            <div
              key={tank.id}
              className={`rounded border-2 cursor-pointer transition-all duration-200 ${
                selectedTank === tank.id 
                  ? 'bg-blue-500 border-blue-300 scale-105 shadow-lg' 
                  : tank.status === 'critical' 
                    ? 'bg-red-500 border-red-300 hover:scale-105'
                    : tank.status === 'warning'
                      ? 'bg-yellow-500 border-yellow-300 hover:scale-105'
                      : 'bg-green-500 border-green-300 hover:scale-105'
              }`}
              onClick={() => setSelectedTank(tank.id)}
              title={`${tank.name} - ${tank.status}`}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-xs font-bold font-mono">{tank.id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
