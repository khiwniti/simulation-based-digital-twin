import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3, CatmullRomCurve3, TubeGeometry, BufferGeometry, Float32BufferAttribute, Group } from 'three';
import { Line, Text, Html, Sphere, Box, Cylinder } from '@react-three/drei';

interface PipeSegment {
  id: string;
  type: 'hot_oil_supply' | 'hot_oil_return' | 'asphalt_product' | 'asphalt_loading';
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  waypoints?: [number, number, number][];
  diameter: number;
  isActive: boolean;
  flowRate: number;
  temperature: number;
  pressure: number;
  flowDirection: 'unidirectional' | 'bidirectional';
  insulated: boolean;
}

interface FlowParticle {
  id: string;
  pipeId: string;
  position: Vector3;
  t: number; // Position along curve (0-1)
  speed: number;
}

interface Valve {
  id: string;
  position: [number, number, number];
  type: 'control' | 'isolation' | 'check';
  size: number;
  isOpen: boolean;
  openPercentage: number;
}

interface PipeRouting3DProps {
  showFlow: boolean;
  showLabels: boolean;
  showInsulation: boolean;
  selectedPipeId?: string;
  onPipeSelect?: (pipeId: string) => void;
}

export function PipeRouting3D({ 
  showFlow, 
  showLabels, 
  showInsulation,
  selectedPipeId,
  onPipeSelect 
}: PipeRouting3DProps) {
  const [flowParticles, setFlowParticles] = useState<FlowParticle[]>([]);
  const pipeRefs = useRef<Map<string, Group>>(new Map());
  
  // Convert pipe configuration to segments
  const pipeSegments = useMemo(() => {
    const segments: PipeSegment[] = [];
    
    // Hot oil supply pipes
    segments.push({
      id: 'HO-MAIN-SUPPLY',
      type: 'hot_oil_supply',
      startPosition: [-12, 0, 2],
      endPosition: [-8, 1, 0],
      waypoints: [[-12, 1, 2], [-10, 1, 1], [-8, 1, 0]],
      diameter: 0.15,
      isActive: true,
      flowRate: 1000,
      temperature: 280,
      pressure: 4.5,
      flowDirection: 'unidirectional',
      insulated: true
    });
    
    // Hot oil distribution to tanks
    for (let i = 1; i <= 10; i++) {
      const tank = PLANT_LAYOUT_CONFIG.tanks.find(t => t.id === i);
      if (tank) {
        segments.push({
          id: `HO-DIST-${i.toString().padStart(2, '0')}`,
          type: 'hot_oil_supply',
          startPosition: [-8, 1, 0],
          endPosition: [tank.position[0], tank.position[1] - 2, tank.position[2]] as [number, number, number],
          waypoints: [
            [-8 + (tank.position[0] + 8) / 2, 1, tank.position[2] / 2],
            [tank.position[0], 0, tank.position[2]],
            [tank.position[0], -2, tank.position[2]]
          ],
          diameter: 0.05,
          isActive: true,
          flowRate: 100,
          temperature: 275,
          pressure: 4.2,
          flowDirection: 'unidirectional',
          insulated: true
        });
      }
    }
    
    // Hot oil return line
    segments.push({
      id: 'HO-MAIN-RETURN',
      type: 'hot_oil_return',
      startPosition: [-8, 0.5, 0],
      endPosition: [-12, 0, 2],
      waypoints: [[-8, 0.5, 0], [-10, 0.5, 1], [-12, 0.5, 2]],
      diameter: 0.15,
      isActive: true,
      flowRate: 950,
      temperature: 260,
      pressure: 3.8,
      flowDirection: 'unidirectional',
      insulated: true
    });
    
    // Asphalt main header
    segments.push({
      id: 'ASP-MAIN-HEADER',
      type: 'asphalt_product',
      startPosition: [0, 0.5, -6],
      endPosition: [8, 0.5, -8],
      waypoints: [[0, 0.5, -6], [4, 0.5, -7], [8, 0.5, -8]],
      diameter: 0.2,
      isActive: true,
      flowRate: 800,
      temperature: 150,
      pressure: 3.5,
      flowDirection: 'unidirectional',
      insulated: true
    });
    
    // Asphalt loading lines
    segments.push({
      id: 'ASP-LOADING-01',
      type: 'asphalt_loading',
      startPosition: [8, 0.5, -8],
      endPosition: [8, 0, -10],
      waypoints: [[8, 0.5, -8], [8, 0.2, -9], [8, 0, -10]],
      diameter: 0.1,
      isActive: true,
      flowRate: 400,
      temperature: 145,
      pressure: 3.2,
      flowDirection: 'unidirectional',
      insulated: true
    });
    
    return segments;
  }, []);

  // Create valves configuration
  const valves = useMemo(() => {
    const valveList: Valve[] = [
      {
        id: 'HV-HO-01',
        position: [-10, 1, 1.5],
        type: 'control',
        size: 0.15,
        isOpen: true,
        openPercentage: 85
      },
      {
        id: 'AV-ASP-MAIN-01',
        position: [2, 0.5, -6.5],
        type: 'control',
        size: 0.2,
        isOpen: true,
        openPercentage: 75
      }
    ];
    return valveList;
  }, []);

  // Initialize flow particles
  useEffect(() => {
    if (showFlow) {
      const particles: FlowParticle[] = [];
      pipeSegments.forEach((segment) => {
        if (segment.isActive && segment.flowRate > 0) {
          const particleCount = Math.ceil(segment.flowRate / 200);
          for (let i = 0; i < particleCount; i++) {
            particles.push({
              id: `${segment.id}-particle-${i}`,
              pipeId: segment.id,
              position: new Vector3(),
              t: i / particleCount,
              speed: segment.flowRate / 10000
            });
          }
        }
      });
      setFlowParticles(particles);
    } else {
      setFlowParticles([]);
    }
  }, [showFlow, pipeSegments]);

  // Animate flow particles
  useFrame((state, delta) => {
    if (showFlow && flowParticles.length > 0) {
      setFlowParticles(prevParticles => 
        prevParticles.map(particle => {
          const segment = pipeSegments.find(s => s.id === particle.pipeId);
          if (!segment) return particle;
          
          // Update position along curve
          particle.t += particle.speed * delta;
          if (particle.t > 1) particle.t = 0;
          
          // Calculate position
          const curve = createPipePath(segment);
          const newPosition = curve.getPoint(particle.t);
          
          return {
            ...particle,
            position: newPosition,
            t: particle.t
          };
        })
      );
    }
  });

  const getPipeColor = (type: string, isActive: boolean, temperature: number) => {
    if (!isActive) return '#666666';
    
    switch (type) {
      case 'hot_oil_supply':
      case 'hot_oil_return':
        // Color based on temperature
        if (temperature > 280) return '#FF6600'; // Hot orange
        if (temperature > 250) return '#FFD700'; // Gold
        return '#FFFF00'; // Yellow
      case 'asphalt_product':
      case 'asphalt_loading':
        return '#1a1a1a'; // Very dark gray/black
      default:
        return '#666666';
    }
  };

  const createPipePath = (segment: PipeSegment) => {
    const points: Vector3[] = [];
    
    // Add start point
    points.push(new Vector3(...segment.startPosition));
    
    // Add waypoints if exist
    if (segment.waypoints && segment.waypoints.length > 0) {
      segment.waypoints.forEach(wp => points.push(new Vector3(...wp)));
    }
    
    // Add end point
    points.push(new Vector3(...segment.endPosition));
    
    return new CatmullRomCurve3(points, false, 'centripetal', 0.5);
  };

  const ValveComponent = ({ valve }: { valve: Valve }) => {
    const handleClick = () => {
      console.log(`Valve ${valve.id} clicked - ${valve.openPercentage}% open`);
    };

    return (
      <group position={valve.position} onClick={handleClick}>
        {/* Valve body */}
        <Box args={[valve.size * 1.5, valve.size * 1.5, valve.size * 1.5]}>
          <meshStandardMaterial 
            color="#666666"
            roughness={0.2}
            metalness={0.9}
          />
        </Box>
        
        {/* Valve stem */}
        <Cylinder 
          args={[valve.size * 0.2, valve.size * 0.2, valve.size * 0.8, 8]}
          position={[0, valve.size * 1.2, 0]}
        >
          <meshStandardMaterial 
            color="#333333"
            roughness={0.4}
            metalness={0.8}
          />
        </Cylinder>
        
        {/* Valve handle */}
        <Cylinder 
          args={[valve.size * 0.5, valve.size * 0.5, valve.size * 0.1, 16]}
          position={[0, valve.size * 1.6, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial 
            color="#ff0000"
            roughness={0.6}
            metalness={0.5}
          />
        </Cylinder>
        
        {/* Status indicator */}
        <Sphere args={[valve.size * 0.15]} position={[0, valve.size * 2, 0]}>
          <meshStandardMaterial 
            color={valve.isOpen ? '#00ff00' : '#ff0000'}
            emissive={valve.isOpen ? '#00ff00' : '#ff0000'}
            emissiveIntensity={0.8}
          />
        </Sphere>
        
        {/* Label */}
        {showLabels && (
          <Html position={[0, valve.size * 2.5, 0]} center>
            <div style={{
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              whiteSpace: 'nowrap'
            }}>
              {valve.id} - {valve.openPercentage}%
            </div>
          </Html>
        )}
      </group>
    );
  };

  return (
    <group>
      {/* Render all pipe segments */}
      {pipeSegments.map((segment) => {
        const curve = createPipePath(segment);
        const points = curve.getPoints(50);
        const color = getPipeColor(segment.type, segment.isActive, segment.temperature);
        const isSelected = selectedPipeId === segment.id;
        
        return (
          <group 
            key={segment.id}
            ref={(ref) => {
              if (ref) pipeRefs.current.set(segment.id, ref);
            }}
            onClick={() => onPipeSelect?.(segment.id)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            {/* Main pipe */}
            <mesh>
              <tubeGeometry args={[curve, 64, segment.diameter / 2, 16, false]} />
              <meshStandardMaterial 
                color={isSelected ? '#00ffff' : color}
                emissive={segment.isActive ? color : '#000000'}
                emissiveIntensity={segment.isActive ? (isSelected ? 0.3 : 0.1) : 0}
                roughness={0.3}
                metalness={0.7}
              />
            </mesh>

            {/* Pipe insulation */}
            {segment.insulated && showInsulation && (
              <mesh>
                <tubeGeometry args={[curve, 64, (segment.diameter / 2) + 0.05, 16, false]} />
                <meshStandardMaterial 
                  color="#888888"
                  transparent
                  opacity={0.3}
                  roughness={0.8}
                  metalness={0.2}
                />
              </mesh>
            )}

            {/* Flow direction indicators */}
            {segment.isActive && showFlow && segment.flowDirection === 'unidirectional' && (
              <group>
                {points.filter((_, index) => index % 10 === 0 && index < points.length - 1).map((point, index) => {
                  const nextPoint = points[index * 10 + 1];
                  const direction = nextPoint.clone().sub(point).normalize();
                  
                  return (
                    <mesh 
                      key={`arrow-${index}`}
                      position={point}
                      ref={(mesh) => {
                        if (mesh) {
                          mesh.lookAt(nextPoint);
                        }
                      }}
                    >
                      <coneGeometry args={[segment.diameter * 0.8, segment.diameter * 2, 8]} />
                      <meshStandardMaterial 
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.5}
                      />
                    </mesh>
                  );
                })}
              </group>
            )}

            {/* Pipe supports */}
            {points.filter((_, index) => index % 20 === 0).map((point, index) => {
              if (point.y > -1) { // Only for elevated pipes
                return (
                  <Cylinder 
                    key={`support-${index}`}
                    args={[0.05, 0.05, Math.abs(point.y) + 0.5, 6]}
                    position={[point.x, -Math.abs(point.y) / 2 - 0.25, point.z]}
                  >
                    <meshStandardMaterial 
                      color="#444444"
                      roughness={0.6}
                      metalness={0.8}
                    />
                  </Cylinder>
                );
              }
              return null;
            })}

            {/* Pipe label */}
            {showLabels && (
              <Html
                position={[
                  (segment.startPosition[0] + segment.endPosition[0]) / 2,
                  (segment.startPosition[1] + segment.endPosition[1]) / 2 + 0.5,
                  (segment.startPosition[2] + segment.endPosition[2]) / 2
                ]}
                center
              >
                <div style={{
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: isSelected ? '2px solid #00ffff' : 'none'
                }}>
                  <div>{segment.id}</div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>
                    {segment.flowRate} L/min | {segment.temperature}°C | {segment.pressure} bar
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Render valves */}
      {valves.map(valve => (
        <ValveComponent key={valve.id} valve={valve} />
      ))}

      {/* Render flow particles */}
      {showFlow && flowParticles.map((particle) => {
        const segment = pipeSegments.find(s => s.id === particle.pipeId);
        if (!segment) return null;
        
        const color = getPipeColor(segment.type, segment.isActive, segment.temperature);
        
        return (
          <Sphere 
            key={particle.id}
            args={[segment.diameter * 0.4, 8, 8]}
            position={particle.position}
          >
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={0.8}
              transparent
              opacity={0.8}
            />
          </Sphere>
        );
      })}

      {/* Pipe legend */}
      {showLabels && (
        <group position={[15, 3, -15]}>
          <Box args={[5, 3.5, 0.1]}>
            <meshStandardMaterial 
              color="#000000"
              transparent
              opacity={0.8}
            />
          </Box>
          
          <Text
            position={[0, 1.5, 0.1]}
            fontSize={0.3}
            color="white"
            anchorX="center"
          >
            Pipe Network Legend
          </Text>
          
          {/* Hot oil supply */}
          <Cylinder 
            args={[0.05, 0.05, 0.5, 8]}
            position={[-1.5, 0.8, 0.1]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <meshStandardMaterial color="#FFD700" />
          </Cylinder>
          <Text
            position={[-0.5, 0.8, 0.1]}
            fontSize={0.2}
            color="white"
            anchorX="left"
          >
            Hot Oil Supply
          </Text>
          
          {/* Hot oil return */}
          <Cylinder 
            args={[0.05, 0.05, 0.5, 8]}
            position={[-1.5, 0.3, 0.1]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <meshStandardMaterial color="#FFA500" />
          </Cylinder>
          <Text
            position={[-0.5, 0.3, 0.1]}
            fontSize={0.2}
            color="white"
            anchorX="left"
          >
            Hot Oil Return
          </Text>
          
          {/* Asphalt product */}
          <Cylinder 
            args={[0.05, 0.05, 0.5, 8]}
            position={[-1.5, -0.2, 0.1]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <meshStandardMaterial color="#1a1a1a" />
          </Cylinder>
          <Text
            position={[-0.5, -0.2, 0.1]}
            fontSize={0.2}
            color="white"
            anchorX="left"
          >
            Asphalt Product
          </Text>
          
          {/* Flow indicators */}
          <Text
            position={[0, -0.8, 0.1]}
            fontSize={0.15}
            color="white"
            anchorX="center"
          >
            Flow Rate: Size of particles
          </Text>
          <Text
            position={[0, -1.1, 0.1]}
            fontSize={0.15}
            color="white"
            anchorX="center"
          >
            Temperature: Color intensity
          </Text>
        </group>
      )}
    </group>
  );
}

// Import placeholder for missing config files
const PLANT_LAYOUT_CONFIG = {
  tanks: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    position: [
      (i % 4) * 4 - 6,
      0,
      Math.floor(i / 4) * -4 - 4
    ] as [number, number, number]
  }))
};