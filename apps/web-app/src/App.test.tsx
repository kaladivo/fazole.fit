import { parseCzechAccount } from "@platitprosim/core";
import { Either } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { navigateTo } from "./routing";
import { createTestServices } from "./services/testing/testServices";
import type { Route } from "./routing";
import { saveSetting, saveShop } from "./storage";
import type { AppEvolu } from "./storage";
import { createTestEvolu } from "./storage/testing/testEvolu";

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  navigateTo("welcome");
  vi.restoreAllMocks();
});

const renderAt = async (route: Route, evolu: AppEvolu = createTestEvolu()) => {
  navigateTo(route);
  const container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
  await act(async () =>
    root?.render(<App evolu={evolu} services={createTestServices(evolu)} />),
  );
  return container;
};

const withShop = async () => {
  const evolu = createTestEvolu();
  const account = parseCzechAccount("19-2000145399/0800");
  if (Either.isLeft(account)) throw account.left;
  await saveShop(evolu, { name: "Kavárna", account: account.right });
  return evolu;
};

describe("App", () => {
  it("welcomes a fresh install in the browser's language", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["cs-CZ"]);
    expect((await renderAt("welcome")).textContent).toContain("Založit obchod");
  });

  it("prefers the language saved in settings", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["cs-CZ"]);
    const evolu = createTestEvolu();
    await saveSetting(evolu, "language", "en");
    expect((await renderAt("welcome", evolu)).textContent).toContain(
      "Set up a shop",
    );
  });

  it("keeps an install without a shop out of the sections", async () => {
    const container = await renderAt("history");
    expect(
      container.querySelector('[data-testid="welcome-screen"]'),
    ).not.toBeNull();
  });

  it("opens the section in the hash with its navigation once there is a shop", async () => {
    const container = await renderAt("history", await withShop());
    expect(
      container.querySelector('[data-testid="history-screen"]'),
    ).not.toBeNull();
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it("sends an owner from the welcome screen to the terminal", async () => {
    const container = await renderAt("welcome", await withShop());
    expect(
      container.querySelector('[data-testid="terminal-screen"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("Kavárna");
  });
});
