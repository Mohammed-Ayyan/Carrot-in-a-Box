/**
 * Session API — creates an anonymous session on the backend.
 */

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';

export interface SessionResponse {
  playerId: string;
  sessionToken: string;
  nickname: string;
  expiresAt: string;
}

export async function createSession(nickname: string): Promise<SessionResponse> {
  const res = await fetch(`${SERVER_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create session' }));
    throw new Error(err.message || 'Failed to create session');
  }

  return res.json();
}

export function getServerUrl(): string {
  return SERVER_URL;
}

export function isMultiplayerEnabled(): boolean {
  return (import.meta as any).env?.VITE_MULTIPLAYER === 'true';
}
