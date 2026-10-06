import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../test/render";
import { UIProvider } from "./provider";
import { QRScanner } from "./qrScanner";

const scanner = (
  <QRScanner
    onScan={() => {}}
    accessibilityLabel="Scanner"
    hint="Point the camera at a QR code"
    unavailableHint="The camera is not available"
  />
);

interface FakeStream {
  getTracks: () => { stop: () => void }[];
}

const withCamera = (getUserMedia: () => Promise<FakeStream>) =>
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

afterEach(() => {
  Reflect.deleteProperty(navigator, "mediaDevices");
  vi.restoreAllMocks();
});

describe("QRScanner", () => {
  it("falls back to its hint when the browser offers no camera", async () => {
    const container = await render(scanner);
    expect(container.textContent).toContain("The camera is not available");
  });

  it("falls back to its hint when the user denies the camera", async () => {
    withCamera(() => Promise.reject(new Error("NotAllowedError")));
    const container = await render(scanner);
    expect(container.textContent).toContain("The camera is not available");
  });

  it("shows the rear camera and stops it once unmounted", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const stop = vi.fn();
    const getUserMedia = vi.fn(() =>
      Promise.resolve<FakeStream>({ getTracks: () => [{ stop }] }),
    );
    withCamera(getUserMedia);
    const container = document.body.appendChild(document.createElement("div"));
    const root = createRoot(container);
    await act(async () =>
      root.render(<UIProvider mode="dark">{scanner}</UIProvider>),
    );
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "environment" },
      audio: false,
    });
    expect(container.querySelector("video")).not.toBeNull();
    expect(container.textContent).toContain("Point the camera at a QR code");
    await act(async () => root.unmount());
    expect(stop).toHaveBeenCalled();
  });
});
