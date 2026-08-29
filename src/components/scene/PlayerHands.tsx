import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { GameStatus } from '../../game/types';

interface PlayerHandsProps {
  isPeeking?: boolean;
  status?: GameStatus;
}

export const PlayerHands: React.FC<PlayerHandsProps> = ({ isPeeking, status }) => {
  const handsGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (handsGroupRef.current) {
      // Idle breathing motion for player hands
      const idleY = Math.sin(state.clock.elapsedTime * 2) * 0.005;
      
      const isSwapping = status === 'SWAPPING';

      // When standing up to peek or swapping boxes, hands press forward/reach across table
      let targetY = idleY;
      let targetZ = 0;
      let targetRotX = 0;

      if (isPeeking) {
        targetY = 0.08;
        targetZ = -0.22;
        targetRotX = -0.15;
      } else if (isSwapping) {
        targetY = 0.06;
        targetZ = -0.32;
        targetRotX = -0.22;
      }

      handsGroupRef.current.position.y = THREE.MathUtils.lerp(
        handsGroupRef.current.position.y,
        targetY,
        delta * 5
      );
      handsGroupRef.current.position.z = THREE.MathUtils.lerp(
        handsGroupRef.current.position.z,
        targetZ,
        delta * 5
      );
      handsGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        handsGroupRef.current.rotation.x,
        targetRotX,
        delta * 5
      );
    }
  });

  return (
    <group ref={handsGroupRef} position={[0, 0.95, 0.95]}>
      {/* Left Arm / Sleeve & Hand */}
      <group position={[-0.32, 0, 0]} rotation={[-0.25, 0.15, 0]}>
        {/* Sleeve (Blue Hoodie) */}
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.075, 0.45, 12]} />
          <meshStandardMaterial color="#2563eb" roughness={0.6} />
        </mesh>
        {/* Hand */}
        <mesh position={[0.02, 0.01, -0.05]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.12]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.5} />
        </mesh>
        {/* Fingers */}
        <mesh position={[0.02, 0.005, -0.12]} castShadow>
          <boxGeometry args={[0.075, 0.03, 0.05]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.5} />
        </mesh>
      </group>

      {/* Right Arm / Sleeve & Hand */}
      <group position={[0.32, 0, 0]} rotation={[-0.25, -0.15, 0]}>
        {/* Sleeve (Blue Hoodie) */}
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.075, 0.45, 12]} />
          <meshStandardMaterial color="#2563eb" roughness={0.6} />
        </mesh>
        {/* Hand */}
        <mesh position={[-0.02, 0.01, -0.05]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.12]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.5} />
        </mesh>
        {/* Fingers */}
        <mesh position={[-0.02, 0.005, -0.12]} castShadow>
          <boxGeometry args={[0.075, 0.03, 0.05]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};
