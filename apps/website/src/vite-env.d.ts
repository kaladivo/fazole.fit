/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where "Open the app" leads; defaults to https://app.platitprosim.cz. */
  readonly VITE_WEB_APP_URL?: string;
  /** The site's public origin for canonical and Open Graph URLs (read by vite.config.ts); defaults to https://platitprosim.cz. */
  readonly VITE_SITE_URL?: string;
}
