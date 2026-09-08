import { http, HttpResponse } from "msw";
import { expect, describe, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Updates from "./Updates";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const notification = {
  id: 7,
  notification_type: "INVENTORY" as const,
  title: "Restock needed",
  description: "Fictional stock is low.",
  route: "/inventory",
  entity_type: "inventory",
  entity_id: 2,
  read_at: null,
  created_at: "2026-09-08T09:00:00Z",
};

function renderUpdates() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={queryClient}><Updates /></QueryClientProvider>, "/updates");
}

describe("Updates", () => {
  it("keeps live attention items separate from saved notification history", async () => {
    server.use(
      http.get("http://localhost:8000/api/operations/alerts", () => HttpResponse.json({
        items: [{ id: "inventory-2", category: "INVENTORY", severity: "CRITICAL", title: "Fictional product is out of stock", description: "Stock is empty.", source_at: "2026-09-08T09:00:00Z", href: "/inventory" }],
        total: 1,
        limit: 100,
        offset: 0,
        counts: { total: 1, critical: 1, warning: 0 },
      })),
      http.get("http://localhost:8000/api/notifications", () => HttpResponse.json({ items: [notification], page: 1, page_size: 20, total: 1, total_pages: 1 })),
    );

    renderUpdates();

    expect(screen.getByText("Needs attention")).toBeVisible();
    expect(await screen.findByText("Fictional product is out of stock")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/inventory");
    expect(await screen.findByText("Notification history")).toBeVisible();
    expect(screen.getAllByText("Restock needed")[0]).toBeVisible();
  });

  it("marks a notification read before opening its related work", async () => {
    let markedRead = false;
    server.use(
      http.get("http://localhost:8000/api/operations/alerts", () => HttpResponse.json({ items: [], total: 0, limit: 100, offset: 0, counts: { total: 0, critical: 0, warning: 0 } })),
      http.get("http://localhost:8000/api/notifications", () => HttpResponse.json({ items: [notification], page: 1, page_size: 20, total: 1, total_pages: 1 })),
      http.patch("http://localhost:8000/api/notifications/7/read", () => { markedRead = true; return HttpResponse.json({ ...notification, read_at: "2026-09-08T10:00:00Z" }); }),
    );
    const user = userEvent.setup();
    renderUpdates();

    await screen.findAllByText("Restock needed");
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);

    await waitFor(() => expect(markedRead).toBe(true));
  });
});
