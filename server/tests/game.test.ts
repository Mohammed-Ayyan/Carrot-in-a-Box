import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRoom,
  createCustomRoom,
  joinCustomRoom,
  generateRoomCode,
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
} from '../src/services/gameEngine';
import { GameRoom } from '../src/types/game';

describe('Game Engine', () => {
  let room: GameRoom;
  const player1 = { playerId: 'p1-uuid', nickname: 'Alice' };
  const player2 = { playerId: 'p2-uuid', nickname: 'Bob' };

  beforeEach(() => {
    // Clean up any previous rooms
    destroyRoom('test-room');
    room = createRoom('test-room', player1, player2);
  });

  describe('6-Character Room Code & Custom Rooms', () => {
    it('should generate a 6-character uppercase alphanumeric room code', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    });

    it('should create a custom room with a unique room code', () => {
      const customRoom = createCustomRoom(player1);
      expect(customRoom.isCustomRoom).toBe(true);
      expect(customRoom.roomCode).toHaveLength(6);
      expect(customRoom.player1.playerId).toBe(player1.playerId);
      expect(customRoom.player2).toBeNull();
      expect(customRoom.status).toBe('WAITING');

      destroyRoom(customRoom.roomId);
    });

    it('should join custom room with valid 6-character room code', () => {
      const customRoom = createCustomRoom(player1);
      const code = customRoom.roomCode!;

      const joinResult = joinCustomRoom(code, player2);
      expect(joinResult.error).toBeUndefined();
      expect(joinResult.room).toBeDefined();
      expect(joinResult.room!.player2!.playerId).toBe(player2.playerId);

      destroyRoom(customRoom.roomId);
    });

    it('should reject invalid or non-existent room code', () => {
      const joinResult = joinCustomRoom('INVALID', player2);
      expect(joinResult.error).toBe('NOT_FOUND');
    });

    it('should reject a third player when room is full (max 2 players)', () => {
      const customRoom = createCustomRoom(player1);
      const code = customRoom.roomCode!;

      joinCustomRoom(code, player2);

      const player3 = { playerId: 'p3-uuid', nickname: 'Charlie' };
      const thirdJoin = joinCustomRoom(code, player3);
      expect(thirdJoin.error).toBe('FULL');
      expect(thirdJoin.room).toBeUndefined();

      destroyRoom(customRoom.roomId);
    });
  });

  describe('Room Creation', () => {
    it('should create a room with two players', () => {
      expect(room.roomId).toBe('test-room');
      expect(room.player1.playerId).toBe('p1-uuid');
      expect(room.player2!.playerId).toBe('p2-uuid');
      expect(room.phase).toBe('WAITING_FOR_PLAYERS');
    });

    it('should assign one peeker and one chooser', () => {
      const roles = [room.player1.peekRole, room.player2!.peekRole];
      expect(roles).toContain('PEEKER');
      expect(roles).toContain('CHOOSER');
    });

    it('should randomly place the carrot', () => {
      expect(['PLAYER_1', 'PLAYER_2']).toContain(room.carrotOwner);
    });

    it('should be retrievable by room ID', () => {
      expect(getRoom('test-room')).toBe(room);
    });

    it('should be retrievable by player ID', () => {
      expect(getRoomByPlayerId('p1-uuid')).toBe(room);
      expect(getRoomByPlayerId('p2-uuid')).toBe(room);
    });
  });

  describe('Phase Transitions', () => {
    it('should allow valid transitions', () => {
      expect(transitionPhase(room, 'MATCH_FOUND')).toBe(true);
      expect(room.phase).toBe('MATCH_FOUND');
    });

    it('should reject invalid transitions', () => {
      expect(transitionPhase(room, 'REVEAL_PHASE')).toBe(false);
      expect(room.phase).toBe('WAITING_FOR_PLAYERS');
    });

    it('should follow the full game flow', () => {
      expect(transitionPhase(room, 'MATCH_FOUND')).toBe(true);
      expect(transitionPhase(room, 'GAME_STARTING')).toBe(true);
      expect(transitionPhase(room, 'PLAYER_PEEK_PHASE')).toBe(true);
      expect(transitionPhase(room, 'DISCUSSION_PHASE')).toBe(true);
      expect(transitionPhase(room, 'DECISION_PHASE')).toBe(true);
      expect(transitionPhase(room, 'REVEAL_PHASE')).toBe(true);
      expect(transitionPhase(room, 'RESULT')).toBe(true);
    });
  });

  describe('Peek System - Privacy', () => {
    beforeEach(() => {
      transitionPhase(room, 'MATCH_FOUND');
      transitionPhase(room, 'GAME_STARTING');
      transitionPhase(room, 'PLAYER_PEEK_PHASE');
    });

    it('should only allow the peeker to peek', () => {
      const peekerId = room.peekerId;
      const chooserId = room.chooserId;

      // Chooser cannot peek
      const invalidResult = playerPeek(room, chooserId);
      expect(invalidResult).toBeNull();

      // Peeker can peek
      const validResult = playerPeek(room, peekerId);
      expect(validResult).not.toBeNull();
      expect(typeof validResult!.containsCarrot).toBe('boolean');
    });

    it('should not allow peeking twice', () => {
      const peekerId = room.peekerId;

      playerPeek(room, peekerId);
      const secondPeek = playerPeek(room, peekerId);
      expect(secondPeek).toBeNull();
    });

    it('should not reveal carrot location in public state', () => {
      const state1 = getPublicState(room, player1.playerId);
      const state2 = getPublicState(room, player2.playerId);

      // Public state should NOT contain carrotOwner
      expect((state1 as any).carrotOwner).toBeUndefined();
      expect((state2 as any).carrotOwner).toBeUndefined();
    });

    it('should return correct peek result based on carrot position', () => {
      const peekerId = room.peekerId;
      const peekerRole = room.player1.playerId === peekerId ? 'PLAYER_1' : 'PLAYER_2';

      const result = playerPeek(room, peekerId);
      expect(result).not.toBeNull();
      expect(result!.containsCarrot).toBe(room.carrotOwner === peekerRole);
    });
  });

  describe('Decision System', () => {
    beforeEach(() => {
      transitionPhase(room, 'MATCH_FOUND');
      transitionPhase(room, 'GAME_STARTING');
      transitionPhase(room, 'PLAYER_PEEK_PHASE');
      transitionPhase(room, 'DISCUSSION_PHASE');
      transitionPhase(room, 'DECISION_PHASE');
    });

    it('should only allow chooser to submit decision', () => {
      const peekerId = room.peekerId;
      const chooserId = room.chooserId;

      // Peeker cannot decide
      const invalid = submitDecision(room, peekerId, 'KEEP_BOX');
      expect(invalid.valid).toBe(false);

      // Chooser can decide
      const valid = submitDecision(room, chooserId, 'KEEP_BOX');
      expect(valid.valid).toBe(true);
      expect(valid.bothDecided).toBe(true);
    });

    it('should not allow double submission', () => {
      const chooserId = room.chooserId;

      submitDecision(room, chooserId, 'KEEP_BOX');
      const second = submitDecision(room, chooserId, 'SWAP_BOX');
      expect(second.valid).toBe(false);
    });

    it('should reject decision in wrong phase', () => {
      // Reset to wrong phase
      room.phase = 'PLAYER_PEEK_PHASE';
      const result = submitDecision(room, room.chooserId, 'KEEP_BOX');
      expect(result.valid).toBe(false);
    });
  });

  describe('Result Calculation', () => {
    beforeEach(() => {
      transitionPhase(room, 'MATCH_FOUND');
      transitionPhase(room, 'GAME_STARTING');
      transitionPhase(room, 'PLAYER_PEEK_PHASE');
      transitionPhase(room, 'DISCUSSION_PHASE');
      transitionPhase(room, 'DECISION_PHASE');
    });

    it('should determine winner correctly with KEEP', () => {
      room.decisions[room.chooserId] = 'KEEP_BOX';
      transitionPhase(room, 'REVEAL_PHASE');

      const result = calculateResult(room);
      expect(['PLAYER_1', 'PLAYER_2']).toContain(result.winner);
      expect(result.carrotOwner).toBe(room.carrotOwner);
    });

    it('should determine winner correctly with SWAP', () => {
      room.decisions[room.chooserId] = 'SWAP_BOX';
      transitionPhase(room, 'REVEAL_PHASE');

      const result = calculateResult(room);
      expect(['PLAYER_1', 'PLAYER_2']).toContain(result.winner);
      expect(result.carrotOwner).toBe(room.carrotOwner);
    });

    it('should update score', () => {
      room.decisions[room.chooserId] = 'KEEP_BOX';
      transitionPhase(room, 'REVEAL_PHASE');

      const previousP1 = room.score.player1;
      const previousP2 = room.score.player2;
      calculateResult(room);

      const totalScoreIncrease =
        (room.score.player1 - previousP1) + (room.score.player2 - previousP2);
      expect(totalScoreIncrease).toBe(1);
    });
  });

  describe('Rematch', () => {
    it('should swap peek roles on rematch', () => {
      const originalPeeker = room.peekerId;
      const originalChooser = room.chooserId;

      resetForRematch(room);

      expect(room.peekerId).toBe(originalChooser);
      expect(room.chooserId).toBe(originalPeeker);
    });

    it('should reset game state', () => {
      room.peeked = true;
      room.decisions[player1.playerId] = 'KEEP_BOX';

      resetForRematch(room);

      expect(room.peeked).toBe(false);
      expect(room.decisions[player1.playerId]).toBeNull();
      expect(room.decisions[player2.playerId]).toBeNull();
    });

    it('should increment round', () => {
      const prevRound = room.round;
      resetForRematch(room);
      expect(room.round).toBe(prevRound + 1);
    });
  });

  describe('Disconnect Handling', () => {
    it('should mark player as disconnected', () => {
      markDisconnected(room, player1.playerId);
      expect(room.player1.connected).toBe(false);
      expect(room.player2!.connected).toBe(true);
    });

    it('should mark player as reconnected', () => {
      markDisconnected(room, player1.playerId);
      markReconnected(room, player1.playerId);
      expect(room.player1.connected).toBe(true);
    });
  });

  describe('Room Destruction', () => {
    it('should remove room', () => {
      destroyRoom('test-room');
      expect(getRoom('test-room')).toBeUndefined();
    });
  });

  describe('Anti-Cheat', () => {
    it('should not expose carrot location in any public API', () => {
      const state = getPublicState(room, player1.playerId);
      const stateStr = JSON.stringify(state);
      expect(stateStr).not.toContain('carrotOwner');
      expect(stateStr).not.toContain('carrotBox');
    });

    it('should prevent peek from wrong phase', () => {
      // Still in WAITING_FOR_PLAYERS
      const result = playerPeek(room, room.peekerId);
      expect(result).toBeNull();
    });

    it('should prevent non-room player from peeking', () => {
      transitionPhase(room, 'MATCH_FOUND');
      transitionPhase(room, 'GAME_STARTING');
      transitionPhase(room, 'PLAYER_PEEK_PHASE');

      const result = playerPeek(room, 'random-intruder-id');
      expect(result).toBeNull();
    });
  });
});
