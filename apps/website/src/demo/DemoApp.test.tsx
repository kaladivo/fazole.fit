import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteProvider } from "../site/SiteProvider";
import { DemoApp } from "./DemoApp";
import { DemoProvider } from "./DemoProvider";

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  vi.useRealTimers();
});

const renderTerminal = async () => {
  const container = document.body.appendChild(document.createElement("div"));
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <SiteProvider>
        <DemoProvider>
          <DemoApp
            initialTab="terminal"
            accessibilityLabel="Demo"
            maxWidth={320}
          />
          <DemoApp
            initialTab="history"
            accessibilityLabel="History"
            maxWidth={320}
          />
        </DemoProvider>
      </SiteProvider>,
    ),
  );
  return container;
};

const press = async (container: HTMLElement, name: string) => {
  const button = [
    ...container.querySelectorAll<HTMLElement>("button, [role=radio]"),
  ].find(
    (element) =>
      element.getAttribute("aria-label") === name ||
      element.textContent === name,
  );
  if (!button) throw new Error(`No button "${name}"`);
  await act(async () => button.click());
};

describe("the live terminal", () => {
  it("takes a bank payment and records it in the shared history", async () => {
    const container = await renderTerminal();
    for (const key of ["4", "2", "0"]) await press(container, key);
    await press(container, "Požadovat platbu");
    expect(container.textContent).toContain("123456789/0000");
    expect(container.textContent).toContain("Čeká");
    await press(container, "Označit jako zaplacené");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Banka · ",
    );
    await press(container, "Nová platba");
    expect(container.textContent).toContain("Požadovat platbu");
    expect(container.textContent).toContain("420 Kč");
    expect(container.textContent).toContain(" · Já");
  });

  it("confirms a Bitcoin payment by itself", async () => {
    vi.useFakeTimers();
    const container = await renderTerminal();
    await press(container, "5");
    await press(container, "Požadovat platbu");
    await press(container, "Bitcoin");
    expect(container.textContent).toContain("Čekám na platbu…");
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Lightning · ",
    );
  });

  it("leaves a cancelled payment in the history", async () => {
    const container = await renderTerminal();
    const cancelled = () => container.textContent?.split("Zrušeno").length;
    const before = cancelled();
    await press(container, "7");
    await press(container, "Požadovat platbu");
    await press(container, "Zrušit platbu");
    expect(container.textContent).toContain("Požadovat platbu");
    expect(cancelled()).toBe((before ?? 0) + 1);
  });
});
