/**
 * Édition Server : copie server-stack → ProgramData, bootstrap Docker.
 */
const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { getAppEdition } = require('./edition.cjs');

function getBundledStackDir() {
  if (process.resourcesPath) {
    const fromResources = path.join(process.resourcesPath, 'server-stack');
    if (fs.existsSync(fromResources)) return fromResources;
  }
  const fromDev = path.join(__dirname, '../../server-stack');
  if (fs.existsSync(fromDev)) return fromDev;
  return null;
}

function getInstalledStackDir() {
  const programData = process.env.ProgramData || 'C:\\ProgramData';
  return path.join(programData, 'Parallele SchoolMatrix', 'server-stack');
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

function ensureStackInstalled() {
  const bundled = getBundledStackDir();
  const installed = getInstalledStackDir();
  if (!bundled) {
    throw new Error('server-stack introuvable dans l’installateur.');
  }
  fs.mkdirSync(installed, { recursive: true });
  for (const entry of fs.readdirSync(bundled, { withFileTypes: true })) {
    if (entry.name === '.env.server' || entry.name === '.bootstrap-done') continue;
    const from = path.join(bundled, entry.name);
    const to = path.join(installed, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
  return installed;
}

function runBootstrap(stackDir) {
  return new Promise((resolve, reject) => {
    const script = path.join(stackDir, 'bootstrap.ps1');
    if (!fs.existsSync(script)) {
      reject(new Error(`bootstrap.ps1 introuvable: ${script}`));
      return;
    }
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-StackDir', stackDir],
      { windowsHide: false },
    );
    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += String(c);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `bootstrap exit ${code}`));
    });
  });
}

function waitForApi(maxMs = 180000) {
  const deadline = Date.now() + maxMs;
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get('http://127.0.0.1:3000/', (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 500) resolve(true);
        else if (Date.now() > deadline) resolve(false);
        else setTimeout(tick, 2000);
      });
      req.on('error', () => {
        if (Date.now() > deadline) resolve(false);
        else setTimeout(tick, 2000);
      });
      req.setTimeout(3000, () => {
        req.destroy();
        if (Date.now() > deadline) resolve(false);
        else setTimeout(tick, 2000);
      });
    };
    tick();
  });
}

async function isApiUp() {
  return waitForApi(4000);
}

/**
 * @returns {Promise<{ ran: boolean, ok: boolean, message?: string }>}
 */
async function ensureServerStack() {
  if (getAppEdition() !== 'server') {
    return { ran: false, ok: true };
  }
  if (process.argv.includes('--dev') || process.argv.includes('-d')) {
    const up = await isApiUp();
    return {
      ran: false,
      ok: up,
      message: up
        ? undefined
        : 'API locale absente (http://127.0.0.1:3000). Démarrez le backend / stack server.',
    };
  }

  try {
    if (await isApiUp()) {
      return { ran: false, ok: true };
    }
    const stackDir = ensureStackInstalled();
    await runBootstrap(stackDir);
    const ok = await waitForApi(180000);
    if (!ok) {
      return {
        ran: true,
        ok: false,
        message: 'Stack démarrée mais API non joignable sur :3000',
      };
    }
    const done = path.join(stackDir, '.bootstrap-done');
    if (!fs.existsSync(done)) {
      fs.writeFileSync(done, new Date().toISOString(), 'utf8');
    }
    return { ran: true, ok: true };
  } catch (err) {
    const message = err?.message || String(err);
    dialog.showErrorBox('SchoolMatrix Server — stack locale', message);
    return { ran: true, ok: false, message };
  }
}

module.exports = { ensureServerStack, getInstalledStackDir };
