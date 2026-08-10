/**
 * Copie les fichiers nécessaires vers un dossier d'installation (ex. pour Electron).
 * Idempotent : ne jamais écraser un fichier ou dossier existant.
 *
 * Utilisation (depuis la racine du repo) :
 *   node scripts/copy-to-install-dir.js C:/SchoolMatrix
 *   node scripts/copy-to-install-dir.js D:/Apps/SchoolMatrix
 *
 * Copie :
 *   - docker-compose.prod-local.yml
 *   - docker-compose.prod-local-ecr.yml
 *   - scripts/ (prepare, start, update, login, check-prod-local-update, ecr-version-utils, templates)
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const FILES_TO_COPY = [
  { src: 'docker-compose.prod-local.yml', dest: 'docker-compose.prod-local.yml' },
  { src: 'docker-compose.prod-local-ecr.yml', dest: 'docker-compose.prod-local-ecr.yml' },
];

const SCRIPTS_TO_COPY = [
  'prepare-prod-local.js',
  'start-prod-local.js',
  'start-prod-local-build.js',
  'update-prod-local-ecr.js',
  'login-ecr.js',
  'check-prod-local-update.js',
  'ecr-version-utils.js',
  'env.template',
  'env.prod.local.template',
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Créé : ${dirPath}`);
  }
}

function copyIfMissing(srcPath, destPath) {
  if (fs.existsSync(destPath)) {
    return;
  }
  if (!fs.existsSync(srcPath)) {
    console.warn(`Ignoré (source absente) : ${srcPath}`);
    return;
  }
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copié : ${path.basename(srcPath)} → ${destPath}`);
}

function main() {
  const targetRoot = process.argv[2];
  if (!targetRoot || typeof targetRoot !== 'string' || !targetRoot.trim()) {
    console.error('Usage: node scripts/copy-to-install-dir.js <dossier_installation>');
    console.error('Exemple: node scripts/copy-to-install-dir.js C:/SchoolMatrix');
    process.exit(1);
  }
  const target = path.resolve(targetRoot.trim());
  ensureDir(target);
  const targetScripts = path.join(target, 'scripts');
  ensureDir(targetScripts);

  for (const { src, dest } of FILES_TO_COPY) {
    copyIfMissing(path.join(PROJECT_ROOT, src), path.join(target, dest));
  }
  for (const name of SCRIPTS_TO_COPY) {
    copyIfMissing(path.join(__dirname, name), path.join(targetScripts, name));
  }

  console.log('Copie terminée. Dossier d\'installation :', target);
  console.log('Ensuite : cd "' + target + '" && node scripts/prepare-prod-local.js');
  console.log('Puis : node scripts/start-prod-local-build.js ou node scripts/update-prod-local-ecr.js');
}

main();
