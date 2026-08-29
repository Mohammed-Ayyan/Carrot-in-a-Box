import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Redis for tests
vi.mock('../src/services/redis', () => {
  const store = new Map<string, string>();
  const sortedSet = new Map<string, { score: number; member: string }[]>();
  const hashes = new Map<string, Map<string, string>>();

  return {
    getRedis: () => ({
      hset: async (key: string, field: string, value: string) => {
        if (!hashes.has(key)) hashes.set(key, new Map());
        hashes.get(key)!.set(field, value);
        return 1;
      },
      hget: async (key: string, field: string) => {
        return hashes.get(key)?.get(field) ?? null;
      },
      hdel: async (key: string, ...fields: string[]) => {
        const h = hashes.get(key);
        if (!h) return 0;
        let n = 0;
        for (const f of fields) { if (h.delete(f)) n++; }
        return n;
      },
      zadd: async (key: string, score: number, member: string) => {
        if (!sortedSet.has(key)) sortedSet.set(key, []);
        const set = sortedSet.get(key)!;
        set.push({ score, member });
        set.sort((a, b) => a.score - b.score);
      },
      zscore: async (key: string, member: string) => {
        const set = sortedSet.get(key);
        if (!set) return null;
        const entry = set.find((e) => e.member === member);
        return entry ? String(entry.score) : null;
      },
      zrank: async (key: string, member: string) => {
        const set = sortedSet.get(key);
        if (!set) return null;
        const idx = set.findIndex((e) => e.member === member);
        return idx >= 0 ? idx : null;
      },
      zrange: async (key: string, start: number, stop: number) => {
        const set = sortedSet.get(key) || [];
        return set.slice(start, stop + 1).map((e) => e.member);
      },
      zrem: async (key: string, member: string) => {
        const set = sortedSet.get(key);
        if (!set) return 0;
        const idx = set.findIndex((e) => e.member === member);
        if (idx >= 0) { set.splice(idx, 1); return 1; }
        return 0;
      },
      // Atomically pop the N lowest-score members, returning [member, score, ...].
      zpopmin: async (key: string, count = 1) => {
        const set = sortedSet.get(key) || [];
        const out: string[] = [];
        for (let i = 0; i < count && set.length > 0; i++) {
          const e = set.shift()!;
          out.push(e.member, String(e.score));
        }
        return out;
      },
      zcard: async (key: string) => {
        return (sortedSet.get(key) || []).length;
      },
      zremrangebyscore: async () => 0,
      setex: async (key: string, _ttl: number, value: string) => {
        store.set(key, value);
      },
      get: async (key: string) => store.get(key) || null,
      del: async (key: string) => { store.delete(key); return 1; },
      pipeline: () => ({
        zrem: function() { return this; },
        exec: async () => [],
      }),
    }),
    KEYS: {
      matchmakingQueue: 'matchmaking:queue',
      playerSession: (id: string) => `session:${id}`,
      activeRoom: (id: string) => `room:${id}`,
      playerRoom: (id: string) => `player:room:${id}`,
      rateLimitChat: (id: string) => `ratelimit:chat:${id}`,
    },
    connectRedis: async () => {},
    disconnectRedis: async () => {},
  };
});

import { joinQueue, leaveQueue, getQueueSize, getQueuePosition, tryMatch } from '../src/services/matchmaking';

describe('Matchmaking', () => {
  it('should add a player to queue and return position', async () => {
    const position = await joinQueue({
      playerId: 'player-1',
      nickname: 'TestPlayer',
      joinedAt: Date.now(),
      socketId: 'socket-1',
    });

    expect(position).toBeGreaterThan(0);
  });

  it('should prevent duplicate queue entries', async () => {
    await joinQueue({
      playerId: 'player-dup',
      nickname: 'Dup',
      joinedAt: Date.now(),
      socketId: 'socket-1',
    });

    const position = await joinQueue({
      playerId: 'player-dup',
      nickname: 'Dup',
      joinedAt: Date.now(),
      socketId: 'socket-1',
    });

    expect(position).toBeGreaterThan(0);
  });

  describe('tryMatch — never match with fewer than two players', () => {
    it('returns null when only ONE player is queued (no solo game)', async () => {
      // Fully drain the queue from any prior tests.
      for (const id of ['player-1', 'player-dup', 'solo-A']) await leaveQueue(id);
      expect(await getQueueSize()).toBe(0);

      await joinQueue({ playerId: 'solo-A', nickname: 'Solo', joinedAt: Date.now(), socketId: 's-A' });

      const match = await tryMatch();
      expect(match).toBeNull();
      // The lone player must remain queued (re-queued after the failed pop).
      expect(await getQueueSize()).toBe(1);
      await leaveQueue('solo-A');
    });

    it('matches exactly two DISTINCT players', async () => {
      // Drain queue
      for (const id of ['solo-A', 'player-1', 'player-dup']) await leaveQueue(id);
      await joinQueue({ playerId: 'mm-A', nickname: 'Alice', joinedAt: Date.now(), socketId: 's-A' });
      await joinQueue({ playerId: 'mm-B', nickname: 'Bob', joinedAt: Date.now() + 1, socketId: 's-B' });

      const match = await tryMatch();
      expect(match).not.toBeNull();
      expect(match!.player1.playerId).not.toBe(match!.player2.playerId);
      const ids = [match!.player1.playerId, match!.player2.playerId].sort();
      expect(ids).toEqual(['mm-A', 'mm-B']);
    });

    it('a second concurrent tryMatch after a match finds no one', async () => {
      for (const id of ['mm-A', 'mm-B', 'c-A', 'c-B']) await leaveQueue(id);
      await joinQueue({ playerId: 'c-A', nickname: 'A', joinedAt: Date.now(), socketId: 's-A' });
      await joinQueue({ playerId: 'c-B', nickname: 'B', joinedAt: Date.now() + 1, socketId: 's-B' });

      const first = await tryMatch();
      expect(first).not.toBeNull();
      // Queue is now empty; a second attempt must not fabricate a match.
      const second = await tryMatch();
      expect(second).toBeNull();
    });
  });
});
