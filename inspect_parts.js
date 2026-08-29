import fs from 'fs';
import path from 'path';

function inspectParts(filepath) {
  const buffer = fs.readFileSync(filepath);
  const chunkLength = buffer.readUInt32LE(12);
  const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
  const gltf = JSON.parse(jsonString);

  console.log(`\n=== Detailed Parts Inspection for ${path.basename(filepath)} ===`);
  
  gltf.nodes.forEach((node, idx) => {
    if (node.mesh !== undefined) {
      const mesh = gltf.meshes[node.mesh];
      const prim = mesh.primitives[0];
      const posAccessorIdx = prim.attributes.POSITION;
      const posAccessor = gltf.accessors[posAccessorIdx];
      const min = posAccessor.min;
      const max = posAccessor.max;
      const center = [
        ((min[0] + max[0]) / 2 + (node.translation ? node.translation[0] : 0)).toFixed(3),
        ((min[1] + max[1]) / 2 + (node.translation ? node.translation[1] : 0)).toFixed(3),
        ((min[2] + max[2]) / 2 + (node.translation ? node.translation[2] : 0)).toFixed(3)
      ];
      const size = [
        (max[0] - min[0]).toFixed(3),
        (max[1] - min[1]).toFixed(3),
        (max[2] - min[2]).toFixed(3)
      ];
      console.log(`Node [${idx}] ${node.name}: center=[${center.join(', ')}], size=[${size.join(', ')}], localTrans=${node.translation ? JSON.stringify(node.translation.map(v => v.toFixed(3))) : 'none'}`);
    }
  });
}

inspectParts('./public/cozy+stylized+room+3d+model_Clone1+(1).glb');
