import { randomUUID } from 'crypto';
import { getDb } from './database';
import { getRedis, KEYS } from './redis';
import { config } from '../config';

export interface SessionData {
  playerId: string;
  sessionToken: string;
  nickname: string;
  expiresAt: Date;
}

/**
 * Create a new anonymous session.
 * Returns playerId, sessionToken, nickname.
 */
export async function createSession(nickname: string): Promise<SessionData> {
  const db = getDb();
  const redis = getRedis();

  const playerId = randomUUID();
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + config.session.ttlHours * 60 * 60 * 1000);

  // Create session in database
  const session = await db.session.create({
    data: {
      playerId,
      nickname,
      token: sessionToken,
      expiresAt,
      player: {
        create: {
          nickname,
        },
      },
    },
  });

  // Cache in Redis for fast lookup
  await redis.setex(
    KEYS.playerSession(playerId),
    config.session.ttlHours * 3600,
    JSON.stringify({ playerId, sessionToken, nickname, sessionId: session.id })
  );

  return { playerId, sessionToken, nickname, expiresAt };
}

/**
 * Validate session token and return player data.
 */
export async function validateSession(sessionToken: string): Promise<SessionData | null> {
  const db = getDb();

  const session = await db.session.findUnique({
    where: { token: sessionToken },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Expired — clean up
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    playerId: session.playerId,
    sessionToken: session.token,
    nickname: session.nickname,
    expiresAt: session.expiresAt,
  };
}

/**
 * Refresh session expiration.
 */
export async function refreshSession(sessionToken: string): Promise<void> {
  const db = getDb();
  const redis = getRedis();

  const newExpiry = new Date(Date.now() + config.session.ttlHours * 60 * 60 * 1000);

  const session = await db.session.update({
    where: { token: sessionToken },
    data: { expiresAt: newExpiry },
  });

  await redis.setex(
    KEYS.playerSession(session.playerId),
    config.session.ttlHours * 3600,
    JSON.stringify({
      playerId: session.playerId,
      sessionToken: session.token,
      nickname: session.nickname,
      sessionId: session.id,
    })
  );
}
