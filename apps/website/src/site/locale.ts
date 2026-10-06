import { useEffect, useState } from "react";
import { copies } from "../copy";
import type { Locale } from "../copy";

const languageParam = "lang";

/** Czech unless the URL asks for English, so a shared `?lang=en` link opens in English. */
export const localeFromUrl = (search: string): Locale =>
  new URLSearchParams(search).get(languageParam) === "en" ? "en" : "cs";

const otherLocale = (locale: Locale): Locale => (locale === "cs" ? "en" : "cs");

const setMetaContent = (
  selector: string,
  content: string | null | undefined,
) => {
  if (content != null)
    document.querySelector(selector)?.setAttribute("content", content);
};

/** Mirrors `locale` to `<html lang>`, the title and the description, Open Graph and Twitter tags. */
export const applyLocaleMeta = (locale: Locale) => {
  const { meta } = copies[locale];
  document.documentElement.lang = locale;
  document.title = meta.title;
  setMetaContent('meta[name="description"]', meta.description);
  setMetaContent('meta[property="og:title"]', meta.title);
  setMetaContent('meta[property="og:description"]', meta.socialDescription);
  setMetaContent('meta[property="og:image:alt"]', meta.imageAlt);
  setMetaContent('meta[property="og:locale"]', meta.ogLocale);
  setMetaContent(
    'meta[property="og:locale:alternate"]',
    copies[otherLocale(locale)].meta.ogLocale,
  );
  setMetaContent(
    'meta[property="og:url"]',
    document
      .querySelector(`link[rel="alternate"][hreflang="${locale}"]`)
      ?.getAttribute("href"),
  );
  setMetaContent('meta[name="twitter:title"]', meta.title);
  setMetaContent('meta[name="twitter:description"]', meta.socialDescription);
};

/** The page language, mirrored to the URL and the document's metadata. */
export const useLocale = () => {
  const [locale, setLocale] = useState(() => localeFromUrl(location.search));
  useEffect(() => {
    const url = new URL(location.href);
    if (locale === "cs") url.searchParams.delete(languageParam);
    else url.searchParams.set(languageParam, locale);
    history.replaceState(history.state, "", url);
    applyLocaleMeta(locale);
  }, [locale]);
  return [locale, setLocale] as const;
};
