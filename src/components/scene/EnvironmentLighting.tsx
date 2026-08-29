import React from 'react';

export const EnvironmentLighting: React.FC = () => {
  return (
    <>
      {/* Warm Ambient Illumination */}
      <ambientLight color="#fed7aa" intensity={0.65} />

      {/* Main Warm Key Spotlight from Red Hanging Lamp onto Table & Boxes */}
      <spotLight
        position={[0, 4.1, 0]}
        target-position={[0, 0.9, 0]}
        intensity={2.4}
        color="#fef08a"
        angle={0.8}
        penumbra={0.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      />

      {/* Soft Directional Fill Light for Soft Shadows */}
      <directionalLight
        position={[2, 5, 4]}
        intensity={0.5}
        color="#ffedd5"
      />

      {/* Left Wall Lantern Sconce Glow */}
      <pointLight
        position={[-4.5, 3.2, -1.8]}
        intensity={0.6}
        color="#f59e0b"
        distance={5}
        decay={2}
      />

      {/* Right Wall Lantern Sconce Glow */}
      <pointLight
        position={[4.5, 3.2, -1.8]}
        intensity={0.6}
        color="#f59e0b"
        distance={5}
        decay={2}
      />

      {/* Window Sky Glow from Back Wall */}
      <pointLight
        position={[0, 3.1, -3.5]}
        intensity={0.4}
        color="#38bdf8"
        distance={4}
        decay={2}
      />
    </>
  );
};
