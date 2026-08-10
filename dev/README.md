# Espace DEV (poste développeur)

Utilitaires pour le **développement local** uniquement.

| Fichier | Rôle |
|---------|------|
| `docker-compose.postgres.yml` | Postgres `schoolmatrix-db-dev` (port **5435**) |
| `stop-local-server-stack.ps1` | Arrête le stack « Server école » s’il tourne par erreur sur ce PC (libère `:3000`) |

Voir [docs/DEV.md](../docs/DEV.md) et [docs/ENVIRONMENTS.md](../docs/ENVIRONMENTS.md).

**Ne pas** mettre ici de compose GCP ni de stack installateur école.
