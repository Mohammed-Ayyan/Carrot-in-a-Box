import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { BoxId, GameStatus } from '../../game/types';
import { Carrot } from './Carrot';

interface BoxProps {
  boxId: BoxId;
  label: string;
  targetPosition: [number, number, number];
  isPeeking: boolean;
  isPlayerPeeking: boolean;
  isOpen: boolean;
  hasCarrot: boolean;
  status: GameStatus;
  isPlayerBox: boolean;
  debugVisibility?: boolean;
}

export const BoxComponent: React.FC<BoxProps> = ({
  boxId,
  label,
  targetPosition,
  isPeeking,
  isPlayerPeeking,
  isOpen,
  hasCarrot,
  status,
  isPlayerBox,
  debugVisibility = false,
}) => {
  const lidGroupRef = useRef<THREE.Group>(null);
  const boxGroupRef = useRef<THREE.Group>(null);
  const lidAngle = useRef(0);

  // Swap animation state tracking
  const swapProgress = useRef(0);
  const startPos = useRef<THREE.Vector3 | null>(null);

  useFrame((_, delta) => {
    if (boxGroupRef.current) {
      const targetVec = new THREE.Vector3(...targetPosition);
      const targetRotY = isPlayerBox ? 0 : Math.PI;

      if (status === 'SWAPPING') {
        // Capture initial position at start of swap
        if (startPos.current === null) {
          startPos.current = boxGroupRef.current.position.clone();
          swapProgress.current = 0;
        }

        // Advance progress over ~0.9s
        swapProgress.current = Math.min(1, swapProgress.current + delta * 1.15);
        const t = swapProgress.current;
        // Smooth ease-in-out curve
        const ease = (1 - Math.cos(Math.PI * t)) / 2;

        const fromPos = startPos.current;
        
        // 1. Z-axis: Lerp linearly from start to target
        const currentZ = THREE.MathUtils.lerp(fromPos.z, targetVec.z, ease);

        // 2. X-axis: Arc outward (Box A curves right +, Box B curves left -)
        const arcDirection = boxId === 'BOX_A' ? 1 : -1;
        const currentX = arcDirection * 0.38 * Math.sin(Math.PI * ease);

        // 3. Y-axis: Lift upward off table surface during swap to clear central collision
        const currentY = 1.01 + 0.16 * Math.sin(Math.PI * ease);

        boxGroupRef.current.position.set(currentX, currentY, currentZ);

        // 4. Dynamic rotational tilt during arc swing
        const tiltY = targetRotY + arcDirection * 0.35 * Math.sin(Math.PI * ease);
        const tiltZ = arcDirection * 0.12 * Math.sin(Math.PI * ease);
        boxGroupRef.current.rotation.y = tiltY;
        boxGroupRef.current.rotation.z = tiltZ;
        boxGroupRef.current.rotation.x = 0;
      } else {
        // Reset swap state tracking when not in SWAPPING
        startPos.current = null;
        swapProgress.current = 0;

        // Smooth Box Position Lerp to target position
        boxGroupRef.current.position.lerp(targetVec, delta * 7);
        boxGroupRef.current.rotation.y = THREE.MathUtils.lerp(boxGroupRef.current.rotation.y, targetRotY, delta * 7);
        boxGroupRef.current.rotation.z = THREE.MathUtils.lerp(boxGroupRef.current.rotation.z, 0, delta * 7);
        boxGroupRef.current.rotation.x = THREE.MathUtils.lerp(boxGroupRef.current.rotation.x, 0, delta * 7);
      }
    }

    // 2. Animate Lid opening rotation around Rear Hinge Pivot.
    //    The pivot group sits at the REAR top edge, so a negative rotation.x swings the
    //    lid backward and DOWN behind the box, clearing the camera's line of sight.
    if (lidGroupRef.current) {
      let targetAngle = 0;
      if (isOpen) {
        targetAngle = -Math.PI * 0.78; // Full open (~140°) — lid folds back out of view
      } else if (isPeeking) {
        // When the LOCAL player peeks their own box, swing the lid well past vertical
        // (~130°) so it rotates completely behind the box and never blocks the interior.
        // The opponent's peek only cracks the lid (~36°) as a visual cue.
        targetAngle = isPlayerPeeking ? -Math.PI * 0.72 : -Math.PI * 0.20;
      }
      lidAngle.current = THREE.MathUtils.lerp(lidAngle.current, targetAngle, delta * 6);
      lidGroupRef.current.rotation.x = lidAngle.current;
    }
  });

  // CRITICAL INFORMATION ISOLATION:
  // `hasCarrot` is now resolved upstream in SceneCanvas using privacy-safe rules
  // (private peek result for own box, or authoritative reveal). We only additionally
  // gate on the box being visually open/peeked so the carrot is not shown through a
  // closed lid. We NEVER reveal a carrot for a box the local player does not own
  // unless the round has been officially revealed.
  const shouldShowCarrot = hasCarrot && (isOpen || (isPeeking && isPlayerPeeking) || debugVisibility);

  // Compact Sleek Box Dimensions
  const width = 0.46;
  const height = 0.24;
  const depth = 0.36;
  const wallThickness = 0.03;

  // Box Orientation: Facing player (rotation 0) or facing opponent (rotation Math.PI)
  const boxRotation: [number, number, number] = isPlayerBox ? [0, 0, 0] : [0, Math.PI, 0];

  return (
    <group ref={boxGroupRef} position={targetPosition} rotation={boxRotation}>
      {/* Box Main Body Container */}
      <group>
        {/* --- BOX HOLLOW BODY --- */}
        {/* Bottom Panel */}
        <mesh position={[0, wallThickness / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, wallThickness, depth]} />
          <meshStandardMaterial color="#9a531e" roughness={0.55} metalness={0.05} />
        </mesh>

        {/* Front Wall */}
        <mesh position={[0, height / 2, depth / 2 - wallThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[width, height, wallThickness]} />
          <meshStandardMaterial color="#b45309" roughness={0.5} metalness={0.05} />
        </mesh>

        {/* Back Wall */}
        <mesh position={[0, height / 2, -depth / 2 + wallThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[width, height, wallThickness]} />
          <meshStandardMaterial color="#78350f" roughness={0.55} />
        </mesh>

        {/* Left Wall */}
        <mesh position={[-width / 2 + wallThickness / 2, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[wallThickness, height, depth]} />
          <meshStandardMaterial color="#78350f" roughness={0.55} />
        </mesh>

        {/* Right Wall */}
        <mesh position={[width / 2 - wallThickness / 2, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[wallThickness, height, depth]} />
          <meshStandardMaterial color="#78350f" roughness={0.55} />
        </mesh>

        {/* Dark Interior Felt Lining */}
        <mesh position={[0, height / 2, 0]} receiveShadow>
          <boxGeometry args={[width - wallThickness * 2, height - wallThickness, depth - wallThickness * 2]} />
          <meshStandardMaterial color="#1c1917" roughness={0.9} side={THREE.BackSide} />
        </mesh>

        {/* Metallic Corner Brackets */}
        {[-1, 1].map((xSide) =>
          [-1, 1].map((zSide) => (
            <group key={`${xSide}-${zSide}`} position={[(width / 2) * xSide, height / 2, (depth / 2) * zSide]}>
              <mesh castShadow>
                <boxGeometry args={[0.04, height + 0.015, 0.04]} />
                <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))
        )}

        {/* Front Brass Latch Lock */}
        <mesh position={[0, height / 2, depth / 2 + 0.008]} castShadow>
          <boxGeometry args={[0.08, 0.12, 0.015]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Front Label Plate */}
        <group position={[0, height * 0.62, depth / 2 + 0.016]}>
          <mesh castShadow>
            <planeGeometry args={[0.26, 0.10]} />
            <meshStandardMaterial color="#451a03" roughness={0.4} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.065}
            color={isPlayerBox ? '#60a5fa' : '#f87171'}
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        </group>

        {/* Debug Ownership Badge Tag */}
        {debugVisibility && (
          <group position={[0, height + 0.22, 0]}>
            <Text
              fontSize={0.09}
              color={isPlayerBox ? '#3b82f6' : '#ef4444'}
              anchorX="center"
              anchorY="middle"
            >
              {isPlayerBox ? '👑 YOUR BOX' : '👤 OPPONENT BOX'}
            </Text>
          </group>
        )}

        {/* --- HINGED LID GROUP (Pivot Point at Rear Top Edge) --- */}
        <group ref={lidGroupRef} position={[0, height, -depth / 2]}>
          {/* Main Wooden Lid Surface */}
          <group position={[0, wallThickness / 2, depth / 2]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[width + 0.02, wallThickness + 0.01, depth + 0.02]} />
              <meshStandardMaterial color="#b45309" roughness={0.5} metalness={0.1} />
            </mesh>

            {/* Lid Trim Slats */}
            {[-width * 0.3, 0, width * 0.3].map((xPos, idx) => (
              <mesh key={idx} position={[xPos, wallThickness / 2 + 0.006, 0]} castShadow>
                <boxGeometry args={[0.04, 0.008, depth + 0.015]} />
                <meshStandardMaterial color="#78350f" roughness={0.55} />
              </mesh>
            ))}

            {/* Top Handle Ring */}
            <mesh position={[0, wallThickness + 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.03, 0.008, 8, 16]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>

          {/* Hinge Cylinders on Back Pivot */}
          {[-width * 0.3, width * 0.3].map((hX, hIdx) => (
            <mesh key={hIdx} position={[hX, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.06, 12]} />
              <meshStandardMaterial color="#1c1917" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>

        {/* --- CARROT INSIDE BOX (STRICTLY ISOLATED PER VISIBILITY RULES) --- */}
        {shouldShowCarrot && (
          <Carrot
            isPeeking={isPeeking}
            isRevealed={isOpen}
            position={[0, wallThickness + 0.02, 0]}
          />
        )}
      </group>
    </group>
  );
};
