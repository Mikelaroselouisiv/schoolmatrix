# Legacy AWS ECR / prod-locale / Next-in-Docker

Déplacé hors de la racine pour éviter toute confusion avec le produit actuel (GCP + Electron Vite + server-stack).

| Contenu | Ancien rôle |
|---------|-------------|
| `desktop/` | Electron assistant ECR / `C:\SchoolMatrix` |
| `scripts/` | start-prod-local, login-ecr, etc. |
| `docker-compose*.yml` | Stacks Next + API + ECR |
| `workflows/build-push-ecr.yml` | CI AWS (désarmé — plus dans `.github/workflows`) |
| `docs/` | Guides ECR / EC2 / prod-locale |

**Ne pas réactiver** sans migration volontaire. Pipeline actuel : Artifact Registry + `ship-all.ps1`.
