import fs from 'fs';
import path from 'path';

// Check texture files existence
const textureDir = './public/tEXTURE';
const textureFiles = fs.readdirSync(textureDir);
console.log('Texture files in public/tEXTURE:');
textureFiles.forEach(f => console.log(` - ${f} (${fs.statSync(path.join(textureDir, f)).size} bytes)`));

// Read MTL file
const mtlContent = fs.readFileSync('./public/girl OBJ.mtl', 'utf8');
console.log('\nMTL Content:');
console.log(mtlContent);
