import { describe, expect, it } from "vitest";
import { checkServerUrl } from "./serverUrl";

describe("checkServerUrl", () => {
  const listed = ["wss://nos.lol"];

  it("accepts a new wss address", () => {
    expect(checkServerUrl(" wss://relay.example.com ", listed, false)).toBe(
      null,
    );
  });

  it("rejects what is not a plain wss address", () => {
    expect(checkServerUrl("relay.example.com", listed, false)).toBe(
      "serverUrlInvalid",
    );
    expect(checkServerUrl("https://relay.example.com", listed, false)).toBe(
      "serverUrlInvalid",
    );
    expect(checkServerUrl("ws://localhost:7787", listed, false)).toBe(
      "serverUrlInvalid",
    );
    expect(checkServerUrl("wss://relay.example.com?a=1", listed, false)).toBe(
      "serverUrlInvalid",
    );
  });

  it("accepts ws on localhost when insecure local relays are allowed", () => {
    expect(checkServerUrl("ws://localhost:7787", listed, true)).toBe(null);
    expect(checkServerUrl("ws://example.com", listed, true)).toBe(
      "serverUrlInvalid",
    );
  });

  it("rejects an address already listed, also with a trailing slash", () => {
    expect(checkServerUrl("wss://nos.lol/", listed, false)).toBe(
      "serverUrlListed",
    );
  });
});
