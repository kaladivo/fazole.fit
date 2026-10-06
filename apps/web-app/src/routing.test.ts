import { describe, expect, it } from "vitest";
import {
  flows,
  parseRoute,
  paymentIdOf,
  paymentRoute,
  resolveRoute,
  routeHash,
  sections,
} from "./routing";

describe("parseRoute", () => {
  it("reads every section, flow and payment back from its hash", () => {
    for (const route of [...sections, ...flows, paymentRoute("abc-1_2")]) {
      expect(parseRoute(routeHash(route))).toBe(route);
    }
    expect(paymentIdOf(parseRoute("#pay/abc"))).toBe("abc");
  });

  it("falls back to the welcome screen", () => {
    expect(parseRoute("")).toBe("welcome");
    expect(parseRoute("#unknown")).toBe("welcome");
    expect(parseRoute("#pay/")).toBe("welcome");
  });
});

describe("resolveRoute", () => {
  it("keeps an install without a role in the welcome flows", () => {
    expect(resolveRoute("setup", null)).toBe("setup");
    expect(resolveRoute("restoring", null)).toBe("restoring");
    expect(resolveRoute("employee", null)).toBe("employee");
    expect(resolveRoute("terminal", null)).toBe("welcome");
    expect(resolveRoute(paymentRoute("x"), null)).toBe("welcome");
  });

  it("opens the terminal once the install has a role", () => {
    for (const route of [
      "welcome",
      "setup",
      "employee",
      "restoring",
    ] as const) {
      expect(resolveRoute(route, "owner")).toBe("terminal");
    }
    expect(resolveRoute("history", "owner")).toBe("history");
    expect(resolveRoute("restore", "owner")).toBe("restore");
    expect(resolveRoute(paymentRoute("x"), "owner")).toBe("pay/x");
  });

  it("hides the owner's sections from an employee", () => {
    expect(resolveRoute("wallet", "employee")).toBe("terminal");
    expect(resolveRoute("employees", "employee")).toBe("terminal");
    expect(resolveRoute("settings", "employee")).toBe("settings");
  });
});
