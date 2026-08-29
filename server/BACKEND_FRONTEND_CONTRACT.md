# Backend-Frontend Integration Contract

## Overview

This document defines the complete API contract between the Carrot in a Box multiplayer backend and the existing frontend. The frontend should use `RemoteGameEngine` (which implements the same `IGameEngine` interface as `LocalGameEngine`) to communicate with the server.

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Frontend      │◄────────┤  Socket.IO       │
│   (Browser)     │────────►│  WebSocket       │
│                 │         │                  │
│ RemoteGameEngine│         │  Game Server     │
│ implements      │         │  (Fastify +      │
│ IGameEngine     │         │   Socket.IO)     │
└─────────────────┘         └──────┬───────────┘
                                   │
                         ┌─────────┼─────────┐
                         │         │         │
                    ┌────▼───┐ ┌───▼────┐ ┌──▼───┐
                    │PostgreSQL│ │ Redis  │ │WebRTC│
                    │(history)│ │(state) │ │(P2P) │
                    └─────────┘ └────────┘ └──────┘
```

---

## 1. REST API

### POST /api/session
Create an anonymous session.

**Request:**
```json
{
  "nickname": "PlayerName"
}
```

**Response (201):**
```json
{
  "playerId": "uuid-v4",
  "sessionToken": "uuid-v4",
  "nickname": "PlayerName",
  "expiresAt": "2024-03-02T00:00:00.000Z"
}
```

**Errors:**
- `400` — Nickname validation failed (2-20 chars, alphanumeric + space/dash/underscore)

---

### GET /api/session
Validate current session.

**Headers:** `Authorization: Bearer <sessionToken>`

**Response (200):**
```json
{
  "playerId": "uuid-v4",
  "nickname": "PlayerName",
  "expiresAt": "2024-03-02T00:00:00.000Z"
}
```

**Errors:**
- `401` — Invalid or expired session

---

### POST /api/session/refresh
Extend session lifetime.

**Headers:** `Authorization: Bearer <sessionToken>`

**Response (200):** `{ "success": true }`

---

### GET /api/health
Server health check.

**Response (200):**
```json
{
  "status": "healthy",
  "checks": { "redis": "ok", "database": "ok" },
  "timestamp": "2024-03-01T12:00:00.000Z"
}
```

---

## 2. WebSocket Connection

### Connect
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: sessionToken },
  transports: ['websocket', 'polling'],
});
```

Authentication is performed automatically via the `auth.token` handshake field.

---

## 3. WebSocket Events (Client → Server)

### `join_matchmaking`
Enter the matchmaking queue.

```typescript
socket.emit('join_matchmaking', { sessionToken: 'token' });
```

### `leave_matchmaking`
Leave the matchmaking queue.

```typescript
socket.emit('leave_matchmaking');
```

### `peek_box`
Peek at your own box (only the peeker, only during PLAYER_PEEK_PHASE).

```typescript
socket.emit('peek_box');
```

### `submit_decision`
Submit KEEP or SWAP (only the chooser, only during DECISION_PHASE).

```typescript
socket.emit('submit_decision', { decision: 'KEEP_BOX' | 'SWAP_BOX' });
```

### `send_bluff`
Send a bluff message to opponent (only the peeker, during DISCUSSION_PHASE).

```typescript
socket.emit('send_bluff', { message: "I definitely have the carrot!" });
```

### `chat_message`
Send a text chat message (rate-limited: 10 msgs / 10 seconds).

```typescript
socket.emit('chat_message', { text: "Good luck!" });
```

### `request_rematch`
Request another round after RESULT phase.

```typescript
socket.emit('request_rematch');
```

### `decline_rematch`
Decline rematch and end the session.

```typescript
socket.emit('decline_rematch');
```

### `voice_offer` / `voice_answer` / `ice_candidate`
WebRTC signaling (relayed peer-to-peer).

```typescript
socket.emit('voice_offer', { sdp: rtcSessionDescription });
socket.emit('voice_answer', { sdp: rtcSessionDescription });
socket.emit('ice_candidate', { candidate: rtcIceCandidate });
```

### `heartbeat`
Keep-alive ping (handled automatically by Socket.IO, but available manually).

---

## 4. WebSocket Events (Server → Client)

### `matchmaking_joined`
```json
{ "position": 1 }
```

### `matchmaking_status`
```json
{ "position": 2, "estimatedWait": 5000 }
```

### `match_found`
```json
{ "roomId": "uuid", "opponent": { "nickname": "Bob" } }
```

### `game_state`
Full game state (personalized per player — **never contains carrot location**).

```json
{
  "roomId": "uuid",
  "phase": "PLAYER_PEEK_PHASE",
  "round": 1,
  "score": { "player1": 0, "player2": 0 },
  "you": {
    "playerId": "uuid",
    "nickname": "Alice",
    "role": "PLAYER_1",
    "peekRole": "PEEKER"
  },
  "opponent": {
    "playerId": "uuid",
    "nickname": "Bob",
    "role": "PLAYER_2",
    "peekRole": "CHOOSER",
    "connected": true
  },
  "peekerId": "uuid",
  "chooserId": "uuid",
  "peeked": false,
  "phaseTimeRemaining": 60000
}
```

### `phase_change`
```json
{ "phase": "DISCUSSION_PHASE", "timeRemaining": 60000 }
```

### `peek_result` (PRIVATE — only sent to peeker)
```json
{ "containsCarrot": true }
```

### `opponent_peeked`
Sent to the chooser when the peeker peeks (no carrot info).

### `bluff_received`
```json
{ "message": "I have the carrot!", "from": "Alice" }
```

### `decision_received`
```json
{ "playerId": "uuid" }
```

### `game_result`
```json
{
  "winner": "PLAYER_1",
  "winnerPlayerId": "uuid",
  "winnerNickname": "Alice",
  "carrotOwner": "PLAYER_1",
  "yourDecision": "KEEP_BOX",
  "opponentDecision": null
}
```

### `chat_message`
```json
{ "sender": "Alice", "text": "gg!", "timestamp": 1709300000000 }
```

### `voice_offer` / `voice_answer` / `ice_candidate`
Relayed WebRTC signaling payloads.

### `rematch_requested`
```json
{ "playerId": "uuid" }
```

### `rematch_accepted`
Both players accepted — new round starting.

### `rematch_declined`
Opponent declined rematch.

### `opponent_disconnected`
```json
{ "reconnectWindow": 30 }
```

### `opponent_reconnected`
Opponent is back online.

### `game_ended`
```json
{ "reason": "Opponent disconnected" }
```

### `error`
```json
{ "code": "INVALID_PEEK", "message": "Cannot peek now" }
```

---

## 5. Game State Machine

```
WAITING_FOR_PLAYERS
       │
       ▼
  MATCH_FOUND
       │
       ▼
 GAME_STARTING        (3s animation)
       │
       ▼
PLAYER_PEEK_PHASE     (peeker peeks their box)
       │
       ▼
DISCUSSION_PHASE      (60s — chat, bluff, voice)
       │
       ▼
 DECISION_PHASE       (30s — chooser decides KEEP/SWAP)
       │
       ▼
  REVEAL_PHASE        (3s reveal animation)
       │
       ▼
     RESULT
       │
       ├──► REMATCH_PENDING ──► GAME_STARTING (loop)
       │
       └──► ENDED
```

### Invalid transitions are rejected server-side.

---

## 6. Error Codes

| Code | Description |
|------|-------------|
| `ALREADY_IN_GAME` | Player tried to matchmake while in a game |
| `NOT_IN_GAME` | Action requires being in a game room |
| `INVALID_PEEK` | Wrong player, wrong phase, or already peeked |
| `INVALID_DECISION` | Wrong player, wrong phase, or already submitted |
| `RATE_LIMITED` | Too many messages sent |
| `UNAUTHORIZED` | Missing or invalid session token |
| `VALIDATION_ERROR` | Request body failed validation |

---

## 7. Frontend Integration Guide

### Step 1: Install socket.io-client
```bash
npm install socket.io-client
```

### Step 2: Create session on nickname submit
```typescript
const response = await fetch('http://localhost:3001/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nickname }),
});
const { playerId, sessionToken } = await response.json();
```

### Step 3: Connect RemoteGameEngine
```typescript
import { remoteGameEngine } from './game/RemoteGameEngine';

await remoteGameEngine.connect('http://localhost:3001', sessionToken);
```

### Step 4: Replace LocalGameEngine usage
```typescript
// Before:
import { localGameEngine } from './game/LocalGameEngine';

// After:
import { remoteGameEngine } from './game/RemoteGameEngine';

// The interface is identical:
const unsubscribe = remoteGameEngine.subscribe((state) => setGameState(state));
remoteGameEngine.startGame(); // joins matchmaking
remoteGameEngine.makeChoice('SWAP'); // submits decision
remoteGameEngine.resetRound(); // requests rematch
```

### Step 5: Listen for multiplayer events
```typescript
remoteGameEngine.onPeekResult(({ containsCarrot }) => {
  // Show peek animation with actual result
});

remoteGameEngine.onBluffReceived(({ message, from }) => {
  // Display opponent's bluff statement
});

remoteGameEngine.onChatMessage(({ sender, text, timestamp }) => {
  // Display in chat UI
});

remoteGameEngine.onGameResult((result) => {
  // Show result with actual winner
});
```

---

## 8. Security Guarantees

1. **Carrot location** is NEVER sent to clients until the RESULT phase
2. **Peek result** is sent ONLY to the peeking player
3. All game logic is server-authoritative — client cannot decide winner
4. Sessions use secure random UUIDs
5. All inputs are validated and sanitized
6. Chat is rate-limited
7. WebSocket connections require valid session tokens
8. Players can only interact within their own room
