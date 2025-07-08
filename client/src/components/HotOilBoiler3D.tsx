import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface HotOilBoiler3DProps {
  position: [number, number, number];
  temperature?: number;
  isActive?: boolean;
  boilerId?: string;
}

export function HotOilBoiler3D({ position, temperature = 120, isActive = false, boilerId }: HotOilBoiler3DProps) {
  const flameRef = useRef<Mesh>(null);
  const steamRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (flameRef.current && isActive) {
      flameRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
    }
    if (steamRef.current && isActive) {
      steamRef.current.position.y = 3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const getTemperatureColor = (temp: number) => {
    if (temp < 100) return "#3b82f6"; // Blue
    if (temp < 150) return "#10b981"; // Green
    if (temp < 200) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  return (
    <group position={position}>
      {/* Main boiler body */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 3, 16]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      
      {/* Temperature indicator */}
      <mesh position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
        <meshStandardMaterial 
          color={getTemperatureColor(temperature)}
          emissive={getTemperatureColor(temperature)}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Flame (when active) */}
      {isActive && (
        <mesh ref={flameRef} position={[0, -0.5, 0]}>
          <coneGeometry args={[0.3, 1, 8]} />
          <meshStandardMaterial 
            color="#ff6b35"
            emissive="#ff6b35"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Steam/vapor */}
      {isActive && (
        <mesh ref={steamRef} position={[0, 3, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial 
            color="#ffffff"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Control valves */}
      <mesh position={[1.8, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      
      <mesh position={[-1.8, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      
      {/* Base */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[2, 2, 0.3, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  );
}