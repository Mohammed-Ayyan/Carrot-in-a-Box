import fs from 'fs';
import path from 'path';

console.log('Inspecting textures for Girl character...');
const texDir = './public/tEXTURE';
const files = fs.readdirSync(texDir);
files.forEach(f => {
  const stat = fs.statSync(path.join(texDir, f));
  console.log(`Texture: ${f} -> ${stat.size} bytes`);
});
