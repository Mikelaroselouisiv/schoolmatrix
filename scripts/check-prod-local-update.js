/**
 * Vérifie si une mise à jour des images ECR est disponible pour la production locale.
 * Sortie JSON pour exploitation par Electron (pas de secrets dans le code).
 *
 * Usage :
 *   node scripts/check-prod-local-update.js
 *
 * Sortie (stdout) : une seule ligne JSON
 *   { "updateAvailable": true|false, "localVersion": "...", "remoteVersion": "..." | null, "error"?: "..." }
 *
 * Prérequis : ECR_REGISTRY, AWS_REGION dans .env ou env ; AWS CLI configuré (credentials).
 */

const { checkUpdate } = require('./ecr-version-utils.js');

function main() {
  try {
    const result = checkUpdate();
    console.log(JSON.stringify(result));
  } catch (err) {
    const fail = {
      updateAvailable: false,
      localVersion: 'unknown',
      remoteVersion: null,
      error: err.message || String(err),
    };
    console.log(JSON.stringify(fail));
    process.exitCode = 1;
  }
}

main();
