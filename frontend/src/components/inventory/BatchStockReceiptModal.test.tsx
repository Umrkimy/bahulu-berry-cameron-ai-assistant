import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import BatchStockReceiptModal from "./BatchStockReceiptModal";
import { renderWithProviders } from "../../test/render";

const receiptState = vi.hoisted(() => ({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({ received_count: 1, inventories: [] }) }));

vi.mock("../../hooks/useInventory", () => ({ useBatchStockReceipt: () => receiptState }));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: () => ({ data: [{ id: 5, name: "Fictional Supplier" }], isLoading: false }),
}));

const inventories = [
  { id: 1, product_id: 10, product_name: "Original Bahulu", product_category: "Bahulu", quantity: 4, low_stock_threshold: 2, created_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" },
  { id: 2, product_id: 11, product_name: "Strawberry Bahulu", product_category: "Bahulu", quantity: 3, low_stock_threshold: 2, created_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" },
];

async function choose(user: ReturnType<typeof userEvent.setup>, label: RegExp, option: string | RegExp) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(screen.getByText(option));
}

describe("BatchStockReceiptModal", () => {
  it("requires supplier, reference, and receipt lines before review", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BatchStockReceiptModal opened onClose={vi.fn()} inventories={inventories} />);
    await user.click(screen.getByRole("button", { name: "Review receipt" }));
    expect(screen.getByText("Choose the supplier for this receipt.")).toBeInTheDocument();
  });

  it("adds one product once, allows removal, and sends the reviewed receipt", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    receiptState.mutateAsync.mockClear();
    renderWithProviders(<BatchStockReceiptModal opened onClose={onClose} inventories={inventories} />);
    await choose(user, /Supplier/, "Fictional Supplier");
    await user.type(screen.getByPlaceholderText("e.g. DN-2026-001"), "DN-200");
    await choose(user, /Product/, /Original Bahulu/);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Original Bahulu")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Original Bahulu" }));
    expect(screen.queryByRole("button", { name: "Remove Original Bahulu" })).not.toBeInTheDocument();
    await choose(user, /Product/, /Original Bahulu/);
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Review receipt" }));
    expect(screen.getByText("Review stock receipt")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm receipt" }));
    expect(receiptState.mutateAsync).toHaveBeenCalledWith({ supplier_id: 5, reference: "DN-200", items: [{ inventory_id: 1, quantity: 1 }] });
  });
});
