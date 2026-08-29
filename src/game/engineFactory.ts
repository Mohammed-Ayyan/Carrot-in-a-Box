/**
 * Engine Factory — Returns the appropriate game engine based on configuration.
 *
 * Set VITE_MULTIPLAYER=true in your .env to use the remote engine.
 * Otherwise falls back to LocalGameEngine for offline/dev use.
 */

import { IGameEngine } from './types';
import { localGameEngine } from './LocalGameEngine';

// Lazy import to avoid loading socket.io-client when not needed
let remoteInstance: IGameEngine | null = null;

export function getGameEngine(): IGameEngine {
  const useMultiplayer = (import.meta as any).env?.VITE_MULTIPLAYER === 'true';

  if (useMultiplayer) {
    if (!remoteInstance) {
      // Dynamic import handled at build time by Vite
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { RemoteGameEngine } = require('./RemoteGameEngine');
      remoteInstance = new RemoteGameEngine();
    }
    return remoteInstance!;
  }

  return localGameEngine;
}

/**
 * For direct import when you know which engine you want:
 *
 * import { localGameEngine } from './LocalGameEngine';
 * import { remoteGameEngine } from './RemoteGameEngine';
 */
