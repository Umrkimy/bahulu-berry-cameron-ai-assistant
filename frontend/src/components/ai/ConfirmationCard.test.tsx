import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ConfirmationCard from "./ConfirmationCard";
import { renderWithProviders } from "../../test/render";

const preview = {
  action_title: "Review stock adjustment",
  details: ["Remove 2 stock for Fictional Bahulu.", "Quantity change: -2"],
  expires_at: "2026-09-13T08:10:00Z",
};

describe("ConfirmationCard", () => {
  it("offers clearly labelled Owner confirmation controls", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    const cancel = vi.fn();
    renderWithProviders(<ConfirmationCard preview={preview} onConfirm={confirm} onCancel={cancel} />);

    expect(screen.getByText("Quantity change: -2")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm Review stock adjustment" }));
    await user.click(screen.getByRole("button", { name: "Cancel Review stock adjustment" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("prevents a second action while a confirmation request is loading", () => {
    renderWithProviders(<ConfirmationCard preview={preview} loading onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cancel Review stock adjustment" })).toBeDisabled();
  });
});
