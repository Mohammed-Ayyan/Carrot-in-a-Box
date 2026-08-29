import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import { config, getCorsOrigins } from './config';
import { connectDatabase, disconnectDatabase } from './services/database';
import { connectRedis, disconnectRedis } from './services/redis';
import { sessionRoutes } from './routes/session';
import { healthRoutes } from './routes/health';
import { setupSocketHandlers } from './handlers/socketHandler';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types/events';

async function main() {
  // Create Fastify instance
  const fastify = Fastify({ logger: true });

  const corsOrigins = getCorsOrigins();

  // Register plugins
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

  // Register routes
  await fastify.register(sessionRoutes);
  await fastify.register(healthRoutes);

  // Connect to services
  await connectDatabase();
  await connectRedis();

  // Create HTTP server from Fastify
  await fastify.ready();
  const httpServer = fastify.server;

  // Create Socket.IO server with production configuration
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: corsOrigins,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: config.game.heartbeatIntervalMs,
      pingTimeout: config.game.heartbeatTimeoutMs,
    }
  );

  // Setup WebSocket handlers
  setupSocketHandlers(io);

  // Start server
  await fastify.listen({ port: config.port, host: config.host });
  console.log(`\n🥕 Carrot in a Box Server running on http://${config.host}:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   CORS Origins: ${JSON.stringify(corsOrigins)}`);
  console.log(`   WebSocket: ready\n`);

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received. Initiating graceful shutdown...`);
    try {
      io.close(() => {
        console.log('[Server] Socket.IO server closed');
      });
      await fastify.close();
      console.log('[Server] Fastify HTTP server closed');
      await disconnectDatabase();
      console.log('[Server] PostgreSQL disconnected');
      await disconnectRedis();
      console.log('[Server] Redis disconnected');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Server] Fatal error during startup:', err);
  process.exit(1);
});
