const {
  withGradleProperties,
  withAndroidManifest,
} = require('expo/config-plugins');

/**
 * APK ARM 32 bits + 64 bits. Les téléphones qui coupaient le texte
 * sont souvent en 32 bits : un APK arm64 seul leur répond « incompatible ».
 *
 * Causes fréquentes de « Application non installée » sans détail :
 * - targetSdk 36 sur un Package Installer Android 13 Transsion
 * - signature APK v2 seule (pas de v1 JAR)
 */
const ARM_ABIS = 'armeabi-v7a,arm64-v8a';

function setGradleProperty(items, key, value) {
  const idx = items.findIndex(
    (item) => item.type === 'property' && item.key === key,
  );
  if (idx >= 0) {
    items[idx].value = value;
  } else {
    items.push({ type: 'property', key, value });
  }
}

function withAndroidUniversalApk(config) {
  config = withGradleProperties(config, (cfg) => {
    setGradleProperty(cfg.modResults, 'reactNativeArchitectures', ARM_ABIS);
    setGradleProperty(cfg.modResults, 'expo.useLegacyPackaging', 'true');
    setGradleProperty(cfg.modResults, 'android.targetSdkVersion', '34');
    setGradleProperty(cfg.modResults, 'android.injected.signing.v1-enabled', 'true');
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app && app.$) {
      app.$['android:extractNativeLibs'] = 'true';
    }
    return cfg;
  });

  return config;
}

module.exports = withAndroidUniversalApk;
