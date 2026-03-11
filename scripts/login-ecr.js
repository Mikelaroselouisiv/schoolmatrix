/**
 * Authentification Docker auprès d'AWS ECR.
 * Utilisé par update-prod-local-ecr.js avant le pull, ou en standalone pour pré-configurer le client Docker.
 *
 * Lit depuis .env (ou env) : ECR_REGISTRY, AWS_REGION (défaut us-east-2).
 * Les identifiants AWS doivent être disponibles (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY ou aws configure).
 *
 * Utilisation :
 *   node scripts/login-ecr.js
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

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

function runLogin() {
  const env = loadEnv();
  const registry = process.env.ECR_REGISTRY || env.ECR_REGISTRY;
  const region = process.env.AWS_REGION || env.AWS_REGION || 'us-east-2';
  if (!registry) {
    console.error('ECR_REGISTRY manquant. Définir dans .env ou en variable d\'environnement.');
    process.exit(1);
  }
  const loginCmd = `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registry}`;
  const result = spawnSync(loginCmd, [], {
    shell: true,
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ECR_REGISTRY: registry, AWS_REGION: region },
  });
  if (result.status !== 0) {
    throw new Error(`ECR login a échoué (code ${result.status}). Vérifiez AWS CLI et les identifiants.`);
  }
}

if (require.main === module) {
  try {
    runLogin();
    console.log('Login ECR réussi.');
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

module.exports = { runLogin };
