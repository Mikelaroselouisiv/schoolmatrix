/// <reference types="vite/client" />
/// <reference path="./desktop-app.d.ts" />

interface ImportMetaEnv {
  readonly VITE_APP_EDITION?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
