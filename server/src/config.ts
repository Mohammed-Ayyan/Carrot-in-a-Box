export function getCorsOrigins(): string[] | boolean {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (process.env.FRONTEND_URL) {
    return [process.env.FRONTEND_URL.trim()];
  }
  if (process.env.NODE_ENV === 'production') {
    return ['http://localhost:5173'];
  }
  return true;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url:
      process.env.DATABASE_URL ||
      process.env.DATABASE_PRIVATE_URL ||
      process.env.DATABASE_PUBLIC_URL ||
      process.env.POSTGRES_URL ||
      'postgresql://postgres:postgres@localhost:5432/carrot_in_a_box',
  },
  redis: {
    url:
      process.env.REDIS_URL ||
      process.env.REDIS_PRIVATE_URL ||
      process.env.REDIS_PUBLIC_URL ||
      'redis://localhost:6379',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    ttlHours: parseInt(process.env.SESSION_TTL_HOURS || '24', 10),
  },
  game: {
    matchmakingTimeoutMs: parseInt(process.env.MATCHMAKING_TIMEOUT_MS || '30000', 10),
    discussionPhaseSeconds: parseInt(process.env.DISCUSSION_PHASE_SECONDS || '60', 10),
    decisionPhaseSeconds: parseInt(process.env.DECISION_PHASE_SECONDS || '30', 10),
    reconnectWindowSeconds: parseInt(process.env.RECONNECT_WINDOW_SECONDS || '30', 10),
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '5000', 10),
    heartbeatTimeoutMs: parseInt(process.env.HEARTBEAT_TIMEOUT_MS || '15000', 10),
  },
} as const;
