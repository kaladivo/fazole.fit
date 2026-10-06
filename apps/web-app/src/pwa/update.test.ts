import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadUpdate = async () => {
  vi.resetModules();
  return import("./update");
};

const stubController = (clientCount: number) => {
  vi.stubGlobal("navigator", {
    serviceWorker: {
      controller: {
        postMessage: (_message: unknown, transfer: Transferable[]) => {
          const [port] = transfer;
          if (port instanceof MessagePort) {
            port.postMessage({ count: clientCount });
          }
        },
      },
    },
  });
};

const deferred = () => {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
};

const recordValues = (update: Awaited<ReturnType<typeof loadUpdate>>) => {
  const values: boolean[] = [];
  update.subscribeNeedRefresh((value) => values.push(value));
  return values;
};

describe("PWA update", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { reload: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("clears and suppresses the banner until the accepted update reloads", async () => {
    vi.useFakeTimers();
    const update = await loadUpdate();
    const values = recordValues(update);
    update.markNeedRefresh(true);
    update.recordRegistered(() => Promise.resolve());

    await update.applyUpdate();
    update.markNeedRefresh(true);
    update.recordControllerChange();
    update.markNeedRefresh(true);

    expect(values).toEqual([false, true, false]);
  });

  it("holds the update back until wallet work, including work queued meanwhile, settles", async () => {
    const update = await loadUpdate();
    const updateServiceWorker = vi.fn(() => Promise.resolve());
    update.recordRegistered(updateServiceWorker);
    const first = deferred();
    void update.deferUpdateWhile(first.promise);

    const applied = update.applyUpdate();
    const queued = deferred();
    void update.deferUpdateWhile(queued.promise);
    first.resolve();
    await first.promise;
    await Promise.resolve();
    expect(updateServiceWorker).not.toHaveBeenCalled();

    queued.resolve();
    await applied;
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("applies a startup update when this tab is the only client", async () => {
    stubController(1);
    const update = await loadUpdate();
    const values = recordValues(update);
    const updateServiceWorker = vi.fn(() => Promise.resolve());
    update.recordRegistered(updateServiceWorker);

    await update.handleUpdateAvailable();

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(values).toEqual([false]);
  });

  it.each([
    ["other tabs are open", () => stubController(2)],
    ["the client count is unknown", () => vi.stubGlobal("navigator", {})],
    [
      "the user has interacted",
      () => {
        stubController(1);
        window.dispatchEvent(new Event("pointerdown"));
      },
    ],
    [
      "the startup window has passed",
      () => {
        stubController(1);
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(Date.now() + 60_000);
      },
    ],
  ])("shows the banner when %s", async (_case, arrange) => {
    const update = await loadUpdate();
    const values = recordValues(update);
    const updateServiceWorker = vi.fn(() => Promise.resolve());
    update.recordRegistered(updateServiceWorker);
    arrange();

    await update.handleUpdateAvailable();

    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(values).toEqual([false, true]);
  });

  it("shows the banner again when applying the update fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const update = await loadUpdate();
    const values = recordValues(update);
    update.markNeedRefresh(true);
    update.recordRegistered(() => Promise.reject(new Error("boom")));

    await update.applyUpdate();

    expect(values).toEqual([false, true, false, true]);
  });
});
