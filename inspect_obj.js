import fs from 'fs';
import path from 'path';

function inspectObj(filepath) {
  console.log(`\n=== Inspecting OBJ: ${path.basename(filepath)} ===`);
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  
  let vCount = 0;
  let vtCount = 0;
  let vnCount = 0;
  let fCount = 0;
  const objects = new Set();
  const materials = new Set();

  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith('v ')) vCount++;
    else if (line.startsWith('vt ')) vtCount++;
    else if (line.startsWith('vn ')) vnCount++;
    else if (line.startsWith('f ')) fCount++;
    else if (line.startsWith('o ') || line.startsWith('g ')) objects.add(line);
    else if (line.startsWith('usemtl ')) materials.add(line.split(' ')[1]);
  });

  console.log(`Vertices: ${vCount}, UVs: ${vtCount}, Normals: ${vnCount}, Faces: ${fCount}`);
  console.log(`Objects/Groups count: ${objects.size}`);
  console.log('Objects:', Array.from(objects));
  console.log('Materials referenced:', Array.from(materials));
}

inspectObj('./public/girl OBJ.obj');
