/**
 * Met à jour la production locale Windows en tirant les images depuis AWS ECR (sans build local).
 * Compatible avec un bouton Electron "Mettre à jour".
 *
 * 1. Exécute prepare-prod-local.js (vérifie dossier de données et .env.prod)
 * 2. Login ECR (aws ecr get-login-password | docker login)
 * 3. docker compose -f docker-compose.prod-local-ecr.yml pull
 * 4. docker compose -f docker-compose.prod-local-ecr.yml up -d
 * 5. Enregistre la version déployée dans .schoolmatrix-version (pour check-prod-local-update.js)
 *
 * Tag cible : IMAGE_TAG du .env, ou argument optionnel : node update-prod-local-ecr.js [tag]
 * Ex. node update-prod-local-ecr.js latest   ou   node update-prod-local-ecr.js abc1234
 *
 * Prérequis : .env avec ECR_REGISTRY, AWS_REGION (optionnel). Identifiants AWS (aws configure ou env).
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { prepare, getDataRoot, PROJECT_ROOT } = require('./prepare-prod-local.js');
const { runLogin } = require('./login-ecr.js');
const { writeInstalledVersion } = require('./ecr-version-utils.js');

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

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function main() {
  const tagArg = process.argv[2];
  const env = loadEnv();
  const imageTag = (typeof tagArg === 'string' && tagArg.trim())
    ? tagArg.trim()
    : (env.IMAGE_TAG || process.env.IMAGE_TAG || 'latest');

  console.log('Préparation du dossier de données...');
  prepare();

  if (!env.ECR_REGISTRY && !process.env.ECR_REGISTRY) {
    console.error('ECR_REGISTRY manquant. Définir dans .env ou en variable d\'environnement.');
    console.error('Ex. ECR_REGISTRY=421983920969.dkr.ecr.us-east-2.amazonaws.com');
    process.exit(1);
  }
  Object.assign(process.env, {
    ECR_REGISTRY: env.ECR_REGISTRY || process.env.ECR_REGISTRY,
    IMAGE_TAG: imageTag,
    AWS_REGION: env.AWS_REGION || process.env.AWS_REGION || 'us-east-2',
  });

  console.log('Authentification ECR...');
  runLogin();

  console.log('Récupération des images depuis ECR (tag: ' + imageTag + ')...');
  await run('docker', [
    'compose',
    '-f',
    'docker-compose.prod-local-ecr.yml',
    'pull',
  ]);

  console.log('Démarrage de la stack...');
  await run('docker', [
    'compose',
    '-f',
    'docker-compose.prod-local-ecr.yml',
    'up',
    '-d',
  ]);

  writeInstalledVersion(imageTag);
  console.log('Stack mise à jour (images ECR). Version enregistrée:', imageTag);
  console.log('API: http://127.0.0.1:3000  Web: http://127.0.0.1:3001');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
