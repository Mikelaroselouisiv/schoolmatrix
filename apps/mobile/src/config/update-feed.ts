/**
 * Feed MAJ APK (équivalent electron-updater desktop Remote/Server).
 * Bucket tenant Parallele — ne pas inventer d’autre bucket.
 */
export const GCS_ASSETS_BUCKET = 'parallele-schoolmatrix-assets';

export const MOBILE_UPDATE_FEED_URL = `https://storage.googleapis.com/${GCS_ASSETS_BUCKET}/installers/mobile/latest.json`;

export type MobileUpdateManifest = {
  version: string;
  versionCode: number;
  /** Unique APK ARM (32 + 64 bits). */
  apkUrl: string;
  notes?: string;
  sha256?: string;
  size?: number;
  publishedAt?: string;
  mandatory?: boolean;
  /** Anciens feeds 2-APK : même fichier universel, pour MAJ des installs 1.0.10. */
  apkUrlArm64?: string;
  sha256Arm64?: string;
  sizeArm64?: number;
  apkUrlArmv7?: string;
  sha256Armv7?: string;
  sizeArmv7?: number;
};
