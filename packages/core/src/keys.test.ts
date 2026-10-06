import { encodeNprofile, Pubkey } from "@linky-fit/linkstr";
import { bytesToHex } from "@noble/hashes/utils.js";
import { mnemonicToSeedSync } from "@scure/bip39";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { deriveDeviceKeys, isMnemonicWord, parsePubkeyInput } from "./keys";

// NIP-06 test vectors.
const vectors = [
  {
    mnemonic:
      "leader monkey parrot ring guide accident before fence cannon height naive bean",
    secretKeyHex:
      "7f7ff03d123792d6ac594bfa67bf6d0c0ab55b6b1fdb6249303fe861f1ccba9a",
    pubkey: "17162c921dc4d2518f9a101db33695df1afb56ab82f5ff3e5da6eec3ca5cd917",
    npub: "npub1zutzeysacnf9rru6zqwmxd54mud0k44tst6l70ja5mhv8jjumytsd2x7nu",
  },
  {
    mnemonic:
      "what bleak badge arrange retreat wolf trade produce cricket blur garlic valid proud rude strong choose busy staff weather area salt hollow arm fade",
    secretKeyHex:
      "c15d739894c81a2fcfd3a2df85a0d2c0dbc47a280d092799f144d73d7ae78add",
    pubkey: "d41b22899549e1f3d335a31002cfd382174006e166d3e658e3a5eecdb6463573",
    npub: "npub16sdj9zv4f8sl85e45vgq9n7nsgt5qphpvmf7vk8r5hhvmdjxx4es8rq74h",
  },
];

describe("deriveDeviceKeys", () => {
  it.each(vectors)("derives NIP-06 keys for $npub", (vector) => {
    const { nostr, bip39Seed } = Either.getOrThrow(
      deriveDeviceKeys(vector.mnemonic),
    );
    expect(nostr.secretKeyHex).toBe(vector.secretKeyHex);
    expect(bytesToHex(nostr.secretKey)).toBe(vector.secretKeyHex);
    expect(nostr.pubkey).toBe(vector.pubkey);
    expect(nostr.npub).toBe(vector.npub);
    expect(bip39Seed).toEqual(mnemonicToSeedSync(vector.mnemonic));
  });

  it("normalises case and whitespace", () => {
    const [vector] = vectors;
    const keys = deriveDeviceKeys(
      `  ${vector?.mnemonic.toUpperCase().replaceAll(" ", "\n  ")} `,
    );
    expect(Either.getOrThrow(keys).nostr.npub).toBe(vector?.npub);
  });

  it("rejects an invalid mnemonic", () => {
    const result = deriveDeviceKeys(
      "leader monkey parrot ring guide accident before fence cannon height naive naive",
    );
    expect(Either.isLeft(result)).toBe(true);
  });
});

describe("isMnemonicWord", () => {
  it("accepts BIP-39 words in any case and rejects the rest", () => {
    expect(isMnemonicWord(" Abandon ")).toBe(true);
    expect(isMnemonicWord("zoo")).toBe(true);
    expect(isMnemonicWord("abandonx")).toBe(false);
    expect(isMnemonicWord("")).toBe(false);
  });
});

describe("parsePubkeyInput", () => {
  const { pubkey, npub } = vectors[0] ?? { pubkey: "", npub: "" };
  const nprofile = encodeNprofile(Pubkey.make(pubkey), [
    "wss://relay.example.com",
  ]);

  it.each([
    npub,
    ` ${npub.toUpperCase()} `,
    pubkey,
    pubkey.toUpperCase(),
    nprofile,
    `nostr:${npub}`,
    `nostr:${nprofile}`,
    `https://linky.fit/p/${npub}`,
    `https://app.linky.fit/p/${npub}?ref=qr`,
  ])("parses %s", (input) => {
    expect(parsePubkeyInput(input)).toBe(pubkey);
  });

  it.each([
    "",
    "npub1invalid",
    "https://linky.fit/p/dave",
    `https://evil.example/p/${npub}x`,
    "nsec10allq0gjx7fddtzef0ax00mdps9t2kmtrldkyjfs8l5xruwvh2dq0lhhkp",
  ])("rejects %s", (input) => {
    expect(parsePubkeyInput(input)).toBeNull();
  });
});
