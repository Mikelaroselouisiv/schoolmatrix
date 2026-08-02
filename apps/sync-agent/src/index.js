import { createApiClient, replicateDirection } from './replicate.js';

const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://127.0.0.1:3000';
const REMOTE_API_URL = process.env.REMOTE_API_URL || 'http://34.95.43.132';
const SYNC_API_KEY = process.env.SYNC_API_KEY || '';
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 45_000);
const NODE_ID = process.env.SYNC_NODE_ID || 'local-mother';

if (!SYNC_API_KEY) {
  console.error('[sync-agent] SYNC_API_KEY requis');
  process.exit(1);
}

const local = createApiClient(LOCAL_API_URL, SYNC_API_KEY);
const remote = createApiClient(REMOTE_API_URL, SYNC_API_KEY);

/** Curseurs en mémoire (restart = catch-up depuis epoch). */
const pullCursors = Object.create(null);
const pushCursors = Object.create(null);

let running = false;

async function tick() {
  if (running) {
    console.warn('[sync-agent] tick précédent encore en cours — skip');
    return;
  }
  running = true;
  const started = Date.now();
  try {
    // 1) Pull cloud → local (créations cloud ; local gagne sur l’existant)
    const pullSummary = await replicateDirection({
      from: remote,
      to: local,
      cursors: pullCursors,
      sourceNodeId: 'gcp',
      label: 'pull-gcp→local',
    });
    console.log('[sync-agent]', JSON.stringify(pullSummary));

    // 2) Push local → cloud (vérité écrase le miroir)
    const pushSummary = await replicateDirection({
      from: local,
      to: remote,
      cursors: pushCursors,
      sourceNodeId: NODE_ID,
      label: 'push-local→gcp',
    });
    console.log('[sync-agent]', JSON.stringify(pushSummary));
  } catch (err) {
    const message = err?.response?.data
      ? JSON.stringify(err.response.data)
      : err?.message || String(err);
    console.error('[sync-agent] erreur', message);
  } finally {
    running = false;
    console.log(`[sync-agent] tick ${Date.now() - started}ms`);
  }
}

console.log(
  `[sync-agent] démarrage — local=${LOCAL_API_URL} remote=${REMOTE_API_URL} interval=${SYNC_INTERVAL_MS}ms vérité=LOCAL`,
);
void tick();
setInterval(() => void tick(), SYNC_INTERVAL_MS);
