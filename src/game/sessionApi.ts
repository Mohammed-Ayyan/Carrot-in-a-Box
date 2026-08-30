/**
 * Session API — creates an anonymous session on the backend.
 */

function resolveServerUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // In deployed web environments (Vercel, CrazyGames, etc.), default to Railway production backend URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://carrot-in-a-box-production.up.railway.app';
  }
  return 'http://localhost:3001';
}

export interface SessionResponse {
  playerId: string;
  sessionToken: string;
  nickname: string;
  expiresAt: string;
}

export async function createSession(nickname: string): Promise<SessionResponse> {
  const baseUrl = resolveServerUrl();
  const res = await fetch(`${baseUrl}/api/session`, {
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
  return resolveServerUrl();
}

export function isMultiplayerEnabled(): boolean {
  return (import.meta as any).env?.VITE_MULTIPLAYER === 'true';
}
