import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

interface GirlCharacterModelProps {
  scale?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const GirlCharacterModel: React.FC<GirlCharacterModelProps> = ({
  scale = [1, 1, 1],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  try {
    // 1. Load OBJ Geometry
    const obj = useLoader(OBJLoader, '/girl.obj');

    // 2. Load Textures with sRGB Encoding for Vibrant Color
    const [topColorMap, topNormalMap, botColorMap, bodySkinMap, faceMap, colorsMap] = useLoader(
      THREE.TextureLoader,
      [
        '/tEXTURE/top color.png',
        '/tEXTURE/top normal.png',
        '/tEXTURE/bot color.jpg',
        '/tEXTURE/BOdy Skin Base Color.png',
        '/tEXTURE/FACE Base Color apha.png',
        '/tEXTURE/COLORS.jpg',
      ]
    );

    // Set Color Space Encoding
    topColorMap.colorSpace = THREE.SRGBColorSpace;
    botColorMap.colorSpace = THREE.SRGBColorSpace;
    bodySkinMap.colorSpace = THREE.SRGBColorSpace;
    faceMap.colorSpace = THREE.SRGBColorSpace;
    colorsMap.colorSpace = THREE.SRGBColorSpace;

    // Flip Y for OBJ UV alignment
    topColorMap.flipY = true;
    topNormalMap.flipY = true;
    botColorMap.flipY = true;
    bodySkinMap.flipY = true;
    faceMap.flipY = true;
    colorsMap.flipY = true;

    // 3. Clone and Deform T-Pose Arms into Natural Seated Posture
    const clonedObj = useMemo(() => {
      const clone = obj.clone(true);

      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const name = mesh.name;

          // Assign Full Vibrant Color Materials based on Sub-mesh Name
          if (name.includes('Top')) {
            mesh.material = new THREE.MeshStandardMaterial({
              map: topColorMap,
              normalMap: topNormalMap,
              roughness: 0.5,
              metalness: 0.1,
            });
          } else if (name.includes('bot')) {
            mesh.material = new THREE.MeshStandardMaterial({
              map: botColorMap,
              roughness: 0.6,
              metalness: 0.05,
            });
          } else if (name.includes('body')) {
            mesh.material = new THREE.MeshStandardMaterial({
              map: bodySkinMap,
              roughness: 0.45,
              metalness: 0.0,
            });
          } else if (name.includes('Head')) {
            mesh.material = new THREE.MeshStandardMaterial({
              map: bodySkinMap,
              roughness: 0.45,
              metalness: 0.0,
            });
          } else if (name.includes('eyes') || name.includes('boca') || name.includes('ceja')) {
            mesh.material = new THREE.MeshStandardMaterial({
              map: faceMap,
              transparent: true,
              roughness: 0.3,
            });
          } else if (name.includes('hair') || name.includes('scarf')) {
            mesh.material = new THREE.MeshStandardMaterial({
              map: colorsMap,
              roughness: 0.55,
              metalness: 0.05,
            });
          }

          // Deform T-Pose Arms into Seated Pose (for Body and Top meshes)
          if (name.includes('body') || name.includes('Top')) {
            const geo = mesh.geometry.clone();
            const posAttr = geo.attributes.position;
            const count = posAttr.count;

            for (let i = 0; i < count; i++) {
              const x = posAttr.getX(i);
              const y = posAttr.getY(i);
              const z = posAttr.getZ(i);

              // Target vertices in the left/right T-pose arm region
              if (Math.abs(x) > 0.18 && y > 0.65 && y < 1.35) {
                const isRight = x > 0;
                const shoulderX = isRight ? 0.18 : -0.18;
                const shoulderY = 1.25;

                const dx = x - shoulderX;
                const dy = y - shoulderY;
                const dz = z;

                const dist = Math.abs(dx);
                const weight = Math.min(dist / 0.45, 1.0);

                // Rotate down around Z axis
                const angleZ = (isRight ? -1 : 1) * Math.PI * 0.38 * weight;
                const cosZ = Math.cos(angleZ);
                const sinZ = Math.sin(angleZ);

                let rx = dx * cosZ - dy * sinZ;
                let ry = dx * sinZ + dy * cosZ;

                // Rotate forward around X axis
                const angleX = Math.PI * 0.22 * weight;
                const cosX = Math.cos(angleX);
                const sinX = Math.sin(angleX);

                const finalY = ry * cosX - dz * sinX;
                const finalZ = ry * sinX + dz * cosX;

                posAttr.setXYZ(i, shoulderX + rx, shoulderY + finalY, finalZ);
              }
            }

            geo.computeVertexNormals();
            mesh.geometry = geo;
          }
        }
      });

      return clone;
    }, [obj, topColorMap, topNormalMap, botColorMap, bodySkinMap, faceMap, colorsMap]);

    return (
      <group position={position} rotation={rotation} scale={scale}>
        <primitive object={clonedObj} />
      </group>
    );
  } catch (err) {
    console.warn('Failed to load Girl OBJ character model:', err);
    return null;
  }
};
