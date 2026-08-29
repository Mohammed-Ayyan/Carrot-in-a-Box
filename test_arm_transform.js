import fs from 'fs';

function inspectMeshPositions() {
  const content = fs.readFileSync('./public/girl.obj', 'utf8');
  const lines = content.split('\n');

  let currentMesh = '';
  const meshBounds = {};

  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith('o ') || line.startsWith('g ')) {
      currentMesh = line.split(' ')[1];
      meshBounds[currentMesh] = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity, count: 0 };
    } else if (line.startsWith('v ') && currentMesh) {
      const parts = line.split(/\s+/);
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);

      const b = meshBounds[currentMesh];
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y;
      if (y > b.maxY) b.maxY = y;
      if (z < b.minZ) b.minZ = z;
      if (z > b.maxZ) b.maxZ = z;
      b.count++;
    }
  });

  console.log('Mesh Bounding Boxes:');
  Object.keys(meshBounds).forEach(name => {
    const b = meshBounds[name];
    console.log(`Mesh: "${name}" (${b.count} verts) -> X: [${b.minX.toFixed(2)}, ${b.maxX.toFixed(2)}], Y: [${b.minY.toFixed(2)}, ${b.maxY.toFixed(2)}], Z: [${b.minZ.toFixed(2)}, ${b.maxZ.toFixed(2)}]`);
  });
}

inspectMeshPositions();
