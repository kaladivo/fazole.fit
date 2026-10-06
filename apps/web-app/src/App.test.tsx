import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { navigateTo } from "./routing";
import type { Route } from "./routing";

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  navigateTo("welcome");
});

const renderAt = async (route: Route) => {
  navigateTo(route);
  const container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
  await act(async () => root?.render(<App />));
  return container;
};

describe("App", () => {
  it("welcomes a fresh install in Czech", async () => {
    const container = await renderAt("welcome");
    expect(container.textContent).toContain("Založit obchod");
  });

  it("opens the section in the hash with its navigation", async () => {
    const container = await renderAt("history");
    expect(
      container.querySelector('[data-testid="history-screen"]'),
    ).not.toBeNull();
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
  });
});
