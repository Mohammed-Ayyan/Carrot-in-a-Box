import fs from 'fs';
import path from 'path';

function dumpGlb(filepath) {
  console.log(`\n=== Inspecting GLB: ${path.basename(filepath)} ===`);
  const buffer = fs.readFileSync(filepath);

  const magic = buffer.toString('utf8', 0, 4);
  if (magic !== 'glTF') {
    console.error('Not a valid GLB file');
    return;
  }
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  console.log(`GLB Magic: ${magic}, Version: ${version}, Total Length: ${length} bytes`);

  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.toString('utf8', 16, 20);
  if (chunkType !== 'JSON') {
    console.error('Expected JSON chunk');
    return;
  }

  const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
  const gltf = JSON.parse(jsonString);

  console.log('\n--- GLTF Structure Summary ---');
  console.log(`Nodes count: ${gltf.nodes ? gltf.nodes.length : 0}`);
  console.log(`Meshes count: ${gltf.meshes ? gltf.meshes.length : 0}`);
  console.log(`Materials count: ${gltf.materials ? gltf.materials.length : 0}`);
  console.log(`Textures count: ${gltf.textures ? gltf.textures.length : 0}`);

  if (gltf.nodes) {
    console.log('\n--- Node List ---');
    gltf.nodes.forEach((node, idx) => {
      console.log(`Node [${idx}]: name="${node.name || 'unnamed'}", mesh=${node.mesh !== undefined ? node.mesh : 'none'}, children=${node.children ? JSON.stringify(node.children) : '[]'}, translation=${node.translation ? JSON.stringify(node.translation) : 'none'}, scale=${node.scale ? JSON.stringify(node.scale) : 'none'}`);
    });
  }

  if (gltf.meshes) {
    console.log('\n--- Mesh List ---');
    gltf.meshes.forEach((mesh, idx) => {
      console.log(`Mesh [${idx}]: name="${mesh.name || 'unnamed'}", primitives count=${mesh.primitives ? mesh.primitives.length : 0}`);
    });
  }
}

dumpGlb('./public/room.glb');
dumpGlb('./public/cozy+stylized+room+3d+model_Clone1+(1).glb');
