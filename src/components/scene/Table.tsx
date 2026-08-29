import React from 'react';

export const Table: React.FC = () => {
  const tableWidth = 2.4;
  const tableDepth = 1.6;
  const tabletopHeight = 0.12;
  const legHeight = 0.95;
  const tableY = legHeight + tabletopHeight / 2;

  return (
    <group position={[0, 0, 0]}>
      {/* --- CENTRAL ROUNDED WOODEN TABLE --- */}
      {/* Tabletop Main Slab with Rounded Edges */}
      <mesh position={[0, tableY, 0]} castShadow receiveShadow>
        <boxGeometry args={[tableWidth, tabletopHeight, tableDepth]} />
        <meshStandardMaterial color="#9a531e" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Tabletop Rounded Trim Border */}
      <mesh position={[0, tableY - 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[tableWidth + 0.06, 0.04, tableDepth + 0.06]} />
        <meshStandardMaterial color="#78350f" roughness={0.6} />
      </mesh>

      {/* 4 Thick Rounded Cylindrical Wooden Table Legs */}
      {[-1, 1].map((xDir) =>
        [-1, 1].map((zDir) => {
          const legX = (tableWidth / 2 - 0.25) * xDir;
          const legZ = (tableDepth / 2 - 0.25) * zDir;
          return (
            <group key={`leg-${xDir}-${zDir}`} position={[legX, legHeight / 2, legZ]}>
              <mesh castShadow receiveShadow>
                <cylinderGeometry args={[0.12, 0.1, legHeight, 16]} />
                <meshStandardMaterial color="#78350f" roughness={0.6} />
              </mesh>
              {/* Chunky Leg Base Foot */}
              <mesh position={[0, -legHeight / 2 + 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
                <meshStandardMaterial color="#5c2e0e" roughness={0.6} />
              </mesh>
            </group>
          );
        })
      )}

      {/* --- PLAYER CHAIR (Foreground First-Person Side, z = 1.45) --- */}
      <group position={[0, 0, 1.45]}>
        {/* Seat Cushion (Blue) */}
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.1, 0.65]} />
          <meshStandardMaterial color="#2563eb" roughness={0.7} />
        </mesh>
        {/* Chair Legs */}
        {[-0.28, 0.28].map((cX, i) =>
          [-0.26, 0.26].map((cZ, j) => (
            <mesh key={`p-leg-${i}-${j}`} position={[cX, 0.24, cZ]} castShadow>
              <cylinderGeometry args={[0.04, 0.035, 0.48, 8]} />
              <meshStandardMaterial color="#5c2e0e" roughness={0.6} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
};
