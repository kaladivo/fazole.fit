import { deviceAuthorizationTemplate, parsePubkey } from "@linky-fit/linkstr";
import type { Pubkey } from "@linky-fit/linkstr";
import {
  CzechIban,
  DEVICE_AUTHORIZATION_APP,
  decodeAppMessage,
  encodeAppMessage,
} from "@platitprosim/core";
import { Either } from "effect";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import { describe, expect, it } from "vitest";
import type { Employee } from "../storage";
import { EmployeeId } from "../storage/schema";
import { shopConfigFor, sweepAmount, verifyDeviceLink } from "./team";

const keypair = () => {
  const secret = generateSecretKey();
  const pubkey = parsePubkey(getPublicKey(secret));
  if (pubkey === null) throw new Error("bad test key");
  return { secret, pubkey };
};

const employeeKeys = keypair();
const deviceKeys = keypair();

const employee = (overrides: Partial<Employee> = {}): Employee => ({
  id: EmployeeId.orThrow("E".repeat(21) + "A"),
  pubkey: employeeKeys.pubkey,
  name: "Jana",
  addedAtMs: 1,
  removedAtMs: null,
  ...overrides,
});

/** A kind 24138 event the employee's Linky would sign. */
const attestation = ({
  signer = employeeKeys.secret,
  device = deviceKeys.pubkey,
  app = DEVICE_AUTHORIZATION_APP,
}: {
  signer?: Uint8Array;
  device?: Pubkey;
  app?: string;
} = {}) => {
  const template = deviceAuthorizationTemplate({ device, app });
  return JSON.stringify(
    finalizeEvent(
      {
        kind: template.kind,
        content: template.content,
        tags: template.tags.map((tag) => [...tag]),
        created_at: 1_760_000_000,
      },
      signer,
    ),
  );
};

describe("verifyDeviceLink", () => {
  it("links the device that published an active employee's attestation", () => {
    expect(
      verifyDeviceLink({ author: deviceKeys.pubkey, content: attestation() }, [
        employee(),
      ]),
    ).toEqual({ employee: employee(), device: deviceKeys.pubkey });
  });

  it("rejects an attestation another key republished", () => {
    expect(
      verifyDeviceLink({ author: keypair().pubkey, content: attestation() }, [
        employee(),
      ]),
    ).toBeNull();
  });

  it("rejects an attestation for another app", () => {
    expect(
      verifyDeviceLink(
        {
          author: deviceKeys.pubkey,
          content: attestation({ app: "Another app" }),
        },
        [employee()],
      ),
    ).toBeNull();
  });

  it("rejects strangers and removed employees", () => {
    const stranger = keypair();
    expect(
      verifyDeviceLink(
        {
          author: deviceKeys.pubkey,
          content: attestation({ signer: stranger.secret }),
        },
        [employee()],
      ),
    ).toBeNull();
    expect(
      verifyDeviceLink({ author: deviceKeys.pubkey, content: attestation() }, [
        employee({ removedAtMs: 5 }),
      ]),
    ).toBeNull();
  });

  it("rejects a tampered or unreadable attestation", () => {
    const tampered = attestation().replace(deviceKeys.pubkey, keypair().pubkey);
    for (const content of [tampered, "", "{"]) {
      expect(
        verifyDeviceLink({ author: deviceKeys.pubkey, content }, [employee()]),
      ).toBeNull();
    }
  });
});

describe("shopConfigFor", () => {
  it("builds a ShopConfig an employee device decodes", () => {
    const config = shopConfigFor(
      {
        role: "owner",
        name: "Kavárna U Lípy",
        iban: CzechIban.make("CZ6508000000192000145399"),
        accountDisplay: "19-2000145399/0800",
        mintUrl: "http://localhost:3348",
      },
      deviceKeys.pubkey,
      employee({ name: null }),
    );
    expect(
      Either.getOrThrow(decodeAppMessage(encodeAppMessage(config))),
    ).toEqual({ ...config, shopId: deviceKeys.pubkey, employeeName: "" });
  });
});

describe("sweepAmount", () => {
  it("leaves the input fee of every proof for the swap", () => {
    expect(sweepAmount({ balance: 100, proofs: 4, inputFeePpk: 100 })).toBe(99);
    expect(sweepAmount({ balance: 100, proofs: 11, inputFeePpk: 100 })).toBe(
      98,
    );
    expect(sweepAmount({ balance: 100, proofs: 4, inputFeePpk: null })).toBe(
      100,
    );
    expect(sweepAmount({ balance: 0, proofs: 0, inputFeePpk: 100 })).toBe(0);
    expect(sweepAmount({ balance: 1, proofs: 1, inputFeePpk: 100 })).toBe(0);
  });
});
