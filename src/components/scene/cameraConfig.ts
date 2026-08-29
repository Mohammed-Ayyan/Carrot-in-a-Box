import * as THREE from 'three';

/**
 * Centralized first-person camera transforms.
 *
 * All camera positions/look-at targets for the game live here so that no component
 * hard-codes ad-hoc camera coordinates. Each transform represents the local player's
 * eyes in a specific game state.
 *
 * Coordinate reference:
 *  - The local player's OWN box sits on the near side of the table at z = +0.45.
 *  - The opponent's box sits on the far side at z = -0.45.
 *  - Table surface top is at y ≈ 1.01.
 */

export interface CameraTransform {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

// Player seated at the table, eyes at ~1.48, looking across toward the opponent.
export const PLAYER_SEATED_CAMERA: CameraTransform = {
  position: new THREE.Vector3(0, 1.48, 1.4),
  lookAt: new THREE.Vector3(0, 1.2, -1.3),
};

// Player leaning forward and DOWN into their own box (near side, z=+0.45).
// Positioned just above/behind the box's front edge (z ≈ 0.78) and high enough (y=1.62)
// to see over the front wall, with the look-at aimed straight down into the interior.
export const PLAYER_PEEK_CAMERA: CameraTransform = {
  position: new THREE.Vector3(0, 1.62, 0.86),
  lookAt: new THREE.Vector3(0, 1.02, 0.44),
};

// Player watching the opponent perform their peek across the table.
export const OPPONENT_PEEK_OBSERVATION_CAMERA: CameraTransform = {
  position: new THREE.Vector3(0, 1.48, 1.4),
  lookAt: new THREE.Vector3(0, 1.16, -1.05),
};

// Player leaning in slightly to watch the reveal on the center of the table.
export const REVEAL_CAMERA: CameraTransform = {
  position: new THREE.Vector3(0, 1.4, 1.12),
  lookAt: new THREE.Vector3(0, 1.08, -0.05),
};

// Wide menu / establishing shot.
export const MENU_CAMERA: CameraTransform = {
  position: new THREE.Vector3(0, 4.4, 5.4),
  lookAt: new THREE.Vector3(0, 1.6, -0.4),
};
