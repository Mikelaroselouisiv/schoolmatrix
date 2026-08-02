/** Edition desktop : server | remote */
function getAppEdition() {
  const fromEnv = process.env.VITE_APP_EDITION?.trim().toLowerCase();
  if (fromEnv === 'server' || fromEnv === 'remote') return fromEnv;

  try {
    const pkg = require('../../package.json');
    const fromPkg = pkg.edition?.trim().toLowerCase();
    if (fromPkg === 'server' || fromPkg === 'remote') return fromPkg;
  } catch {
    /* ignore */
  }

  if (process.argv.includes('--remote')) return 'remote';
  if (process.argv.includes('--dev') || process.argv.includes('-d')) return 'server';
  return 'remote';
}

module.exports = { getAppEdition };
