export type GameStatus =
  | 'MENU'
  | 'WAITING' // In matchmaking queue, waiting for a real second player. NOT in a game.
  | 'DEALING'
  | 'PEEKING'
  | 'BLUFF'
  | 'DECISION'
  | 'PLAYER_PEEKING'
  | 'PLAYER_BLUFFING'
  | 'AI_THINKING'
  | 'AI_DECISION'
  | 'SWAPPING'
  | 'REVEALING'
  | 'RESULT';

export type BoxId = 'BOX_A' | 'BOX_B';

export type Peeker = 'PLAYER' | 'OPPONENT';

export type PlayerChoice = 'SWAP' | 'KEEP';

export type Winner = 'PLAYER' | 'OPPONENT';

export type LobbyState = 'MAIN_MENU' | 'SEARCHING' | 'CREATE_WAITING' | 'JOIN_INPUT' | 'IN_GAME';

export type VoiceState = 'OFF' | 'CONNECTING' | 'CONNECTED' | 'MUTED' | 'PERMISSION_DENIED' | 'FAILED';

export type VoiceSetupStatus = 'PENDING' | 'REQUESTING' | 'GRANTED' | 'DENIED' | 'SKIPPED';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}

export type EmoteId = '😂' | '😏' | '😮' | '😎' | '🤔' | '😈' | '😱' | '🤥' | '🥕' | '👏' | '🔥' | '👍' | '👀';

export interface ActiveEmote {
  sender: 'PLAYER' | 'OPPONENT';
  emoteId: EmoteId;
  timestamp: number;
}

export interface GameStateData {
  status: GameStatus;
  peeker: Peeker; // 50/50 randomly assigned per round
  playerBox: BoxId; // Box currently held by Player (User)
  opponentBox: BoxId; // Box currently held by Opponent
  carrotBox: BoxId; // Actual box containing the carrot (ONLY authoritative once revealed in RESULT)
  bluffText: string; // Bluff statement (by Opponent or Player)
  playerBluffIndex: number | null;
  opponentSawCarrot: boolean;
  playerSawCarrot: boolean;
  playerChoice: PlayerChoice | null; // Decision made by Player (when Opponent peeks)
  aiChoice: PlayerChoice | null; // Decision made by AI Opponent (when Player peeks)
  winner: Winner | null;
  round: number;
  score: {
    player: number;
    opponent: number;
  };
  isMuted: boolean;
  debugVisibility: boolean;

  // Active emote trigger
  activeEmote: ActiveEmote | null;

  // Display names for multiplayer. In single-player these stay at defaults.
  playerName: string;
  opponentName: string;

  // Room & Lobby system
  roomCode: string | null;
  lobbyState: LobbyState;

  // WebRTC Voice Chat & Setup
  voiceState: VoiceState;
  voiceSetupStatus: VoiceSetupStatus;
  isMicMuted: boolean;
  peerMicMuted: boolean;

  // Text Chat System
  chatMessages: ChatMessage[];
  unreadChatCount: number;
  isChatOpen: boolean;

  // First-Time Tutorial
  showTutorial: boolean;

  // Server-authoritative countdown for the current timed phase, in whole seconds.
  // null when the current phase has no timer. Clients only DISPLAY this; the server
  // decides when the deadline actually passes.
  phaseSecondsRemaining: number | null;

  // ─── PRIVACY-SAFE MULTIPLAYER FIELDS ───────────────────────────
  playerBoxHasCarrot: boolean | null;
  isRevealed: boolean;
}

export type StateChangeListener = (state: GameStateData) => void;

export interface IGameEngine {
  getState(): GameStateData;
  subscribe(listener: StateChangeListener): () => void;
  startGame(): void;
  makeChoice(choice: PlayerChoice): void;
  selectPlayerBluff(bluffIndex: number, statement: string): void;
  sendEmote(emoteId: EmoteId): void;
  resetRound(): void;
  returnToLobby(): void;
  toggleMute(): void;
  getIsMuted(): boolean;
}
