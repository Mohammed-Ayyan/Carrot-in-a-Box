import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, Winner } from '../../game/types';

interface PlayerAvatarsProps {
  status: GameStatus;
  winner: Winner | null;
}

export const PlayerAvatars: React.FC<PlayerAvatarsProps> = ({ status, winner }) => {
  const p1GroupRef = useRef<THREE.Group>(null);
  const p2GroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    // Player 1 Peeking Animation (Opponent peeking inside Box A)
    if (p1GroupRef.current) {
      let p1X = -1.65;
      let p1Y = 0;
      let p1RotZ = 0;

      if (status === 'PEEKING') {
        p1X = -1.25; // Lean forward towards Box A
        p1Y = -0.05;
        p1RotZ = 0.25;
      } else if (status === 'RESULT' && winner === 'OPPONENT') {
        p1Y = Math.sin(state.clock.elapsedTime * 8) * 0.04;
      }

      p1GroupRef.current.position.x = THREE.MathUtils.lerp(p1GroupRef.current.position.x, p1X, delta * 4);
      p1GroupRef.current.position.y = THREE.MathUtils.lerp(p1GroupRef.current.position.y, p1Y, delta * 4);
      p1GroupRef.current.rotation.z = THREE.MathUtils.lerp(p1GroupRef.current.rotation.z, p1RotZ, delta * 4);
    }

    // Player 2 Peeking Animation (Player peeking inside Box B)
    if (p2GroupRef.current) {
      let p2X = 1.65;
      let p2Y = 0;
      let p2RotZ = 0;

      if (status === 'PLAYER_PEEKING') {
        p2X = 1.25; // Lean forward towards Box B
        p2Y = -0.05;
        p2RotZ = -0.25;
      } else if (status === 'RESULT' && winner === 'PLAYER') {
        p2Y = Math.sin(state.clock.elapsedTime * 8) * 0.04;
      }

      p2GroupRef.current.position.x = THREE.MathUtils.lerp(p2GroupRef.current.position.x, p2X, delta * 4);
      p2GroupRef.current.position.y = THREE.MathUtils.lerp(p2GroupRef.current.position.y, p2Y, delta * 4);
      p2GroupRef.current.rotation.z = THREE.MathUtils.lerp(p2GroupRef.current.rotation.z, p2RotZ, delta * 4);
    }
  });

  return (
    <group>
      {/* --- PLAYER 1 (Left Side - Red Hoodie) --- */}
      <group ref={p1GroupRef} position={[-1.65, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Torso in Red Hoodie */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.25, 0.65, 12]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>
        {/* Hoodie Hood Back Accent */}
        <mesh position={[0, 1.15, -0.15]} castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.6} />
        </mesh>

        {/* Head */}
        <group position={[0, 1.45, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.5} />
          </mesh>
          {/* Dark Hair Cap */}
          <mesh position={[0, 0.08, -0.02]} castShadow>
            <sphereGeometry args={[0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
        </group>

        {/* Arms & Hands rested on table */}
        <mesh position={[0.24, 0.85, 0.2]} rotation={[0.4, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>
        <mesh position={[-0.24, 0.85, 0.2]} rotation={[0.4, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>

        {/* Floating PLAYER 1 Badge */}
        <Html position={[0, 1.95, 0]} center distanceFactor={8}>
          <div className="player-head-badge badge-p1">
            <span>PLAYER 1</span>
            <div className="badge-arrow arrow-p1" />
          </div>
        </Html>
      </group>

      {/* --- PLAYER 2 (Right Side - Blue Hoodie) --- */}
      <group ref={p2GroupRef} position={[1.65, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Torso in Blue Hoodie */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.25, 0.65, 12]} />
          <meshStandardMaterial color="#2563eb" roughness={0.6} />
        </mesh>
        {/* Hoodie Hood Back Accent */}
        <mesh position={[0, 1.15, -0.15]} castShadow>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
        </mesh>

        {/* Head */}
        <group position={[0, 1.45, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.5} />
          </mesh>
          {/* Brown Spiky Hair */}
          <mesh position={[0, 0.09, -0.02]} castShadow>
            <sphereGeometry args={[0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            <meshStandardMaterial color="#5c2e0e" roughness={0.7} />
          </mesh>
        </group>

        {/* Arms & Hands rested on table */}
        <mesh position={[0.24, 0.85, 0.2]} rotation={[0.4, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#2563eb" roughness={0.6} />
        </mesh>
        <mesh position={[-0.24, 0.85, 0.2]} rotation={[0.4, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#2563eb" roughness={0.6} />
        </mesh>

        {/* Floating PLAYER 2 Badge */}
        <Html position={[0, 1.95, 0]} center distanceFactor={8}>
          <div className="player-head-badge badge-p2">
            <span>PLAYER 2</span>
            <div className="badge-arrow arrow-p2" />
          </div>
        </Html>
      </group>
    </group>
  );
};
