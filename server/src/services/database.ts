import { PrismaClient } from '@prisma/client';
import { config } from '../config';

let prisma: PrismaClient | null = null;
let useMemoryDb = false;
const inMemorySessions = new Map<string, any>();

export function isUsingMemoryDb(): boolean {
  return useMemoryDb;
}

export function getDb(): any {
  if (useMemoryDb) {
    return {
      session: {
        create: async ({ data }: any) => {
          const s = {
            id: 'mem_' + Math.random(),
            playerId: data.playerId,
            nickname: data.nickname,
            token: data.token,
            expiresAt: data.expiresAt,
          };
          inMemorySessions.set(data.token, s);
          return s;
        },
        findUnique: async ({ where }: any) => {
          return inMemorySessions.get(where.token) || null;
        },
        update: async ({ where, data }: any) => {
          const s = inMemorySessions.get(where.token);
          if (s) {
            s.expiresAt = data.expiresAt;
          }
          return s;
        },
        delete: async ({ where }: any) => {
          inMemorySessions.delete(where.id);
        },
      },
    };
  }

  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
      log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prisma;
}

export async function connectDatabase(): Promise<void> {
  const isProd = config.nodeEnv === 'production';

  try {
    const db = getDb();
    await db.$connect();
    console.log('[Database] Connected to PostgreSQL');
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    if (isProd) {
      console.error(`[Database] PostgreSQL connection failed: ${errorMsg}`);
      process.exit(1);
    }
    console.warn(`[Database] PostgreSQL not running — using in-memory session store. Reason: ${errorMsg}`);
    useMemoryDb = true;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma && !useMemoryDb) {
    await prisma.$disconnect().catch(() => {});
    prisma = null;
    console.log('[Database] Disconnected');
  }
}
