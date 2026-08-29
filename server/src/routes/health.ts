import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRedis } from '../services/redis';
import { getDb } from '../services/database';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  const handler = async (_request: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, string> = {};

    // Check Redis
    try {
      const redis = getRedis();
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    // Check Database
    try {
      const db = getDb();
      await db.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'healthy' : 'degraded',
      checks,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };

  // Register both /health and /api/health for hosting platform probes
  fastify.get('/health', handler);
  fastify.get('/api/health', handler);
}
