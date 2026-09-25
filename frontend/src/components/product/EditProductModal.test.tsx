import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import EditProductModal from "./EditProductModal";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import type { Product } from "../../types/product";

it("keeps typed storefront values and the publish switch until save", async () => {
  let saved: Record<string, unknown> | undefined;
  server.use(
    http.get("http://localhost:8000/api/products/7/images", () => HttpResponse.json([])),
    http.patch("http://localhost:8000/api/products/7", async ({ request }) => { saved = await request.json() as Record<string, unknown>; return HttpResponse.json({ id: 7, ...saved }); }),
  );
  const product = { id: 7, name: "Fictional internal", description: "", price: "12.00", category: "", is_active: true, storefront_published: false, storefront_name_en: null, storefront_name_ms: null, storefront_description_en: null, storefront_description_ms: null } as Product;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const close = vi.fn();
  renderWithProviders(<QueryClientProvider client={client}><ModalsProvider><EditProductModal opened product={product} onClose={close} /></ModalsProvider></QueryClientProvider>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Storefront name — English"), "Fictional English");
  await user.type(screen.getByLabelText("Storefront name — Bahasa Melayu"), "Produk fiksyen");
  await user.click(screen.getByRole("switch", { name: /Publish on storefront/ }));
  expect(screen.getByLabelText("Storefront name — English")).toHaveValue("Fictional English");
  expect(screen.getByRole("switch", { name: /Publish on storefront/ })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(saved).toMatchObject({ storefront_name_en: "Fictional English", storefront_name_ms: "Produk fiksyen", storefront_published: true, price: 12 });
});
