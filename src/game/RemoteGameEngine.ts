import { io, Socket } from 'socket.io-client';
import type { BoxId as BoxIdLocal, EmoteId, GameStateData, IGameEngine, LobbyState, PlayerChoice, StateChangeListener, VoiceState } from './types';
import { voiceManager } from './VoiceManager';

const ADJECTIVES = ['Clever', 'Sneaky', 'Brave', 'Mighty', 'Curious', 'Swift', 'Witty', 'Cosmic', 'Golden', 'Shadow'];
const NOUNS = ['Carrot', 'Bunny', 'Rabbit', 'Bandit', 'Master', 'Finder', 'Ninja', 'Fox', 'Wizard', 'Hero'];

export function generateRandomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`;
}

// Extended interface for multiplayer features
export interface IRemoteGameEngine extends IGameEngine {
  connect(serverUrl: string, sessionToken: string): Promise<void>;
  disconnect(): void;
  joinMatchmaking(): void;
  leaveMatchmaking(): void;
  createRoom(): void;
  joinRoomByCode(code: string): void;
  setLobbyState(lobbyState: LobbyState): void;
  toggleVoiceMic(): void;
  peekBox(): void;
  submitDecision(decision: 'KEEP_BOX' | 'SWAP_BOX'): void;
  sendBluff(message: string): void;
  sendChatMessage(text: string): void;
  requestRematch(): void;
  declineRematch(): void;
  onMatchFound(cb: (data: { roomId: string; opponent: { nickname: string } }) => void): void;
  onPhaseChange(cb: (data: { phase: string; timeRemaining?: number }) => void): void;
  onPeekResult(cb: (data: { containsCarrot: boolean }) => void): void;
  onOpponentPeeked(cb: () => void): void;
  onBluffReceived(cb: (data: { message: string; from: string }) => void): void;
  onGameResult(cb: (data: any) => void): void;
  onChatMessage(cb: (data: { sender: string; text: string; timestamp: number }) => void): void;
  onOpponentDisconnected(cb: (data: { reconnectWindow: number }) => void): void;
  onOpponentReconnected(cb: () => void): void;
  onGameEnded(cb: (data: { reason: string }) => void): void;
  onRematchRequested(cb: (data: { playerId: string }) => void): void;
  onRematchAccepted(cb: () => void): void;
  onRematchDeclined(cb: () => void): void;
  onError(cb: (data: { code: string; message: string }) => void): void;
  // WebRTC signaling
  sendVoiceOffer(sdp: RTCSessionDescriptionInit): void;
  sendVoiceAnswer(sdp: RTCSessionDescriptionInit): void;
  sendIceCandidate(candidate: RTCIceCandidateInit): void;
  onVoiceOffer(cb: (data: { sdp: RTCSessionDescriptionInit }) => void): void;
  onVoiceAnswer(cb: (data: { sdp: RTCSessionDescriptionInit }) => void): void;
  onIceCandidate(cb: (data: { candidate: RTCIceCandidateInit }) => void): void;
}

const DEBUG = (import.meta as any).env?.DEV === true;
function log(...args: unknown[]) {
  if (DEBUG) console.log('[RemoteGameEngine]', ...args);
}

/**
 * PUBLIC game state received from the server. Contains NO carrot information.
 * Mirrors the server's PublicGameState.
 */
interface PublicServerState {
  phase?: string;
  round?: number;
  score?: { player1: number; player2: number };
  you?: { playerId: string; nickname: string; role: string; peekRole: 'PEEKER' | 'CHOOSER' };
  opponent?: { playerId: string; nickname: string; role: string; peekRole: string; connected: boolean };
  peekerId?: string;
  chooserId?: string;
  peeked?: boolean;
}

export class RemoteGameEngine implements IRemoteGameEngine {
  private socket: Socket | null = null;
  private listeners: Set<StateChangeListener> = new Set();
  private state: GameStateData;
  private connected = false;

  // The last PUBLIC state from the server. Kept separate from any private data
  // so that phase re-evaluation never loses the server's authoritative fields.
  private publicState: PublicServerState = {};

  // PRIVATE peek result — exists ONLY on this client, only after this player peeks.
  // Never sent to the opponent, never placed into any broadcast payload.
  private privateBoxHasCarrot: boolean | null = null;

  // Tracks whether we have already requested a peek this round (prevents double-peek).
  private peekRequested = false;

  // Local countdown ticker. The server sends an authoritative deadline; we tick the
  // displayed seconds down locally between server updates. The server still decides
  // when the phase actually ends.
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private phaseDeadlineMs: number | null = null;

  constructor() {
    // Initialize with default menu state
    this.state = {
      status: 'MENU',
      peeker: 'OPPONENT',
      playerBox: 'BOX_B',
      opponentBox: 'BOX_A',
      carrotBox: 'BOX_A', // Placeholder — NEVER authoritative until RESULT reveal
      bluffText: '',
      playerBluffIndex: null,
      opponentSawCarrot: false,
      playerSawCarrot: false,
      playerChoice: null,
      aiChoice: null,
      winner: null,
      round: 1,
      score: { player: 0, opponent: 0 },
      isMuted: false,
      debugVisibility: false,
      activeEmote: null,
      playerName: 'You',
      opponentName: 'Opponent',
      roomCode: null,
      lobbyState: 'MAIN_MENU',
      voiceState: 'OFF',
      voiceSetupStatus: 'PENDING',
      isMicMuted: false,
      peerMicMuted: false,
      chatMessages: [],
      unreadChatCount: 0,
      isChatOpen: false,
      showTutorial: false,
      phaseSecondsRemaining: null,
      playerBoxHasCarrot: null,
      isRevealed: false,
    };
  }

  // ─── IGameEngine Implementation ─────────────────────────────

  getState(): GameStateData {
    return { ...this.state };
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  startGame(): void {
    this.joinMatchmaking();
  }

  makeChoice(choice: PlayerChoice): void {
    const decision = choice === 'SWAP' ? 'SWAP_BOX' : 'KEEP_BOX';
    this.submitDecision(decision);
  }

  selectPlayerBluff(bluffIndex: number, statement: string): void {
    this.sendBluff(statement);
  }

  resetRound(): void {
    this.requestRematch();
  }

  toggleMute(): void {
    this.state = { ...this.state, isMuted: !this.state.isMuted };
    this.notify();
  }

  getIsMuted(): boolean {
    return this.state.isMuted;
  }

  // ─── Remote-specific methods ─────────────────────────────────

  async connect(serverUrl: string, sessionToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect WebRTC VoiceManager signaling callbacks
      voiceManager.setCallbacks({
        onSignalOffer: (sdp) => this.sendVoiceOffer(sdp),
        onSignalAnswer: (sdp) => this.sendVoiceAnswer(sdp),
        onSignalIceCandidate: (candidate) => this.sendIceCandidate(candidate),
        onVoiceStateChange: (vState) => {
          this.state = { ...this.state, voiceState: vState };
          this.notify();
        },
      });

      this.socket = io(serverUrl, {
        auth: { token: sessionToken },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('[RemoteGameEngine] Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (err: Error) => {
        console.error('[RemoteGameEngine] Connection error:', err.message);
        reject(err);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        voiceManager.stopVoice();
        console.log('[RemoteGameEngine] Disconnected');
      });

      // ─── ROOMS & LOBBY EVENTS ─────────────────────────────────
      this.socket.on('room_created', (data: { roomCode: string; roomId: string }) => {
        log('room_created', data.roomCode);
        this.state = { ...this.state, roomCode: data.roomCode, lobbyState: 'CREATE_WAITING' };
        this.notify();
      });

      this.socket.on('room_joined', (data: { roomCode: string; roomId: string; opponent: { nickname: string } }) => {
        log('room_joined', data.roomCode);
        this.state = {
          ...this.state,
          roomCode: data.roomCode,
          opponentName: data.opponent.nickname,
          lobbyState: 'IN_GAME',
        };
        this.notify();
      });

      // ─── PUBLIC state (contains NO carrot info) ──────────────
      this.socket.on('game_state', (serverState: PublicServerState) => {
        log('game_state', serverState.phase, 'peekRole=', serverState.you?.peekRole);
        this.publicState = serverState;
        if (serverState.phase && serverState.phase !== 'WAITING_FOR_PLAYERS') {
          this.state.lobbyState = 'IN_GAME';
        }
        this.applyState();
      });

      this.socket.on('phase_change', (data: { phase: string; timeRemaining?: number }) => {
        log('phase_change', data.phase);
        // Merge only the phase into the cached public state — never lose `you`/`peekerId`.
        this.publicState = { ...this.publicState, phase: data.phase };
        this.applyState();
      });

      // ─── PRIVATE peek result (this client only) ──────────────
      this.socket.on('peek_result', (data: { containsCarrot: boolean }) => {
        log('PRIVATE peek_result received (own box) containsCarrot=', data.containsCarrot);
        this.privateBoxHasCarrot = data.containsCarrot;
        this.applyState();
      });

      // Opponent peeked — carries NO carrot info. Used only for their animation.
      this.socket.on('opponent_peeked', () => {
        log('opponent_peeked (no carrot info)');
        this.applyState();
      });

      // ─── PUBLIC statement from the opponent (the chooser sees this) ──────
      this.socket.on('bluff_received', (data: { message: string; from: string }) => {
        log('bluff_received from', data.from);
        this.state = { ...this.state, bluffText: data.message };
        this.notify();
      });

      // Confirmation to the peeker that their statement was accepted.
      this.socket.on('statement_submitted', (data: { statementId: string; text: string }) => {
        log('statement_submitted', data.statementId);
        this.state = { ...this.state, bluffText: data.text };
        this.notify();
      });

      // Emote received broadcast
      this.socket.on('emote_received', (data: { sender: string; emoteId: string }) => {
        const isSelf = data.sender === this.state.playerName;
        this.state = {
          ...this.state,
          activeEmote: {
            sender: isSelf ? 'PLAYER' : 'OPPONENT',
            emoteId: data.emoteId as EmoteId,
            timestamp: Date.now(),
          },
        };
        this.notify();
      });

      // ─── AUTHORITATIVE reveal (RESULT phase only) ────────────
      this.socket.on('game_result', (result: {
        winner: string;
        carrotOwner: string;
        yourDecision: string | null;
        opponentDecision: string | null;
      }) => {
        log('game_result winner=', result.winner, 'carrotOwner=', result.carrotOwner);
        this.applyResult(result);
      });

      // Reset private state on rematch / new round.
      this.socket.on('rematch_accepted', () => {
        this.resetRoundLocalState();
      });

      // ─── WEBRTC VOICE SIGNALING ──────────────────────────────
      this.socket.on('voice_offer', async (data: { sdp: RTCSessionDescriptionInit }) => {
        await voiceManager.handleOffer(data.sdp);
      });

      this.socket.on('voice_answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
        await voiceManager.handleAnswer(data.sdp);
      });

      this.socket.on('ice_candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        await voiceManager.handleIceCandidate(data.candidate);
      });

      this.socket.on('voice_peer_mute', (data: { playerId: string; isMuted: boolean }) => {
        this.state = { ...this.state, peerMicMuted: data.isMuted };
        this.notify();
      });

      // ─── REAL-TIME TEXT CHAT ──────────────────────────────────
      this.socket.on('chat_message', (data: { sender: string; text: string; timestamp: number }) => {
        const isSelf = data.sender === this.state.playerName;
        const newMsg = {
          id: `${data.timestamp}-${Math.random()}`,
          sender: data.sender,
          text: data.text,
          timestamp: data.timestamp,
          isSelf,
        };
        const updatedMessages = [...this.state.chatMessages, newMsg];
        const newUnread = !this.state.isChatOpen && !isSelf ? this.state.unreadChatCount + 1 : this.state.unreadChatCount;
        this.state = {
          ...this.state,
          chatMessages: updatedMessages,
          unreadChatCount: newUnread,
        };
        this.notify();
      });
    });
  }

  /** Clears private/round-scoped state at the start of a fresh round. */
  public resetRoundLocalState(): void {
    this.stopCountdown();
    this.privateBoxHasCarrot = null;
    this.peekRequested = false;
    this.phaseDeadlineMs = null;
    this.state = {
      ...this.state,
      status: 'DEALING',
      playerBoxHasCarrot: null,
      playerSawCarrot: false,
      opponentSawCarrot: false,
      isRevealed: false,
      winner: null,
      playerChoice: null,
      aiChoice: null,
      carrotBox: 'BOX_A',
      bluffText: '',
      playerBluffIndex: null,
      phaseSecondsRemaining: null,
    };
    this.notify();
  }

  disconnect(): void {
    this.stopCountdown();
    voiceManager.stopVoice();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  joinMatchmaking(): void {
    if (!this.socket) return;
    this.socket.emit('join_matchmaking', { sessionToken: '' });
    this.state = { ...this.state, status: 'WAITING', lobbyState: 'SEARCHING' };
    this.notify();
  }

  leaveMatchmaking(): void {
    if (!this.socket) return;
    this.socket.emit('leave_matchmaking');
    this.state = { ...this.state, status: 'MENU', lobbyState: 'MAIN_MENU', roomCode: null };
    this.notify();
  }

  createRoom(): void {
    if (!this.socket) return;
    this.socket.emit('create_room');
    this.state = { ...this.state, lobbyState: 'CREATE_WAITING', status: 'MENU' };
    this.notify();
  }

  joinRoomByCode(roomCode: string): void {
    if (!this.socket) return;
    const cleanCode = roomCode.trim().toUpperCase();
    this.socket.emit('join_room_by_code', { roomCode: cleanCode });
  }

  setLobbyState(lobbyState: LobbyState): void {
    this.state = { ...this.state, lobbyState };
    this.notify();
  }

  toggleVoiceMic(): void {
    const currentState = voiceManager.getState();
    if (currentState === 'OFF' || currentState === 'PERMISSION_DENIED' || currentState === 'FAILED') {
      const isInitiator = this.publicState.you?.role === 'PLAYER_1';
      log('Starting voice capture via toggle button (isInitiator=', isInitiator, ')');
      voiceManager.startVoice(isInitiator);
    } else {
      const isMuted = voiceManager.toggleMute();
      this.state = {
        ...this.state,
        isMicMuted: isMuted,
        voiceState: isMuted ? 'MUTED' : voiceManager.getState()
      };
      if (this.socket) {
        this.socket.emit('voice_mute', { isMuted });
      }
      this.notify();
    }
  }

  async requestVoicePermission(): Promise<void> {
    const isInitiator = this.publicState.you?.role === 'PLAYER_1';
    this.state = { ...this.state, voiceSetupStatus: 'REQUESTING' };
    this.notify();
    await voiceManager.startVoice(isInitiator);
    const vState = voiceManager.getState();
    const status = vState === 'PERMISSION_DENIED' ? 'DENIED' : 'GRANTED';
    this.state = { ...this.state, voiceSetupStatus: status };
    this.notify();
  }

  skipVoiceSetup(): void {
    this.state = { ...this.state, voiceSetupStatus: 'SKIPPED' };
    this.notify();
  }

  toggleChatPanel(open?: boolean): void {
    const nextOpen = open !== undefined ? open : !this.state.isChatOpen;
    this.state = {
      ...this.state,
      isChatOpen: nextOpen,
      unreadChatCount: nextOpen ? 0 : this.state.unreadChatCount,
    };
    this.notify();
  }

  closeTutorial(): void {
    try {
      localStorage.setItem('carrot_tutorial_seen', 'true');
    } catch {}
    this.state = { ...this.state, showTutorial: false };
    this.notify();
  }

  checkTutorialNeeded(): void {
    let seen = false;
    try {
      seen = localStorage.getItem('carrot_tutorial_seen') === 'true';
    } catch {}
    if (!seen) {
      this.state = { ...this.state, showTutorial: true };
      this.notify();
    }
  }

  peekBox(): void {
    if (!this.socket) return;
    this.socket.emit('peek_box');
  }

  submitDecision(decision: 'KEEP_BOX' | 'SWAP_BOX'): void {
    if (!this.socket) return;
    this.socket.emit('submit_decision', { decision });
  }

  sendBluff(message: string): void {
    if (!this.socket) return;
    this.socket.emit('send_bluff', { message });
  }

  sendEmote(emoteId: EmoteId): void {
    if (!this.socket) return;
    this.socket.emit('send_emote', { emoteId });
  }

  sendChatMessage(text: string): void {
    if (!this.socket) return;
    this.socket.emit('chat_message', { text });
  }

  returnToLobby(): void {
    this.declineRematch();
    this.leaveMatchmaking();
  }

  requestRematch(): void {
    if (!this.socket) return;
    this.socket.emit('request_rematch');
  }

  declineRematch(): void {
    if (!this.socket) return;
    this.socket.emit('decline_rematch');
  }

  // ─── WebRTC Signaling ────────────────────────────────────────

  sendVoiceOffer(sdp: RTCSessionDescriptionInit): void {
    if (!this.socket) return;
    this.socket.emit('voice_offer', { sdp });
  }

  sendVoiceAnswer(sdp: RTCSessionDescriptionInit): void {
    if (!this.socket) return;
    this.socket.emit('voice_answer', { sdp });
  }

  sendIceCandidate(candidate: RTCIceCandidateInit): void {
    if (!this.socket) return;
    this.socket.emit('ice_candidate', { candidate });
  }

  onVoiceOffer(cb: (data: { sdp: RTCSessionDescriptionInit }) => void): void {
    this.socket?.off('voice_offer');
    this.socket?.on('voice_offer', cb);
  }

  onVoiceAnswer(cb: (data: { sdp: RTCSessionDescriptionInit }) => void): void {
    this.socket?.off('voice_answer');
    this.socket?.on('voice_answer', cb);
  }

  onIceCandidate(cb: (data: { candidate: RTCIceCandidateInit }) => void): void {
    this.socket?.off('ice_candidate');
    this.socket?.on('ice_candidate', cb);
  }

  // ─── Event Listeners ─────────────────────────────────────────

  onMatchFound(cb: (data: { roomId: string; opponent: { nickname: string } }) => void): void {
    this.socket?.off('match_found');
    this.socket?.on('match_found', cb);
  }

  onPhaseChange(cb: (data: { phase: string; timeRemaining?: number }) => void): void {
    this.socket?.off('phase_change');
    this.socket?.on('phase_change', cb as any);
  }

  onPeekResult(cb: (data: { containsCarrot: boolean }) => void): void {
    this.socket?.off('peek_result');
    this.socket?.on('peek_result', cb);
  }

  onOpponentPeeked(cb: () => void): void {
    this.socket?.off('opponent_peeked');
    this.socket?.on('opponent_peeked', cb);
  }

  onBluffReceived(cb: (data: { message: string; from: string }) => void): void {
    this.socket?.off('bluff_received');
    this.socket?.on('bluff_received', cb);
  }

  onGameResult(cb: (data: any) => void): void {
    this.socket?.off('game_result');
    this.socket?.on('game_result', cb);
  }

  onChatMessage(cb: (data: { sender: string; text: string; timestamp: number }) => void): void {
    this.socket?.off('chat_message');
    this.socket?.on('chat_message', cb);
  }

  onOpponentDisconnected(cb: (data: { reconnectWindow: number }) => void): void {
    this.socket?.off('opponent_disconnected');
    this.socket?.on('opponent_disconnected', cb);
  }

  onOpponentReconnected(cb: () => void): void {
    this.socket?.off('opponent_reconnected');
    this.socket?.on('opponent_reconnected', cb);
  }

  onGameEnded(cb: (data: { reason: string }) => void): void {
    this.socket?.off('game_ended');
    this.socket?.on('game_ended', cb);
  }

  onRematchRequested(cb: (data: { playerId: string }) => void): void {
    this.socket?.off('rematch_requested');
    this.socket?.on('rematch_requested', cb);
  }

  onRematchAccepted(cb: () => void): void {
    this.socket?.off('rematch_accepted');
    this.socket?.on('rematch_accepted', cb);
  }

  onRematchDeclined(cb: (data: { reason?: string }) => void): void {
    this.socket?.off('rematch_declined');
    this.socket?.on('rematch_declined', cb);
  }

  onError(cb: (data: { code: string; message: string }) => void): void {
    this.socket?.off('error');
    this.socket?.on('error', cb);
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  /**
   * Derive the visual GameStateData from the cached PUBLIC server state plus this
   * client's PRIVATE peek result. This is the single source of the frontend view.
   *
   * Privacy invariant: the only carrot-related field this ever sets before RESULT is
   * `playerBoxHasCarrot`, and that comes exclusively from THIS client's own peek_result.
   */
  private applyState(): void {
    const s = this.publicState;
    const phase = s.phase || 'MENU';
    const isPeeker = s.you?.peekRole === 'PEEKER';
    const serverRound = s.round ?? this.state.round;

    // Detect if we entered a new round or if server reset phase to GAME_STARTING/MATCH_FOUND
    const isNewRound = serverRound > this.state.round;
    const isGameStarting = phase === 'GAME_STARTING' || phase === 'MATCH_FOUND';
    const isNonResultPhase = phase !== 'RESULT' && phase !== 'REVEAL_PHASE';

    // If entering a new round or restarting phase from RESULT, clear local peek/timer variables
    if (isNewRound || (isGameStarting && (this.state.status === 'RESULT' || this.state.winner !== null))) {
      this.stopCountdown();
      this.privateBoxHasCarrot = null;
      this.peekRequested = false;
      this.phaseDeadlineMs = null;
    }

    // Auto-initiate WebRTC voice chat on game start for Player 1 (initiator)
    if (isGameStarting && voiceManager.getState() === 'OFF' && s.you?.role === 'PLAYER_1') {
      log('Auto-initiating WebRTC voice chat as Player 1');
      voiceManager.startVoice(true);
    }

    // Map the server phase + this player's role to the existing visual status names.
    const statusMap: Record<string, GameStateData['status']> = {
      WAITING_FOR_PLAYERS: (this.state.lobbyState === 'CREATE_WAITING' || this.state.lobbyState === 'JOIN_INPUT') ? 'MENU' : 'DEALING',
      MATCH_FOUND: 'DEALING',
      GAME_STARTING: 'DEALING',
      PLAYER_PEEK_PHASE: isPeeker ? 'PLAYER_PEEKING' : 'PEEKING',
      DISCUSSION_PHASE: isPeeker ? 'PLAYER_BLUFFING' : 'BLUFF',
      DECISION_PHASE: s.you?.peekRole === 'CHOOSER' ? 'DECISION' : 'AI_THINKING',
      REVEAL_PHASE: 'REVEALING',
      RESULT: 'RESULT',
      REMATCH_PENDING: 'RESULT',
      ENDED: 'MENU',
    };

    const status = statusMap[phase] || 'MENU';

    // Set up the authoritative countdown for timed phases (discussion + decision).
    const timeRemainingMs = (s as any).phaseTimeRemaining as number | undefined;
    if ((phase === 'DISCUSSION_PHASE' || phase === 'DECISION_PHASE') && typeof timeRemainingMs === 'number') {
      this.phaseDeadlineMs = Date.now() + timeRemainingMs;
      this.startCountdown();
    } else {
      this.phaseDeadlineMs = null;
      this.stopCountdown();
    }

    // Local player is ALWAYS represented as BOX_B (near side), opponent as BOX_A (far side).
    // This keeps each player's own box physically in front of them on their own screen.
    const playerBox: BoxIdLocal = 'BOX_B';
    const opponentBox: BoxIdLocal = 'BOX_A';
    // `peeker` drives which side animates: PLAYER if we are the peeker, else OPPONENT.
    const peeker: 'PLAYER' | 'OPPONENT' = isPeeker ? 'PLAYER' : 'OPPONENT';

    // Auto-request the peek exactly once when we enter our own peek phase.
    if (phase === 'PLAYER_PEEK_PHASE' && isPeeker && !this.peekRequested) {
      this.peekRequested = true;
      log('auto peek_box (we are peeker)');
      this.peekBox();
    }

    // If the authoritative result already arrived for THIS round, preserve its fields.
    // Otherwise in active non-result phases, result fields MUST be cleared.
    const resultAlreadyApplied = phase === 'RESULT' && this.state.status === 'RESULT' && this.state.winner !== null && !isNewRound;

    const isRevealed = (phase === 'REVEAL_PHASE' || phase === 'RESULT') && resultAlreadyApplied;

    // Reset statement/decision fields when transitioning into a fresh round or early round phases
    const shouldClearRoundArtifacts = isNewRound || isGameStarting || phase === 'PLAYER_PEEK_PHASE';

    this.state = {
      ...this.state,
      status,
      peeker,
      playerBox,
      opponentBox,
      playerName: s.you?.nickname ?? this.state.playerName,
      opponentName: s.opponent?.nickname ?? this.state.opponentName,
      phaseSecondsRemaining: this.computeSecondsRemaining(),
      round: serverRound,
      score: {
        // score.player always maps to THIS client's own score regardless of P1/P2 role.
        player: this.myScore(),
        opponent: this.opponentScore(),
      },
      winner: isNonResultPhase ? null : (resultAlreadyApplied ? this.state.winner : null),
      playerChoice: isNonResultPhase ? null : (resultAlreadyApplied ? this.state.playerChoice : null),
      aiChoice: isNonResultPhase ? null : (resultAlreadyApplied ? this.state.aiChoice : null),
      bluffText: shouldClearRoundArtifacts ? '' : this.state.bluffText,
      playerBluffIndex: shouldClearRoundArtifacts ? null : this.state.playerBluffIndex,
      carrotBox: resultAlreadyApplied ? this.state.carrotBox : (this.state.carrotBox || 'BOX_A'),
      playerBoxHasCarrot: resultAlreadyApplied
        ? this.state.playerBoxHasCarrot
        : isPeeker
        ? this.privateBoxHasCarrot
        : null,
      playerSawCarrot: isPeeker && this.privateBoxHasCarrot === true,
      isRevealed: (phase === 'REVEAL_PHASE' || phase === 'RESULT') && resultAlreadyApplied,
    };
    this.notify();
  }

  private computeSecondsRemaining(): number | null {
    if (this.phaseDeadlineMs === null) return null;
    return Math.max(0, Math.ceil((this.phaseDeadlineMs - Date.now()) / 1000));
  }

  private startCountdown(): void {
    if (this.countdownTimer) return; // already ticking
    this.countdownTimer = setInterval(() => {
      const secs = this.computeSecondsRemaining();
      // Update the displayed countdown each second without a server round-trip.
      this.state = { ...this.state, phaseSecondsRemaining: secs };
      this.notify();
      if (secs === null || secs <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private myScore(): number {
    const role = this.publicState.you?.role;
    const sc = this.publicState.score;
    if (!sc) return this.state.score.player;
    return role === 'PLAYER_1' ? sc.player1 : sc.player2;
  }

  private opponentScore(): number {
    const role = this.publicState.you?.role;
    const sc = this.publicState.score;
    if (!sc) return this.state.score.opponent;
    return role === 'PLAYER_1' ? sc.player2 : sc.player1;
  }

  /**
   * Apply the AUTHORITATIVE result. This is the ONLY place carrotBox is set to a real
   * value, and only in the RESULT phase after the server disclosed carrotOwner.
   */
  private applyResult(result: { winner: string; carrotOwner: string; yourDecision: string | null }): void {
    const myRole = this.publicState.you?.role;
    const iWon = result.winner === myRole;

    // Map the disclosed carrotOwner (PLAYER_1/PLAYER_2) onto our local box scheme.
    // Local player is BOX_B, opponent is BOX_A.
    const carrotIsMine = result.carrotOwner === myRole;
    const carrotBox: BoxIdLocal = carrotIsMine ? 'BOX_B' : 'BOX_A';

    this.state = {
      ...this.state,
      status: 'RESULT',
      isRevealed: true,
      winner: iWon ? 'PLAYER' : 'OPPONENT',
      carrotBox,
      playerBoxHasCarrot: carrotIsMine,
      playerChoice: result.yourDecision === 'SWAP_BOX' ? 'SWAP' : result.yourDecision === 'KEEP_BOX' ? 'KEEP' : this.state.playerChoice,
    };
    this.notify();
  }
}

export const remoteGameEngine = new RemoteGameEngine();
