/**
 * Live single-player matchmaking test — the exact scenario that was broken.
 * Run against a RUNNING server: npx tsx tests/onePlayer.e2e.ts
 *
 * Verifies that a lone player who presses START:
 *  - is acknowledged into the queue (matchmaking_joined)
 *  - does NOT receive match_found
 *  - does NOT receive game_state (no game/box/carrot/timer)
 */
import { io } from 'socket.io-client';

const SERVER = process.env.SERVER_URL || 'http://localhost:3001';

async function createSession(nickname: string): Promise<string> {
  const res = await fetch(`${SERVER}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const json = (await res.json()) as { sessionToken: string };
  return json.sessionToken;
}

async function run() {
  const token = await createSession('LonePlayer');
  const sock = io(SERVER, { auth: { token }, transports: ['websocket'] });

  let joined = false;
  let gotMatch = false;
  let gotGameState = false;

  sock.on('matchmaking_joined', () => (joined = true));
  sock.on('match_found', () => (gotMatch = true));
  sock.on('game_state', () => (gotGameState = true));

  await new Promise((r) => setTimeout(r, 400));
  sock.emit('join_matchmaking', {});

  // Wait well beyond any startGame delay to be sure nothing starts.
  await new Promise((r) => setTimeout(r, 5000));

  sock.disconnect();

  const results: string[] = [];
  const pass = (m: string) => results.push(`✓ ${m}`);
  const fail = (m: string) => results.push(`✗ ${m}`);

  if (joined) pass('lone player acknowledged into matchmaking queue'); else fail('never got matchmaking_joined');
  if (!gotMatch) pass('lone player did NOT receive match_found'); else fail('LEAK: lone player got match_found');
  if (!gotGameState) pass('lone player did NOT receive game_state (no solo game)'); else fail('BUG: lone player got game_state — solo game started');

  console.log('\n──── ONE-PLAYER MATCHMAKING TEST ────');
  results.forEach((r) => console.log(r));
  const failed = results.filter((r) => r.startsWith('✗')).length;
  console.log(`\n${failed === 0 ? 'ALL PASSED ✅' : failed + ' FAILED ❌'}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error('E2E error:', e);
  process.exit(1);
});
