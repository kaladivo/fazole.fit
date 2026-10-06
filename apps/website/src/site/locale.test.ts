import { describe, expect, it } from "vitest";
import { copies } from "../copy";
import { localeFromUrl } from "./locale";

/** The shape of a copy object: its keys all the way down, and the length of its lists. */
const shape = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(shape)
    : typeof value === "object" && value !== null
      ? Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, shape(item)]),
        )
      : typeof value;

describe("locale", () => {
  it("is Czech unless the URL asks for English", () => {
    expect(localeFromUrl("")).toBe("cs");
    expect(localeFromUrl("?lang=de")).toBe("cs");
    expect(localeFromUrl("?lang=en")).toBe("en");
  });

  it("has the same copy in both languages", () => {
    expect(shape(copies.en)).toEqual(shape(copies.cs));
  });
});
