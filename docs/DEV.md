# Développement SchoolMatrix

Poste développeur uniquement. Pour la logique des 3 environnements : [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Prérequis

- Node.js 20+
- Docker Desktop (pour Postgres DEV)
- Depuis la racine du repo : `npm install` dans `parallele-schoolmatrix-backend` et `apps/desktop` (une fois)

## Lancer (recommandé)

Depuis la **racine** du dépôt :

```powershell
# 1) S’assurer que le stack « Server école » n’occupe pas :3000 sur ce PC
npm run dev:free-port

# 2) API (démarre schoolmatrix-db-dev si besoin, puis Nest --watch)
npm run dev:backend

# 3) Desktop Electron édition Server (API http://127.0.0.1:3000)
npm run dev:desktop
```

Édition Remote (UI locale, API cloud) :

```powershell
npm run dev:desktop:remote
```

### Équivalent par dossier

```powershell
# Terminal A
cd parallele-schoolmatrix-backend
npm run dev

# Terminal B
cd apps\desktop
npm run dev
```

## Postgres DEV

| | |
|--|--|
| Conteneur | `schoolmatrix-db-dev` |
| Port hôte | **5435** → 5432 conteneur |
| Compose | `dev/docker-compose.postgres.yml` |
| Env Nest | `parallele-schoolmatrix-backend/.env.dev` (copie de `.env.dev.example`) |

```powershell
npm run dev:db          # up -d
npm run dev:db:down     # stop
```

`npm run dev` du backend appelle déjà `docker start schoolmatrix-db-dev`, et crée le conteneur via le compose DEV s’il n’existe pas.

> Sur cette machine, les ports 5432–5434 sont souvent pris par d’autres projets (POS). D’où **5435** pour SchoolMatrix DEV.

## Tester la sync (lab local — recommandé)

Le seed DEV et tes clics UI vivent dans `schoolmatrix-db-dev`. **`npm run dev:sync-agent` pointe vers la VM GCP** : ça enverrait des élèves et parents fictifs en production. Ne pas l’utiliser pour tester un jeu de données local.

Lab à deux nœuds **sur ce PC** :

| Nœud | API | Postgres |
|------|-----|----------|
| LOCAL (vérité école) | `http://127.0.0.1:3000` | `schoolmatrix-db-dev` :5435 |
| Miroir « cloud » | `http://127.0.0.1:3001` | `schoolmatrix-db-cloud-dev` :5438 |

### Deux API + deux fronts simultanés

| Rôle | API | Vite | Commandes |
|------|-----|------|-----------|
| École (Server) | `:3000` | `:5173` | `dev:backend` + `dev:desktop` |
| Miroir (Remote) | `:3001` | `:5174` | `dev:backend:mirror` + `dev:desktop:mirror` |
| Agent | — | — | `dev:sync-lab` |

```powershell
npm run dev:free-lab         # libère 3000, 3001, 5173, 5174, 3911
npm run dev:backend          # Terminal A — école
npm run dev:backend:mirror   # Terminal B — miroir (crée le Postgres :5438 si besoin)
npm run dev:desktop          # Terminal C — front école
npm run dev:desktop:mirror   # Terminal D — front miroir
npm run dev:sync-lab         # Terminal E — agent LOCAL → miroir (refuse la VM GCP)
```

Après un cycle (~5 s), les comptes du seed et les élèves apparaissent sur `:3001`. Une saisie sur Server (`:3000`) doit arriver sur le miroir.

Données fictives : `npm run dev:seed` (mot de passe unique pour tous les comptes de démo, voir l’en-tête du script).

Sur une **école**, l’agent tourne dans Docker via l’installateur — pas comme process Node hôte.

## Frontend : un seul produit

| Chemin | Statut |
|--------|--------|
| `apps/desktop` | **Canonique** — Electron + React/Vite (`src/renderer`) |
| `apps/desktop/frontend` | **Archive Next.js** — référence de portage uniquement |

Ne pas lancer `npm run dev` dans `apps/desktop/frontend` pour le produit.

## Ne pas faire en DEV

| Action | Pourquoi |
|--------|----------|
| Utiliser `_archive/` | Ancien AWS/ECR/Electron local-prod |
| `docker compose -f infra/docker/docker-compose.gcp.yml …` sur le laptop | Définition **cloud** |
| `npm run dev:sync-agent` avec le seed fictif | Pousse vers la **VM GCP** — utiliser `dev:sync-lab` |
| Laisser `schoolmatrix_api_server` sur `:3000` + Nest en parallèle | Collision + confusion prod/dev |
| Croire que Docker Desktop = école | L’école a son propre Docker, alimenté par l’installeur |
| `ship-all` / upload GCS par erreur | Publie en production |

## Après le code — publication

Voir [RELEASE.md](RELEASE.md). En résumé :

```powershell
powershell -ExecutionPolicy Bypass -File infra\scripts\ship-all.ps1 -Bump patch -Commit
```
