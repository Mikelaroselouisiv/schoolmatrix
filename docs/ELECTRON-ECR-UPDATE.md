# Intégration Electron — Vérification et mise à jour depuis ECR

Ce document décrit comment l’application Electron peut vérifier une mise à jour des images Docker sur ECR, proposer la mise à jour à l’utilisateur, lancer la mise à jour et enregistrer la nouvelle version.

## 1. Stratégie de comparaison des versions

### Version locale

La version “installée” est déterminée dans cet ordre :

1. **Fichier `.schoolmatrix-version`** dans le dossier de données (ex. `C:/SchoolMatrix/.schoolmatrix-version`).  
   Ce fichier est écrit par `update-prod-local-ecr.js` après chaque mise à jour réussie. Une ligne = le tag déployé (ex. `latest` ou `abc1234`).

2. **Fallback : `docker inspect`** sur le conteneur `schoolmatrix-api` pour lire l’image (ex. `4219.../schoolmatrix-api:latest`). Le tag est extrait après le `:`.

3. **Fallback : variable `IMAGE_TAG`** dans le `.env` du dossier de données ou du projet.

4. **Sinon :** `"unknown"`.

### Version distante

- **Source :** AWS ECR, repository `schoolmatrix-api` (on suppose que `schoolmatrix-api` et `schoolmatrix-web` partagent le même tag).
- **Méthode :** AWS CLI `aws ecr describe-images --repository-name schoolmatrix-api` ; tri des images par date de push décroissante ; le **tag** de la plus récente image = version distante (si l’image a le tag `latest`, on utilise `latest`, sinon le premier tag, ex. SHA court).

Aucun secret dans le code : `ECR_REGISTRY`, `AWS_REGION` et les credentials viennent du `.env` ou de l’environnement (AWS CLI / variables d’environnement).

### Comparaison “mise à jour disponible”

- **Si `localVersion !== remoteVersion`** (chaînes) → **mise à jour disponible**.
- **Si les deux sont `"latest"`** : comparaison des **digests** (image du conteneur local vs image ECR `latest`) pour éviter les faux positifs ; si les digests diffèrent → mise à jour disponible.

---

## 2. Fichiers créés ou modifiés

| Fichier | Rôle |
|--------|------|
| `scripts/ecr-version-utils.js` | Récupération version locale / distante, comparaison, écriture `.schoolmatrix-version`. |
| `scripts/check-prod-local-update.js` | Script de vérification : sortie JSON pour Electron. |
| `scripts/update-prod-local-ecr.js` | Accepte un tag optionnel en argument ; enregistre la version après mise à jour. |
| `scripts/copy-to-install-dir.js` | Inclut `check-prod-local-update.js` et `ecr-version-utils.js` dans la copie pour l’installation. |
| `docs/ELECTRON-ECR-UPDATE.md` | Ce document. |

Les scripts existants `prepare-prod-local.js`, `start-prod-local-build.js`, `login-ecr.js` et la compatibilité avec le dossier d’installation local sont inchangés.

---

## 3. Comment Electron doit appeler les scripts

À exécuter depuis le **dossier d’installation** (ex. `C:/SchoolMatrix`), avec `scripts` en sous-dossier (après `copy-to-install-dir.js`).

### Vérifier si une mise à jour est disponible

- **Commande :**  
  `node scripts/check-prod-local-update.js`  
  ou  
  `node scripts/check-prod-local-update.js --json`
- **CWD :** dossier d’installation (racine des données).
- **Sortie :** une seule ligne JSON sur stdout, par exemple :

```json
{
  "updateAvailable": true,
  "localVersion": "abc1234",
  "remoteVersion": "latest"
}
```

ou en cas d’erreur (pas d’accès ECR, etc.) :

```json
{
  "updateAvailable": false,
  "localVersion": "latest",
  "remoteVersion": null,
  "error": "Impossible de récupérer la version distante (ECR ou AWS CLI)."
}
```

- **Code de sortie :** 0 en cas de succès, 1 en cas d’exception (parse du JSON quand même possible).
- **Intégration Electron :** lancer le script en child process (ex. `child_process.spawn` ou `execFile`), récupérer stdout, `JSON.parse(lastLine)` ou la ligne complète, puis utiliser `updateAvailable`, `localVersion`, `remoteVersion` et éventuellement `error`.

### Lancer la mise à jour

- **Commande :**  
  `node scripts/update-prod-local-ecr.js [tag]`
- **Tag optionnel :** si présent (ex. `latest` ou `abc1234`), ce tag est utilisé pour le `pull` et le `up`. Sinon, utilisation de `IMAGE_TAG` du `.env` (défaut `latest`).
- **CWD :** dossier d’installation.
- **Comportement :** prepare → login ECR → `docker compose -f docker-compose.prod-local-ecr.yml pull` → `up -d` → écriture de la version dans `.schoolmatrix-version`.
- **Intégration Electron :** lancer le script en child process, rediriger stdout/stderr pour les afficher (logs). À la fin, en cas de succès, la version est déjà enregistrée ; vous pouvez rappeler `check-prod-local-update.js` pour afficher la nouvelle version.

---

## 4. Flux complet : vérifier → confirmer → mettre à jour → enregistrer

1. **Vérifier**  
   Electron exécute :  
   `node scripts/check-prod-local-update.js`  
   (CWD = dossier d’installation).  
   Parse la sortie JSON : si `updateAvailable === true`, afficher une boîte de dialogue du type “Une nouvelle version (remoteVersion) est disponible. Version actuelle : localVersion. Mettre à jour ?”.

2. **Confirmer**  
   L’utilisateur accepte ou refuse. S’il refuse, arrêter.

3. **Mettre à jour**  
   Electron exécute :  
   `node scripts/update-prod-local-ecr.js [remoteVersion]`  
   (en passant `remoteVersion` retourné par le check, ou sans argument pour utiliser le `.env`).  
   CWD = dossier d’installation. Afficher les logs (stdout/stderr) dans l’UI.

4. **Enregistrer la nouvelle version**  
   C’est automatique : `update-prod-local-ecr.js` appelle `writeInstalledVersion(tag)` après un `up -d` réussi et écrit le tag dans `.schoolmatrix-version`. Aucune action supplémentaire côté Electron.

Résumé : **vérifier** (check script) → **confirmer** (UI) → **mettre à jour** (update script) → **enregistrement** (dans le script de mise à jour).

---

## 5. Prérequis côté machine

- **Node.js** installé (pour exécuter les scripts).
- **Docker** installé et démarré.
- **AWS CLI** installé et configuré (credentials pour ECR), ou variables d’environnement `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.
- Fichier **`.env`** dans le dossier d’installation avec au moins `ECR_REGISTRY`, optionnellement `AWS_REGION`, `IMAGE_TAG`.
- Les identifiants AWS ne doivent **pas** être codés en dur ; ils restent dans l’environnement, le `.env` ou la config AWS CLI.
