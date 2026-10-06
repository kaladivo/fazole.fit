import {
  decodeNprofilePubkey,
  derivePubkey,
  encodeNpub,
  NostrSecretKey,
  parsePubkey,
  type Pubkey,
} from "@linky-fit/linkstr";
import { bytesToHex } from "@noble/hashes/utils.js";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { Data, Either, Schema } from "effect";

export const NOSTR_DERIVATION_PATH = "m/44'/1237'/0'/0/0";

export class InvalidMnemonicError extends Data.TaggedError(
  "InvalidMnemonicError",
) {}

export interface NostrKeys {
  readonly secretKey: NostrSecretKey;
  readonly secretKeyHex: string;
  readonly pubkey: Pubkey;
  readonly npub: string;
}

export interface DeviceKeys {
  readonly nostr: NostrKeys;
  /** The BIP-39 seed, used as linkshu `bip39Seed`. */
  readonly bip39Seed: Uint8Array;
}

/** Whether `word` is in the English BIP-39 wordlist, e.g. to flag a mistyped backup word. */
export const isMnemonicWord = (word: string): boolean =>
  wordlist.includes(word.trim().toLowerCase());

const normalizeMnemonic = (mnemonic: string): string =>
  mnemonic.trim().toLowerCase().split(/\s+/).join(" ");

export const deriveDeviceKeys = (
  mnemonic: string,
): Either.Either<DeviceKeys, InvalidMnemonicError> => {
  const words = normalizeMnemonic(mnemonic);
  if (!validateMnemonic(words, wordlist)) {
    return Either.left(new InvalidMnemonicError());
  }
  const bip39Seed = mnemonicToSeedSync(words);
  const secretKey = Schema.decodeUnknownSync(NostrSecretKey)(
    HDKey.fromMasterSeed(bip39Seed).derive(NOSTR_DERIVATION_PATH).privateKey,
  );
  const pubkey = derivePubkey(secretKey);
  return Either.right({
    nostr: {
      secretKey,
      secretKeyHex: bytesToHex(secretKey),
      pubkey,
      npub: encodeNpub(pubkey),
    },
    bip39Seed,
  });
};

const LINKY_PROFILE_URL = /^https:\/\/(?:app\.)?linky\.fit\/p\/([^/?#]+)/;

/** Accepts an npub, nprofile, hex pubkey, `nostr:` URI or Linky profile link. */
export const parsePubkeyInput = (input: string): Pubkey | null => {
  const trimmed = input.trim().toLowerCase();
  const value =
    LINKY_PROFILE_URL.exec(trimmed)?.[1] ?? trimmed.replace(/^nostr:/, "");
  return parsePubkey(value) ?? decodeNprofilePubkey(value);
};
