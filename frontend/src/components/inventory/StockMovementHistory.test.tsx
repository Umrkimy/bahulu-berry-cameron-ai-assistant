import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StockMovementHistory from "./StockMovementHistory";
import { renderWithProviders } from "../../test/render";

const movementState = vi.hoisted(() => ({
  data: {
    total: 2,
    page: 1,
    page_size: 20,
    total_pages: 1,
    items: [
      { id: 1, inventory_id: 1, product_id: 1, product_name: "Fictional Bahulu Pack", supplier_id: 2, supplier_name: "Fictional Supplier", admin_name: "receipt-staff", movement_type: "SUPPLIER_RECEIPT", quantity_change: 5, quantity_before: 2, quantity_after: 7, reason: null, reference: "DN-100", source_type: null, source_id: null, created_at: "2026-09-28T02:00:00Z" },
      { id: 2, inventory_id: 1, product_id: 1, product_name: "Fictional Bahulu Pack", supplier_id: null, supplier_name: null, admin_name: null, movement_type: "ORDER_DEDUCTION", quantity_change: -1, quantity_before: 7, quantity_after: 6, reason: "Stock deducted for order.", reference: null, source_type: "ORDER", source_id: 42, created_at: "2026-09-28T03:00:00Z" },
    ],
  },
  isLoading: false,
}));

vi.mock("../../hooks/useInventory", () => ({ useStockMovements: () => movementState }));

describe("StockMovementHistory", () => {
  it("shows the staff recorder and automated order source", () => {
    renderWithProviders(<StockMovementHistory />);

    expect(screen.getByText("Recorded by receipt-staff")).toBeInTheDocument();
    expect(screen.getByText("Recorded automatically · order #42")).toBeInTheDocument();
    expect(screen.getByText(/Reference: DN-100/)).toBeInTheDocument();
  });
});
