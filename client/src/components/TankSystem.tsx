import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Tank3D } from './Tank3D';
import { useTankSystem } from '@/lib/stores/useTankSystem';
import { socketManager } from '@/lib/socket';

export function TankSystem() {
  const { tanks, selectedTank, setSelectedTank, setTanks, setConnectionStatus } = useTankSystem();
  const controlsRef = useRef();

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
          position={[15, 10, 15]}
          fov={50}
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

        {/* Ground plane */}
        <mesh receiveShadow position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>

        {/* Tank grid */}
        {tanks.map((tank) => (
          <Tank3D
            key={tank.id}
            tank={tank}
            selected={selectedTank === tank.id}
            onSelect={() => setSelectedTank(tank.id)}
          />
        ))}

        {/* Reference grid lines */}
        <gridHelper args={[30, 30, '#444444', '#333333']} position={[0, -1.99, 0]} />
      </Canvas>

      {/* 3D Controls overlay - repositioned for floating UI */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-sm backdrop-blur-sm border border-gray-600">
        <div className="font-semibold mb-2">3D Controls</div>
        <div>• Mouse: Rotate view</div>
        <div>• Wheel: Zoom in/out</div>
        <div>• Right click: Pan</div>
        <div>• Click tank: Select</div>
      </div>

      {/* Mini-map */}
      <div className="absolute bottom-4 right-4 w-32 h-32 bg-black/70 backdrop-blur-sm border border-gray-600 rounded-lg p-2">
        <div className="text-white text-xs font-semibold mb-1">Tank Layout</div>
        <div className="grid grid-cols-3 gap-1 h-full">
          {tanks.map((tank) => (
            <div
              key={tank.id}
              className={`rounded-sm border cursor-pointer transition-colors ${
                selectedTank === tank.id 
                  ? 'bg-blue-500 border-blue-400' 
                  : tank.status === 'critical' 
                    ? 'bg-red-500 border-red-400'
                    : tank.status === 'warning'
                      ? 'bg-yellow-500 border-yellow-400'
                      : 'bg-green-500 border-green-400'
              }`}
              onClick={() => setSelectedTank(tank.id)}
              title={`${tank.name} - ${tank.status}`}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{tank.id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
