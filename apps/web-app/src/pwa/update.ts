import { Option, Schema } from "effect";

type Listener = (needRefresh: boolean) => void;
type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

const STARTUP_AUTO_UPDATE_WINDOW_MS = 5_000;
const CLIENT_COUNT_TIMEOUT_MS = 1_000;
const RELOAD_FALLBACK_MS = 1_500;

const listeners = new Set<Listener>();
const heldWork = new Set<Promise<void>>();
let needRefresh = false;
let applying = false;
let updateServiceWorker: UpdateServiceWorker | null = null;

const startedAt = Date.now();
let interacted = false;
for (const type of ["pointerdown", "keydown"]) {
  window.addEventListener(
    type,
    () => {
      interacted = true;
    },
    { capture: true, once: true },
  );
}

export const recordRegistered = (update: UpdateServiceWorker) => {
  updateServiceWorker = update;
};

export const markNeedRefresh = (value: boolean) => {
  if ((value && applying) || needRefresh === value) return;
  needRefresh = value;
  for (const listener of listeners) listener(value);
};

export const recordControllerChange = () => markNeedRefresh(false);

export const subscribeNeedRefresh = (listener: Listener) => {
  listeners.add(listener);
  listener(needRefresh);
  return () => {
    listeners.delete(listener);
  };
};

export const isApplyingUpdate = () => applying;

/** Holds the update's reload back until `work` settles, so it cannot cut a wallet operation short. */
export const deferUpdateWhile = <A>(work: Promise<A>): Promise<A> => {
  const settled: Promise<void> = work.then(
    () => void heldWork.delete(settled),
    () => void heldWork.delete(settled),
  );
  heldWork.add(settled);
  return work;
};

const decodeClientCount = Schema.decodeUnknownOption(
  Schema.Struct({ count: Schema.Number }),
);

/** How many windows the controlling worker serves; null without a controller or a reply. */
const countClients = (): Promise<number | null> => {
  const controller =
    "serviceWorker" in navigator ? navigator.serviceWorker.controller : null;
  if (!controller) return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), CLIENT_COUNT_TIMEOUT_MS);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      clearTimeout(timer);
      resolve(
        Option.getOrNull(
          Option.map(decodeClientCount(event.data), ({ count }) => count),
        ),
      );
    };
    controller.postMessage({ type: "CLIENT_COUNT" }, [channel.port2]);
  });
};

/**
 * A fresh, untouched load in the only open tab applies the update right away;
 * otherwise the banner asks, because applying it reloads every open tab.
 */
export const handleUpdateAvailable = async () => {
  const untouched = () =>
    !interacted && Date.now() - startedAt < STARTUP_AUTO_UPDATE_WINDOW_MS;
  if (untouched() && (await countClients()) === 1 && untouched()) {
    await applyUpdate();
    return;
  }
  markNeedRefresh(true);
};

export const applyUpdate = async () => {
  if (applying) return;
  applying = true;
  markNeedRefresh(false);
  while (heldWork.size > 0) await Promise.allSettled(heldWork);
  if (!updateServiceWorker) {
    location.reload();
    return;
  }
  try {
    await updateServiceWorker(true);
    setTimeout(() => location.reload(), RELOAD_FALLBACK_MS);
  } catch (error) {
    console.warn("service worker update failed", error);
    applying = false;
    markNeedRefresh(true);
  }
};
