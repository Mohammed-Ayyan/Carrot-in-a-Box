# 🥕 Carrot in a Box — Multiplayer Backend

Production-ready multiplayer game server for Carrot in a Box.

## Architecture

- **Runtime:** Node.js + TypeScript
- **HTTP Framework:** Fastify
- **WebSocket:** Socket.IO
- **Database:** PostgreSQL + Prisma ORM
- **Cache/Queue:** Redis
- **Voice:** WebRTC (server handles signaling only)
- **Container:** Docker + docker-compose

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for PostgreSQL and Redis)

### 1. Start infrastructure
```bash
docker-compose up -d db redis
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment
```bash
cp .env.example .env
```

### 4. Run database migrations
```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Start development server
```bash
npm run dev
```

Server runs at `http://localhost:3001`

## Production Deployment

### Using Docker
```bash
docker-compose up -d
```

This starts the server, PostgreSQL, and Redis together.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `DATABASE_URL` | postgresql://... | PostgreSQL connection string |
| `REDIS_URL` | redis://localhost:6379 | Redis connection string |
| `SESSION_SECRET` | dev-secret | Session signing secret |
| `SESSION_TTL_HOURS` | 24 | Session lifetime |
| `DISCUSSION_PHASE_SECONDS` | 60 | Discussion timer |
| `DECISION_PHASE_SECONDS` | 30 | Decision timer |
| `RECONNECT_WINDOW_SECONDS` | 30 | Time to reconnect |

## API Documentation

See [BACKEND_FRONTEND_CONTRACT.md](./BACKEND_FRONTEND_CONTRACT.md) for the complete API contract.

## Testing

```bash
# Unit tests (no infrastructure needed)
npm test

# With watch mode
npm run test:watch
```

## Project Structure

```
server/
├── prisma/                 # Database schema & migrations
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── index.ts            # Server entrypoint
│   ├── config.ts           # Environment configuration
│   ├── types/
│   │   ├── game.ts         # Game state types & state machine
│   │   └── events.ts       # Socket.IO event contracts
│   ├── services/
│   │   ├── database.ts     # Prisma client
│   │   ├── redis.ts        # Redis client & key management
│   │   ├── session.ts      # Anonymous session management
│   │   ├── matchmaking.ts  # Queue & matching logic
│   │   ├── gameEngine.ts   # Server-authoritative game logic
│   │   └── chatLimiter.ts  # Rate limiting & sanitization
│   ├── handlers/
│   │   └── socketHandler.ts # Socket.IO event handlers
│   └── routes/
│       ├── session.ts      # REST: session management
│       └── health.ts       # REST: health check
├── tests/
│   ├── game.test.ts        # Game engine unit tests
│   ├── matchmaking.test.ts # Matchmaking unit tests
│   └── integration.test.ts # E2E test scenarios
├── docker-compose.yml
├── Dockerfile
└── BACKEND_FRONTEND_CONTRACT.md
```

## Security

- Server is the single source of truth — clients cannot determine game outcomes
- Carrot location is never broadcast; only revealed privately via `peek_result`
- All inputs validated with Zod
- WebSocket connections require valid session tokens
- Chat messages are rate-limited and sanitized
- Players can only interact within their own room
