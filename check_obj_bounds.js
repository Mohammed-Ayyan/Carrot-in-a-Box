import fs from 'fs';

function checkBounds() {
  const content = fs.readFileSync('./public/girl.obj', 'utf8');
  const lines = content.split('\n');

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  lines.forEach(line => {
    if (line.startsWith('v ')) {
      const parts = line.trim().split(/\s+/);
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  });

  console.log(`OBJ Bounds: min=[${minX}, ${minY}, ${minZ}], max=[${maxX}, ${maxY}, ${maxZ}]`);
  console.log(`Size: width=${(maxX - minX).toFixed(3)}, height=${(maxY - minY).toFixed(3)}, depth=${(maxZ - minZ).toFixed(3)}`);
}

checkBounds();
