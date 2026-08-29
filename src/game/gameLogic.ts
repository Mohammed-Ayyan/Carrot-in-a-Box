import { BoxId } from './types';

/**
 * Isolated function to determine which box contains the carrot.
 * In Phase 1 local prototype, this is randomly chosen (50/50).
 * In future multiplayer phases, this interface will be backed by server-authoritative state.
 */
export function getCarrotBox(): BoxId {
  return Math.random() < 0.5 ? 'BOX_A' : 'BOX_B';
}
