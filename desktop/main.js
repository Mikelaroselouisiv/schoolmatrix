const { app, BrowserWindow, nativeImage, dialog, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DEFAULT_FRONTEND_URL = 'http://localhost:3001';
const CHECK_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 120000; // 2 minutes
const APP_LOGO = path.join(__dirname, 'App logo.png');

// Conteneurs à démarrer automatiquement (ceux affichés dans Docker Desktop pour SchoolMatrix)
const CONTAINER_NAMES = ['schoolmatrix-db-dev', 'schoolmatrix-api', 'schoolmatrix-web'];

const DEV_MODE_FLAG = process.argv.includes('--dev') || process.argv.includes('-d');

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    return {
      projectRoot: cfg.projectRoot || null,
      devMode: cfg.devMode,
      frontendUrl: cfg.frontendUrl || DEFAULT_FRONTEND_URL,
    };
  } catch {
    return { projectRoot: null, devMode: undefined, frontendUrl: DEFAULT_FRONTEND_URL };
  }
}

function saveConfig(config) {
  const dir = path.dirname(getConfigPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

function loadProjectRoot() {
  return loadConfig().projectRoot;
}

function saveProjectRoot(projectRoot) {
  const cfg = loadConfig();
  cfg.projectRoot = projectRoot;
  saveConfig(cfg);
}

function hasDockerCompose(folder) {
  return fs.existsSync(path.join(folder, 'docker-compose.yml'));
}

async function getOrSelectProjectRoot() {
  const cfg = loadConfig();
  // 1. Essayer le chemin enregistré
  if (cfg.projectRoot && hasDockerCompose(cfg.projectRoot)) return cfg.projectRoot;

  // 2. En dev : chemin relatif si docker-compose existe
  const devRoot = path.join(__dirname, '..');
  if (hasDockerCompose(devRoot)) return devRoot;

  // 3. Demander à l'utilisateur
  const { canceled, filePaths } = await dialog.showOpenDialog(null, {
    title: 'Configuration - Parallele SchoolMatrix',
    message: 'Sélectionnez le dossier du projet Parallele-Schoolmatrix (celui qui contient docker-compose.yml)',
    properties: ['openDirectory'],
    buttonLabel: 'Sélectionner',
  });
  if (canceled || !filePaths?.length) return null;
  const selected = filePaths[0];
  if (!hasDockerCompose(selected)) {
    dialog.showErrorBox('Dossier invalide', 'Le dossier sélectionné ne contient pas docker-compose.yml.');
    return getOrSelectProjectRoot(); // Réessayer
  }
  saveProjectRoot(selected);
  return selected;
}

async function askDevModeFirstTime() {
  const cfg = loadConfig();
  if (cfg.devMode !== undefined && cfg.devMode !== null) return cfg; // déjà configuré
  const { response } = await dialog.showMessageBox(null, {
    type: 'question',
    title: 'Mode de fonctionnement',
    message: 'Utilisez-vous le frontend de développement (npm run dev) ?',
    detail: 'Mode développement : le frontend doit déjà tourner localement (npm run dev).\nMode production : les conteneurs schoolmatrix-db-dev, schoolmatrix-api et schoolmatrix-web seront démarrés automatiquement au lancement.',
    buttons: ['Mode développement', 'Mode production (Docker)'],
    defaultId: 1,
  });
  cfg.devMode = response === 0;
  saveConfig(cfg);
  return cfg;
}

function checkFrontendAvailable(url) {
  const frontendUrl = url || DEFAULT_FRONTEND_URL;
  return new Promise((resolve) => {
    const req = http.get(frontendUrl, { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function waitForFrontend(frontendUrl, startTime = Date.now()) {
  return checkFrontendAvailable(frontendUrl).then((ok) => {
    if (ok) return true;
    if (Date.now() - startTime > MAX_WAIT_MS) {
      throw new Error('Délai dépassé : le frontend n\'est pas disponible. Vérifiez que les conteneurs schoolmatrix-web, schoolmatrix-api et schoolmatrix-db-dev tournent.');
    }
    return new Promise((r) => setTimeout(r, CHECK_INTERVAL_MS)).then(() =>
      waitForFrontend(frontendUrl, startTime)
    );
  });
}

/**
 * Démarre les conteneurs SchoolMatrix (schoolmatrix-db-dev, schoolmatrix-api, schoolmatrix-web)
 * avant le lancement de l'app pour que le frontend soit disponible.
 */
function startContainers() {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === 'win32' ? 'docker' : 'docker';
    const args = ['start', ...CONTAINER_NAMES];
    const proc = spawn(cmd, args, {
      shell: true,
      env: process.env,
    });
    proc.on('close', (code) => {
      // 0 = tous démarrés, déjà running = 0 aussi
      if (code === 0) return resolve();
      reject(new Error(`Démarrage des conteneurs échoué (code ${code}). Vérifiez que ${CONTAINER_NAMES.join(', ')} existent dans Docker.`));
    });
    proc.on('error', (err) => reject(err));
  });
}

function createAppMenu() {
  const cfg = loadConfig();
  const template = [
    {
      label: 'Parallele SchoolMatrix',
      submenu: [
        {
          label: 'Mode développement (frontend local)',
          type: 'checkbox',
          checked: cfg.devMode,
          click: (menuItem) => {
            const c = loadConfig();
            c.devMode = menuItem.checked;
            saveConfig(c);
            dialog.showMessageBox(null, {
              type: 'info',
              title: 'Préférences',
              message: 'Redémarrez l\'application pour appliquer le changement.',
            });
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(splash, frontendUrl) {
  const url = frontendUrl || DEFAULT_FRONTEND_URL;
  createAppMenu();
  // Créer la fenêtre principale EN PREMIER, sinon window-all-closed ferme l'app
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: APP_LOGO,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(url);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (splash && !splash.isDestroyed()) splash.close();
  });
  mainWindow.on('closed', () => app.quit());
}

function createSplashWindow() {
  const logoDataUrl = nativeImage.createFromPath(APP_LOGO).toDataURL() || '';
  const splash = new BrowserWindow({
    width: 400,
    height: 220,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    icon: APP_LOGO,
  });
  splash.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui; padding: 24px; text-align: center; }
  .logo { width: 64px; height: 64px; margin: 0 auto 16px; display: block; object-fit: contain; }
  .msg { margin: 12px 0; color: #333; }
  .spinner { width: 32px; height: 32px; border: 3px solid #ddd; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head><body>
  <img class="logo" src="${logoDataUrl}" alt="Logo">
  <div class="spinner"></div>
  <div class="msg" id="msg">Démarrage des services Docker…</div>
  <div class="msg" style="font-size: 12px; color: #666;">Patientez…</div>
</body></html>`)}`
  );
  return splash;
}

app.whenReady().then(async () => {
  // Étape 1 : obtenir le chemin du projet (config ou sélection utilisateur)
  const projectRoot = await getOrSelectProjectRoot();
  if (!projectRoot) {
    app.quit();
    return;
  }

  let cfg = loadConfig();
  if (DEV_MODE_FLAG) {
    cfg.devMode = true;
    saveConfig(cfg);
  }
  if (cfg.devMode === undefined || cfg.devMode === null) {
    cfg = await askDevModeFirstTime();
  }

  const frontendUrl = cfg.frontendUrl || DEFAULT_FRONTEND_URL;

  const splash = createSplashWindow();

  try {
    if (cfg.devMode) {
      // Mode développement : pas de démarrage Docker, le frontend tourne en local
      splash.webContents.executeJavaScript(
        "document.getElementById('msg').textContent = 'Connexion au frontend local…';"
      );
      const ok = await checkFrontendAvailable(frontendUrl);
      if (!ok) {
        dialog.showErrorBox(
          'Frontend non disponible',
          'Le frontend de développement n\'est pas disponible.\n\nDémarrez-le avec :\n  cd parallele-schoolmatrix-frontend\n  npm run dev\n\nPuis relancez l\'application.'
        );
        app.quit();
        return;
      }
    } else {
      // Mode production : démarrer les conteneurs (schoolmatrix-db-dev, api, web) AVANT tout
      splash.webContents.executeJavaScript(
        "document.getElementById('msg').textContent = 'Démarrage des conteneurs SchoolMatrix…';"
      );
      await startContainers();
      splash.webContents.executeJavaScript(
        "document.getElementById('msg').textContent = 'En attente du frontend…';"
      );
      let ok = await checkFrontendAvailable(frontendUrl);
      if (!ok) await waitForFrontend(frontendUrl);
    }
    createWindow(splash, frontendUrl);
  } catch (err) {
    splash.webContents.executeJavaScript(
      `document.getElementById('msg').innerHTML = 'Erreur : ${err.message.replace(/'/g, "\\'")}'; document.querySelector('.spinner').style.display='none';`
    );
    setTimeout(() => app.quit(), 5000);
  }
});

app.on('window-all-closed', () => app.quit());
