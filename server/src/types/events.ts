// ============================================================
// SOCKET.IO EVENT DEFINITIONS
// ============================================================

import { GamePhase, GameResult, PeekResult, PlayerDecision, PublicGameState } from './game';

// WebRTC types (these are browser globals, so we define minimal shapes for the server)
interface RTCSessionDescriptionInit {
  type?: string;
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

// Client → Server events
export interface ClientToServerEvents {
  // Matchmaking & Rooms
  join_matchmaking: (data: { sessionToken: string }) => void;
  leave_matchmaking: () => void;
  create_room: () => void;
  join_room_by_code: (data: { roomCode: string }) => void;

  // Game actions
  peek_box: () => void;
  submit_decision: (data: { decision: PlayerDecision }) => void;
  send_bluff: (data: { message: string }) => void;

  // Chat & Emotes
  chat_message: (data: { text: string }) => void;
  send_emote: (data: { emoteId: string }) => void;

  // Voice signaling (WebRTC)
  voice_offer: (data: { sdp: RTCSessionDescriptionInit }) => void;
  voice_answer: (data: { sdp: RTCSessionDescriptionInit }) => void;
  ice_candidate: (data: { candidate: RTCIceCandidateInit }) => void;
  voice_mute: (data: { isMuted: boolean }) => void;

  // Rematch
  request_rematch: () => void;
  decline_rematch: () => void;

  // Connection
  heartbeat: () => void;
}

// Server → Client events
export interface ServerToClientEvents {
  // Matchmaking & Rooms
  matchmaking_joined: (data: { position: number }) => void;
  matchmaking_status: (data: { position: number; estimatedWait: number }) => void;
  match_found: (data: { roomId: string; opponent: { nickname: string } }) => void;
  room_created: (data: { roomCode: string; roomId: string }) => void;
  room_joined: (data: { roomCode: string; roomId: string; opponent: { nickname: string } }) => void;

  // Game state
  game_state: (state: PublicGameState) => void;
  phase_change: (data: { phase: GamePhase; timeRemaining?: number }) => void;
  peek_result: (data: PeekResult) => void;
  opponent_peeked: () => void;
  bluff_received: (data: { message: string; from: string }) => void;
  statement_submitted: (data: { statementId: string; text: string }) => void;
  opponent_statement: (data: { playerId: string; displayName: string; statementId: string; text: string }) => void;
  decision_received: (data: { playerId: string }) => void;
  game_result: (data: GameResult) => void;

  // Chat & Emotes
  chat_message: (data: { sender: string; text: string; timestamp: number }) => void;
  emote_received: (data: { sender: string; emoteId: string }) => void;

  // Voice signaling
  voice_offer: (data: { sdp: RTCSessionDescriptionInit }) => void;
  voice_answer: (data: { sdp: RTCSessionDescriptionInit }) => void;
  ice_candidate: (data: { candidate: RTCIceCandidateInit }) => void;
  voice_peer_mute: (data: { playerId: string; isMuted: boolean }) => void;

  // Rematch
  rematch_requested: (data: { playerId: string }) => void;
  rematch_accepted: () => void;
  rematch_declined: () => void;

  // Connection
  opponent_disconnected: (data: { reconnectWindow: number }) => void;
  opponent_reconnected: () => void;
  game_ended: (data: { reason: string }) => void;

  // Errors
  error: (data: { code: string; message: string }) => void;
}

// Inter-server events (for scaling)
export interface InterServerEvents {
  ping: () => void;
}

// Socket data attached to each connection
export interface SocketData {
  playerId: string;
  nickname: string;
  sessionToken: string;
  roomId?: string;
}
