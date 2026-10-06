import { makeIdentity } from "@linky-fit/linkstr/testing";
import { CzechIban } from "@platitprosim/core";
import { describe, expect, it } from "vitest";
import { resolveRoute } from "../routing";
import type { EmployeeLogin, ShopOffer, StoredMembership } from "../storage";
import { ShopOfferId } from "../storage/schema";
import { employeeStep, holdsEmployeeScreen, linkReducer } from "./employeeFlow";
import type { LinkState } from "./employeeFlow";

const owner = makeIdentity().pubkey;
const login: EmployeeLogin = {
  employeePubkey: makeIdentity().pubkey,
  attestation: "{}",
};
const offer = (declined = false): ShopOffer => ({
  id: ShopOfferId.orThrow("O".repeat(21) + "A"),
  ownerPubkey: owner,
  declined,
  config: {
    v: 1,
    type: "ShopConfig",
    shopId: owner,
    shopName: "Kavárna",
    iban: CzechIban.make("CZ6508000000192000145399"),
    accountDisplay: "19-2000145399/0800",
    ownerPubkey: owner,
    mintUrl: "https://cashu.cz",
    employeeName: "Jana",
  },
});
const membership = (removed: boolean): StoredMembership => ({
  shopName: "Kavárna",
  ownerPubkey: owner,
  mintUrl: "https://cashu.cz",
  employeeName: "Jana",
  employeePubkey: login.employeePubkey,
  removed,
});

describe("employeeStep", () => {
  it("starts at the Linky login and waits once logged in", () => {
    expect(employeeStep({ login: null, offers: [], membership: null })).toEqual(
      { step: "login" },
    );
    expect(employeeStep({ login, offers: [], membership: null })).toEqual({
      step: "waiting",
      login,
    });
  });

  it("asks about an offer, and waits again once it is declined", () => {
    expect(
      employeeStep({ login, offers: [offer()], membership: null }),
    ).toEqual({ step: "offer", login, offer: offer() });
    expect(
      employeeStep({ login, offers: [offer(true)], membership: null }),
    ).toEqual({ step: "waiting", login });
  });

  it("ignores offers without a login", () => {
    expect(
      employeeStep({ login: null, offers: [offer()], membership: null }),
    ).toEqual({ step: "login" });
  });

  it("opens the terminal for a member and tells a removed one", () => {
    expect(
      employeeStep({ login, offers: [], membership: membership(false) }),
    ).toEqual({ step: "member" });
    expect(
      employeeStep({ login, offers: [], membership: membership(true) }),
    ).toEqual({ step: "removed", shopName: "Kavárna" });
    expect(
      employeeStep({ login, offers: [offer()], membership: membership(true) }),
    ).toMatchObject({ step: "offer" });
  });

  it("keeps a waiting, offered or removed install on the employee screen", () => {
    for (const step of [
      employeeStep({ login, offers: [], membership: null }),
      employeeStep({ login, offers: [offer()], membership: null }),
      employeeStep({ login, offers: [], membership: membership(true) }),
    ]) {
      expect(holdsEmployeeScreen(step)).toBe(true);
      expect(resolveRoute("terminal", null, true)).toBe("employee");
      expect(resolveRoute("welcome", null, true)).toBe("employee");
    }
    expect(
      holdsEmployeeScreen(
        employeeStep({ login: null, offers: [], membership: null }),
      ),
    ).toBe(false);
    expect(resolveRoute("employee", "employee", true)).toBe("terminal");
  });
});

describe("linkReducer", () => {
  const idle: LinkState = { status: "idle" };

  it("opens a session, shows its link and returns to idle once signed", () => {
    const opening = linkReducer(idle, { type: "start" });
    expect(opening).toEqual({ status: "opening" });
    const awaiting = linkReducer(opening, {
      type: "uri",
      uri: "nostrconnect://x",
    });
    expect(awaiting).toEqual({ status: "awaiting", uri: "nostrconnect://x" });
    expect(linkReducer(awaiting, { type: "finished", failure: null })).toEqual(
      idle,
    );
  });

  it("reports a failure and starts over from it", () => {
    const failed = linkReducer(
      { status: "awaiting", uri: "nostrconnect://x" },
      { type: "finished", failure: "timeout" },
    );
    expect(failed).toEqual({ status: "failed", failure: "timeout" });
    expect(linkReducer(failed, { type: "start" })).toEqual({
      status: "opening",
    });
    expect(
      linkReducer(
        { status: "opening" },
        {
          type: "finished",
          failure: "unreachable",
        },
      ),
    ).toEqual({ status: "failed", failure: "unreachable" });
  });

  it("ignores late events after a cancel", () => {
    const cancelled = linkReducer(
      { status: "awaiting", uri: "nostrconnect://x" },
      { type: "cancel" },
    );
    expect(cancelled).toEqual(idle);
    expect(linkReducer(cancelled, { type: "uri", uri: "late" })).toEqual(idle);
    expect(
      linkReducer(cancelled, { type: "finished", failure: "refused" }),
    ).toEqual(idle);
    expect(linkReducer({ status: "opening" }, { type: "start" })).toEqual({
      status: "opening",
    });
  });
});
