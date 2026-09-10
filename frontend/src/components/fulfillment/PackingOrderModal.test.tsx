import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PackingOrderModal from "./PackingOrderModal";
import { renderWithProviders } from "../../test/render";

const updateState = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn() }));
const dispatchState = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn() }));

vi.mock("../../hooks/useOrders", () => ({
  useUpdateOrder: () => updateState,
  useDispatchOrder: () => dispatchState,
}));

const order = {
  id: 42,
  customer_name: "Fictional Customer",
  status: "PROCESSING" as const,
  payment_status: "PAID" as const,
  total_amount: "20.00",
  created_at: "2026-09-09T12:00:00Z",
  queue_stage: "IN_PREPARATION" as const,
  items: [
    { id: 1, product_name: "Bahulu Original", quantity: 2 },
    { id: 2, product_name: "Bahulu Coklat", quantity: 1 },
  ],
  delivery: { id: 7, status: "PENDING" as const, recipient_name: "Fictional Customer", recipient_phone: "0000000000", address: "Fictional address", city: "Cameron Highlands", state: "Pahang", postal_code: "39000", country: "MY", courier: null, tracking_number: null, updated_at: "2026-09-09T12:00:00Z" },
};

describe("PackingOrderModal", () => {
  it("requires every item to be confirmed before dispatch", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PackingOrderModal opened order={order} mode="dispatch" onClose={vi.fn()} />);
    const dispatch = screen.getByRole("button", { name: "Mark as shipped" });
    expect(dispatch).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /Bahulu Original/i }));
    expect(dispatch).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /Bahulu Coklat/i }));
    expect(dispatch).toBeEnabled();
    expect(screen.getByText("Every item has been confirmed packed.")).toBeInTheDocument();
  });

  it("reviews item quantities before preparation starts", () => {
    renderWithProviders(<PackingOrderModal opened order={order} mode="prepare" onClose={vi.fn()} />);
    expect(screen.getByText("Bahulu Original")).toBeInTheDocument();
    expect(screen.getByText("× 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start preparation" })).toBeEnabled();
  });
});
