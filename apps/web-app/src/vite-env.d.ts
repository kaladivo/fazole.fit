/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Comma-separated relay URLs. */
  readonly VITE_NOSTR_RELAYS?: string;
  /** Comma-separated Evolu relay URLs. */
  readonly VITE_EVOLU_SERVER_URLS?: string;
  readonly VITE_MAIN_MINT_URL?: string;
  readonly VITE_LINKY_URL?: string;
  /** "1" allows ws:// relays on localhost. */
  readonly VITE_ALLOW_INSECURE_LOCALHOST_RELAYS?: string;
}
