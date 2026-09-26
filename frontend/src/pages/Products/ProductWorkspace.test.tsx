import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProductWorkspace from "./ProductWorkspace";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const auth = vi.hoisted(() => ({ role: "OWNER" }));
vi.mock("../../auth/useAuth", () => ({ default: () => ({ admin: { role: auth.role } }) }));

const product = {
  id: 7,
  name: "Approved English product",
  description: "Approved English description",
  price: "12.00",
  image_path: "/api/storefront/products/7/images/1/content",
  images: [{ id: 1, image_path: "/api/products/7/images/1/content", position: 0 }],
  category: "Bahulu",
  inventory: { id: 1, product_id: 7, quantity: 4, low_stock_threshold: 1 },
  is_active: true,
  storefront_published: false,
  name_ms: null,
  description_ms: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  active_discount: null,
  active_discounts: [],
};

function renderWorkspace(route = "/products/7/storefront") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Routes><Route path="/products/:productId/*" element={<ProductWorkspace />} /></Routes>
      </ModalsProvider>
    </QueryClientProvider>,
    route,
  );
}

function renderCreateWorkspace() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <ModalsProvider>
        <Routes><Route path="/products/new" element={<ProductWorkspace />} /></Routes>
      </ModalsProvider>
    </QueryClientProvider>,
    "/products/new",
  );
}

function installHandlers(onPatch?: (body: Record<string, unknown>) => void) {
  server.use(
    http.get("http://localhost:8000/api/products/7", () => HttpResponse.json(product)),
    http.get("http://localhost:8000/api/discounts", () => HttpResponse.json([])),
    http.get("http://localhost:8000/api/storefront/featured", () => HttpResponse.json(null)),
    http.patch("http://localhost:8000/api/products/7", async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      onPatch?.(body);
      return HttpResponse.json({ ...product, ...body, updated_at: "2026-01-02T00:00:00Z" });
    }),
  );
}

afterEach(() => { auth.role = "OWNER"; });

describe("ProductWorkspace", () => {
  it("opens the explicit new-product route in creation mode", () => {
    renderCreateWorkspace();

    expect(screen.getByRole("heading", { name: "Add product" })).toBeVisible();
    expect(screen.getByLabelText(/Product name.*English/)).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create product" })).toBeVisible();
  });

  it("uses canonical product details as English and saves only the Malay translation", async () => {
    let saved: Record<string, unknown> | undefined;
    installHandlers((body) => { saved = body; });
    const user = userEvent.setup();
    renderWorkspace();

    expect(await screen.findByRole("heading", { name: "Approved English product" })).toBeVisible();
    expect(screen.getByText("Approved English description")).toBeVisible();
    expect(screen.queryByLabelText(/Product name.*English/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Product name.*Bahasa Melayu/), "Produk diluluskan");
    await user.type(screen.getByLabelText(/Description.*Bahasa Melayu/), "Penerangan diluluskan");
    await user.click(screen.getByRole("switch", { name: /Published online/ }));
    await user.click(screen.getByRole("button", { name: "Save storefront" }));

    await waitFor(() => expect(saved).toEqual({
      name_ms: "Produk diluluskan",
      description_ms: "Penerangan diluluskan",
      storefront_published: true,
    }));
    expect(saved).not.toHaveProperty("name");
    expect(saved).not.toHaveProperty("description");
  });

  it("gives Staff read-only product tabs", async () => {
    auth.role = "STAFF";
    installHandlers();
    renderWorkspace();

    expect(await screen.findByText("Read-only access")).toBeVisible();
    expect(await screen.findByLabelText(/Product name.*Bahasa Melayu/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save storefront" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Feature on homepage" })).toBeDisabled();
  });
});
