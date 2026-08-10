/**
 * Démarre la production locale Windows avec build local des images Docker.
 * Compatible avec un bouton Electron "Démarrer".
 *
 * 1. Exécute prepare-prod-local.js (dossier de données, sous-dossiers, .env.prod si besoin)
 * 2. Lance : docker compose -f docker-compose.prod-local.yml up -d --build
 *
 * Utilisation :
 *   node scripts/start-prod-local-build.js
 *   SCHOOLMATRIX_DATA=D:/Data/SchoolMatrix node scripts/start-prod-local-build.js
 */
const { spawn } = require('child_process');
const path = require('path');
const { prepare, getDataRoot, PROJECT_ROOT } = require('./prepare-prod-local.js');

function run(cmd, args, opts = {}) {
  const dataRoot = getDataRoot();
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: PROJECT_ROOT,
      env: { ...process.env, SCHOOLMATRIX_DATA: dataRoot },
      ...opts,
    });
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))
    );
    proc.on('error', reject);
  });
}

async function main() {
  console.log('Préparation du dossier de données...');
  prepare();
  console.log('Build local et démarrage de la stack...');
  await run('docker', [
    'compose',
    '-f',
    'docker-compose.prod-local.yml',
    'up',
    '-d',
    '--build',
  ]);
  console.log('Stack démarrée (build local). API: http://127.0.0.1:3000  Web: http://127.0.0.1:3001');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
