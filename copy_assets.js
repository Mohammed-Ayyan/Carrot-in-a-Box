import fs from 'fs';
import path from 'path';

const destDir = './public/assets/models';
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy GLB models
fs.copyFileSync('./public/cozy+stylized+room+3d+model_Clone1+(1).glb', path.join(destDir, 'room_parts.glb'));
fs.copyFileSync('./public/room.glb', path.join(destDir, 'room_full.glb'));

console.log('Successfully organized 3D model assets in public/assets/models/');
