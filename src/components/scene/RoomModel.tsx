import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GENERATED_ASSETS } from '../../assets/assetLoader';

export const RoomModel: React.FC = () => {
  try {
    const { scene } = useGLTF(GENERATED_ASSETS.ROOM_FULL);

    // Apply rich warm materials to GLB meshes
    const clonedScene = useMemo(() => {
      const clone = scene.clone(true);
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          // Apply cozy warm wood material to GLB geometry
          mesh.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#b45309'), // Warm amber wood
            roughness: 0.6,
            metalness: 0.05,
          });
        }
      });
      return clone;
    }, [scene]);

    return (
      <group position={[0, -0.3, -0.6]} scale={[7.8, 7.0, 7.8]}>
        <primitive object={clonedScene} />
      </group>
    );
  } catch (err) {
    console.warn('Failed to load generated room GLB model:', err);
    return null;
  }
};

useGLTF.preload(GENERATED_ASSETS.ROOM_FULL);
