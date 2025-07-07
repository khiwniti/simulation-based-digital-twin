import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3, TubeGeometry, BufferGeometry, Float32BufferAttribute, Color, Group } from 'three';
import { Text, Html } from '@react-three/drei';

interface HeatingCoil3DProps {
  tankId: number;
  position: [number, number, number];
  tankRadius: number;
  coilTurns: number;
  coilDiameter: number;
  pipeDiameter: number;
  temperature: number;
  flowRate: number;
  isActive: boolean;
  showLabels: boolean;
  showThermalGradient: boolean;
}

export function HeatingCoil3D({
  tankId,
  position,
  tankRadius,
  coilTurns = 3,
  coilDiameter = 1.8,
  pipeDiameter = 0.05,
  temperature = 280,
  flowRate = 100,
  isActive = true,
  showLabels = false,
  showThermalGradient = false
}: HeatingCoil3DProps) {
  const groupRef = useRef<Group>(null);
  const heatWaveRef = useRef<number>(0);

  // Animate thermal effect
  useFrame((state, delta) => {
    if (isActive && groupRef.current) {
      heatWaveRef.current += delta * 0.5;
    }
  });

  // Generate 3-turn spiral coil path
  const coilPath = useMemo(() => {
    const points: Vector3[] = [];
    const totalPoints = 100 * coilTurns; // Points per turn
    const verticalSpacing = 0.15; // Vertical spacing between turns
    const startHeight = -verticalSpacing * (coilTurns - 1) / 2;

    for (let i = 0; i <= totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * Math.PI * 2 * coilTurns;
      const radius = (tankRadius - 0.3) * 0.9; // Slightly smaller than tank radius
      const height = startHeight + t * verticalSpacing * (coilTurns - 1);
      
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = height;
      
      points.push(new Vector3(x, y, z));
    }

    return new CatmullRomCurve3(points, false);
  }, [tankRadius, coilTurns]);

  // Get color based on temperature
  const getCoilColor = () => {
    if (!isActive) return '#444444';
    
    if (temperature > 300) return '#FF0000'; // Red - very hot
    if (temperature > 280) return '#FF6600'; // Orange - hot
    if (temperature > 250) return '#FFD700'; // Gold
    if (temperature > 200) return '#FFFF00'; // Yellow
    return '#FFA500'; // Orange - warm
  };

  // Create thermal gradient geometry
  const thermalGradientGeometry = useMemo(() => {
    if (!showThermalGradient) return null;

    const geometry = new BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    
    const rings = 20;
    const segments = 32;
    const maxRadius = tankRadius * 1.2;
    
    for (let i = 0; i < rings; i++) {
      const radius = (tankRadius - 0.3) + (maxRadius - tankRadius + 0.3) * (i / rings);
      const alpha = 1 - (i / rings);
      const tempFactor = 1 - (i / rings) * 0.7;
      
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        
        positions.push(x, -0.1, z);
        
        // Color based on temperature gradient
        const color = new Color();
        if (temperature > 250) {
          color.setHSL(0.05 - tempFactor * 0.05, 1, 0.5 + tempFactor * 0.3);
        } else {
          color.setHSL(0.1 - tempFactor * 0.05, 0.8, 0.4 + tempFactor * 0.2);
        }
        colors.push(color.r, color.g, color.b, alpha);
      }
    }
    
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 4));
    
    return geometry;
  }, [showThermalGradient, tankRadius, temperature]);

  return (
    <group ref={groupRef} position={position}>
      {/* Main heating coil */}
      <mesh>
        <tubeGeometry args={[coilPath, 128, pipeDiameter / 2, 16, false]} />
        <meshStandardMaterial 
          color={getCoilColor()}
          emissive={isActive ? getCoilColor() : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Inlet connection */}
      <mesh position={[(tankRadius - 0.3) * 0.9, -verticalSpacing * (coilTurns - 1) / 2, 0]}>
        <cylinderGeometry args={[pipeDiameter / 2 * 1.5, pipeDiameter / 2 * 1.5, 0.3, 8]} />
        <meshStandardMaterial 
          color="#666666"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Outlet connection */}
      <mesh position={[(tankRadius - 0.3) * 0.9, verticalSpacing * (coilTurns - 1) / 2, 0]}>
        <cylinderGeometry args={[pipeDiameter / 2 * 1.5, pipeDiameter / 2 * 1.5, 0.3, 8]} />
        <meshStandardMaterial 
          color="#666666"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Support brackets */}
      {[0, 120, 240].map((angle, index) => {
        const rad = (angle * Math.PI) / 180;
        const x = (tankRadius - 0.2) * Math.cos(rad);
        const z = (tankRadius - 0.2) * Math.sin(rad);
        
        return (
          <mesh key={`bracket-${index}`} position={[x, 0, z]} rotation={[0, -rad, 0]}>
            <boxGeometry args={[0.1, 0.05, 0.3]} />
            <meshStandardMaterial 
              color="#333333"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
        );
      })}

      {/* Thermal gradient visualization */}
      {showThermalGradient && thermalGradientGeometry && (
        <mesh geometry={thermalGradientGeometry}>
          <meshBasicMaterial 
            transparent
            vertexColors
            depthWrite={false}
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Flow indicators (animated) */}
      {isActive && flowRate > 0 && (
        <group>
          {[0, 1, 2].map((i) => {
            const t = (i / 3 + heatWaveRef.current * 0.1) % 1;
            const position = coilPath.getPoint(t);
            
            return (
              <mesh key={`flow-${i}`} position={position}>
                <sphereGeometry args={[pipeDiameter * 0.8, 8, 8]} />
                <meshStandardMaterial 
                  color={getCoilColor()}
                  emissive={getCoilColor()}
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Temperature indicator */}
      {showLabels && (
        <Html position={[0, 0.5, 0]} center>
          <div style={{
            background: `linear-gradient(135deg, ${getCoilColor()}, ${getCoilColor()}88)`,
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <div>Heating Coil #{tankId}</div>
            <div style={{ fontSize: '10px', marginTop: '4px' }}>
              {temperature}°C | {flowRate} L/min
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px' }}>
              {coilTurns} turns | {isActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </Html>
      )}

      {/* Efficiency indicator */}
      {isActive && (
        <mesh position={[0, -0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.2, 32]} />
          <meshStandardMaterial 
            color={temperature > 260 ? '#00ff00' : '#ffaa00'}
            emissive={temperature > 260 ? '#00ff00' : '#ffaa00'}
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Heat transfer visualization arrows */}
      {isActive && showThermalGradient && (
        <group>
          {[0, 60, 120, 180, 240, 300].map((angle, index) => {
            const rad = (angle * Math.PI) / 180;
            const startRadius = tankRadius - 0.3;
            const endRadius = tankRadius + 0.2;
            
            return (
              <group key={`heat-arrow-${index}`}>
                <mesh 
                  position={[
                    (startRadius + endRadius) / 2 * Math.cos(rad),
                    0,
                    (startRadius + endRadius) / 2 * Math.sin(rad)
                  ]}
                  rotation={[0, -rad + Math.PI / 2, 0]}
                >
                  <boxGeometry args={[0.02, 0.02, endRadius - startRadius]} />
                  <meshStandardMaterial 
                    color={getCoilColor()}
                    emissive={getCoilColor()}
                    emissiveIntensity={0.3}
                    transparent
                    opacity={0.6}
                  />
                </mesh>
                
                {/* Arrow head */}
                <mesh 
                  position={[
                    endRadius * Math.cos(rad),
                    0,
                    endRadius * Math.sin(rad)
                  ]}
                  rotation={[0, -rad + Math.PI / 2, -Math.PI / 2]}
                >
                  <coneGeometry args={[0.06, 0.12, 8]} />
                  <meshStandardMaterial 
                    color={getCoilColor()}
                    emissive={getCoilColor()}
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

// Vertical spacing constant
const verticalSpacing = 0.15;