import { randomUUID } from 'crypto';
import { getRedis, KEYS } from './redis';
import { config } from '../config';

export interface QueueEntry {
  playerId: string;
  nickname: string;
  joinedAt: number;
  socketId: string;
}

/**
 * Add a player to the matchmaking queue.
 * Returns position in queue.
 */
// Redis hash holding the full entry JSON per player. Kept in lockstep with the
// sorted set below so an entry's data and its queue position share the SAME lifetime
// (no TTL mismatch that could orphan a queue entry).
const ENTRIES_HASH = 'matchmaking:entries';

export async function joinQueue(entry: QueueEntry): Promise<number> {
  const redis = getRedis();

  // Check for duplicate entry — refresh the socketId/data but keep FIFO position.
  const existing = await redis.zscore(KEYS.matchmakingQueue, entry.playerId);
  if (existing !== null) {
    await redis.hset(ENTRIES_HASH, entry.playerId, JSON.stringify(entry));
    return await getQueuePosition(entry.playerId);
  }

  // Add to sorted set (score = timestamp for FIFO ordering) AND store the entry data
  // in a companion hash. Neither has a TTL, so they never expire out from under a
  // waiting player. Stale entries are pruned explicitly on disconnect / cleanup.
  await redis.zadd(KEYS.matchmakingQueue, entry.joinedAt, entry.playerId);
  await redis.hset(ENTRIES_HASH, entry.playerId, JSON.stringify(entry));

  return await getQueuePosition(entry.playerId);
}

/**
 * Remove a player from the matchmaking queue.
 */
export async function leaveQueue(playerId: string): Promise<void> {
  const redis = getRedis();
  await redis.zrem(KEYS.matchmakingQueue, playerId);
  await redis.hdel(ENTRIES_HASH, playerId);
}

/**
 * Get player's position in queue (1-based).
 */
export async function getQueuePosition(playerId: string): Promise<number> {
  const redis = getRedis();
  const rank = await redis.zrank(KEYS.matchmakingQueue, playerId);
  return rank !== null ? rank + 1 : -1;
}

/**
 * Try to match two players from the queue.
 * Returns matched pair or null.
 */
export async function tryMatch(): Promise<{ player1: QueueEntry; player2: QueueEntry; roomId: string } | null> {
  const redis = getRedis();

  // ATOMICALLY pop the two oldest entries. ZPOPMIN removes-and-returns in a single
  // command, so two concurrent tryMatch() calls can never grab the same players.
  // Result shape: [member1, score1, member2, score2].
  const popped = (await redis.zpopmin(KEYS.matchmakingQueue, 2)) as string[];
  const poppedIds: string[] = [];
  for (let i = 0; i < popped.length; i += 2) {
    poppedIds.push(popped[i]);
  }

  // Fewer than two players available → not enough to match. Put back anyone we popped.
  if (poppedIds.length < 2) {
    for (const id of poppedIds) {
      const data = await redis.hget(ENTRIES_HASH, id);
      if (data) await requeueRaw(JSON.parse(data) as QueueEntry);
      else await redis.hdel(ENTRIES_HASH, id); // orphan cleanup
    }
    return null;
  }

  const [id1, id2] = poppedIds;

  // Guard against matching a player with themselves. Re-queue the single unique entry.
  if (id1 === id2) {
    const data = await redis.hget(ENTRIES_HASH, id1);
    if (data) await requeueRaw(JSON.parse(data) as QueueEntry);
    return null;
  }

  const [data1, data2] = await Promise.all([
    redis.hget(ENTRIES_HASH, id1),
    redis.hget(ENTRIES_HASH, id2),
  ]);

  // If either entry's data is missing (orphaned/stale), re-queue the valid survivor
  // and drop the orphan so it can never block the queue again.
  if (!data1 || !data2) {
    if (data1) await requeueRaw(JSON.parse(data1) as QueueEntry);
    else await redis.hdel(ENTRIES_HASH, id1);
    if (data2) await requeueRaw(JSON.parse(data2) as QueueEntry);
    else await redis.hdel(ENTRIES_HASH, id2);
    return null;
  }

  const player1 = JSON.parse(data1) as QueueEntry;
  const player2 = JSON.parse(data2) as QueueEntry;

  // Clean up entry data for both matched players.
  await redis.hdel(ENTRIES_HASH, player1.playerId, player2.playerId);

  const roomId = randomUUID();
  return { player1, player2, roomId };
}

/** Re-add an entry to the queue without duplicate-checking (used when un-popping). */
async function requeueRaw(entry: QueueEntry): Promise<void> {
  const redis = getRedis();
  await redis.zadd(KEYS.matchmakingQueue, entry.joinedAt, entry.playerId);
  await redis.hset(ENTRIES_HASH, entry.playerId, JSON.stringify(entry));
}

/**
 * Get the current queue size.
 */
export async function getQueueSize(): Promise<number> {
  const redis = getRedis();
  return redis.zcard(KEYS.matchmakingQueue);
}

/**
 * Remove a set of players from the queue (e.g. on disconnect). Waiting itself is NOT
 * a reason for removal — a player may legitimately wait a long time for an opponent —
 * so this only removes explicitly-provided player ids and keeps the hash in sync.
 */
export async function removeStalePlayers(playerIds: string[]): Promise<void> {
  const redis = getRedis();
  for (const id of playerIds) {
    await redis.zrem(KEYS.matchmakingQueue, id);
    await redis.hdel(ENTRIES_HASH, id);
  }
}
