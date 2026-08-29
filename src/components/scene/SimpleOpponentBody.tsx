import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameStatus } from '../../game/types';

interface SimpleOpponentBodyProps {
  status: GameStatus;
}

/**
 * Lightweight procedural low-poly seated opponent: head, hair, torso, arms, hands.
 * No external assets. Arms reach toward the box during the opponent's peek so the
 * local player can clearly see the opponent performing the peek — without ever
 * exposing the opponent's private box contents.
 */
export const SimpleOpponentBody: React.FC<SimpleOpponentBodyProps> = ({ status }) => {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const isPeeking = status === 'PEEKING' || status === 'BLUFF';

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;

    // Arms reach forward/down toward the box while peeking, otherwise rest on lap.
    const armTargetX = isPeeking ? -0.75 : -0.25;
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, armTargetX, delta * 4);
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, armTargetX, delta * 4);
    }

    // Head dips down toward the box while peeking; subtle idle bob otherwise.
    if (headRef.current) {
      const headTargetX = isPeeking ? 0.42 : Math.sin(elapsed * 2) * 0.04;
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headTargetX, delta * 4);
    }
  });

  const skin = '#f2c9a0';
  const shirt = '#7c3aed';
  const hair = '#3b2417';

  return (
    <group>
      {/* Torso */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.34, 6, 12]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.08, 10]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>

      {/* Head + hair (pivots to look down when peeking) */}
      <group ref={headRef} position={[0, 0.98, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.15, 20, 20]} />
          <meshStandardMaterial color={skin} roughness={0.55} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 0.05, -0.01]} castShadow>
          <sphereGeometry args={[0.16, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.055, -0.01, 0.14]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
        <mesh position={[0.055, -0.01, 0.14]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
      </group>

      {/* Left arm (shoulder pivot) reaches toward box when peeking */}
      <group ref={leftArmRef} position={[-0.22, 0.82, 0]}>
        <mesh position={[0, -0.2, 0.02]} rotation={[0, 0, 0.08]} castShadow>
          <capsuleGeometry args={[0.055, 0.34, 6, 10]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.42, 0.05]} castShadow>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>

      {/* Right arm (shoulder pivot) */}
      <group ref={rightArmRef} position={[0.22, 0.82, 0]}>
        <mesh position={[0, -0.2, 0.02]} rotation={[0, 0, -0.08]} castShadow>
          <capsuleGeometry args={[0.055, 0.34, 6, 10]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.42, 0.05]} castShadow>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
      </group>

      {/* Lap / seated thighs */}
      <mesh position={[0, 0.4, 0.12]} rotation={[Math.PI / 2.2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.22, 6, 10]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
    </group>
  );
};
