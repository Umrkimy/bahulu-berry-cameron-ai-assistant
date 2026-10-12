import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import ProductImportModal from "./ProductImportModal";
import api from "../../api/axios";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={queryClient}><ModalsProvider><ProductImportModal opened onClose={() => undefined} /></ModalsProvider></QueryClientProvider>);
}

function fileInput() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("CSV file input was not rendered.");
  return input;
}

describe("ProductImportModal", () => {
  it("shows row errors and prevents confirmation when a CSV cannot be imported", async () => {
    server.use(http.post("http://localhost:8000/api/products/import/preview", async ({ request }) => {
      // jsdom's File cannot be streamed by Node's fetch, so the form itself is
      // checked through the spy below rather than by reading the body here.
      expect(request.headers.get("content-type")).toMatch(/^multipart\/form-data/);
      return HttpResponse.json({ rows: [], errors: [{ row_number: 2, field: "price_myr", message: "Price must be greater than zero." }], can_import: false });
    }));
    const post = vi.spyOn(api, "post");
    const user = userEvent.setup();
    renderModal();

    await user.upload(fileInput(), new File(["name\n"], "products.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: "Preview CSV" }));

    expect(await screen.findByText("Row 2 (price_myr): Price must be greater than zero.")).toBeVisible();
    const sent = post.mock.calls[0][1] as FormData;
    expect((sent.get("file") as File).name).toBe("products.csv");
    post.mockRestore();
    expect(screen.getByRole("button", { name: "Confirm import" })).toBeDisabled();
  });

  it("shows valid rows before the explicit confirmation step", async () => {
    server.use(http.post("http://localhost:8000/api/products/import/preview", () => HttpResponse.json({ rows: [{ row_number: 2, name: "Original Bahulu", category: "Bahulu", description: null, price_myr: "12.50", opening_stock: 24, low_stock_threshold: 10 }], errors: [], can_import: true })));
    const user = userEvent.setup();
    renderModal();

    await user.upload(fileInput(), new File(["name\n"], "products.csv", { type: "text/csv" }));
    await user.click(screen.getByRole("button", { name: "Preview CSV" }));

    expect(await screen.findByText("Original Bahulu")).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm import" })).toBeEnabled();
  });
});
