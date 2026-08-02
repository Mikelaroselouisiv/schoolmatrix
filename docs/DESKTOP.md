# Desktop SchoolMatrix — un seul logiciel

Le produit desktop est **entièrement dans** `apps/desktop` (modèle Israel) :

- **UI** : React + Vite + React Router (`src/renderer`), chargée par Electron  
  - Dev : serveur Vite (`http://localhost:5173`)  
  - Installateur : `dist/index.html` (`file://`, HashRouter)
- **Shell** : Electron (`src/main`) — éditions Server / Remote, mise à jour auto, bootstrap Docker Server
- Deux éditions : **Server** (API locale + stack Docker) et **Remote** (API cloud)

| Édition | API |
|--------|-----|
| **Server** | `http://127.0.0.1:3000` (+ stack Docker / sync-agent) |
| **Remote** | `http://34.95.43.132` |

## Legacy / archive

L’ancien frontend Next.js (`parallele-schoolmatrix-frontend`, éventuellement présent sous `apps/desktop/frontend`) est **legacy / archive** :

- source de référence pour le portage vers `src/renderer`
- **plus utilisé par Electron** (pas de sidecar Next, pas de `next-runtime`)
- ne pas lancer `npm run dev` dedans pour le produit desktop

Ne pas supprimer le dossier Next tant que le portage de pages restantes n’est pas validé ; le marquer uniquement comme archive.

## Dev

Seul le **backend** reste à part (API Nest). L’UI part avec Electron + Vite.

```powershell
# Terminal A — API (Server uniquement ; Remote parle au cloud)
cd parallele-schoolmatrix-backend
npm run dev
```

```powershell
# Terminal B — logiciel desktop (UI Vite + Electron)
cd apps/desktop
npm install
npm run dev          # Server (Vite :5173 + Electron)
# ou
npm run dev:remote   # Remote
```

## Build installateurs

```powershell
cd apps/desktop
npm run dist:win:remote
npm run dist:win:server
```

Sortie : `apps/desktop/release/`.

Les scripts packagent `dist/**` (renderer Vite) + `src/main/**`. L’édition Server embarque aussi `server-stack/` (images Docker + compose). Aucun `next-runtime` n’est embarqué.

## Mises à jour (notification → téléchargement → install)

Les apps **installées** (Remote et Server) vérifient le feed GCS au démarrage (~8 s) puis toutes les 4 h.

1. Bump `version` dans `apps/desktop/package.json` (ex. `1.0.1`)
2. Publier :
   - **GitHub Actions** → workflow **Desktop - release to GCS** (choix `remote` / `server` / `both`)
   - ou tag : `git tag desktop-v1.0.1 && git push origin desktop-v1.0.1`
3. Artefacts uploadés : `latest.yml`, `.exe`, `.blockmap` vers :
   - Remote : `https://storage.googleapis.com/parallele-schoolmatrix-assets/installers/remote/`
   - Server : `https://storage.googleapis.com/parallele-schoolmatrix-assets/installers/server/`
4. Sur la machine distante : notification OS + modal in-app → **Télécharger** → **Redémarrer et installer**

En dev (`npm run dev`), les mises à jour sont désactivées (bouton version visible mais feed inactif).

Upload manuel local :

```powershell
cd apps/desktop
npm run dist:win:remote   # ou dist:win:server
cd ../..
powershell -ExecutionPolicy Bypass -File infra/scripts/upload-desktop-installer.ps1 -Edition remote
```
