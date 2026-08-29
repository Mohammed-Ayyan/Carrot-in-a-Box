import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameStatus, Winner } from '../../game/types';

interface OpponentAvatarProps {
  status: GameStatus;
  winner: Winner | null;
}

export const OpponentAvatar: React.FC<OpponentAvatarProps> = ({ status, winner }) => {
  const avatarGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!avatarGroupRef.current) return;

    let targetZ = -1.8;
    let targetY = 0;
    let targetRotX = 0;

    // Lean forward towards Box A during Peeking
    if (status === 'PEEKING') {
      targetZ = -1.25;
      targetY = -0.15;
      targetRotX = 0.35;
    } else if (status === 'BLUFF' || status === 'DECISION') {
      // Sit back with proud posture
      targetZ = -1.75;
      targetRotX = -0.08;
    } else if (status === 'RESULT') {
      if (winner === 'OPPONENT') {
        // Joyful slight bounce
        targetY = Math.sin(state.clock.elapsedTime * 8) * 0.05;
      } else {
        // Disappointed head tilt
        targetRotX = 0.2;
      }
    }

    avatarGroupRef.current.position.z = THREE.MathUtils.lerp(avatarGroupRef.current.position.z, targetZ, delta * 4);
    avatarGroupRef.current.position.y = THREE.MathUtils.lerp(avatarGroupRef.current.position.y, targetY, delta * 4);
    avatarGroupRef.current.rotation.x = THREE.MathUtils.lerp(avatarGroupRef.current.rotation.x, targetRotX, delta * 4);

    if (headGroupRef.current && status === 'PEEKING') {
      headGroupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.15;
    }
  });

  return (
    <group ref={avatarGroupRef} position={[0, 0, -1.8]} rotation={[0, 0, 0]}>
      {/* Torso / Jacket */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.32, 0.75, 12]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>

      {/* Collar & Tie */}
      <mesh position={[0, 1.58, 0.2]} rotation={[0.2, 0, 0]} castShadow>
        <coneGeometry args={[0.12, 0.25, 4]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>

      {/* Head Group */}
      <group ref={headGroupRef} position={[0, 1.92, 0]}>
        {/* Head Sphere */}
        <mesh castShadow>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.5} />
        </mesh>

        {/* Stylized Hair Cap */}
        <mesh position={[0, 0.12, -0.02]} castShadow>
          <sphereGeometry args={[0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
          <meshStandardMaterial color="#451a03" roughness={0.7} />
        </mesh>

        {/* Glasses Frame */}
        <mesh position={[0, 0.04, 0.24]} castShadow>
          <boxGeometry args={[0.34, 0.1, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
      </group>

      {/* Arms & Hands rested on table */}
      <mesh position={[-0.42, 1.1, 0.3]} rotation={[0.4, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.6, 8]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>
      <mesh position={[0.42, 1.1, 0.3]} rotation={[0.4, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.6, 8]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>
    </group>
  );
};
