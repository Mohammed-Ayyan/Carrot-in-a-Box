import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createSession, validateSession, refreshSession } from '../services/session';

const createSessionSchema = z.object({
  // Nickname is OPTIONAL. If omitted/blank, the server generates an anonymous name.
  nickname: z
    .string()
    .max(20, 'Nickname must be at most 20 characters')
    .optional(),
});

/** Sanitize + clamp a display name, or generate an anonymous one if empty/invalid. */
function resolveDisplayName(raw?: string): string {
  const cleaned = (raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_\- ]/g, '') // strip disallowed chars
    .slice(0, 20);
  if (cleaned.length >= 2) return cleaned;
  return `Player_${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/session — Create anonymous session
  fastify.post('/api/session', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createSessionSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: body.error.errors[0].message,
      });
    }

    const displayName = resolveDisplayName(body.data.nickname);
    const session = await createSession(displayName);

    return reply.status(201).send({
      playerId: session.playerId,
      sessionToken: session.sessionToken,
      nickname: session.nickname,
      expiresAt: session.expiresAt.toISOString(),
    });
  });

  // GET /api/session — Validate current session
  fastify.get('/api/session', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'No session token provided' });
    }

    const session = await validateSession(token);
    if (!session) {
      return reply.status(401).send({ error: 'INVALID_SESSION', message: 'Session expired or invalid' });
    }

    return reply.send({
      playerId: session.playerId,
      nickname: session.nickname,
      expiresAt: session.expiresAt.toISOString(),
    });
  });

  // POST /api/session/refresh — Refresh session expiration
  fastify.post('/api/session/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'No session token provided' });
    }

    const session = await validateSession(token);
    if (!session) {
      return reply.status(401).send({ error: 'INVALID_SESSION', message: 'Session expired or invalid' });
    }

    await refreshSession(token);
    return reply.send({ success: true });
  });
}
