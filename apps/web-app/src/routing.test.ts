import { describe, expect, it } from "vitest";
import { parseRoute, routeHash, sections } from "./routing";

describe("parseRoute", () => {
  it("reads every section back from its hash", () => {
    for (const section of sections) {
      expect(parseRoute(routeHash(section))).toBe(section);
    }
  });

  it("falls back to the welcome screen", () => {
    expect(parseRoute("")).toBe("welcome");
    expect(parseRoute("#unknown")).toBe("welcome");
  });
});
