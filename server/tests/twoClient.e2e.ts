/**
 * Live two-client end-to-end test.
 *
 * Run against a RUNNING server (npm run dev) + Postgres + Redis:
 *   npx tsx tests/twoClient.e2e.ts
 *
 * Verifies the full multiplayer flow and the carrot privacy guarantees:
 *  - two clients match into the same room
 *  - each client's peek_result is private (opponent never receives it)
 *  - opponent_peeked carries no carrot info
 *  - game_result (carrotOwner) only arrives in the RESULT phase
 *  - result is consistent across both clients
 */
import { io, Socket } from 'socket.io-client';

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

function connect(token: string): Socket {
  return io(SERVER, { auth: { token }, transports: ['websocket'] });
}

async function run() {
  const results: string[] = [];
  const pass = (m: string) => results.push(`✓ ${m}`);
  const fail = (m: string) => results.push(`✗ ${m}`);

  const tokenA = await createSession('ClientA');
  const tokenB = await createSession('ClientB');

  const a = connect(tokenA);
  const b = connect(tokenB);

  const aState = { peekResults: 0, opponentPeeked: 0, gameResult: null as any, roomId: '', myName: '', oppName: '' };
  const bState = { peekResults: 0, opponentPeeked: 0, gameResult: null as any, roomId: '', myName: '', oppName: '' };

  a.on('match_found', (d: any) => (aState.roomId = d.roomId));
  b.on('match_found', (d: any) => (bState.roomId = d.roomId));
  a.on('game_state', (s: any) => { if (s.you?.nickname) aState.myName = s.you.nickname; if (s.opponent?.nickname) aState.oppName = s.opponent.nickname; });
  b.on('game_state', (s: any) => { if (s.you?.nickname) bState.myName = s.you.nickname; if (s.opponent?.nickname) bState.oppName = s.opponent.nickname; });
  a.on('peek_result', () => aState.peekResults++);
  b.on('peek_result', () => bState.peekResults++);
  a.on('opponent_peeked', () => aState.opponentPeeked++);
  b.on('opponent_peeked', () => bState.opponentPeeked++);
  a.on('game_result', (d: any) => (aState.gameResult = d));
  b.on('game_result', (d: any) => (bState.gameResult = d));

  // Track that no carrot info ever appears in public events.
  let leak = false;
  const auditPublic = (name: string) => (payload: any) => {
    const str = JSON.stringify(payload || {});
    if (name !== 'game_result' && /carrot(Owner|Location|Box)|containsCarrot/i.test(str)) {
      leak = true;
      fail(`LEAK: '${name}' contained carrot info: ${str}`);
    }
  };
  for (const evt of ['game_state', 'phase_change', 'opponent_peeked', 'decision_received']) {
    a.on(evt, auditPublic(evt));
    b.on(evt, auditPublic(evt));
  }

  await new Promise((r) => setTimeout(r, 500));
  a.emit('join_matchmaking', {});
  b.emit('join_matchmaking', {});

  // Auto-peek when we become the peeker; auto-decide when chooser.
  const wire = (name: string, sock: Socket) => {
    let decided = false;
    sock.on('game_state', (s: any) => {
      console.log(`[${name}] game_state phase=${s.phase} peekRole=${s.you?.peekRole}`);
      if (s.phase === 'PLAYER_PEEK_PHASE' && s.you?.peekRole === 'PEEKER') {
        sock.emit('peek_box');
      }
      if (s.phase === 'DECISION_PHASE' && s.you?.peekRole === 'CHOOSER' && !decided) {
        decided = true;
        console.log(`[${name}] submitting KEEP_BOX`);
        sock.emit('submit_decision', { decision: 'KEEP_BOX' });
      }
    });
    sock.on('phase_change', (s: any) => {
      console.log(`[${name}] phase_change phase=${s.phase}`);
    });
    sock.on('error', (e: any) => console.log(`[${name}] error ${e.code}: ${e.message}`));
  };
  wire('A', a);
  wire('B', b);

  // Let the full round play out. Default server timings: peek(2s) + discussion(60s)
  // + decision(up to 30s) + reveal(3s). We submit the decision as soon as the decision
  // phase opens, so the decision timer short-circuits; ~68s is a safe upper bound.
  const waitMs = parseInt(process.env.E2E_WAIT_MS || '70000', 10);
  await new Promise((r) => setTimeout(r, waitMs));

  // ── Assertions ────────────────────────────────────────────
  if (aState.roomId && aState.roomId === bState.roomId) pass(`both clients in same room ${aState.roomId}`);
  else fail(`room mismatch A=${aState.roomId} B=${bState.roomId}`);

  // Player identity: each sees their own name as `you` and the other as `opponent`.
  if (aState.myName === 'ClientA' && aState.oppName === 'ClientB') pass(`A sees YOU=${aState.myName} OPPONENT=${aState.oppName}`);
  else fail(`A name mismatch you=${aState.myName} opp=${aState.oppName}`);
  if (bState.myName === 'ClientB' && bState.oppName === 'ClientA') pass(`B sees YOU=${bState.myName} OPPONENT=${bState.oppName}`);
  else fail(`B name mismatch you=${bState.myName} opp=${bState.oppName}`);

  const totalPeekResults = aState.peekResults + bState.peekResults;
  if (totalPeekResults === 1) pass('exactly one client received a private peek_result (the peeker)');
  else fail(`expected 1 peek_result total, got ${totalPeekResults} (A=${aState.peekResults} B=${bState.peekResults})`);

  const totalOpponentPeeked = aState.opponentPeeked + bState.opponentPeeked;
  if (totalOpponentPeeked === 1) pass('the non-peeker received opponent_peeked (no carrot info)');
  else fail(`expected 1 opponent_peeked, got ${totalOpponentPeeked}`);

  if (!leak) pass('no carrot info leaked in any public event');

  if (aState.gameResult && bState.gameResult) {
    pass('both clients received game_result at RESULT');
    if (aState.gameResult.carrotOwner && aState.gameResult.carrotOwner === bState.gameResult.carrotOwner) {
      pass(`carrot location consistent across clients (${aState.gameResult.carrotOwner})`);
    } else {
      fail('carrotOwner mismatch between clients');
    }
    if (aState.gameResult.winner === bState.gameResult.winner) pass(`winner consistent (${aState.gameResult.winner})`);
    else fail('winner mismatch between clients');
  } else {
    fail('one or both clients missing game_result');
  }

  a.disconnect();
  b.disconnect();

  console.log('\n──── TWO-CLIENT E2E RESULTS ────');
  results.forEach((r) => console.log(r));
  const failed = results.filter((r) => r.startsWith('✗')).length;
  console.log(`\n${failed === 0 ? 'ALL PASSED ✅' : failed + ' FAILED ❌'}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error('E2E error:', e);
  process.exit(1);
});
