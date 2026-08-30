import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRedis, isUsingMemoryRedis } from '../services/redis';
import { getDb, isUsingMemoryDb } from '../services/database';
import { config } from '../config';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  const handler = async (_request: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, string> = {};
    const isProd = config.nodeEnv === 'production';

    // Check Redis
    if (isUsingMemoryRedis()) {
      checks.redis = isProd ? 'error' : 'in-memory-fallback';
    } else {
      try {
        const redis = getRedis();
        await redis.ping();
        checks.redis = 'ok';
      } catch (err) {
        checks.redis = 'error';
      }
    }

    // Check Database
    if (isUsingMemoryDb()) {
      checks.database = isProd ? 'error' : 'in-memory-fallback';
    } else {
      try {
        const db = getDb();
        if (typeof db.$queryRaw === 'function') {
          await db.$queryRaw`SELECT 1`;
          checks.database = 'ok';
        } else {
          checks.database = isProd ? 'error' : 'in-memory-fallback';
        }
      } catch (err) {
        checks.database = 'error';
      }
    }

    // In production, both required dependencies (Redis & PostgreSQL) MUST be 'ok'
    const isHealthy = isProd
      ? checks.redis === 'ok' && checks.database === 'ok'
      : checks.redis !== 'error' && checks.database !== 'error';

    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'healthy' : 'degraded',
      environment: config.nodeEnv,
      checks,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };

  // Register both /health and /api/health for hosting platform probes
  fastify.get('/health', handler);
  fastify.get('/api/health', handler);
}
