# Carrot in a Box — Backend Deployment Guide

This document explains how to deploy the **Carrot in a Box** Node.js / Socket.IO backend to production hosting services such as **Render**, **Railway**, **Fly.io**, or any standard Linux VPS.

---

## 1. Environment & Prerequisites

- **Node.js Version**: `>= 20.0.0`
- **Database**: External PostgreSQL database (`>= 14`)
- **Cache / Queue**: External Redis instance (`>= 6.0`)
- **Build Tooling**: TypeScript Compiler (`tsc`) & Prisma CLI (`prisma generate`)

---

## 2. Required Production Environment Variables

Set the following environment variables on your hosting provider:

| Variable | Required | Example Value | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Set environment mode to production |
| `PORT` | **Yes** | `3001` | Platform-assigned HTTP port |
| `HOST` | **Yes** | `0.0.0.0` | Bind host address |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@host:5432/carrot_db?sslmode=require` | PostgreSQL connection string |
| `REDIS_URL` | **Yes** | `redis://default:pass@redis-host:6379` | Redis connection URL |
| `SESSION_SECRET` | **Yes** | `a_random_32_character_secret_key` | Secret key for signing session tokens |
| `CORS_ORIGINS` | **Yes** | `https://your-game.crazygames.com,https://www.crazygames.com` | Allowed frontend origins (comma-separated) |
| `FRONTEND_URL` | Optional | `https://your-game.crazygames.com` | Primary frontend fallback origin |

---

## 3. Database Migration Process

Do **NOT** run `prisma migrate dev` in production. Use Prisma's deployment migration command:

```bash
# Apply pending Prisma database migrations in production
npx prisma migrate deploy
```

---

## 4. Build & Start Commands

### Hosting Build Command
```bash
npm ci && npx prisma generate && npm run build
```

### Hosting Start Command
```bash
npx prisma migrate deploy && npm start
```

---

## 5. Health Check Endpoint

The server exposes dual health check endpoints:
- `GET /health`
- `GET /api/health`

### Health Check Response
```json
{
  "status": "healthy",
  "checks": {
    "redis": "ok",
    "database": "ok"
  },
  "uptimeSeconds": 342,
  "timestamp": "2026-08-30T00:30:00.000Z"
}
```

Use `GET /health` as the HTTP health check path in your hosting dashboard (e.g., Render or Railway).

---

## 6. Frontend Environment Configuration

In your frontend build (e.g. Vercel, Netlify, or CrazyGames hosting), set:

```env
VITE_SERVER_URL=https://your-backend.onrender.com
VITE_MULTIPLAYER=true
```

---

## 7. Step-by-Step Hosting Setup Examples

### Render.com Deployment
1. Create a **Web Service** connected to your repository.
2. Select **Environment**: `Node`.
3. Set **Build Command**: `cd server && npm ci && npx prisma generate && npm run build`
4. Set **Start Command**: `cd server && npx prisma migrate deploy && npm start`
5. Add environment variables (`DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `CORS_ORIGINS`, `NODE_ENV=production`).
6. Set Health Check Path to `/health`.

### Railway.app Deployment
1. Add **PostgreSQL** and **Redis** services to your project.
2. Add a **Node.js** service for the `server/` directory.
3. Link `DATABASE_URL` to the Postgres service and `REDIS_URL` to the Redis service.
4. Set **Custom Start Command**: `npx prisma migrate deploy && npm start`.
