/**
 * Utilitaires pour la version locale et distante (ECR) — intégration Electron.
 * Pas de secrets : ECR_REGISTRY, AWS_REGION et credentials viennent de .env / environnement.
 *
 * Stratégie de version :
 * - Local : fichier .schoolmatrix-version dans le dossier de données (écrit après chaque mise à jour),
 *   puis fallback docker inspect sur le conteneur schoolmatrix-api, puis .env IMAGE_TAG, puis "unknown".
 * - Distant : AWS ECR describe-images sur schoolmatrix-api, tri par date de push décroissante,
 *   dernier tag = version distante (on suppose api et web partagent le même tag).
 * - Comparaison : updateAvailable = (remoteVersion !== localVersion). Si les deux sont "latest",
 *   on compare les digests (image locale vs ECR latest) pour éviter les faux positifs.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERSION_FILE = '.schoolmatrix-version';
const CONTAINER_API = 'schoolmatrix-api';

/**
 * Charge le dossier de données (sans appeler prepare).
 * @returns {string} Chemin du dossier de données
 */
function getDataRootPath() {
  const { getDataRoot } = require('./prepare-prod-local.js');
  return getDataRoot();
}

/**
 * Récupère la version locale installée.
 * Ordre : .schoolmatrix-version → docker inspect → .env IMAGE_TAG → "unknown"
 * @returns {{ version: string, source: 'file'|'docker'|'env'|'unknown' }}
 */
function getLocalVersion() {
  const dataRoot = getDataRootPath();
  const versionFile = path.join(dataRoot, VERSION_FILE);

  if (fs.existsSync(versionFile)) {
    const content = fs.readFileSync(versionFile, 'utf8').trim();
    if (content) return { version: content, source: 'file' };
  }

  try {
    const out = execSync(
      `docker inspect ${CONTAINER_API} --format "{{.Config.Image}}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const image = out;
    const tag = image.includes(':') ? image.split(':').slice(1).join(':') : 'latest';
    if (tag) return { version: tag, source: 'docker' };
  } catch (_) {
    // conteneur absent ou docker indisponible
  }

  const projectRoot = path.resolve(__dirname, '..');
  const envPath = path.join(projectRoot, '.env');
  const dataRootEnv = path.join(dataRoot, '.env');
  for (const p of [dataRootEnv, envPath]) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    const m = content.match(/^\s*IMAGE_TAG\s*=\s*(.+)/m);
    if (m) {
      const v = m[1].trim();
      if (v) return { version: v, source: 'env' };
    }
  }

  return { version: 'unknown', source: 'unknown' };
}

/**
 * Récupère le digest de l'image du conteneur local (pour comparaison avec ECR).
 * @returns {string|null} Digest ou null
 */
function getLocalImageDigest() {
  try {
    const out = execSync(
      `docker inspect ${CONTAINER_API} --format "{{.Image}}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return out || null;
  } catch (_) {
    return null;
  }
}

/**
 * Appelle AWS CLI pour lister les images ECR et retourner le tag le plus récent.
 * Utilise .env / process.env pour ECR_REGISTRY et AWS_REGION (credentials = AWS CLI / env).
 * @param {string} repositoryName - ex. schoolmatrix-api
 * @returns {{ tag: string, digest?: string }|null}
 */
function getLatestEcrTag(repositoryName) {
  const projectRoot = path.resolve(__dirname, '..');
  const dataRoot = getDataRootPath();
  const envPath = path.join(dataRoot, '.env');
  const fallbackEnv = path.join(projectRoot, '.env');
  let env = {};
  for (const p of [envPath, fallbackEnv]) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
    break;
  }
  const region = process.env.AWS_REGION || env.AWS_REGION || 'us-east-2';
  try {
    const cmd = `aws ecr describe-images --repository-name ${repositoryName} --region ${region} --output json`;
    const raw = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, AWS_REGION: region },
    });
    const data = JSON.parse(raw);
    const images = (data && data.imageDetails) || [];
    if (images.length === 0) return null;
    const sorted = images
      .filter((i) => i.imageTags && i.imageTags.length > 0)
      .sort((a, b) => new Date(b.imagePushedAt) - new Date(a.imagePushedAt));
    const latest = sorted[0];
    if (!latest || !latest.imageTags || latest.imageTags.length === 0) return null;
    const tag = latest.imageTags.includes('latest')
      ? 'latest'
      : latest.imageTags[0];
    return { tag, digest: latest.imageDigest || undefined };
  } catch (err) {
    return null;
  }
}

/**
 * Récupère le digest de l'image ECR pour un repository:tag.
 * @param {string} repositoryName
 * @param {string} tag
 * @returns {string|null}
 */
function getEcrImageDigest(repositoryName, tag) {
  const dataRoot = getDataRootPath();
  const projectRoot = path.resolve(__dirname, '..');
  const envPath = path.join(dataRoot, '.env');
  const fallbackEnv = path.join(projectRoot, '.env');
  let env = {};
  for (const p of [envPath, fallbackEnv]) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
    break;
  }
  const region = process.env.AWS_REGION || env.AWS_REGION || 'us-east-2';
  try {
    const cmd = `aws ecr describe-images --repository-name ${repositoryName} --image-ids imageTag=${tag} --region ${region} --output json`;
    const raw = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, AWS_REGION: region },
    });
    const data = JSON.parse(raw);
    const images = (data && data.imageDetails) || [];
    const img = images[0];
    return (img && img.imageDigest) || null;
  } catch (_) {
    return null;
  }
}

/**
 * Version distante = tag le plus récent du repo schoolmatrix-api (api et web partagent le tag).
 * @returns {{ version: string, digest?: string }|null} null si ECR injoignable
 */
function getRemoteVersion() {
  const result = getLatestEcrTag('schoolmatrix-api');
  if (!result) return null;
  return { version: result.tag, digest: result.digest };
}

/**
 * Détermine si une mise à jour est disponible.
 * - Si local !== remote (chaînes) → true.
 * - Si les deux sont "latest", compare les digests (image locale vs ECR latest).
 * @returns {{ updateAvailable: boolean, localVersion: string, remoteVersion: string|null, error?: string }}
 */
function checkUpdate() {
  const local = getLocalVersion();
  const remote = getRemoteVersion();
  const localVersion = local.version;
  const remoteVersion = remote ? remote.version : null;

  if (remoteVersion === null) {
    return {
      updateAvailable: false,
      localVersion,
      remoteVersion: null,
      error: 'Impossible de récupérer la version distante (ECR ou AWS CLI).',
    };
  }

  if (localVersion !== remoteVersion) {
    return { updateAvailable: true, localVersion, remoteVersion };
  }

  if (localVersion === 'latest' && remoteVersion === 'latest') {
    const localDigest = getLocalImageDigest();
    const remoteDigest = getEcrImageDigest('schoolmatrix-api', 'latest');
    if (localDigest && remoteDigest) {
      const same = localDigest === remoteDigest;
      return {
        updateAvailable: !same,
        localVersion: localVersion + ' (@' + localDigest.slice(0, 12) + ')',
        remoteVersion: remoteVersion + ' (@' + remoteDigest.slice(0, 12) + ')',
      };
    }
  }

  return { updateAvailable: false, localVersion, remoteVersion };
}

/**
 * Enregistre la version déployée dans le dossier de données (après mise à jour réussie).
 * @param {string} tag - ex. "latest" ou "abc1234"
 */
function writeInstalledVersion(tag) {
  const dataRoot = getDataRootPath();
  const versionFile = path.join(dataRoot, VERSION_FILE);
  fs.mkdirSync(dataRoot, { recursive: true });
  fs.writeFileSync(versionFile, String(tag).trim() + '\n', 'utf8');
}

module.exports = {
  getDataRootPath,
  getLocalVersion,
  getRemoteVersion,
  getLatestEcrTag,
  checkUpdate,
  writeInstalledVersion,
  VERSION_FILE,
};
