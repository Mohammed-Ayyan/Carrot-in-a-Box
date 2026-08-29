import { randomUUID } from 'crypto';
import {
  GamePhase,
  GameRoom,
  PlayerRole,
  PlayerDecision,
  PublicGameState,
  PeekResult,
  GameResult,
  VALID_TRANSITIONS,
  PlayerInfo,
} from '../types/game';
import { getRedis, KEYS } from './redis';
import { config } from '../config';

// In-memory store for active game rooms and room codes
const activeRooms = new Map<string, GameRoom>();
const roomCodeMap = new Map<string, string>(); // roomCode -> roomId

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a unique 6-character alphanumeric room code (unambiguous characters).
 */
export function generateRoomCode(): string {
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
  } while (roomCodeMap.has(code));
  return code;
}

/**
 * Create a custom room waiting for a second player with a 6-character room code.
 */
export function createCustomRoom(
  hostPlayer: { playerId: string; nickname: string }
): GameRoom {
  const roomId = randomUUID();
  const roomCode = generateRoomCode();
  const peekerIsHost = Math.random() < 0.5;
  const carrotOwner: PlayerRole = Math.random() < 0.5 ? 'PLAYER_1' : 'PLAYER_2';

  const room: GameRoom = {
    roomId,
    roomCode,
    isCustomRoom: true,
    hostPlayerId: hostPlayer.playerId,
    status: 'WAITING',
    createdAt: Date.now(),
    player1: {
      playerId: hostPlayer.playerId,
      nickname: hostPlayer.nickname,
      role: 'PLAYER_1',
      peekRole: peekerIsHost ? 'PEEKER' : 'CHOOSER',
      connected: true,
    },
    player2: null,
    phase: 'WAITING_FOR_PLAYERS',
    carrotOwner,
    round: 1,
    score: { player1: 0, player2: 0 },
    peekerId: hostPlayer.playerId,
    chooserId: hostPlayer.playerId,
    peeked: false,
    decisions: {
      [hostPlayer.playerId]: null,
    },
    rematchRequests: new Set(),
    phaseStartedAt: Date.now(),
    phaseDeadline: null,
    bluffStatementId: null,
    timers: [],
  };

  activeRooms.set(roomId, room);
  roomCodeMap.set(roomCode, roomId);
  return room;
}

/**
 * Join a custom room using a 6-character room code.
 */
export function joinCustomRoom(
  roomCode: string,
  joinPlayer: { playerId: string; nickname: string }
): { room?: GameRoom; error?: 'NOT_FOUND' | 'FULL' } {
  const cleanCode = roomCode.trim().toUpperCase();
  const roomId = roomCodeMap.get(cleanCode);
  if (!roomId) return { error: 'NOT_FOUND' };

  const room = activeRooms.get(roomId);
  if (!room) {
    roomCodeMap.delete(cleanCode);
    return { error: 'NOT_FOUND' };
  }

  if (room.player1.playerId === joinPlayer.playerId) {
    return { room };
  }

  if (room.player2) {
    if (room.player2.playerId === joinPlayer.playerId) {
      return { room };
    }
    return { error: 'FULL' };
  }

  const peekerIsP1 = room.player1.peekRole === 'PEEKER';
  room.player2 = {
    playerId: joinPlayer.playerId,
    nickname: joinPlayer.nickname,
    role: 'PLAYER_2',
    peekRole: peekerIsP1 ? 'CHOOSER' : 'PEEKER',
    connected: true,
  };
  room.chooserId = peekerIsP1 ? joinPlayer.playerId : room.player1.playerId;
  room.peekerId = peekerIsP1 ? room.player1.playerId : joinPlayer.playerId;
  room.decisions[joinPlayer.playerId] = null;
  room.status = 'READY';

  return { room };
}

/**
 * Create a new game room for two matched players.
 */
export function createRoom(
  roomId: string,
  player1: { playerId: string; nickname: string },
  player2: { playerId: string; nickname: string }
): GameRoom {
  // Randomly assign who peeks first
  const peekerIsPlayer1 = Math.random() < 0.5;

  // Randomly place the carrot
  const carrotOwner: PlayerRole = Math.random() < 0.5 ? 'PLAYER_1' : 'PLAYER_2';

  const room: GameRoom = {
    roomId,
    player1: {
      playerId: player1.playerId,
      nickname: player1.nickname,
      role: 'PLAYER_1',
      peekRole: peekerIsPlayer1 ? 'PEEKER' : 'CHOOSER',
      connected: true,
    },
    player2: {
      playerId: player2.playerId,
      nickname: player2.nickname,
      role: 'PLAYER_2',
      peekRole: peekerIsPlayer1 ? 'CHOOSER' : 'PEEKER',
      connected: true,
    },
    phase: 'WAITING_FOR_PLAYERS',
    carrotOwner,
    round: 1,
    score: { player1: 0, player2: 0 },
    peekerId: peekerIsPlayer1 ? player1.playerId : player2.playerId,
    chooserId: peekerIsPlayer1 ? player2.playerId : player1.playerId,
    peeked: false,
    decisions: {
      [player1.playerId]: null,
      [player2.playerId]: null,
    },
    rematchRequests: new Set(),
    phaseStartedAt: Date.now(),
    phaseDeadline: null,
    bluffStatementId: null,
    timers: [],
  };

  activeRooms.set(roomId, room);
  return room;
}

/**
 * Get a room by ID.
 */
export function getRoom(roomId: string): GameRoom | undefined {
  return activeRooms.get(roomId);
}

/**
 * Get a room by player ID.
 */
export function getRoomByPlayerId(playerId: string): GameRoom | undefined {
  for (const room of activeRooms.values()) {
    if (room.player1.playerId === playerId || (room.player2 && room.player2.playerId === playerId)) {
      return room;
    }
  }
  return undefined;
}

/**
 * Transition the room to a new phase. Validates the transition.
 */
export function transitionPhase(room: GameRoom, newPhase: GamePhase): boolean {
  const validNext = VALID_TRANSITIONS[room.phase];
  if (!validNext.includes(newPhase)) {
    console.warn(`[GameEngine] Invalid transition: ${room.phase} -> ${newPhase}`);
    return false;
  }

  room.phase = newPhase;
  room.phaseStartedAt = Date.now();
  return true;
}

/**
 * Player peeks at their own box.
 * Returns the peek result (private to that player).
 */
export function playerPeek(room: GameRoom, playerId: string): PeekResult | null {
  // Validate phase
  if (room.phase !== 'PLAYER_PEEK_PHASE') {
    return null;
  }

  // Validate this is the peeker
  if (playerId !== room.peekerId) {
    return null;
  }

  // Check if already peeked
  if (room.peeked) {
    return null;
  }

  room.peeked = true;

  // Determine if the peeker's box has the carrot
  const peekerRole = getPlayerRole(room, playerId);
  const containsCarrot = room.carrotOwner === peekerRole;

  return { containsCarrot };
}

/**
 * Submit a player's decision (KEEP_BOX or SWAP_BOX).
 * Only the chooser can submit a decision.
 */
export function submitDecision(
  room: GameRoom,
  playerId: string,
  decision: PlayerDecision
): { valid: boolean; bothDecided: boolean } {
  // Only allow during decision phase
  if (room.phase !== 'DECISION_PHASE') {
    return { valid: false, bothDecided: false };
  }

  // Only the chooser decides
  if (playerId !== room.chooserId) {
    return { valid: false, bothDecided: false };
  }

  // Already submitted
  if (room.decisions[playerId] !== null) {
    return { valid: false, bothDecided: false };
  }

  room.decisions[playerId] = decision;

  // In this game, only the chooser decides, so we move forward immediately
  return { valid: true, bothDecided: true };
}

/**
 * Calculate the game result after the reveal phase.
 */
export function calculateResult(room: GameRoom): GameResult {
  const chooserDecision = room.decisions[room.chooserId];

  // If chooser swaps, the carrot ownership perception swaps
  // The chooser "takes" the peeker's box if they SWAP
  let winnerRole: PlayerRole;

  if (chooserDecision === 'SWAP_BOX') {
    // Chooser now has the peeker's box
    // If carrot was with peeker (carrotOwner === peekerRole), chooser wins
    const peekerRole = getPlayerRole(room, room.peekerId);
    winnerRole = room.carrotOwner === peekerRole ? getPlayerRole(room, room.chooserId) : peekerRole;
  } else {
    // Chooser keeps their own box
    // If carrot is with chooser, chooser wins
    const chooserRole = getPlayerRole(room, room.chooserId);
    winnerRole = room.carrotOwner === chooserRole ? chooserRole : getPlayerRole(room, room.peekerId);
  }

  // Update score
  if (winnerRole === 'PLAYER_1') {
    room.score.player1++;
  } else {
    room.score.player2++;
  }

  const winnerInfo = (room.player2 && winnerRole === 'PLAYER_2') ? room.player2 : room.player1;

  return {
    winner: winnerRole,
    winnerPlayerId: winnerInfo.playerId,
    winnerNickname: winnerInfo.nickname,
    carrotOwner: room.carrotOwner,
    yourDecision: null, // Filled per-player on send
    opponentDecision: null,
  };
}

/**
 * Reset the room for a new round (rematch).
 */
export function resetForRematch(room: GameRoom): void {
  if (!room.player2) return;

  // Swap peek roles
  const prevPeekerId = room.peekerId;
  room.peekerId = room.chooserId;
  room.chooserId = prevPeekerId;

  // Update player peekRoles
  room.player1.peekRole = room.player1.playerId === room.peekerId ? 'PEEKER' : 'CHOOSER';
  room.player2.peekRole = room.player2.playerId === room.peekerId ? 'PEEKER' : 'CHOOSER';

  // New carrot placement
  room.carrotOwner = Math.random() < 0.5 ? 'PLAYER_1' : 'PLAYER_2';
  room.peeked = false;
  room.round++;
  room.decisions = {
    [room.player1.playerId]: null,
    [room.player2.playerId]: null,
  };
  room.rematchRequests = new Set();
  room.phaseStartedAt = Date.now();
  room.phaseDeadline = null;
  room.bluffStatementId = null;

  // Clear timers
  room.timers.forEach((t) => clearTimeout(t));
  room.timers = [];
}

/**
 * Mark a player as disconnected.
 */
export function markDisconnected(room: GameRoom, playerId: string): void {
  if (room.player1.playerId === playerId) {
    room.player1.connected = false;
  } else if (room.player2 && room.player2.playerId === playerId) {
    room.player2.connected = false;
  }
}

/**
 * Mark a player as reconnected.
 */
export function markReconnected(room: GameRoom, playerId: string): void {
  if (room.player1.playerId === playerId) {
    room.player1.connected = true;
  } else if (room.player2 && room.player2.playerId === playerId) {
    room.player2.connected = true;
  }
}

/**
 * Remove a room entirely.
 */
export function destroyRoom(roomId: string): void {
  const room = activeRooms.get(roomId);
  if (room) {
    room.timers.forEach((t) => clearTimeout(t));
    if (room.roomCode) {
      roomCodeMap.delete(room.roomCode);
    }
    activeRooms.delete(roomId);
  }
}

/**
 * Get the sanitized public game state for a specific player.
 * Never reveals the carrot location.
 */
export function getPublicState(room: GameRoom, playerId: string): PublicGameState {
  const isPlayer1 = room.player1.playerId === playerId;
  const you = isPlayer1 ? room.player1 : room.player2;
  const opponent = isPlayer1 ? room.player2 : room.player1;

  // Prefer the explicit authoritative deadline when set; fall back to elapsed-based.
  let phaseTimeRemaining: number | undefined;
  if (room.phaseDeadline !== null) {
    phaseTimeRemaining = Math.max(0, room.phaseDeadline - Date.now());
  } else {
    const elapsed = Date.now() - room.phaseStartedAt;
    if (room.phase === 'DISCUSSION_PHASE') {
      phaseTimeRemaining = Math.max(0, config.game.discussionPhaseSeconds * 1000 - elapsed);
    } else if (room.phase === 'DECISION_PHASE') {
      phaseTimeRemaining = Math.max(0, config.game.decisionPhaseSeconds * 1000 - elapsed);
    }
  }

  return {
    roomId: room.roomId,
    roomCode: room.roomCode,
    phase: room.phase,
    round: room.round,
    score: room.score,
    you: you ? {
      playerId: you.playerId,
      nickname: you.nickname,
      role: you.role,
      peekRole: you.peekRole,
    } : {
      playerId,
      nickname: 'Player',
      role: 'PLAYER_1',
      peekRole: 'PEEKER',
    },
    opponent: opponent ? {
      playerId: opponent.playerId,
      nickname: opponent.nickname,
      role: opponent.role,
      peekRole: opponent.peekRole,
      connected: opponent.connected,
    } : null,
    peekerId: room.peekerId,
    chooserId: room.chooserId,
    peeked: room.peeked,
    phaseTimeRemaining,
    bluffStatementId: room.bluffStatementId,
  };
}

/**
 * Get the role of a player in the room.
 */
function getPlayerRole(room: GameRoom, playerId: string): PlayerRole {
  return room.player1.playerId === playerId ? 'PLAYER_1' : 'PLAYER_2';
}

/**
 * Get all active rooms (for debugging/admin).
 */
export function getActiveRooms(): Map<string, GameRoom> {
  return activeRooms;
}
