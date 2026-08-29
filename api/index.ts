import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { getCorsOrigins } from '../server/src/config';
import { connectDatabase } from '../server/src/services/database';
import { connectRedis } from '../server/src/services/redis';
import { sessionRoutes } from '../server/src/routes/session';
import { healthRoutes } from '../server/src/routes/health';

const fastify = Fastify({ logger: false });
let initialized = false;

async function initFastifyApp() {
  if (initialized) return fastify;

  const corsOrigins = getCorsOrigins();

  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  await fastify.register(rateLimit, {
    max: 120,
    timeWindow: '1 minute',
  });

  await fastify.register(sessionRoutes);
  await fastify.register(healthRoutes);

  try {
    await connectDatabase();
    await connectRedis();
  } catch (err) {
    console.warn('[Vercel API] Warning during database/redis connect:', err);
  }

  await fastify.ready();
  initialized = true;
  return fastify;
}

export default async function handler(req: any, res: any) {
  const app = await initFastifyApp();
  app.server.emit('request', req, res);
}
