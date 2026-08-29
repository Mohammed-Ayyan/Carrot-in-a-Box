/**
 * Reproduces the reported bug: players press START at different times / wait a while,
 * and must still match. Run against a RUNNING server:
 *   npx tsx tests/staggeredMatch.e2e.ts
 *
 * Flow:
 *  - Client 1 joins and waits (simulating a long wait in the queue)
 *  - Client 2 joins later
 *  - BOTH must receive match_found and game_state
 *  - A third client that joins alone afterward must NOT match (stays waiting)
 */
import { io, Socket } from 'socket.io-client';

const SERVER = process.env.SERVER_URL || 'http://localhost:3001';

async function session(nick: string): Promise<string> {
  const res = await fetch(`${SERVER}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: nick }),
  });
  return ((await res.json()) as { sessionToken: string }).sessionToken;
}

function mk(token: string) {
  const s = io(SERVER, { auth: { token }, transports: ['websocket'] });
  const state = { matched: false, gameState: false };
  s.on('match_found', () => (state.matched = true));
  s.on('game_state', () => (state.gameState = true));
  s.on('join_matchmaking', () => {});
  return { s, state };
}

async function run() {
  const results: string[] = [];
  const pass = (m: string) => results.push(`✓ ${m}`);
  const fail = (m: string) => results.push(`✗ ${m}`);

  const t1 = await session('Waiter1');
  const t2 = await session('Waiter2');
  const t3 = await session('Lonely3');

  const c1 = mk(t1);
  await new Promise((r) => setTimeout(r, 300));
  c1.s.emit('join_matchmaking', {});

  // Client 1 waits a while before Client 2 arrives.
  await new Promise((r) => setTimeout(r, 4000));

  const c2 = mk(t2);
  await new Promise((r) => setTimeout(r, 300));
  c2.s.emit('join_matchmaking', {});

  // Give matchmaking a moment.
  await new Promise((r) => setTimeout(r, 2500));

  if (c1.state.matched && c2.state.matched) pass('staggered joiners matched (Waiter1 + Waiter2)');
  else fail(`staggered match failed: c1.matched=${c1.state.matched} c2.matched=${c2.state.matched}`);

  if (c1.state.gameState && c2.state.gameState) pass('both matched clients received game_state');
  else fail(`missing game_state: c1=${c1.state.gameState} c2=${c2.state.gameState}`);

  // Third client joins alone → must NOT match.
  const c3 = mk(t3);
  await new Promise((r) => setTimeout(r, 300));
  c3.s.emit('join_matchmaking', {});
  await new Promise((r) => setTimeout(r, 2500));

  if (!c3.state.matched) pass('lone third client correctly stays waiting (no match)');
  else fail('BUG: lone third client got matched');

  c1.s.disconnect();
  c2.s.disconnect();
  c3.s.disconnect();

  console.log('\n──── STAGGERED MATCH TEST ────');
  results.forEach((r) => console.log(r));
  const failed = results.filter((r) => r.startsWith('✗')).length;
  console.log(`\n${failed === 0 ? 'ALL PASSED ✅' : failed + ' FAILED ❌'}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error('E2E error:', e);
  process.exit(1);
});
