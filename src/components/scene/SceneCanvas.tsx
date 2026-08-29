import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameStateData, BoxId } from '../../game/types';
import { EnvironmentLighting } from './EnvironmentLighting';
import { CameraController } from './CameraController';
import { Room } from './Room';
import { Table } from './Table';
import { BoxComponent } from './Box';
import { OpponentCharacter } from './OpponentCharacter';
import { PlayerHands } from './PlayerHands';
import { EmoteBubble3D } from './EmoteBubble3D';

interface SceneCanvasProps {
  gameState: GameStateData;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({ gameState }) => {
  const { status, peeker, playerBox, carrotBox, winner, debugVisibility, playerBoxHasCarrot, isRevealed: revealedFlag } = gameState;

  // Box positions on central table surface (y = 1.01)
  // Longitudinal positions: Player Side (z = 0.45), Opponent Side (z = -0.45)
  const boxAPos: [number, number, number] = playerBox === 'BOX_A' ? [0, 1.01, 0.45] : [0, 1.01, -0.45];
  const boxBPos: [number, number, number] = playerBox === 'BOX_B' ? [0, 1.01, 0.45] : [0, 1.01, -0.45];

  const isRevealed = revealedFlag || status === 'REVEALING' || status === 'RESULT';

  const boxAPeeking = status === 'PEEKING' && peeker === 'OPPONENT';
  const boxBPeeking = status === 'PLAYER_PEEKING' && peeker === 'PLAYER';

  // PRIVACY-SAFE carrot resolution per box.
  //  - During a peek, the ONLY box that may reveal a carrot is the LOCAL player's own box,
  //    and only using the private peek result (playerBoxHasCarrot). The opponent's box
  //    contents are NEVER known to this client until the authoritative RESULT reveal.
  //  - On reveal/result, carrotBox is the server-disclosed authoritative location.
  const resolveBoxCarrot = (boxId: BoxId): boolean => {
    if (isRevealed) {
      return carrotBox === boxId;
    }
    // Before reveal: only during active PLAYER_PEEKING phase may local player's own box show a carrot
    if (status === 'PLAYER_PEEKING' && peeker === 'PLAYER' && playerBox === boxId && playerBoxHasCarrot === true) {
      return true;
    }
    // Debug visibility (single-player dev aid) shows carrot in its true box.
    if (debugVisibility) {
      return carrotBox === boxId;
    }
    return false;
  };

  const boxAIsPlayers = playerBox === 'BOX_A';
  const boxBIsPlayers = playerBox === 'BOX_B';
  const boxAHasCarrot = resolveBoxCarrot('BOX_A');
  const boxBHasCarrot = resolveBoxCarrot('BOX_B');

  const graphicsQuality = (typeof localStorage !== 'undefined' && localStorage.getItem('carrot_graphics_quality')) || 'HIGH';
  const dpr: [number, number] | number = graphicsQuality === 'LOW' ? 1 : graphicsQuality === 'MEDIUM' ? [1, 1.5] : [1, 2];

  return (
    <div className="scene-container">
      <Canvas
        shadows={graphicsQuality !== 'LOW'}
        dpr={dpr}
        camera={{ position: [0, 1.48, 1.40], fov: 55 }}
        gl={{ antialias: graphicsQuality !== 'LOW', alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0f172a');
        }}
      >
        <Suspense fallback={null}>
          <EnvironmentLighting />
          <CameraController status={status} />

          {/* 3D Room Architecture & Environment */}
          <Room />
          <Table />
          
          {/* Seated Living Opponent across the table */}
          <OpponentCharacter status={status} winner={winner} />

          {/* First-Person Player Hands on table */}
          <PlayerHands status={status} isPeeking={status === 'PLAYER_PEEKING'} />

          {/* 3D Floating Emote Reactions */}
          <EmoteBubble3D activeEmote={gameState.activeEmote} />

          {/* BOX A */}
          <BoxComponent
            boxId="BOX_A"
            label="BOX A"
            targetPosition={boxAPos}
            isPeeking={boxAPeeking}
            isPlayerPeeking={peeker === 'PLAYER'}
            isOpen={isRevealed}
            hasCarrot={boxAHasCarrot}
            status={status}
            isPlayerBox={boxAIsPlayers}
            debugVisibility={debugVisibility}
          />

          {/* BOX B */}
          <BoxComponent
            boxId="BOX_B"
            label="BOX B"
            targetPosition={boxBPos}
            isPeeking={boxBPeeking}
            isPlayerPeeking={peeker === 'PLAYER'}
            isOpen={isRevealed}
            hasCarrot={boxBHasCarrot}
            status={status}
            isPlayerBox={boxBIsPlayers}
            debugVisibility={debugVisibility}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
