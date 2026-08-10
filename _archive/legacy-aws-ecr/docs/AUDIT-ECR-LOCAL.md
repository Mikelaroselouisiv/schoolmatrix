# Audit final — Déploiement local ECR SchoolMatrix

---

## 1. Ce qui est correct

### docker-compose.prod-local-ecr.yml et images ECR
- **Images** : `api` et `web` utilisent `${ECR_REGISTRY}/schoolmatrix-api:${IMAGE_TAG:-latest}` et `${ECR_REGISTRY}/schoolmatrix-web:${IMAGE_TAG:-latest}`. Noms et format ECR cohérents avec le workflow GitHub (account 421983920969, région us-east-2).
- **Service db** : image `postgres:16-alpine` (Docker Hub), pas ECR — voulu pour la prod locale.
- **Pas de `build:`** dans le compose ECR : uniquement `image:`, donc pas de mélange build/pull.

### update-prod-local-ecr.js et variables .env
- **Chargement** : `loadEnv()` lit le `.env` à la racine du projet et remplit `ECR_REGISTRY`, `IMAGE_TAG`, `AWS_REGION` dans `process.env` avant le login et les commandes Docker.
- **Ordre** : préparation → login ECR → `docker compose pull` → `docker compose up -d`.
- **Docker Compose** : lancé avec `cwd: PROJECT_ROOT`, donc le binaire Docker Compose charge bien le `.env` du projet et résout `${SCHOOLMATRIX_DATA}`, `${DB_USER}`, etc. pour les volumes et `env_file`.

### login-ecr.js et AWS CLI
- **Commande** : `aws ecr get-login-password --region <AWS_REGION> | docker login --username AWS --password-stdin <ECR_REGISTRY>` en une seule commande shell, avec `spawnSync(..., { shell: true })`.
- **Variables** : `ECR_REGISTRY` et `AWS_REGION` prises depuis `.env` ou `process.env` ; l’enfant reçoit `env: { ...process.env, ECR_REGISTRY, AWS_REGION }`.
- **Credentials** : AWS CLI utilise `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (env) ou `~/.aws/credentials` ; pas de lecture des clés dans le `.env` (sécurité).

### API et bootstrap production
- **Dockerfile backend** : `CMD ["node", "scripts/bootstrap-production.js"]` — l’image ECR démarre bien avec le bootstrap.
- **Bootstrap** : attend la base, lance les migrations, puis `node dist/main.js`. À l’intérieur du conteneur, `DB_HOST` / `DB_PORT` viennent de l’`env_file` Docker (fichier sur l’hôte), pas d’un `.env.prod` dans l’image — cohérent.

### PostgreSQL et persistance
- **Volume** : `${SCHOOLMATRIX_DATA}/postgres_data:/var/lib/postgresql/data` dans les deux composes (prod-local et prod-local-ecr).
- **Même nom de conteneur** : `schoolmatrix-db-prod-local`. Passage du mode build local au mode ECR réutilise la même base et le même volume.

### Stockage local (dossier Windows)
- **Montage** : `${SCHOOLMATRIX_DATA}/storage:/app/storage` pour le service `api` dans les deux composes.
- **STORAGE_ROOT** : `environment: STORAGE_ROOT: /app/storage` — inchangé dans le conteneur ; le contenu est bien le dossier Windows.

### host.docker.internal
- **prod-local et prod-local-ecr** : aucun usage de `host.docker.internal` ; `DB_HOST: db` (service interne).
- **docker-compose.yml** (ancien, base sur l’hôte) : utilise encore `DB_HOST: host.docker.internal` et `extra_hosts` — limité à ce scénario, pas utilisé par le flux ECR / prod locale.

### Séparation build local / ECR
- **Fichiers distincts** : `docker-compose.prod-local.yml` (build) et `docker-compose.prod-local-ecr.yml` (images ECR).
- **Scripts distincts** : `start-prod-local-build.js` (prepare + compose build) et `update-prod-local-ecr.js` (prepare + login + compose pull + up).
- **Mêmes noms de conteneurs et volumes** : bascule entre les deux modes sans conflit de ressources.

---

## 2. Ce qui reste risqué ou à surveiller

- **Credentials AWS en local** : si l’utilisateur n’a pas configuré `aws configure` ni défini `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` dans l’environnement, `login-ecr.js` échouera. Les clés ne doivent pas être mises dans le `.env` (fichier souvent versionné ou partagé).
- **Premier lancement ECR** : le `.env` créé par `prepare` à partir de `.env.example` contient désormais `ECR_REGISTRY`, `AWS_REGION` et `IMAGE_TAG`.
- **Bootstrap et `.env.prod` dans le conteneur** : le bootstrap fait `dotenv.config({ path: '.env.prod' })` ; ce fichier n’existe pas dans l’image. Les variables viennent uniquement de l’`env_file` Docker. Comportement correct, mais à ne pas modifier en s’attendant à un `.env.prod` dans le conteneur.
- **Chemin Windows et `.env`** : `SCHOOLMATRIX_DATA` doit être en slashes pour Docker (ex. `C:/SchoolMatrix`). Le script `prepare-prod-local.js` normalise déjà en slashes lors de la création du `.env` — à conserver.

---

## 3. Corrections recommandées avant le premier test réel

1. **Vérifier que le `.env` contient toutes les variables pour le mode ECR**  
   Le `.env` à la racine (créé depuis `.env.example`) contient par défaut :
   - `SCHOOLMATRIX_DATA` (ex. `C:/SchoolMatrix`)
   - `DB_USER`, `DB_PASS`, `DB_NAME`
   - `ECR_REGISTRY`, `AWS_REGION`, `IMAGE_TAG`

2. **Documenter explicitement les credentials AWS pour le login ECR**  
   Dans la doc (ex. `ECR-DEPLOYMENT.md` ou `LOCAL-PRODUCTION-WINDOWS.md`), préciser que pour « Mettre à jour » depuis ECR en local il faut soit :
   - `aws configure` (avec un utilisateur IAM ayant les droits ECR en lecture),  
   soit exporter `AWS_ACCESS_KEY_ID` et `AWS_SECRET_ACCESS_KEY` dans l’environnement avant d’exécuter le script (et ne pas les mettre dans le `.env`).

3. **`.env` consolidé**  
   Un seul fichier `.env` à la racine (modèle `.env.example`) configure toute la production locale (build local + ECR). `prepare-prod-local.js` crée le `.env` depuis `.env.example` si absent.

Aucune modification de code obligatoire pour un premier test : il suffit d’avoir un `.env` complet et des credentials AWS valides pour ECR.
