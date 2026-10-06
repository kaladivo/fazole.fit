import { registerSW } from "virtual:pwa-register";
import {
  handleUpdateAvailable,
  isApplyingUpdate,
  recordControllerChange,
  recordRegistered,
} from "./update";

const UPDATE_CHECK_INTERVAL_MS = 30_000;

/** Looks for a new release periodically and whenever the app comes back to the foreground. */
const watchForUpdates = (registration: ServiceWorkerRegistration) => {
  const check = () => {
    if (!navigator.onLine) return;
    registration.update().catch((error: unknown) => {
      console.warn("service worker update check failed", error);
    });
  };
  setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  window.addEventListener("focus", check);
  window.addEventListener("online", check);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
};

export const registerPwa = () => {
  recordRegistered(
    registerSW({
      immediate: true,
      onNeedRefresh: () => void handleUpdateAvailable(),
      onRegisteredSW: (_url, registration) => {
        if (registration) watchForUpdates(registration);
      },
    }),
  );
  if (!("serviceWorker" in navigator)) return;
  const hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    recordControllerChange();
    // Another tab accepted the update; this one would keep loading old assets missing from the new precache.
    if (hadController && !isApplyingUpdate()) location.reload();
  });
};
