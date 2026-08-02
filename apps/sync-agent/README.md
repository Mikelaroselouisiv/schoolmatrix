# SchoolMatrix sync-agent

Tourne **uniquement** sur la machine Server (source de vérité).

Cycle toutes les ~45s :

1. Pull cloud → local (nouvelles lignes cloud ; **local gagne** si la ligne existe déjà)
2. Push local → cloud (le local écrase le miroir)

## Variables

| Variable | Défaut | Rôle |
|----------|--------|------|
| `LOCAL_API_URL` | `http://127.0.0.1:3000` | API locale |
| `REMOTE_API_URL` | `http://34.95.43.132` | API GCP |
| `SYNC_API_KEY` | *(requis)* | Header `X-Sync-Key` |
| `SYNC_INTERVAL_MS` | `45000` | Période |
| `SYNC_NODE_ID` | `local-mother` | `sourceNodeId` du push |

## Dev

```powershell
cd apps/sync-agent
npm install
$env:SYNC_API_KEY="..."
$env:LOCAL_API_URL="http://127.0.0.1:3000"
$env:REMOTE_API_URL="http://34.95.43.132"
npm start
```
