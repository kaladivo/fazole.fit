import { useSyncExternalStore } from "react";
import type { Role } from "./storage";

/** The main sections, reachable from the navigation once the install has a role. */
export const sections = [
  "terminal",
  "history",
  "employees",
  "wallet",
  "settings",
] as const;
export type Section = (typeof sections)[number];

/** Full-screen steps outside the navigation. */
export const flows = [
  "welcome",
  "setup",
  "restore",
  "restoring",
  "employee",
] as const;
export type Flow = (typeof flows)[number];

/** A payment shown to the customer. */
export type PaymentRoute = `pay/${string}`;

export type Route = Section | Flow | PaymentRoute;

const isOneOf = <T extends string>(
  values: readonly T[],
  value: string,
): value is T => values.some((item) => item === value);

const isPaymentRoute = (value: string): value is PaymentRoute =>
  /^pay\/[\w-]+$/u.test(value);

export const parseRoute = (hash: string): Route => {
  const name = hash.replace(/^#\/?/u, "");
  return isOneOf(sections, name) || isOneOf(flows, name) || isPaymentRoute(name)
    ? name
    : "welcome";
};

export const paymentRoute = (paymentId: string): PaymentRoute =>
  `pay/${paymentId}`;

export const paymentIdOf = (route: Route): string | null =>
  isPaymentRoute(route) ? route.slice("pay/".length) : null;

export const isSection = (route: Route): route is Section =>
  isOneOf(sections, route);

export const isFlow = (route: Route): route is Flow => isOneOf(flows, route);

/** The sections a role uses; an employee has no team and no wallet of their own. */
export const sectionsFor = (role: Role): readonly Section[] =>
  role === "owner" ? sections : ["terminal", "history", "settings"];

/**
 * Where a route lands for this install: without a role only the welcome
 * flows are open, and with one the welcome flows lead to the terminal.
 * Restoring stays open to an owner, who may replace this device's identity.
 * An employee install waiting for, answering or removed from a shop stays
 * on the employee screen.
 */
export const resolveRoute = (
  route: Route,
  role: Role | null,
  employeePending = false,
): Route => {
  if (role === null) {
    if (employeePending) return "employee";
    return route === "setup" ||
      route === "restore" ||
      route === "restoring" ||
      route === "employee"
      ? route
      : "welcome";
  }
  if (route === "restore" || isPaymentRoute(route)) return route;
  return isSection(route) && sectionsFor(role).includes(route)
    ? route
    : "terminal";
};

export const routeHash = (route: Route) => `#${route}`;

export const navigateTo = (route: Route) => {
  window.location.hash = routeHash(route);
};

/** Swaps the current history entry, so Back skips a route that redirected. */
export const replaceRoute = (route: Route) => {
  window.location.replace(routeHash(route));
};

/** Reloads the app at `route`, e.g. after Evolu replaced the identity. */
export const reloadAt = (route: Route) => {
  window.location.replace(`/${routeHash(route)}`);
  window.location.reload();
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export const useRoute = (): Route =>
  useSyncExternalStore(subscribe, () => parseRoute(window.location.hash));
