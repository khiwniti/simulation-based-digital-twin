import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface LoadingStation3DProps {
  position: [number, number, number];
  isActive?: boolean;
  stationId?: string;
  loadingInProgress?: boolean;
  currentFlowRate?: number;
  onSelect?: () => void;
}

export function LoadingStation3D({ 
  position, 
  isActive = false, 
  stationId, 
  loadingInProgress = false, 
  currentFlowRate = 0, 
  onSelect 
}: LoadingStation3DProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current && isActive) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Base platform */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.2, 16]} />
        <meshStandardMaterial color={isActive ? "#4ade80" : "#6b7280"} />
      </mesh>
      
      {/* Loading arm */}
      <mesh ref={meshRef} position={[0, 1, 0]}>
        <boxGeometry args={[0.2, 2, 0.2]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Control panel */}
      <mesh position={[1.5, 0.5, 0]}>
        <boxGeometry args={[0.3, 1, 0.1]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      
      {/* Status indicator */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial 
          color={isActive ? "#10b981" : "#ef4444"} 
          emissive={isActive ? "#10b981" : "#ef4444"}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}