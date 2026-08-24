# Espace DEV (poste développeur)

Utilitaires pour le **développement local** uniquement.

| Fichier | Rôle |
|---------|------|
| `docker-compose.postgres.yml` | Postgres `schoolmatrix-db-dev` (port **5435**) |
| `docker-compose.sync-cloud.yml` | Postgres miroir lab `schoolmatrix-db-cloud-dev` (port **5438**) — pas GCP |
| `stop-local-server-stack.ps1` | Arrête le stack « Server école » s’il tourne par erreur sur ce PC (libère `:3000`) |
| `free-dev-lab-ports.ps1` | Libère les ports du lab (`3000`, `3001`, `5173`, `5174`, `3911`) sans toucher Postgres |
| `normalize-dev-grades-haitian.sql` | Recale les notes DEV (anciennes /20) vers barèmes 100–500. **Uniquement** `schoolmatrix-db-dev` |

Voir [docs/DEV.md](../docs/DEV.md) et [docs/ENVIRONMENTS.md](../docs/ENVIRONMENTS.md).

**Ne pas** mettre ici de compose GCP ni de stack installateur école.
