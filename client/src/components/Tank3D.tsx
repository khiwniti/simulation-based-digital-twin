import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color } from 'three';
import { Text, Html } from '@react-three/drei';
import { TankData } from '@shared/types';

interface Tank3DProps {
  tank: TankData;
  selected: boolean;
  onSelect: () => void;
}

export function Tank3D({ tank, selected, onSelect }: Tank3DProps) {
  const meshRef = useRef<Mesh>(null);
  const liquidRef = useRef<Mesh>(null);
  
  // Calculate colors based on temperature and status
  const tankColor = useMemo(() => {
    switch (tank.status) {
      case 'critical': return '#ff4444';
      case 'warning': return '#ffaa00';
      default: return '#4a90e2';
    }
  }, [tank.status]);

  const temperatureColor = useMemo(() => {
    const ratio = Math.min(tank.temperature / 200, 1); // Assuming max temp around 200°C
    return new Color().lerpColors(
      new Color(0x0066cc), // Cold blue
      new Color(0xff3300), // Hot red
      ratio
    );
  }, [tank.temperature]);

  // Animate selected tank
  useFrame((state) => {
    if (meshRef.current && selected) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
    
    // Animate liquid level
    if (liquidRef.current) {
      const targetScale = tank.currentLevel / tank.capacity;
      liquidRef.current.scale.y = targetScale;
      liquidRef.current.position.y = -1 + targetScale;
    }
  });

  const liquidHeight = tank.currentLevel / tank.capacity;

  return (
    <group position={tank.position}>
      {/* Main tank body */}
      <mesh
        ref={meshRef}
        onClick={onSelect}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <cylinderGeometry args={[1, 1, 2, 16]} />
        <meshStandardMaterial 
          color={tankColor}
          transparent={true}
          opacity={selected ? 0.9 : 0.7}
          emissive={selected ? tankColor : '#000000'}
          emissiveIntensity={selected ? 0.2 : 0}
        />
      </mesh>

      {/* Liquid inside tank */}
      <mesh ref={liquidRef} position={[0, -1, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 2, 16]} />
        <meshStandardMaterial 
          color={temperatureColor}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* Tank label */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {tank.name}
      </Text>

      {/* Temperature display */}
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.25}
        color={tank.status === 'critical' ? '#ff4444' : 'white'}
        anchorX="center"
        anchorY="middle"
      >
        {tank.temperature.toFixed(1)}°C
      </Text>

      {/* Status indicator */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial 
          color={tankColor}
          emissive={tankColor}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Boiler system (enhanced) */}
      <group position={[1.5, -0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial 
            color={tank.boilerStatus === 'active' ? '#ff6600' : '#666666'}
            emissive={tank.boilerStatus === 'active' ? '#ff3300' : '#000000'}
            emissiveIntensity={tank.boilerStatus === 'active' ? 0.3 : 0}
          />
        </mesh>
        
        {/* Pipe connection */}
        <mesh position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
        
        {/* Boiler efficiency indicator */}
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.15}
          color={tank.boilerStatus === 'active' ? '#00ff00' : '#ff6600'}
          anchorX="center"
          anchorY="middle"
        >
          {tank.efficiency ? `${tank.efficiency.toFixed(0)}%` : '85%'}
        </Text>
      </group>

      {/* Sensor indicators */}
      <group position={[-1.2, 0, 0]}>
        {/* Temperature sensor */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial 
            color={tank.sensors?.temperatureSensor?.status === 'online' ? '#00ff00' : '#ff0000'}
            emissive={tank.sensors?.temperatureSensor?.status === 'online' ? '#004400' : '#440000'}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        {/* Level sensor */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial 
            color={tank.sensors?.levelSensor?.status === 'online' ? '#00ff00' : '#ff0000'}
            emissive={tank.sensors?.levelSensor?.status === 'online' ? '#004400' : '#440000'}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        {/* Pressure sensor */}
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial 
            color={tank.sensors?.pressureSensor?.status === 'online' ? '#00ff00' : '#ff0000'}
            emissive={tank.sensors?.pressureSensor?.status === 'online' ? '#004400' : '#440000'}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>

      {/* ML Prediction indicator */}
      {tank.prediction && (
        <group position={[0, 2, 0]}>
          <mesh>
            <octahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial 
              color="#8b5cf6"
              emissive="#8b5cf6"
              emissiveIntensity={tank.prediction.actionConfidence * 0.5}
              transparent
              opacity={0.8}
            />
          </mesh>
          
          {/* ML confidence indicator */}
          <Text
            position={[0, 0.3, 0]}
            fontSize={0.12}
            color="#8b5cf6"
            anchorX="center"
            anchorY="middle"
          >
            AI: {(tank.prediction.actionConfidence * 100).toFixed(0)}%
          </Text>
        </group>
      )}

      {/* Data flow visualization */}
      {selected && (
        <group>
          {/* Data streams */}
          <mesh position={[-1.2, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
            <meshStandardMaterial 
              color="#00aaff"
              emissive="#0066cc"
              emissiveIntensity={0.3}
              transparent
              opacity={0.7}
            />
          </mesh>
          
          <mesh position={[0.8, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
            <meshStandardMaterial 
              color="#8b5cf6"
              emissive="#7c3aed"
              emissiveIntensity={0.3}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
