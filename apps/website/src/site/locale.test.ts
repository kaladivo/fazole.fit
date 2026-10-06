import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import { copies } from "../copy";
import { applyLocaleMeta, localeFromUrl } from "./locale";

/** The language-dependent head of the page: title, description, Open Graph and Twitter. */
const headMeta = () => ({
  lang: document.documentElement.lang,
  title: document.title,
  ...Object.fromEntries(
    [
      ...document.head.querySelectorAll(
        'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]',
      ),
    ].map((tag) => [
      tag.getAttribute("property") ?? tag.getAttribute("name"),
      tag.getAttribute("content"),
    ]),
  ),
});

const loadIndexHtml = () => {
  document.documentElement.innerHTML = new DOMParser().parseFromString(
    indexHtml,
    "text/html",
  ).documentElement.innerHTML;
  document.documentElement.lang = "cs";
};

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

  it("keeps index.html in sync with the Czech copy", () => {
    loadIndexHtml();
    const html = headMeta();
    applyLocaleMeta("cs");
    expect(headMeta()).toEqual(html);
  });

  it("switches the social metadata to English", () => {
    loadIndexHtml();
    applyLocaleMeta("en");
    const { meta } = copies.en;
    expect(headMeta()).toMatchObject({
      lang: "en",
      title: meta.title,
      description: meta.description,
      "og:title": meta.title,
      "og:description": meta.socialDescription,
      "og:image:alt": meta.imageAlt,
      "og:locale": "en_US",
      "og:locale:alternate": "cs_CZ",
      "og:url": "%SITE_URL%/?lang=en",
      "twitter:title": meta.title,
      "twitter:description": meta.socialDescription,
    });
  });
});
