import Redis from 'ioredis';
import { config } from '../config';

let redis: Redis | null = null;
let useMemoryRedis = false;

// In-memory data structures
const memoryStore = new Map<string, string>();
const memoryHash = new Map<string, Map<string, string>>();
const memoryZSet = new Map<string, Map<string, number>>();

export function getRedis(): any {
  if (useMemoryRedis) {
    return {
      setex: async (key: string, secs: number, val: string) => {
        memoryStore.set(key, val);
      },
      get: async (key: string) => {
        return memoryStore.get(key) || null;
      },
      del: async (key: string) => {
        memoryStore.delete(key);
      },
      incr: async (key: string) => {
        const current = parseInt(memoryStore.get(key) || '0', 10) + 1;
        memoryStore.set(key, current.toString());
        return current;
      },
      expire: async (key: string, secs: number) => {
        // In-memory rate-limit expiration fallback
      },
      hset: async (key: string, field: string, val: string) => {
        if (!memoryHash.has(key)) memoryHash.set(key, new Map());
        memoryHash.get(key)!.set(field, val);
      },
      hget: async (key: string, field: string) => {
        return memoryHash.get(key)?.get(field) || null;
      },
      hdel: async (key: string, ...fields: string[]) => {
        const hash = memoryHash.get(key);
        if (hash) {
          fields.forEach((f) => hash.delete(f));
        }
      },
      zadd: async (key: string, score: number, member: string) => {
        if (!memoryZSet.has(key)) memoryZSet.set(key, new Map());
        memoryZSet.get(key)!.set(member, score);
      },
      zscore: async (key: string, member: string) => {
        const zset = memoryZSet.get(key);
        return zset?.has(member) ? zset.get(member)! : null;
      },
      zrem: async (key: string, member: string) => {
        memoryZSet.get(key)?.delete(member);
      },
      zrank: async (key: string, member: string) => {
        const zset = memoryZSet.get(key);
        if (!zset || !zset.has(member)) return null;
        const sorted = Array.from(zset.entries()).sort((a, b) => a[1] - b[1]);
        const index = sorted.findIndex(([m]) => m === member);
        return index !== -1 ? index : null;
      },
      zpopmin: async (key: string, count: number) => {
        const zset = memoryZSet.get(key);
        if (!zset || zset.size === 0) return [];
        const sorted = Array.from(zset.entries()).sort((a, b) => a[1] - b[1]);
        const popped = sorted.slice(0, count);
        const result: string[] = [];
        for (const [m, s] of popped) {
          zset.delete(m);
          result.push(m, s.toString());
        }
        return result;
      },
      zcard: async (key: string) => {
        return memoryZSet.get(key)?.size || 0;
      },
    };
  }

  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    const r = getRedis();
    await r.connect();
    console.log('[Redis] Connected to Redis server');
  } catch (err) {
    console.warn('[Redis] Redis server not running — using in-memory store.');
    useMemoryRedis = true;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis && !useMemoryRedis) {
    await redis.quit().catch(() => {});
    redis = null;
    console.log('[Redis] Disconnected');
  }
}

export const KEYS = {
  matchmakingQueue: 'matchmaking:queue',
  playerSession: (playerId: string) => `session:${playerId}`,
  activeRoom: (roomId: string) => `room:${roomId}`,
  playerRoom: (playerId: string) => `player:room:${playerId}`,
  rateLimitChat: (playerId: string) => `ratelimit:chat:${playerId}`,
} as const;
