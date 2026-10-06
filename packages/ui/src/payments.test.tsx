import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test/render";
import { Keypad } from "./payments";
import type { KeypadKey } from "./payments";

describe("Keypad", () => {
  it("sends digits, the decimal comma and backspace", async () => {
    const onKeyPress = vi.fn<(key: KeypadKey) => void>();
    const container = await render(
      <Keypad
        accessibilityLabel="Amount"
        labels={{ decimal: "Decimal comma", backspace: "Delete" }}
        onKeyPress={onKeyPress}
      />,
    );
    for (const name of ["7", "Decimal comma", "Delete"]) {
      const key = container.querySelector<HTMLButtonElement>(
        `button[aria-label="${name}"]`,
      );
      await act(async () => key?.click());
    }
    expect(onKeyPress.mock.calls.flat()).toEqual(["7", "decimal", "backspace"]);
    expect(container.textContent).toContain(",");
  });
});
