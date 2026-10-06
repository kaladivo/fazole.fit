import { describe, expect, it } from "vitest";
import { render } from "../test/render";
import { Avatar, StatusBadge } from "./display";

describe("Avatar", () => {
  it("shows up to two initials of the name", async () => {
    const container = await render(<Avatar name="jana nová malá" />);
    expect(container.textContent).toBe("JN");
  });
});

describe("StatusBadge", () => {
  it("shows the translated label", async () => {
    const container = await render(<StatusBadge status="paid" label="Paid" />);
    expect(container.textContent).toBe("Paid");
  });
});
