/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Hanya dev: password kartu login cepat (isi di .env.local). */
  readonly VITE_DEV_LOGIN_PASSWORD?: string;
}
