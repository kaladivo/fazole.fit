import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { brandMark } from "@platitprosim/ui/tokens";
import { expect, test } from "vitest";

test("the app icon draws the same mark as BrandMark", () => {
  const logo = readFileSync(
    resolve(import.meta.dirname, "../public/logo.svg"),
    "utf8",
  );
  expect(logo).toContain(`fill="${brandMark.color}"`);
  for (const part of [brandMark.bean, brandMark.hilum]) {
    expect(logo).toContain(`d="${part.path}"`);
    expect(logo).toContain(`stroke="${part.color}"`);
    expect(logo).toContain(`stroke-width="${part.width}"`);
  }
});
