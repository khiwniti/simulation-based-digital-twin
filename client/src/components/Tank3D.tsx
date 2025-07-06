import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color } from 'three';
import { Text } from '@react-three/drei';
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

      {/* Boiler system (simplified) */}
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
      </group>
    </group>
  );
}
