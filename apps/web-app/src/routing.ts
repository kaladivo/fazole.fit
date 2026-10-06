import { useSyncExternalStore } from "react";

export const sections = [
  "terminal",
  "history",
  "employees",
  "wallet",
  "settings",
] as const;

export type Section = (typeof sections)[number];

export type Route = "welcome" | Section;

const isSection = (value: string): value is Section =>
  sections.some((section) => section === value);

export const parseRoute = (hash: string): Route => {
  const name = hash.replace(/^#\/?/u, "");
  return isSection(name) ? name : "welcome";
};

export const routeHash = (route: Route) => `#${route}`;

export const navigateTo = (route: Route) => {
  window.location.hash = routeHash(route);
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export const useRoute = (): Route =>
  useSyncExternalStore(subscribe, () => parseRoute(window.location.hash));
