import axios from 'axios';
import { ENTITY_ORDER } from './entities.js';

export function createApiClient(baseURL, syncKey) {
  return axios.create({
    baseURL: baseURL.replace(/\/$/, ''),
    timeout: 60_000,
    headers: {
      'X-Sync-Key': syncKey,
      'Content-Type': 'application/json',
    },
  });
}

function readCursor(cursors, entity) {
  const cur = cursors[entity];
  if (!cur) return { t: '1970-01-01T00:00:00.000000Z', id: null };
  if (typeof cur === 'string') return { t: cur, id: null };
  return {
    t: cur.t || '1970-01-01T00:00:00.000000Z',
    id: cur.id || null,
  };
}

/**
 * Pull deltas from `from` and push them to `to`.
 * Curseur avancé seulement si le batch a 0 erreur.
 * Curseur composite { t, id } pour éviter le blocage µs.
 */
export async function replicateDirection({
  from,
  to,
  cursors,
  sourceNodeId,
  label,
}) {
  const summary = { label, entities: {} };

  for (const entity of ENTITY_ORDER) {
    let cursor = readCursor(cursors, entity);
    let pulled = 0;
    let applied = 0;
    let skipped = 0;
    let errors = 0;
    const errorSamples = [];
    let pages = 0;
    let blocked = false;

    for (;;) {
      pages += 1;
      const params = {
        entity,
        since: cursor.t,
        take: 200,
      };
      if (cursor.id) params.afterId = cursor.id;

      const { data } = await from.get('/sync/pull', { params });
      const records = data.records || [];
      if (records.length === 0) {
        if (data.nextCursor) {
          cursors[entity] = {
            t: data.nextCursor,
            id: data.nextAfterId || null,
          };
        }
        break;
      }

      pulled += records.length;
      const pushRes = await to.post('/sync/push', {
        entity,
        sourceNodeId,
        records,
      });
      const batchApplied = pushRes.data?.applied ?? 0;
      const batchSkipped = pushRes.data?.skipped ?? 0;
      const batchErrors = pushRes.data?.errors ?? 0;
      applied += batchApplied;
      skipped += batchSkipped;
      errors += batchErrors;

      if (batchErrors > 0) {
        const failed = (pushRes.data?.results || [])
          .filter((r) => r.action === 'error')
          .slice(0, 3)
          .map((r) => `${r.uuid}: ${r.error || 'error'}`);
        errorSamples.push(...failed);
        blocked = true;
        break;
      }

      cursor = {
        t:
          data.nextCursor ||
          records[records.length - 1]?.updatedAt ||
          cursor.t,
        id:
          data.nextAfterId ||
          records[records.length - 1]?.uuid ||
          cursor.id,
      };
      cursors[entity] = cursor;

      if (records.length < 200 || pages > 50) break;
    }

    summary.entities[entity] = {
      pulled,
      applied,
      skipped,
      errors,
      blocked,
      cursor: cursors[entity],
      ...(errorSamples.length ? { errorSamples } : {}),
    };
  }

  return summary;
}
