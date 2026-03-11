/**
 * Point d'entrée "Démarrer" — délègue à start-prod-local-build.js (build local).
 * Conservé pour compatibilité (docs, Electron). Préférer appeler directement
 * start-prod-local-build.js ou update-prod-local-ecr.js selon le cas.
 *
 *   node scripts/start-prod-local.js
 */
require('./start-prod-local-build.js');
