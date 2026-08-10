# Compose Docker — ops / production

| Fichier | Cible |
|---------|--------|
| `docker-compose.gcp.yml` | **VM GCP uniquement** (Remote API) |
| `docker-compose.server.yml` | Référence Server (pull AR) — **pas** le bundle installateur |

Le stack réellement livré aux écoles est :

`apps/desktop/server-stack/docker-compose.yml` (+ images `.tar`).

Ne pas lancer `docker-compose.gcp.yml` sur le poste de développement.

Voir [docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md).
