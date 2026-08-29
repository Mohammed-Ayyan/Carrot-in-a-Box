import fs from 'fs';

function testArmDeform() {
  console.log('Testing arm vertex deformation formula...');
  
  // Sample arm vertex at shoulder/elbow/hand
  const testVerts = [
    { name: 'shoulder_R', x: 0.22, y: 1.25, z: 0.0 },
    { name: 'elbow_R', x: 0.45, y: 1.22, z: 0.0 },
    { name: 'hand_R', x: 0.65, y: 1.20, z: 0.0 },
    { name: 'shoulder_L', x: -0.22, y: 1.25, z: 0.0 },
    { name: 'elbow_L', x: -0.45, y: 1.22, z: 0.0 },
    { name: 'hand_L', x: -0.65, y: 1.20, z: 0.0 },
  ];

  testVerts.forEach(v => {
    const isRight = v.x > 0;
    const shoulderX = isRight ? 0.18 : -0.18;
    const shoulderY = 1.25;

    const dx = v.x - shoulderX;
    const dy = v.y - shoulderY;
    const dz = v.z;

    const distFromShoulder = Math.abs(dx);
    // Smooth weight factor based on distance from shoulder
    const weight = Math.min(distFromShoulder / 0.45, 1.0);

    // Rotate down towards body & forward towards table
    // 1. Rotate around Z axis (arms down along body)
    const angleZ = (isRight ? -1 : 1) * Math.PI * 0.38 * weight;
    const cosZ = Math.cos(angleZ);
    const sinZ = Math.sin(angleZ);

    let rx = dx * cosZ - dy * sinZ;
    let ry = dx * sinZ + dy * cosZ;
    let rz = dz;

    // 2. Rotate around X axis (arms forward towards table)
    const angleX = Math.PI * 0.22 * weight;
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);

    const finalY = ry * cosX - rz * sinX;
    const finalZ = ry * sinX + rz * cosX;

    const newX = (shoulderX + rx).toFixed(2);
    const newY = (shoulderY + finalY).toFixed(2);
    const newZ = (finalZ).toFixed(2);

    console.log(`${v.name}: original=[${v.x}, ${v.y}, ${v.z}] -> transformed=[${newX}, ${newY}, ${newZ}]`);
  });
}

testArmDeform();
