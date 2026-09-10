import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import NotificationBell from "./NotificationBell";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

describe("NotificationBell", () => {
  it("combines live attention with saved notifications while retaining the unread count", async () => {
    server.use(
      http.get("http://localhost:8000/api/operations/alerts", () => HttpResponse.json({ items: [{ id: "stock-1", category: "INVENTORY", severity: "CRITICAL", title: "Out of stock", description: "Restock Bahulu", source_at: "2026-09-09T12:00:00Z", href: "/inventory" }], total: 1, limit: 3, offset: 0, counts: { total: 1, critical: 1, warning: 0 } })),
      http.get("http://localhost:8000/api/notifications/unread-count", () => HttpResponse.json({ unread_count: 2 })),
      http.get("http://localhost:8000/api/notifications", () => HttpResponse.json({ items: [], page: 1, page_size: 5, total: 0, total_pages: 0 })),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithProviders(<QueryClientProvider client={queryClient}><NotificationBell /></QueryClientProvider>);
    const button = await screen.findByRole("button", { name: /2 unread notifications and 1 item needing attention/i });
    expect(button).toHaveTextContent("2");
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });
});
