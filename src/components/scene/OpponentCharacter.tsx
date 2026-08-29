import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameStatus, Winner } from '../../game/types';
import { SimpleOpponentBody } from './SimpleOpponentBody';

interface OpponentCharacterProps {
  status: GameStatus;
  winner: Winner | null;
}

export const OpponentCharacter: React.FC<OpponentCharacterProps> = ({ status, winner }) => {
  const characterGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;

    // 1. Procedural Breathing Motion
    const breathY = Math.sin(elapsed * 2.2) * 0.008;

    // 2. State-based Seated Posture & Upper-Torso Lean Motion (Stays Seated in Chair)
    if (characterGroupRef.current) {
      let targetZ = -1.45; // Stays seated in chair at z = -1.45
      let targetY = breathY;
      let targetRotX = 0;
      let targetRotY = 0;

      if (status === 'PEEKING' || status === 'BLUFF') {
        // OPPONENT REMAINS SEATED IN CHAIR, leaning upper torso forward over Box A to peek inside
        targetZ = -1.22;
        targetY = -0.04 + breathY;
        targetRotX = 0.24; // Upper body leans forward from seat
        targetRotY = -0.20;
      } else if (status === 'SWAPPING') {
        targetZ = -1.25;
        targetY = -0.03 + breathY;
        targetRotX = 0.20;
        targetRotY = 0.15;
      } else if (status === 'AI_THINKING' || status === 'AI_DECISION') {
        // Tilts head thoughtfully looking between boxes and player
        targetRotY = Math.sin(elapsed * 4) * 0.18;
      } else if (status === 'PLAYER_BLUFFING') {
        // Looks straight up at Player attentively
        targetRotX = -0.05;
        targetRotY = 0;
      } else if (status === 'RESULT') {
        if (winner === 'OPPONENT') {
          // Cheering / Happy posture
          targetY = Math.sin(elapsed * 8) * 0.03 + breathY;
          targetRotX = -0.08;
        } else {
          // Disappointed / Head lowered
          targetRotX = 0.12;
        }
      }

      // Smooth Lerp Transformations
      characterGroupRef.current.position.z = THREE.MathUtils.lerp(characterGroupRef.current.position.z, targetZ, delta * 4);
      characterGroupRef.current.position.y = THREE.MathUtils.lerp(characterGroupRef.current.position.y, targetY, delta * 4);
      characterGroupRef.current.rotation.x = THREE.MathUtils.lerp(characterGroupRef.current.rotation.x, targetRotX, delta * 4);
      characterGroupRef.current.rotation.y = THREE.MathUtils.lerp(characterGroupRef.current.rotation.y, targetRotY, delta * 4);
    }
  });

  return (
    <group ref={characterGroupRef} position={[0, 0, -1.45]}>
      {/* --- CHAIR FOR OPPONENT --- */}
      <group position={[0, 0, 0]}>
        {/* Seat Cushion (Red) */}
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.1, 0.65]} />
          <meshStandardMaterial color="#dc2626" roughness={0.7} />
        </mesh>
        {/* Chair Backrest */}
        <mesh position={[0, 0.95, -0.28]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.75, 0.08]} />
          <meshStandardMaterial color="#5c2e0e" roughness={0.6} />
        </mesh>
        {/* Chair Wooden Legs */}
        {[-0.28, 0.28].map((cX, i) =>
          [-0.26, 0.26].map((cZ, j) => (
            <mesh key={`op-leg-${i}-${j}`} position={[cX, 0.24, cZ]} castShadow>
              <cylinderGeometry args={[0.04, 0.035, 0.48, 8]} />
              <meshStandardMaterial color="#5c2e0e" roughness={0.6} />
            </mesh>
          ))
        )}
      </group>

      {/* --- PROCEDURAL LOW-POLY SEATED OPPONENT (head, hair, torso, arms, hands) --- */}
      <group position={[0, 0.58, 0.02]} scale={[1, 1, 1]}>
        <SimpleOpponentBody status={status} />
      </group>
    </group>
  );
};
