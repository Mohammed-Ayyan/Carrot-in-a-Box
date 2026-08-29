/**
 * IGameEngine — Clean API Contract
 *
 * Both LocalGameEngine and RemoteGameEngine implement this interface.
 * The frontend components should depend on this interface, not a specific implementation.
 *
 * Usage:
 *   import { getGameEngine } from './engineFactory';
 *   const engine = getGameEngine(); // Returns Local or Remote based on config
 */

import { GameStateData, PlayerChoice, StateChangeListener } from './types';

export interface IGameEngine {
  /** Get current game state snapshot */
  getState(): GameStateData;

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: StateChangeListener): () => void;

  /** Start a new game (local) or join matchmaking (remote) */
  startGame(): void;

  /** Make a SWAP/KEEP choice (when you are the chooser) */
  makeChoice(choice: PlayerChoice): void;

  /** Select and send a bluff statement (when you are the peeker) */
  selectPlayerBluff(bluffIndex: number, statement: string): void;

  /** Start a new round / request rematch */
  resetRound(): void;

  /** Toggle audio mute */
  toggleMute(): void;

  /** Get current mute state */
  getIsMuted(): boolean;
}
