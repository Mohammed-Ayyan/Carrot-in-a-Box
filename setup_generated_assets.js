import fs from 'fs';
import path from 'path';

const targetDir = './public/generated-assets';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const downloadsDir = 'C:/Users/sumiy/Downloads';
const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.glb'));

files.forEach(f => {
  const src = path.join(downloadsDir, f);
  const safeName = f.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = path.join(targetDir, safeName);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${f} -> ${dest}`);
});

// Also copy room.glb and room_parts.glb specifically into generated-assets
if (fs.existsSync('./public/room.glb')) {
  fs.copyFileSync('./public/room.glb', path.join(targetDir, 'room.glb'));
}
if (fs.existsSync('./public/cozy+stylized+room+3d+model_Clone1+(1).glb')) {
  fs.copyFileSync('./public/cozy+stylized+room+3d+model_Clone1+(1).glb', path.join(targetDir, 'room_parts.glb'));
}

console.log('\nAll GLB files populated inside public/generated-assets/');
