import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { brandMark } from "@platitprosim/ui/tokens";
import { expect, test } from "vitest";

test("the app icon draws the same mark as BrandMark", () => {
  const logo = readFileSync(
    resolve(import.meta.dirname, "../public/logo.svg"),
    "utf8",
  );
  expect(logo).toContain(`d="${brandMark.letter}"`);
  expect(logo).toContain(`fill="${brandMark.color}"`);
});
