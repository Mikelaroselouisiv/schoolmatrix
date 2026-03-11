# Production locale Windows — SchoolMatrix

Guide pour faire tourner SchoolMatrix en production locale sur Windows avec données persistantes (dossier hôte + PostgreSQL + stockage fichiers), prêt pour un lancement depuis Electron.

---

## Préparation automatique (aucune création manuelle)

Au premier lancement, **aucun dossier ni fichier n’a besoin d’être créé à la main**. Un script prépare tout avant le démarrage Docker.

**Deux modes de démarrage :**

- **Build local** (premier lancement ou développement) :  
  `node scripts/start-prod-local-build.js`  
  (ou `node scripts/start-prod-local.js`, qui délègue à celui-ci)
- **Mise à jour depuis ECR** (images déjà poussées sur AWS) :  
  `node scripts/update-prod-local-ecr.js`

**Ce qui est créé automatiquement et à quel moment :**

| Moment | Élément | Condition |
|--------|--------|-----------|
| Au lancement de `prepare-prod-local.js` (ou des scripts de démarrage) | Dossier racine des données | S’il n’existe pas (défaut : `C:\SchoolMatrix`) |
| Idem | `storage`, `storage/profiles`, `storage/uploads`, `storage/backups`, `postgres_data` | S’ils n’existent pas |
| Idem | Fichier `.env.prod` dans le dossier racine des données | S’il n’existe pas (copié depuis `scripts/env.prod.local.template`) |
| Idem | Fichier `.env` à la racine du projet | S’il n’existe pas (copié depuis `.env.example`, avec `SCHOOLMATRIX_DATA` mis à jour) |
| Au démarrage du conteneur api | Sous-dossiers utilisés sous `/app/storage` | Déjà créés sur l’hôte dans `…/storage/` |

**Choix du dossier racine :** par défaut `C:/SchoolMatrix`. Pour un autre chemin : définir `SCHOOLMATRIX_DATA` (variable d’environnement ou dans le `.env` du projet) avant d’exécuter le script.

---

## 1. Dossier Windows recommandé (racine des données)

**Recommandation : `C:\SchoolMatrix`**

- Un seul dossier contient toutes les données (base, fichiers, configuration).
- Utiliser des **slashes** dans les variables pour Docker : `C:/SchoolMatrix`.
- Vous pouvez choisir un autre chemin (ex. `D:\Donnees\SchoolMatrix` ou `%LOCALAPPDATA%\SchoolMatrix`) en le définissant via `SCHOOLMATRIX_DATA`.

---

## 2. Bind mounts Docker (prod locale)

Avec `docker-compose.prod-local.yml` et `SCHOOLMATRIX_DATA=C:/SchoolMatrix` :

| Dossier hôte (Windows)     | Monté dans le conteneur | Usage                    |
|----------------------------|--------------------------|--------------------------|
| `C:\SchoolMatrix\storage`  | `/app/storage` (api)     | profiles, uploads, backups |
| `C:\SchoolMatrix\postgres_data` | `/var/lib/postgresql/data` (db) | Données PostgreSQL |

L’application garde **`STORAGE_ROOT=/app/storage`** dans le conteneur ; le contenu est celui du dossier Windows `C:\SchoolMatrix\storage`.

---

## 3. Sous-dossiers créés automatiquement

Créés par **`scripts/prepare-prod-local.js`** (ou par `start-prod-local.js`) **sur l’hôte** si absents :

- **`storage/`** — racine du stockage applicatif (montée en `/app/storage` dans l’api).
- **`storage/profiles/`** — photos de profil, etc.
- **`storage/uploads/`** — fichiers uploadés (logos, pièces jointes).
- **`storage/backups/`** — sauvegardes locales (prévu pour usage futur).
- **`postgres_data/`** — données PostgreSQL (montées dans le conteneur `db`).

Aucune création manuelle : le script les crée au premier lancement.

---

## 4. Emplacement du fichier `.env.prod`

**Chemin : `<dossier racine des données>/.env.prod`** (ex. `C:\SchoolMatrix\.env.prod`).

Ce fichier est chargé par le conteneur **api** via `env_file` dans `docker-compose.prod-local.yml`. Il contient au minimum :

- `DB_HOST=db`, `DB_PORT=5432`
- `DB_USER`, `DB_PASS`, `DB_NAME` (identiques à ceux du `.env` à la racine du projet)
- `JWT_SECRET` (à changer en production)

**Création automatique :** si le fichier n’existe pas, `prepare-prod-local.js` le crée à partir de `scripts/env.prod.local.template`. Vous pouvez ensuite éditer `C:\SchoolMatrix\.env.prod` pour modifier le `JWT_SECRET` ou ajouter les variables S3.

---

## 4b. Fichier `.env` à la racine du projet

Un **seul fichier `.env`** à la racine configure toute la production locale (docker-compose, scripts de démarrage et de mise à jour ECR). Modèle : `.env.example`.

Variables : `SCHOOLMATRIX_DATA`, `DB_USER`, `DB_PASS`, `DB_NAME`, `ECR_REGISTRY`, `AWS_REGION`, `IMAGE_TAG`. Pour le stockage S3 (optionnel), le `.env` contient des lignes à remplir : `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_PREFIX`.

Docker Compose charge automatiquement ce fichier ; les scripts Node le lisent aussi.

---

## 5. Scripts et fichiers du projet

| Fichier | Rôle |
|--------|--------|
| **`scripts/prepare-prod-local.js`** | Prépare l’environnement local : crée le dossier racine des données, les sous-dossiers (`storage/*`, `postgres_data`) et `.env.prod` / `.env` si absents. Appelé par les deux scripts de démarrage. |
| **`scripts/start-prod-local-build.js`** | **Démarrer (build local)** : préparation puis `docker compose -f docker-compose.prod-local.yml up -d --build`. À utiliser pour le bouton Electron « Démarrer » ou le premier lancement. |
| **`scripts/update-prod-local-ecr.js`** | **Mettre à jour (depuis ECR)** : préparation puis `docker compose -f docker-compose.prod-local-ecr.yml pull` et `up -d`. Aucun build local. À utiliser pour le bouton Electron « Mettre à jour » une fois le workflow GitHub/ECR en place. Prérequis : `ECR_REGISTRY` (et optionnellement `IMAGE_TAG`) dans le `.env`. |
| **`scripts/start-prod-local.js`** | Raccourci conservé pour compatibilité : délègue à `start-prod-local-build.js`. |
| **`scripts/env.prod.local.template`** | Template pour `.env.prod` dans le dossier de données. |
| **`docker-compose.prod-local.yml`** | Stack prod locale avec **build local** des images (api, web). |
| **`docker-compose.prod-local-ecr.yml`** | Même stack mais images **tirées depuis ECR** (pas de build). Utilisé par `update-prod-local-ecr.js`. |
| **`.env.example`** | Modèle pour le `.env` (copier en `.env` et adapter). |
| **`.env`** (racine) | **Créé automatiquement** par le script de préparation si absent (depuis `.env.example`). Toutes les variables pour prod locale. |
| **`<data root>/.env.prod`** | **Créé automatiquement** par le script de préparation si absent. |

Aucune création manuelle des dossiers ni des fichiers `.env` / `.env.prod` n’est nécessaire.

---

## 6. Lancer la stack depuis Electron (ou en manuel)

### Prérequis

- **Docker Desktop** (ou Docker Engine) installé et en cours d’exécution.
- Aucune création manuelle : les scripts préparent le dossier de données et les fichiers.

### Démarrer avec build local (recommandé au premier lancement)

Depuis la **racine du projet** :

```powershell
node scripts/start-prod-local-build.js
```

Ou le raccourci : `node scripts/start-prod-local.js` (délègue au même script).

Préparation automatique puis build des images et démarrage de la stack.

### Mettre à jour depuis ECR (sans build local)

Une fois le workflow GitHub Actions et ECR configurés (voir **[\docs\ECR-DEPLOYMENT.md](ECR-DEPLOYMENT.md)**) et les images poussées :

1. S'assurer que le `.env` à la racine contient `ECR_REGISTRY`, `AWS_REGION`, et optionnellement `IMAGE_TAG=latest` (voir `.env.example`).

2. Lancer :

```powershell
node scripts/update-prod-local-ecr.js
```

Le script prépare l’environnement si besoin, tire les images depuis ECR, puis redémarre les conteneurs api et web (la base reste inchangée).

### Dossier de données personnalisé

Avant d’exécuter un script, définir le chemin (slashes pour Docker) :

```powershell
$env:SCHOOLMATRIX_DATA="D:/Data/SchoolMatrix"
node scripts/start-prod-local-build.js
```

Ou mettre `SCHOOLMATRIX_DATA=D:/Data/SchoolMatrix` dans le `.env` à la racine.

### Commandes manuelles (après préparation)

```powershell
# Build local + démarrage
docker compose -f docker-compose.prod-local.yml up -d --build

# Mise à jour ECR (pull + up)
docker compose -f docker-compose.prod-local-ecr.yml pull
docker compose -f docker-compose.prod-local-ecr.yml up -d

# Logs
docker compose -f docker-compose.prod-local.yml logs -f

# Arrêter (même commande pour les deux composes, mêmes noms de conteneurs)
docker compose -f docker-compose.prod-local.yml down
```

### Boutons Electron « Démarrer » et « Mettre à jour »

1. **Répertoire de travail** : exécuter les scripts depuis la **racine du dépôt** (où se trouvent les `docker-compose.*.yml` et le dossier `scripts/`).

2. **Bouton « Démarrer »** : lancer  
   `node scripts/start-prod-local-build.js`  
   (préparation + build local + up).

3. **Bouton « Mettre à jour »** : lancer  
   `node scripts/update-prod-local-ecr.js`  
   (préparation + pull ECR + up). Prérequis : `ECR_REGISTRY` dans le `.env`.

4. **Dossier de données personnalisé** : définir `SCHOOLMATRIX_DATA` dans l’environnement ou dans le `.env` avant d’exécuter les scripts.

5. **URLs après démarrage** : API `http://127.0.0.1:3000`, Web `http://127.0.0.1:3001`.

---

## Stockage cloud S3 (prêt, optionnel)

L’application est déjà prête pour envoyer les fichiers vers AWS S3 lorsque les identifiants sont fournis. Aucun changement de code n’est nécessaire.

Dans **`C:\SchoolMatrix\.env.prod`**, ajouter (optionnel) :

```env
AWS_REGION=eu-west-1
AWS_S3_BUCKET=drive-mike
AWS_S3_PREFIX=schoolmatrix
AWS_ACCESS_KEY_ID=<votre clé>
AWS_SECRET_ACCESS_KEY=<votre secret>
```

Sans ces variables, le stockage reste uniquement local (profiles, uploads, backups sous `C:\SchoolMatrix\storage`).

---

## Architecture : qui crée quoi

- **Préparation sur l’hôte (scripts Node)** : les dossiers et fichiers `.env` / `.env.prod` sont créés par `scripts/prepare-prod-local.js` **avant** le démarrage de Docker. Ce script peut être appelé par Electron ou par `scripts/start-prod-local.js`. C’est la solution retenue pour ne pas dépendre d’une création manuelle et pour garder un seul dossier de données (y compris `postgres_data`) sur le disque Windows.
- **Docker** : ne crée pas les dossiers hôte ; il monte des chemins existants (`storage`, `postgres_data`). Les variables `SCHOOLMATRIX_DATA` et `DB_*` sont lues depuis le `.env` du projet (chargé par `docker compose`).
- **Backend (conteneur api)** : utilise `STORAGE_ROOT=/app/storage` ; les sous-dossiers existent déjà sur l’hôte (créés par le script).
- **Deux composes** : `docker-compose.prod-local.yml` (build local) pour « Démarrer », `docker-compose.prod-local-ecr.yml` (images ECR) pour « Mettre à jour ». Mêmes noms de conteneurs et mêmes montages ; seul le mode d’obtention des images (build vs pull) change.
