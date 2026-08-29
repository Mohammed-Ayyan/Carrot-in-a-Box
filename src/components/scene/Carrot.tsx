import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CarrotProps {
  isPeeking: boolean;
  isRevealed: boolean;
  position?: [number, number, number];
}

export const Carrot: React.FC<CarrotProps> = ({ isPeeking, isRevealed, position = [0, 0.02, 0] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const animProgress = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isRevealed) {
      // During REVEAL phase: Carrot POPS OUT / FLOATS UP out of the box with gentle spin & bounce
      animProgress.current = Math.min(1, animProgress.current + delta * 2.8);

      const floatY = position[1] + animProgress.current * 0.38 + Math.sin(state.clock.elapsedTime * 3) * 0.03;
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, floatY, delta * 8);

      // Gentle spin
      groupRef.current.rotation.y += delta * 1.5;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.08;
    } else {
      // During PEEKING phase: Carrot sits STATIONARY inside box on felt floor with 0 float
      animProgress.current = 0;
      groupRef.current.position.y = position[1];
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.y = Math.PI / 2; // Resting horizontally in box
      groupRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={isRevealed ? [0.85, 0.85, 0.85] : [0.7, 0.7, 0.7]}>
      {/* Carrot Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.015, 0.38, 16, 8]} />
        <meshStandardMaterial
          color="#ea580c"
          roughness={0.4}
          metalness={0.1}
          emissive="#f97316"
          emissiveIntensity={isRevealed ? 0.2 : 0.0}
        />
      </mesh>

      {/* Carrot Top Tip */}
      <mesh position={[0, 0.19, 0]} castShadow>
        <sphereGeometry args={[0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} />
      </mesh>

      {/* Rings / Ridges */}
      {[0.05, 0.10, 0.15].map((yPos, i) => (
        <mesh key={i} position={[0, yPos, 0]}>
          <torusGeometry args={[0.05 + (0.19 - yPos) * 0.1, 0.006, 8, 16]} />
          <meshStandardMaterial color="#c2410c" roughness={0.6} />
        </mesh>
      ))}

      {/* Green Leaves */}
      <group position={[0, 0.22, 0]}>
        <mesh position={[0, 0.10, 0]} rotation={[0.1, 0, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.02, 0.2, 8]} />
          <meshStandardMaterial color="#16a34a" roughness={0.3} />
        </mesh>

        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3, Math.PI / 3, (Math.PI * 5) / 3].map((angle, i) => {
          const tilt = 0.35 + (i % 2) * 0.15;
          return (
            <group key={i} rotation={[0, angle, 0]}>
              <mesh position={[0, 0.10, 0.05]} rotation={[tilt, 0, 0]} castShadow>
                <coneGeometry args={[0.04, 0.22, 6]} />
                <meshStandardMaterial color={i % 2 === 0 ? '#22c55e' : '#15803d'} roughness={0.3} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};
