/**
 * Backend DEV — deux nœuds simultanés sur le poste de développement :
 *   local  → :3000  schoolmatrix-db-dev       :5435
 *   mirror → :3001  schoolmatrix-db-cloud-dev :5438
 *
 * Ne touche ni au stack Server école ni à la VM GCP.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TARGETS = {
  local: {
    label: 'LOCAL (école / seed)',
    container: 'schoolmatrix-db-dev',
    compose: 'dev/docker-compose.postgres.yml',
    envFile: '.env.dev',
    envExample: '.env.dev.example',
    dbPort: 5435,
    apiPort: 3000,
    watch: true,
  },
  mirror: {
    label: 'MIROIR cloud local',
    container: 'schoolmatrix-db-cloud-dev',
    compose: 'dev/docker-compose.sync-cloud.yml',
    envFile: '.env.dev.mirror',
    envExample: '.env.dev.mirror.example',
    dbPort: 5438,
    apiPort: 3001,
    watch: false,
  },
};

const targetName = (process.argv[2] || 'local').toLowerCase();
const target = TARGETS[targetName];
if (!target) {
  console.error(`Cible inconnue: ${targetName}. Utiliser: local | mirror`);
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.join(__dirname, '..');
const composeFile = path.join(repoRoot, target.compose);
const envPath = path.join(backendRoot, target.envFile);
const examplePath = path.join(backendRoot, target.envExample);

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const useShell = opts.shell !== undefined ? opts.shell : true;
    const { shell: _ignored, ...rest } = opts;
    const proc = spawn(cmd, args, { stdio: 'inherit', shell: useShell, ...rest });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    proc.on('error', reject);
  });
}

async function ensurePostgres() {
  console.log(`Postgres ${target.container} :${target.dbPort}...`);
  try {
    await run('docker', ['start', target.container]);
    return;
  } catch {
    /* conteneur absent → création via compose */
  }
  if (!fs.existsSync(composeFile)) {
    throw new Error(`Compose manquant : ${composeFile}`);
  }
  await run('docker', ['compose', '-f', composeFile, 'up', '-d']);
}

async function main() {
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log(`Créé ${target.envFile} depuis l’exemple.`);
  }
  await ensurePostgres();
  console.log('');
  console.log('========================================');
  console.log(`  Backend DEV → ${target.label}`);
  console.log(`  API         → http://127.0.0.1:${target.apiPort}`);
  console.log(`  Postgres    → localhost:${target.dbPort}`);
  console.log('========================================');
  console.log('');
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    ENV_FILE: target.envFile,
    PORT: String(target.apiPort),
    DB_PORT: String(target.dbPort),
    STORAGE_ROOT: path.join(backendRoot, 'storage'),
  };
  const distMain = path.join(backendRoot, 'dist', 'main.js');
  if (target.watch) {
    await run('npx', ['nest', 'start', '--watch'], { cwd: backendRoot, env });
    return;
  }
  // Le miroir tourne sur le build : deux `nest --watch` sur le même dist se marchent dessus.
  if (!fs.existsSync(distMain)) {
    console.log('Build Nest (dist/main.js absent)...');
    await run('npm', ['run', 'build'], { cwd: backendRoot });
  }
  await run(process.execPath, [distMain], { cwd: backendRoot, env, shell: false });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
