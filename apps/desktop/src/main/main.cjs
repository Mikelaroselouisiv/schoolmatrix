/**
 * Parallele SchoolMatrix — Electron unifié (Server | Remote).
 * UI = Vite/React (renderer). Server démarre aussi la stack Docker locale + sync-agent.
 */
const { app, BrowserWindow, ipcMain, dialog, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { getAppEdition } = require('./edition.cjs');
const { PUBLIC_API_BASE_URL, LOCAL_API_BASE_URL } = require('./update-feed.cjs');
const { ensureServerStack } = require('./server-bootstrap.cjs');
const { initUpdater } = require('./updater.cjs');

const edition = getAppEdition();
const apiBase = edition === 'server' ? LOCAL_API_BASE_URL : PUBLIC_API_BASE_URL;
const isDev = !!process.env.VITE_DEV_SERVER_URL;

let mainWindow = null;

function resolveIcon() {
  const candidates = [
    path.join(__dirname, '../../build/icon.png'),
    path.join(__dirname, '../../build/icon.ico'),
    path.join(process.resourcesPath || '', 'icon.png'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return nativeImage.createFromPath(p);
  }
  return undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    show: false,
    title: edition === 'server' ? 'SchoolMatrix Server' : 'SchoolMatrix Remote',
    icon: resolveIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Installateur (file://) → API HTTP : sans ça, Chromium peut bloquer les appels.
      webSecurity: isDev,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

function setAppMenu() {
  const template = [
    {
      label: 'SchoolMatrix',
      submenu: [
        {
          label: 'Vérifier les mises à jour',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('updater:menu-check');
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.on('app:get-edition-sync', (event) => {
  event.returnValue = edition;
});
ipcMain.on('app:get-api-base-sync', (event) => {
  event.returnValue = apiBase;
});

async function boot() {
  app.setName(
    edition === 'server'
      ? 'Parallele SchoolMatrix Server'
      : 'Parallele SchoolMatrix Remote',
  );
  if (process.platform === 'win32') {
    app.setAppUserModelId(
      edition === 'server'
        ? 'com.parallele.schoolmatrix.desktop.server'
        : 'com.parallele.schoolmatrix.desktop.remote',
    );
  }

  createWindow();
  setAppMenu();
  initUpdater();

  if (edition === 'server' && !isDev) {
    const stack = await ensureServerStack();
    if (!stack.ok && mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'API locale',
        message: stack.message || 'Impossible de démarrer la stack Server.',
      });
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

app.whenReady().then(boot);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
