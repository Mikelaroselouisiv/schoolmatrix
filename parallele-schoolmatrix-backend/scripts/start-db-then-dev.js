/**
 * En dev : démarre le conteneur PostgreSQL (schoolmatrix-db-dev) puis lance le backend.
 * Utilisation : node scripts/start-db-then-dev.js  ou  npm run dev
 */
const { spawn } = require('child_process');
const path = require('path');

const containerName = 'schoolmatrix-db-dev';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    proc.on('error', reject);
  });
}

async function main() {
  console.log('Démarrage du conteneur base de données...');
  await run('docker', ['start', containerName]).catch(() => {
    console.log('(conteneur déjà démarré ou à créer manuellement)');
  });
  console.log('Lancement du backend...');
  await run('npm', ['run', 'start:dev'], { cwd: path.join(__dirname, '..') });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
