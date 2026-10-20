import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import OrdersTable from "./OrdersTable";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

vi.mock("../../auth/useAuth", () => ({ default: () => ({ admin: { role: "OWNER" } }) }));

const order = { id: 7, customer_id: 3, status: "PROCESSING", payment_status: "PAID", source: "STOREFRONT", subtotal: "26.00", discount_amount: "0.00", total_amount: "26.00", created_at: "2026-10-20T07:13:00Z", updated_at: "2026-10-20T07:13:00Z", items: [{ product_name: "Fictional Bahulu", quantity: 2 }, { product_name: "Fictional Kek", quantity: 1 }] };

describe("OrdersTable", () => {
  it("shows what each order contains", async () => {
    server.use(
      http.get("http://localhost:8000/api/orders", () => HttpResponse.json([order])),
      http.get("http://localhost:8000/api/customers", () => HttpResponse.json([{ id: 3, full_name: "Fictional Pembeli" }])),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithProviders(<QueryClientProvider client={client}><OrdersTable /></QueryClientProvider>, "/orders");
    expect((await screen.findAllByText("2 × Fictional Bahulu, 1 × Fictional Kek")).length).toBeGreaterThan(0);
  });
});
