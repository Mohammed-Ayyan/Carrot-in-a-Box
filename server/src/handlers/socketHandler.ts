import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/events';
import { validateSession } from '../services/session';
import { sanitizeAndModerateChat } from '../services/profanity';
import { joinQueue, leaveQueue, tryMatch } from '../services/matchmaking';
import {
  createRoom,
  createCustomRoom,
  joinCustomRoom,
  getRoom,
  getRoomByPlayerId,
  transitionPhase,
  playerPeek,
  submitDecision,
  calculateResult,
  resetForRematch,
  markDisconnected,
  markReconnected,
  destroyRoom,
  getPublicState,
} from '../services/gameEngine';
import { canSendChatMessage, sanitizeChatMessage } from '../services/chatLimiter';
import { config } from '../config';
import { GameRoom, PlayerDecision } from '../types/game';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Server-defined statement allowlist. The client sends the statement text; we match it
// to a canonical id + text here. Arbitrary client text is rejected.
const STATEMENTS: { id: string; text: string }[] = [
  { id: 'CONFIDENT_CLAIM', text: "I definitely have the carrot in my box! Swap with me!" },
  { id: 'REVERSE_PSYCHOLOGY', text: "My box is completely empty... keep your box if you dare!" },
  { id: 'POKER_FACE', text: "I'm saying nothing. Look at my poker face." },
];

/** Match client-provided text (loosely) to a known server statement. */
function resolveStatement(message: string): { id: string; text: string } | null {
  if (typeof message !== 'string') return null;
  const norm = message.trim().toLowerCase();
  // Exact/startsWith match against canonical texts, or match by id.
  return (
    STATEMENTS.find((s) => s.text.toLowerCase() === norm) ||
    STATEMENTS.find((s) => s.id.toLowerCase() === norm) ||
    STATEMENTS.find((s) => norm.length > 0 && s.text.toLowerCase().startsWith(norm.slice(0, 12))) ||
    null
  );
}

export function setupSocketHandlers(io: TypedServer): void {
  // Authentication middleware
  io.use(async (socket: TypedSocket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const session = await validateSession(token);
    if (!session) {
      return next(new Error('Invalid or expired session'));
    }

    socket.data.playerId = session.playerId;
    socket.data.nickname = session.nickname;
    socket.data.sessionToken = token;
    next();
  });

  io.on('connection', (socket: TypedSocket) => {
    const { playerId, nickname } = socket.data;
    console.log(`[Socket] Player connected: ${nickname} (${playerId})`);

    // Check if player was in a room (reconnection)
    const existingRoom = getRoomByPlayerId(playerId);
    if (existingRoom) {
      handleReconnection(io, socket, existingRoom);
    }

    // ─── MATCHMAKING & ROOMS ──────────────────────────────────
    socket.on('join_matchmaking', async () => {
      // Prevent joining if already in a game
      if (getRoomByPlayerId(playerId)) {
        socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'You are already in a game' });
        return;
      }

      const position = await joinQueue({
        playerId,
        nickname,
        joinedAt: Date.now(),
        socketId: socket.id,
      });

      socket.emit('matchmaking_joined', { position });

      // Try to find a match
      await attemptMatch(io);
    });

    socket.on('leave_matchmaking', async () => {
      await leaveQueue(playerId);
    });

    socket.on('create_room', () => {
      if (getRoomByPlayerId(playerId)) {
        socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'You are already in a room or game' });
        return;
      }

      const room = createCustomRoom({ playerId, nickname });
      socket.join(room.roomId);
      (socket as any).data.roomId = room.roomId;

      socket.emit('room_created', { roomCode: room.roomCode!, roomId: room.roomId });
      socket.emit('game_state', getPublicState(room, playerId));
    });

    socket.on('join_room_by_code', ({ roomCode }) => {
      if (getRoomByPlayerId(playerId)) {
        socket.emit('error', { code: 'ALREADY_IN_GAME', message: 'You are already in a room or game' });
        return;
      }

      const { room, error } = joinCustomRoom(roomCode, { playerId, nickname });
      if (error || !room) {
        if (error === 'FULL') {
          socket.emit('error', { code: 'ROOM_FULL', message: 'Room is full' });
        } else {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        }
        return;
      }

      socket.join(room.roomId);
      (socket as any).data.roomId = room.roomId;

      const opponentSocket = getOpponentSocket(io, room, playerId);
      socket.emit('room_joined', {
        roomCode: room.roomCode!,
        roomId: room.roomId,
        opponent: { nickname: room.player1.nickname }
      });

      if (opponentSocket) {
        opponentSocket.emit('room_joined', {
          roomCode: room.roomCode!,
          roomId: room.roomId,
          opponent: { nickname }
        });
      }

      transitionPhase(room, 'MATCH_FOUND');
      broadcastGameState(io, room);

      const timer = setTimeout(() => {
        startGame(io, room);
      }, 2000);
      room.timers.push(timer);
    });

    // ─── GAME ACTIONS ────────────────────────────────────────
    socket.on('peek_box', () => {
      const room = getRoomByPlayerId(playerId);
      if (!room) {
        socket.emit('error', { code: 'NOT_IN_GAME', message: 'Not in a game room' });
        return;
      }

      const result = playerPeek(room, playerId);
      if (!result) {
        console.warn(`[PEEK] REJECTED room=${room.roomId} player=${playerId} phase=${room.phase} (not peeker / wrong phase / already peeked)`);
        socket.emit('error', { code: 'INVALID_PEEK', message: 'Cannot peek now' });
        return;
      }

      // Send result ONLY to the peeking player (NEVER logged with its carrot value).
      console.log(`[PRIVATE] sending peek result to player=${playerId} room=${room.roomId}`);
      socket.emit('peek_result', result);

      // Notify opponent that peek happened (NO carrot info in this event).
      const opponentSocket = getOpponentSocket(io, room, playerId);
      if (opponentSocket) {
        console.log(`[PUBLIC] opponent_peeking broadcast room=${room.roomId} peeker=${playerId}`);
        opponentSocket.emit('opponent_peeked');
      }

      // Transition to discussion phase after a short delay
      const timer = setTimeout(() => {
        if (transitionPhase(room, 'DISCUSSION_PHASE')) {
          broadcastPhaseChange(io, room);
          startDiscussionTimer(io, room);
        }
      }, 2000);
      room.timers.push(timer);
    });

    socket.on('send_bluff', ({ message }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) {
        socket.emit('error', { code: 'NOT_IN_MATCH', message: 'Not in a game room' });
        return;
      }

      // Only the peeker may make a statement, and only during peek/discussion.
      if (room.phase !== 'DISCUSSION_PHASE' && room.phase !== 'PLAYER_PEEK_PHASE') {
        socket.emit('error', { code: 'INVALID_PHASE', message: 'Cannot send a statement now' });
        return;
      }
      if (playerId !== room.peekerId) {
        socket.emit('error', { code: 'NOT_YOUR_TURN', message: 'Only the peeker can make a statement' });
        return;
      }
      // A statement may only be submitted once per round.
      if (room.bluffStatementId !== null) {
        socket.emit('error', { code: 'ALREADY_SUBMITTED', message: 'Statement already submitted' });
        return;
      }

      // Validate against the server-defined statement allowlist. The client sends the
      // statement text; we match it to a known id and use the canonical server text.
      const statement = resolveStatement(message);
      if (!statement) {
        socket.emit('error', { code: 'INVALID_STATEMENT', message: 'Unknown statement' });
        return;
      }

      room.bluffStatementId = statement.id;
      console.log(`[STATEMENT] room=${room.roomId} peeker=${playerId} statement=${statement.id}`);

      // Confirm to the peeker.
      socket.emit('statement_submitted', { statementId: statement.id, text: statement.text });

      // Broadcast the statement PUBLICLY to the opponent (carries no carrot info).
      const opponentSocket = getOpponentSocket(io, room, playerId);
      if (opponentSocket) {
        opponentSocket.emit('bluff_received', { message: statement.text, from: nickname });
        opponentSocket.emit('opponent_statement', {
          playerId,
          displayName: nickname,
          statementId: statement.id,
          text: statement.text,
        });
      }

      // Advance immediately to the decision phase (don't make players wait out the full
      // discussion timer once the statement is in).
      if (room.phase === 'DISCUSSION_PHASE') {
        clearRoomTimers(room);
        advanceToDecision(io, room);
      } else if (room.phase === 'PLAYER_PEEK_PHASE') {
        // Peek→discussion transition is still pending; go to discussion then decision.
        clearRoomTimers(room);
        if (transitionPhase(room, 'DISCUSSION_PHASE')) {
          broadcastPhaseChange(io, room);
          advanceToDecision(io, room);
        }
      }
    });

    socket.on('submit_decision', ({ decision }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) {
        socket.emit('error', { code: 'NOT_IN_GAME', message: 'Not in a game room' });
        return;
      }

      const { valid, bothDecided } = submitDecision(room, playerId, decision);
      if (!valid) {
        socket.emit('error', { code: 'INVALID_DECISION', message: 'Cannot submit decision now' });
        return;
      }

      // Notify both players a decision was made
      broadcastToRoom(io, room, 'decision_received', { playerId });

      if (bothDecided) {
        // Move to reveal
        clearRoomTimers(room);
        handleReveal(io, room);
      }
    });

    // ─── CHAT & EMOTES ───────────────────────────────────────
    socket.on('chat_message', async ({ text }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) return;

      const allowed = await canSendChatMessage(playerId);
      if (!allowed) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Sending too fast' });
        return;
      }

      const sanitized = sanitizeAndModerateChat(text);
      if (!sanitized) return;

      broadcastToRoom(io, room, 'chat_message', {
        sender: nickname,
        text: sanitized,
        timestamp: Date.now(),
      });
    });

    socket.on('send_emote', ({ emoteId }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) return;
      if (typeof emoteId !== 'string') return;
      broadcastToRoom(io, room, 'emote_received', {
        sender: nickname,
        emoteId,
      });
    });

    // ─── VOICE SIGNALING ─────────────────────────────────────
    socket.on('voice_offer', ({ sdp }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) return;
      const opponentSocket = getOpponentSocket(io, room, playerId);
      if (opponentSocket) {
        opponentSocket.emit('voice_offer', { sdp });
      }
    });

    socket.on('voice_answer', ({ sdp }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) return;
      const opponentSocket = getOpponentSocket(io, room, playerId);
      if (opponentSocket) {
        opponentSocket.emit('voice_answer', { sdp });
      }
    });

    socket.on('ice_candidate', ({ candidate }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) return;
      const opponentSocket = getOpponentSocket(io, room, playerId);
      if (opponentSocket) {
        opponentSocket.emit('ice_candidate', { candidate });
      }
    });

    socket.on('voice_mute', ({ isMuted }) => {
      const room = getRoomByPlayerId(playerId);
      if (!room) return;
      const opponentSocket = getOpponentSocket(io, room, playerId);
      if (opponentSocket) {
        opponentSocket.emit('voice_peer_mute', { playerId, isMuted });
      }
    });

    // ─── REMATCH ─────────────────────────────────────────────
    socket.on('request_rematch', () => {
      const room = getRoomByPlayerId(playerId);
      if (!room || room.phase !== 'RESULT') return;

      room.rematchRequests.add(playerId);

      if (room.rematchRequests.size === 2) {
        // Both players want rematch
        transitionPhase(room, 'REMATCH_PENDING');
        resetForRematch(room);
        broadcastToRoom(io, room, 'rematch_accepted', undefined as any);

        // Start new round
        startGame(io, room);
      } else {
        // Notify opponent
        const opponentSocket = getOpponentSocket(io, room, playerId);
        if (opponentSocket) {
          opponentSocket.emit('rematch_requested', { playerId });
        }
      }
    });

    socket.on('decline_rematch', () => {
      const room = getRoomByPlayerId(playerId);
      if (!room) return;

      transitionPhase(room, 'ENDED');
      broadcastToRoom(io, room, 'rematch_declined', undefined as any);
      broadcastToRoom(io, room, 'game_ended', { reason: 'Opponent declined rematch' });
      destroyRoom(room.roomId);
    });

    // ─── HEARTBEAT ───────────────────────────────────────────
    socket.on('heartbeat', () => {
      // Just receiving it keeps the connection alive
    });

    // ─── DISCONNECT ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[Socket] Player disconnected: ${nickname} (${playerId})`);

      // Remove from matchmaking
      await leaveQueue(playerId);

      // Handle game disconnection
      const room = getRoomByPlayerId(playerId);
      if (room) {
        markDisconnected(room, playerId);

        // Notify opponent
        const opponentSocket = getOpponentSocket(io, room, playerId);
        if (opponentSocket) {
          opponentSocket.emit('opponent_disconnected', {
            reconnectWindow: config.game.reconnectWindowSeconds,
          });
        }

        // Start reconnection timer
        const timer = setTimeout(() => {
          const currentRoom = getRoom(room.roomId);
          if (!currentRoom) return;

          const player = currentRoom.player1.playerId === playerId
            ? currentRoom.player1
            : currentRoom.player2;

          if (player && !player.connected) {
            // Player didn't reconnect in time
            transitionPhase(currentRoom, 'ENDED');
            const opSock = getOpponentSocket(io, currentRoom, playerId);
            if (opSock) {
              opSock.emit('game_ended', { reason: 'Opponent disconnected' });
            }
            destroyRoom(currentRoom.roomId);
          }
        }, config.game.reconnectWindowSeconds * 1000);
        room.timers.push(timer);
      }
    });
  });
}

// ─── HELPER FUNCTIONS ──────────────────────────────────────────

async function attemptMatch(io: TypedServer): Promise<void> {
  const match = await tryMatch();
  if (!match) return;

  const { player1, player2, roomId } = match;

  // Resolve the live sockets for both matched players by playerId (socket ids can go
  // stale). If EITHER player is no longer connected, abort the match and re-queue the
  // survivor — never start a game with a ghost/one player.
  const p1Sockets = findSocketsByPlayerId(io, player1.playerId);
  const p2Sockets = findSocketsByPlayerId(io, player2.playerId);

  if (p1Sockets.length === 0 || p2Sockets.length === 0) {
    console.warn(`[MATCH] aborted room=${roomId}: a matched player is no longer connected`);
    const survivor = p1Sockets.length > 0 ? player1 : p2Sockets.length > 0 ? player2 : null;
    if (survivor) {
      await joinQueue({ ...survivor, joinedAt: Date.now() });
      // Try again in case there is another waiting player.
      await attemptMatch(io);
    }
    return;
  }

  // Create the game room only now that BOTH players are confirmed connected.
  const room = createRoom(roomId, player1, player2);
  console.log(`[MATCH] room=${roomId} p1=${player1.playerId}(${player1.nickname}) p2=${player2.playerId}(${player2.nickname})`);

  // Join socket room
  for (const s of p1Sockets) {
    s.join(roomId);
    (s as any).data.roomId = roomId;
  }
  for (const s of p2Sockets) {
    s.join(roomId);
    (s as any).data.roomId = roomId;
  }

  // Notify both players
  transitionPhase(room, 'MATCH_FOUND');

  for (const s of p1Sockets) {
    (s as unknown as TypedSocket).emit('match_found', {
      roomId,
      opponent: { nickname: player2.nickname },
    });
  }
  for (const s of p2Sockets) {
    (s as unknown as TypedSocket).emit('match_found', {
      roomId,
      opponent: { nickname: player1.nickname },
    });
  }
  // Immediately push initial public state so both clients get names/boxes right away
  // (names also flow via game_state on GAME_STARTING, this is just faster).
  broadcastGameState(io, room);

  // Start game after brief delay
  const timer = setTimeout(() => {
    startGame(io, room);
  }, 2000);
  room.timers.push(timer);
}

function startGame(io: TypedServer, room: GameRoom): void {
  transitionPhase(room, 'GAME_STARTING');
  broadcastGameState(io, room);

  // Move to peek phase after animation time
  const timer = setTimeout(() => {
    if (transitionPhase(room, 'PLAYER_PEEK_PHASE')) {
      broadcastPhaseChange(io, room);
    }
  }, 3000);
  room.timers.push(timer);
}

function startDiscussionTimer(io: TypedServer, room: GameRoom): void {
  const durationMs = config.game.discussionPhaseSeconds * 1000;
  room.phaseDeadline = Date.now() + durationMs;
  broadcastGameState(io, room); // push the fresh deadline to clients
  const timer = setTimeout(() => {
    if (room.phase === 'DISCUSSION_PHASE') {
      advanceToDecision(io, room);
    }
  }, durationMs);
  room.timers.push(timer);
}

function advanceToDecision(io: TypedServer, room: GameRoom): void {
  if (room.phase !== 'DISCUSSION_PHASE') return;
  if (transitionPhase(room, 'DECISION_PHASE')) {
    broadcastPhaseChange(io, room);
    startDecisionTimer(io, room);
  }
}

function startDecisionTimer(io: TypedServer, room: GameRoom): void {
  const durationMs = config.game.decisionPhaseSeconds * 1000;
  room.phaseDeadline = Date.now() + durationMs;
  broadcastGameState(io, room); // push the fresh deadline to clients
  const timer = setTimeout(() => {
    if (room.phase === 'DECISION_PHASE') {
      // Auto-submit KEEP if chooser didn't decide in time (idempotent — resolve once).
      const chooserId = room.chooserId;
      if (room.decisions[chooserId] === null) {
        room.decisions[chooserId] = 'KEEP_BOX';
      }
      handleReveal(io, room);
    }
  }, durationMs);
  room.timers.push(timer);
}

function handleReveal(io: TypedServer, room: GameRoom): void {
  if (!transitionPhase(room, 'REVEAL_PHASE')) return;
  broadcastPhaseChange(io, room);

  // After reveal animation, show result
  const timer = setTimeout(() => {
    const result = calculateResult(room);
    transitionPhase(room, 'RESULT');

    // Send personalized results to each player
    const sockets = io.sockets.adapter.rooms.get(room.roomId);
    if (sockets) {
      for (const socketId of sockets) {
        const sock = io.sockets.sockets.get(socketId) as TypedSocket | undefined;
        if (sock) {
          const pid = sock.data.playerId;
          const opponentId = room.player2
            ? (pid === room.player1.playerId ? room.player2.playerId : room.player1.playerId)
            : '';

          sock.emit('game_result', {
            ...result,
            yourDecision: room.decisions[pid] || null,
            opponentDecision: opponentId ? (room.decisions[opponentId] || null) : null,
          });
        }
      }
    }
  }, 3000);
  room.timers.push(timer);
}

function handleReconnection(io: TypedServer, socket: TypedSocket, room: GameRoom): void {
  const { playerId, nickname } = socket.data;

  markReconnected(room, playerId);
  socket.join(room.roomId);
  socket.data.roomId = room.roomId;

  // Send current state to reconnecting player
  socket.emit('game_state', getPublicState(room, playerId));

  // Notify opponent
  const opponentSocket = getOpponentSocket(io, room, playerId);
  if (opponentSocket) {
    opponentSocket.emit('opponent_reconnected');
  }

  console.log(`[Socket] Player reconnected: ${nickname} to room ${room.roomId}`);
}

/** Find all live sockets belonging to a given playerId. */
function findSocketsByPlayerId(io: TypedServer, playerId: string): TypedSocket[] {
  const matches: TypedSocket[] = [];
  for (const sock of io.sockets.sockets.values()) {
    const s = sock as unknown as TypedSocket;
    if (s.data?.playerId === playerId) matches.push(s);
  }
  return matches;
}

function getOpponentSocket(io: TypedServer, room: GameRoom, playerId: string): TypedSocket | null {
  if (!room.player2) return null;
  const opponentId = room.player1.playerId === playerId
    ? room.player2.playerId
    : room.player1.playerId;

  const sockets = io.sockets.adapter.rooms.get(room.roomId);
  if (!sockets) return null;

  for (const socketId of sockets) {
    const sock = io.sockets.sockets.get(socketId) as TypedSocket | undefined;
    if (sock && sock.data.playerId === opponentId) {
      return sock;
    }
  }
  return null;
}

function broadcastToRoom(io: TypedServer, room: GameRoom, event: string, data: any): void {
  io.to(room.roomId).emit(event as any, data);
}

function broadcastGameState(io: TypedServer, room: GameRoom): void {
  const sockets = io.sockets.adapter.rooms.get(room.roomId);
  if (!sockets) return;

  for (const socketId of sockets) {
    const sock = io.sockets.sockets.get(socketId) as TypedSocket | undefined;
    if (sock) {
      sock.emit('game_state', getPublicState(room, sock.data.playerId));
    }
  }
}

function broadcastPhaseChange(io: TypedServer, room: GameRoom): void {
  let timeRemaining: number | undefined;
  if (room.phase === 'DISCUSSION_PHASE') {
    timeRemaining = config.game.discussionPhaseSeconds * 1000;
  } else if (room.phase === 'DECISION_PHASE') {
    timeRemaining = config.game.decisionPhaseSeconds * 1000;
  }

  io.to(room.roomId).emit('phase_change', {
    phase: room.phase,
    timeRemaining,
  });

  // Also send full state update
  broadcastGameState(io, room);
}

function clearRoomTimers(room: GameRoom): void {
  room.timers.forEach((t) => clearTimeout(t));
  room.timers = [];
}
