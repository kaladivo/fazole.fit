import type { Identity } from "./storage";

interface PasswordCredentialData {
  id: string;
  name: string;
  password: string;
}

type PasswordCredentialConstructor = new (
  data: PasswordCredentialData,
) => Credential;

export type PasswordManagerSaveResult = "saved" | "unsupported" | "failed";

// PasswordCredential is Chromium-only, so TypeScript's DOM lib leaves it out.
const isPasswordCredential = (
  value: unknown,
): value is PasswordCredentialConstructor => typeof value === "function";

/** Offers a secret to the browser's password manager. */
export const saveToPasswordManager = async (
  credential: PasswordCredentialData,
): Promise<PasswordManagerSaveResult> => {
  const PasswordCredential: unknown = Reflect.get(
    globalThis,
    "PasswordCredential",
  );
  if (!isPasswordCredential(PasswordCredential) || !globalThis.isSecureContext)
    return "unsupported";
  try {
    await navigator.credentials.store(new PasswordCredential(credential));
    return "saved";
  } catch {
    return "failed";
  }
};

/** Offers the backup phrase under the shop's name, keyed by the device so a re-save updates it. */
export const saveBackupPhrase = (
  { mnemonic, keys }: Identity,
  shopName: string,
): Promise<PasswordManagerSaveResult> =>
  saveToPasswordManager({
    id: `fazole.fit:${keys.nostr.npub}`,
    name: shopName,
    password: mnemonic,
  });
