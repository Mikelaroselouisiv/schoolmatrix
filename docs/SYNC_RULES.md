# Règles de synchronisation — Parallele SchoolMatrix

## Topologie

- **Source de vérité = LOCAL** (machine Server : Postgres + API + **un** sync-agent).
- **Cloud GCP = miroir** (API + Postgres) pour Remote, mobile, WordPress.
- **Un seul agent sync métier**, sur la machine Server.

## Cycle agent (~45s)

1. Pull cloud → local  
2. Push local → cloud  

## Conflits : LOCAL gagne

| Nœud qui applique | Provenance | Règle |
|-------------------|------------|--------|
| LOCAL | cloud (`sourceNodeId=gcp`) | Crée si absent ; **ne jamais écraser** une ligne existante |
| CLOUD | local (`local-mother`) | Upsert si `incoming.updatedAt >= existing` (local gagne les égalités) |

Les écritures Remote/mobile sur le cloud apparaissent en local **seulement** si l’uuid n’existe pas encore localement (sinon local conserve sa version).

## Identité

- UUID métier (`id`) = clé de sync.
- Filaire : colonnes scalaires + FK ManyToOne comme uuid (via `loadRelationIds`).
- Pas de soft-delete généralisé en V1 (`deletedAt` toujours `null`).

## Append-only

Ne jamais écraser si uuid déjà présent :

- `PaymentTransaction`
- `Attendance`

## Auth

Header `X-Sync-Key: <SYNC_API_KEY>` — même clé sur local, cloud et agent.

## Entités V1

Voir `ENTITY_ORDER` dans `apps/sync-agent/src/entities.js` et `SYNC_ENTITY_DEFS` dans le backend.

Inclut **`User`** (login Server → Remote ; `password_hash` + `role_id`). Les rôles sont seedés identiquement (mêmes ids) des deux côtés — pas de sync `Role` en V1.

Hors scope V1 : sync fichiers GCS (Phase 2/plus tard).
