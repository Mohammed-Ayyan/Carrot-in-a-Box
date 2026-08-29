// ============================================================
// SHARED TYPES — Game State Machine & Contracts
// ============================================================

export type GamePhase =
  | 'WAITING_FOR_PLAYERS'
  | 'MATCH_FOUND'
  | 'GAME_STARTING'
  | 'PLAYER_PEEK_PHASE'
  | 'DISCUSSION_PHASE'
  | 'DECISION_PHASE'
  | 'REVEAL_PHASE'
  | 'RESULT'
  | 'REMATCH_PENDING'
  | 'ENDED';

export type PlayerRole = 'PLAYER_1' | 'PLAYER_2';

export type BoxId = 'BOX_A' | 'BOX_B';

export type PeekRole = 'PEEKER' | 'CHOOSER';

export type PlayerDecision = 'KEEP_BOX' | 'SWAP_BOX';

export interface PlayerInfo {
  playerId: string;
  nickname: string;
  role: PlayerRole;
  peekRole: PeekRole;
  connected: boolean;
}

export interface GameRoom {
  roomId: string;
  roomCode?: string;
  isCustomRoom?: boolean;
  hostPlayerId?: string;
  status?: string;
  createdAt?: number;
  player1: PlayerInfo;
  player2: PlayerInfo | null;
  phase: GamePhase;
  carrotOwner: PlayerRole; // SECRET — never sent to clients
  round: number;
  score: { player1: number; player2: number };
  peekerId: string; // playerId of the peeker this round
  chooserId: string; // playerId of the chooser this round
  peeked: boolean;
  decisions: {
    [playerId: string]: PlayerDecision | null;
  };
  rematchRequests: Set<string>;
  phaseStartedAt: number;
  // Absolute epoch-ms deadline for the current timed phase (DISCUSSION/DECISION), or
  // null for phases without a timer. Clients compute remaining = deadline - now.
  phaseDeadline: number | null;
  // The peeker's chosen statement id this round (public once submitted), or null.
  bluffStatementId: string | null;
  timers: NodeJS.Timeout[];
}

// What the server sends to each client (sanitized)
export interface PublicGameState {
  roomId: string;
  roomCode?: string;
  phase: GamePhase;
  round: number;
  score: { player1: number; player2: number };
  you: {
    playerId: string;
    nickname: string;
    role: PlayerRole;
    peekRole: PeekRole;
  };
  opponent: {
    playerId: string;
    nickname: string;
    role: PlayerRole;
    peekRole: PeekRole;
    connected: boolean;
  } | null;
  peekerId: string;
  chooserId: string;
  peeked: boolean;
  phaseTimeRemaining?: number;
  // The peeker's chosen statement id, public once submitted (safe — carries no carrot info).
  bluffStatementId?: string | null;
}

export interface PeekResult {
  containsCarrot: boolean;
}

export interface GameResult {
  winner: PlayerRole;
  winnerPlayerId: string;
  winnerNickname: string;
  carrotOwner: PlayerRole;
  yourDecision: PlayerDecision | null;
  opponentDecision: PlayerDecision | null;
}

// Valid phase transitions
export const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  'WAITING_FOR_PLAYERS': ['MATCH_FOUND'],
  'MATCH_FOUND': ['GAME_STARTING'],
  'GAME_STARTING': ['PLAYER_PEEK_PHASE'],
  'PLAYER_PEEK_PHASE': ['DISCUSSION_PHASE'],
  'DISCUSSION_PHASE': ['DECISION_PHASE'],
  'DECISION_PHASE': ['REVEAL_PHASE'],
  'REVEAL_PHASE': ['RESULT'],
  'RESULT': ['REMATCH_PENDING', 'GAME_STARTING', 'ENDED'],
  'REMATCH_PENDING': ['GAME_STARTING', 'ENDED'],
  'ENDED': [],
};
