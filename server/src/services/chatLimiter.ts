import { getRedis, KEYS } from './redis';

const CHAT_RATE_LIMIT = 10; // messages per window
const CHAT_RATE_WINDOW = 10; // seconds

/**
 * Check if player can send a chat message (rate limiting).
 * Returns true if allowed.
 */
export async function canSendChatMessage(playerId: string): Promise<boolean> {
  const redis = getRedis();
  const key = KEYS.rateLimitChat(playerId);

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, CHAT_RATE_WINDOW);
  }

  return count <= CHAT_RATE_LIMIT;
}

/**
 * Sanitize a chat message (remove dangerous characters, limit length).
 */
export function sanitizeChatMessage(text: string): string {
  return text
    .trim()
    .slice(0, 500) // Max 500 characters
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;');
}
