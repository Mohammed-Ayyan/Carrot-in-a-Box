import fs from 'fs';
import path from 'path';

function inspectGlb(filepath) {
  if (!fs.existsSync(filepath)) return;
  console.log(`\n========================================`);
  console.log(`Inspecting: ${path.basename(filepath)} (${fs.statSync(filepath).size} bytes)`);
  console.log(`========================================`);
  
  const buffer = fs.readFileSync(filepath);
  const magic = buffer.toString('utf8', 0, 4);
  if (magic !== 'glTF') {
    console.error('Not a valid GLB');
    return;
  }

  const chunkLength = buffer.readUInt32LE(12);
  const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
  const gltf = JSON.parse(jsonString);

  console.log(`Nodes: ${gltf.nodes ? gltf.nodes.length : 0}`);
  console.log(`Meshes: ${gltf.meshes ? gltf.meshes.length : 0}`);
  console.log(`Materials: ${gltf.materials ? gltf.materials.length : 0}`);

  if (gltf.nodes) {
    gltf.nodes.forEach((node, idx) => {
      let boundsStr = '';
      if (node.mesh !== undefined && gltf.accessors) {
        const mesh = gltf.meshes[node.mesh];
        if (mesh && mesh.primitives && mesh.primitives[0]) {
          const acc = gltf.accessors[mesh.primitives[0].attributes.POSITION];
          if (acc && acc.min && acc.max) {
            const size = [
              (acc.max[0] - acc.min[0]).toFixed(3),
              (acc.max[1] - acc.min[1]).toFixed(3),
              (acc.max[2] - acc.min[2]).toFixed(3)
            ];
            const center = [
              ((acc.min[0] + acc.max[0])/2 + (node.translation ? node.translation[0] : 0)).toFixed(3),
              ((acc.min[1] + acc.max[1])/2 + (node.translation ? node.translation[1] : 0)).toFixed(3),
              ((acc.min[2] + acc.max[2])/2 + (node.translation ? node.translation[2] : 0)).toFixed(3)
            ];
            boundsStr = ` center=[${center.join(', ')}], size=[${size.join(', ')}]`;
          }
        }
      }
      console.log(`  Node [${idx}] "${node.name || 'unnamed'}": mesh=${node.mesh !== undefined ? node.mesh : 'none'}${boundsStr}`);
    });
  }
}

const downloadsDir = 'C:/Users/sumiy/Downloads';
const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.glb'));
files.forEach(f => inspectGlb(path.join(downloadsDir, f)));
