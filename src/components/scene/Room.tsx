import React from 'react';
import * as THREE from 'three';
import { RoomModel } from './RoomModel';

export const Room: React.FC = () => {
  const roomWidth = 10;
  const roomDepth = 7.5;
  const roomHeight = 5.5;

  return (
    <group>
      {/* --- GENERATED GLB 3D ROOM MODEL OVERLAY --- */}
      <RoomModel />

      {/* --- FLOOR (Rich Warm Honey Oak Wooden Floorboards) --- */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color="#a16207" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Stylized Floorboard Planks Lines */}
      {[-3.5, -2.1, -0.7, 0.7, 2.1, 3.5].map((zPos, idx) => (
        <mesh key={`plank-${idx}`} position={[0, 0.002, zPos]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[roomWidth, 0.03]} />
          <meshStandardMaterial color="#451a03" roughness={0.7} />
        </mesh>
      ))}

      {/* --- BACK WALL (Cozy Warm Cream Plaster) --- */}
      <mesh position={[0, roomHeight / 2, -roomDepth / 2]} receiveShadow>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>

      {/* Back Wall Wooden Baseboard Trim */}
      <mesh position={[0, 0.25, -roomDepth / 2 + 0.04]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, 0.5, 0.08]} />
        <meshStandardMaterial color="#5c2e0e" roughness={0.55} />
      </mesh>

      {/* Vertical Timber Pillars / Posts */}
      {[-roomWidth / 2 + 0.4, -1.8, 1.8, roomWidth / 2 - 0.4].map((pX, idx) => (
        <group key={`post-${idx}`} position={[pX, roomHeight / 2, -roomDepth / 2 + 0.1]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.42, roomHeight, 0.16]} />
            <meshStandardMaterial color="#451a03" roughness={0.55} />
          </mesh>
          {/* Pillar Carved Base Block */}
          <mesh position={[0, -roomHeight / 2 + 0.3, 0.04]} castShadow>
            <boxGeometry args={[0.54, 0.6, 0.22]} />
            <meshStandardMaterial color="#381201" roughness={0.55} />
          </mesh>
        </group>
      ))}

      {/* Top Wall Header Beam */}
      <mesh position={[0, roomHeight - 0.25, -roomDepth / 2 + 0.12]} castShadow receiveShadow>
        <boxGeometry args={[roomWidth, 0.5, 0.22]} />
        <meshStandardMaterial color="#451a03" roughness={0.55} />
      </mesh>

      {/* --- CEILING & EXPOSED CROSS-BEAMS --- */}
      <mesh position={[0, roomHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color="#fde68a" roughness={0.85} />
      </mesh>

      {/* Exposed Heavy Ceiling Beams */}
      {[-roomDepth / 3, 0, roomDepth / 3].map((bZ, idx) => (
        <mesh key={`beam-${idx}`} position={[0, roomHeight - 0.2, bZ]} castShadow>
          <boxGeometry args={[roomWidth, 0.35, 0.35]} />
          <meshStandardMaterial color="#451a03" roughness={0.55} />
        </mesh>
      ))}

      {/* --- CENTRAL ARCHED WINDOW (Back Wall Center) --- */}
      <group position={[0, 3.1, -roomDepth / 2 + 0.12]}>
        {/* Outer Arched Wooden Frame */}
        <mesh castShadow>
          <boxGeometry args={[1.2, 1.4, 0.15]} />
          <meshStandardMaterial color="#5c2e0e" roughness={0.55} />
        </mesh>
        {/* Window Sill */}
        <mesh position={[0, -0.75, 0.1]} castShadow>
          <boxGeometry args={[1.5, 0.14, 0.32]} />
          <meshStandardMaterial color="#381201" roughness={0.5} />
        </mesh>
        {/* Blue Sky View Glass */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[0.9, 1.1]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        {/* Window Grid Frame Bars */}
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.04, 1.1, 0.02]} />
          <meshStandardMaterial color="#5c2e0e" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.9, 0.04, 0.02]} />
          <meshStandardMaterial color="#5c2e0e" roughness={0.55} />
        </mesh>
        {/* Potted Plant on Window Sill */}
        <group position={[0.25, -0.55, 0.18]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.07, 0.2, 12]} />
            <meshStandardMaterial color="#ea580c" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.16, 0]} castShadow>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* --- CRIMSON RED HANGING PENDANT LAMP --- */}
      <group position={[0, roomHeight - 0.4, 0]}>
        {/* Suspension Chain */}
        <mesh position={[0, -0.65, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.3, 8]} />
          <meshStandardMaterial color="#1c1917" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Red Metallic Lamp Dome Shade */}
        <mesh position={[0, -1.35, 0]} castShadow>
          <coneGeometry args={[0.42, 0.38, 24, 1, true]} />
          <meshStandardMaterial color="#dc2626" roughness={0.25} metalness={0.2} side={THREE.DoubleSide} />
        </mesh>
        {/* Top Connector Cap */}
        <mesh position={[0, -1.14, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 12]} />
          <meshStandardMaterial color="#1c1917" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Glowing Warm Light Bulb */}
        <mesh position={[0, -1.4, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* --- LEFT WALL & DECOR --- */}
      <mesh position={[-roomWidth / 2, roomHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>

      {/* Left Wall Baseboard Trim */}
      <mesh position={[-roomWidth / 2 + 0.04, 0.25, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[roomDepth, 0.5, 0.08]} />
        <meshStandardMaterial color="#5c2e0e" roughness={0.55} />
      </mesh>

      {/* Left Wall Sconce Lantern Lamp */}
      <group position={[-roomWidth / 2 + 0.18, 3.2, -1.8]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.35, 0.18]} />
          <meshStandardMaterial color="#1c1917" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.04, 0, 0]}>
          <boxGeometry args={[0.08, 0.26, 0.14]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      </group>

      {/* Left Wall Shelf with Books & Plant */}
      <group position={[-roomWidth / 2 + 0.25, 3.4, 0.8]}>
        {/* Shelf Board */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.08, 1.2]} />
          <meshStandardMaterial color="#451a03" roughness={0.55} />
        </mesh>
        {/* Books */}
        <mesh position={[0, 0.18, -0.25]} castShadow>
          <boxGeometry args={[0.18, 0.28, 0.08]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.16, -0.12]} castShadow>
          <boxGeometry args={[0.18, 0.24, 0.07]} />
          <meshStandardMaterial color="#d97706" roughness={0.4} />
        </mesh>
        {/* Small Potted Plant */}
        <group position={[0, 0.15, 0.28]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.09, 0.06, 0.16, 10]} />
            <meshStandardMaterial color="#ea580c" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.14, 0]} castShadow>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#16a34a" roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Foreground Left Potted Floor Plant (Terracotta Pot) */}
      <group position={[-roomWidth / 2 + 0.75, 0, 2.2]}>
        {/* Terracotta Pot */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.38, 0.26, 0.8, 16]} />
          <meshStandardMaterial color="#ea580c" roughness={0.5} />
        </mesh>
        {/* Lush Green Plant Leaves */}
        {[0, 0.8, 1.6, 2.4, 3.2, 4.0].map((angle, i) => (
          <group key={`leaf-${i}`} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.8, 0.15]} rotation={[0.4, 0, 0]} castShadow>
              <coneGeometry args={[0.14, 0.7, 8]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#16a34a' : '#15803d'} roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>

      {/* --- RIGHT WALL & DECOR --- */}
      <mesh position={[roomWidth / 2, roomHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.8} />
      </mesh>

      {/* Right Wall Baseboard Trim */}
      <mesh position={[roomWidth / 2 - 0.04, 0.25, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[roomDepth, 0.5, 0.08]} />
        <meshStandardMaterial color="#5c2e0e" roughness={0.55} />
      </mesh>

      {/* Right Wall Sconce Lantern Lamp */}
      <group position={[roomWidth / 2 - 0.18, 3.2, -1.8]}>
        <mesh castShadow>
          <boxGeometry args={[0.12, 0.35, 0.18]} />
          <meshStandardMaterial color="#1c1917" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[-0.04, 0, 0]}>
          <boxGeometry args={[0.08, 0.26, 0.14]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      </group>

      {/* Framed Landscape Painting on Right Wall */}
      <group position={[roomWidth / 2 - 0.06, 3.4, 0.8]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[1.6, 1.2, 0.08]} />
          <meshStandardMaterial color="#5c2e0e" roughness={0.55} />
        </mesh>
        {/* Painting Canvas (Mountain Landscape) */}
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.4, 1.0]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.35} />
        </mesh>
        {/* Mountain Silhouette */}
        <mesh position={[0, -0.15, 0.05]}>
          <coneGeometry args={[0.5, 0.6, 3]} />
          <meshStandardMaterial color="#16a34a" roughness={0.5} />
        </mesh>
      </group>

      {/* Small Wooden Side Cabinet / Nightstand (Right Back Corner) */}
      <group position={[roomWidth / 2 - 0.75, 0, -2.4]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 1.0, 0.7]} />
          <meshStandardMaterial color="#6c3611" roughness={0.55} />
        </mesh>
        {/* Drawers Knobs */}
        <mesh position={[-0.2, 0.7, 0.36]} castShadow>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[-0.2, 0.3, 0.36]} castShadow>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Cobalt Blue Ceramic Vase on Cabinet */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.16, 0.38, 12]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
};
