import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameStatus } from '../../game/types';
import {
  PLAYER_SEATED_CAMERA,
  PLAYER_PEEK_CAMERA,
  OPPONENT_PEEK_OBSERVATION_CAMERA,
  REVEAL_CAMERA,
  MENU_CAMERA,
  CameraTransform,
} from './cameraConfig';

interface CameraControllerProps {
  status: GameStatus;
}

/**
 * Drives the first-person camera between the centralized transforms defined in
 * cameraConfig.ts. Each game state resolves to exactly one transform, keeping the
 * 3D camera state synchronized with the authoritative game state.
 */
export const CameraController: React.FC<CameraControllerProps> = ({ status }) => {
  const { camera, size } = useThree();
  const currentTarget = useRef(new THREE.Vector3().copy(PLAYER_SEATED_CAMERA.lookAt));

  useFrame((_, delta) => {
    let transform: CameraTransform;

    switch (status) {
      case 'PLAYER_PEEKING':
        transform = PLAYER_PEEK_CAMERA;
        break;
      case 'PEEKING':
      case 'BLUFF':
        transform = OPPONENT_PEEK_OBSERVATION_CAMERA;
        break;
      case 'REVEALING':
      case 'RESULT':
        transform = REVEAL_CAMERA;
        break;
      case 'MENU':
        transform = MENU_CAMERA;
        break;
      default:
        transform = PLAYER_SEATED_CAMERA;
        break;
    }

    // Adaptive Mobile Aspect Ratio Framing:
    // On portrait mobile viewports (aspect < 1.0), increase FOV to 68° and pull back slightly
    // so both boxes and peek interiors remain in full view without clipping.
    const aspect = size.width / (size.height || 1);
    const isPortrait = aspect < 1.0;

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = isPortrait ? 68 : 55;
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 4);
        camera.updateProjectionMatrix();
      }
    }

    // Apply slight portrait position offset for optimal framing
    const targetPos = transform.position.clone();
    if (isPortrait && status !== 'PLAYER_PEEKING') {
      targetPos.z += 0.24;
      targetPos.y += 0.12;
    }

    camera.position.lerp(targetPos, delta * 4.2);
    currentTarget.current.lerp(transform.lookAt, delta * 4.2);
    camera.lookAt(currentTarget.current);
  });

  return null;
};
