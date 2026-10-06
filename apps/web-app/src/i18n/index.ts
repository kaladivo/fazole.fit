import { createContext, useContext } from "react";
import { cs } from "./cs";
import { en } from "./en";

export const dictionaries = { cs, en } as const;

export type Lang = keyof typeof dictionaries;
export type I18nKey = keyof typeof cs;
export type Translate = (
  key: I18nKey,
  params?: Record<string, string | number>,
) => string;

export const defaultLang: Lang = "cs";

/** Looks the key up in `lang` and fills its `{name}` placeholders from `params`. */
export const translate =
  (lang: Lang): Translate =>
  (key, params = {}) =>
    dictionaries[lang][key].replace(/\{(\w+)\}/gu, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
}

export const I18nContext = createContext<I18n>({
  lang: defaultLang,
  setLang: () => {},
  t: translate(defaultLang),
});

export const useI18n = () => useContext(I18nContext);
