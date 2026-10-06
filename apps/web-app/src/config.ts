const list = (value: string | undefined, fallback: readonly string[]) => {
  const items = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
};

const env = import.meta.env;

/** Fresh-install defaults, the same as linky's; `.env.development` points them at the local services. */
export const appConfig = {
  nostrRelays: list(env.VITE_NOSTR_RELAYS, [
    "wss://nos.lol",
    "wss://nostr.linky.fit",
    "wss://nostr.eu.freedomrelay.dev",
    "wss://relay.nostr.net",
  ]),
  evoluServerUrls: list(env.VITE_EVOLU_SERVER_URLS, [
    "wss://evolu.linky.fit",
    "wss://evolu.eu.freedomrelay.dev",
  ]),
  mintUrl: env.VITE_MAIN_MINT_URL || "https://cashu.cz",
  linkyUrl: env.VITE_LINKY_URL || "https://app.linky.fit",
  allowInsecureLocalhostRelays:
    env.VITE_ALLOW_INSECURE_LOCALHOST_RELAYS === "1",
} as const;
