import { afterEach, describe, expect, it, vi } from "vitest";
import { saveToPasswordManager } from "./passwordManager";

const credential = { id: "fazole.fit:npub1", name: "Kavárna", password: "a b" };

class FakePasswordCredential {
  readonly type = "password";
  readonly data: typeof credential;
  constructor(data: typeof credential) {
    this.data = data;
  }
}

const stubBrowser = (store: (stored: unknown) => Promise<void>) => {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("PasswordCredential", FakePasswordCredential);
  vi.stubGlobal("navigator", { credentials: { store } });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveToPasswordManager", () => {
  it("stores the phrase as a password credential", async () => {
    const store = vi.fn(() => Promise.resolve(undefined));
    stubBrowser(store);
    await expect(saveToPasswordManager(credential)).resolves.toBe("saved");
    expect(store).toHaveBeenCalledWith(new FakePasswordCredential(credential));
  });

  it("reports browsers without PasswordCredential as unsupported", async () => {
    await expect(saveToPasswordManager(credential)).resolves.toBe(
      "unsupported",
    );
  });

  it("reports a rejected store as failed", async () => {
    stubBrowser(() => Promise.reject(new Error("denied")));
    await expect(saveToPasswordManager(credential)).resolves.toBe("failed");
  });
});
