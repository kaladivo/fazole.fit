import { Mnemonic } from "@evolu/common";
import { deriveDeviceKeys } from "@platitprosim/core";
import type { DeviceKeys } from "@platitprosim/core";
import { Either } from "effect";
import { use } from "react";
import type { AppEvolu } from "./evolu";
import { useAppEvolu } from "./evolu";

/** This install's identity: Evolu's AppOwner mnemonic and the keys derived from it. */
export interface Identity {
  /** The backup phrase; restoring it brings the whole install back. */
  readonly mnemonic: Mnemonic;
  /** The Nostr device key (NIP-06) and the BIP-39 seed for linkshu. */
  readonly keys: DeviceKeys;
}

const identities = new WeakMap<AppEvolu, Promise<Identity>>();

const deriveIdentity = async (evolu: AppEvolu): Promise<Identity> => {
  const { mnemonic } = await evolu.appOwner;
  if (!mnemonic) throw new Error("The Evolu AppOwner has no mnemonic");
  const keys = deriveDeviceKeys(mnemonic);
  if (Either.isLeft(keys)) throw keys.left;
  return { mnemonic, keys: keys.right };
};

/** Resolves once Evolu has loaded or created the AppOwner; one promise per instance. */
export const loadIdentity = (evolu: AppEvolu): Promise<Identity> => {
  const cached = identities.get(evolu);
  if (cached) return cached;
  const identity = deriveIdentity(evolu);
  identities.set(evolu, identity);
  return identity;
};

/** The identity of this install; suspends until Evolu has the AppOwner. */
export const useIdentity = (): Identity => use(loadIdentity(useAppEvolu()));

/** Validates a typed backup phrase; `null` when it is not a valid BIP-39 mnemonic. */
export const parseMnemonic = (phrase: string): Mnemonic | null => {
  const words = phrase.trim().toLowerCase().split(/\s+/u).join(" ");
  const mnemonic = Mnemonic.fromUnknown(words);
  return mnemonic.ok ? mnemonic.value : null;
};

/** Replaces this install's identity with the restored one; the caller reloads the app. */
export const restoreDevice = (evolu: AppEvolu, mnemonic: Mnemonic) =>
  evolu.restoreAppOwner(mnemonic, { reload: false });

/** Wipes every local row and the AppOwner, then reloads into a fresh install. */
export const resetDevice = (evolu: AppEvolu) =>
  evolu.resetAppOwner({ reload: true });
