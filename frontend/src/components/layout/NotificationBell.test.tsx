import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("opens the updates menu with the keyboard", async () => {
    let historyRequests = 0;
    server.use(
      http.get("http://localhost:8000/api/operations/alerts", () => HttpResponse.json({ items: [], total: 0, limit: 3, offset: 0, counts: { total: 0, critical: 0, warning: 0 } })),
      http.get("http://localhost:8000/api/notifications/unread-count", () => HttpResponse.json({ unread_count: 0 })),
      http.get("http://localhost:8000/api/notifications", () => { historyRequests += 1; return HttpResponse.json({ items: [], page: 1, page_size: 5, total: 0, total_pages: 0 }); }),
    );
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithProviders(<QueryClientProvider client={queryClient}><NotificationBell /></QueryClientProvider>);
    const button = await screen.findByRole("button", { name: "Open updates" });
    expect(historyRequests).toBe(0);
    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(historyRequests).toBe(1));
  });

  it("keeps the layout usable when an unexpected empty response reaches the updates endpoints", async () => {
    server.use(
      http.get("http://localhost:8000/api/operations/alerts", () => HttpResponse.json([])),
      http.get("http://localhost:8000/api/notifications/unread-count", () => HttpResponse.json({ unread_count: 0 })),
      http.get("http://localhost:8000/api/notifications", () => HttpResponse.json([])),
    );
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithProviders(<QueryClientProvider client={queryClient}><NotificationBell /></QueryClientProvider>);
    const button = await screen.findByRole("button", { name: "Open updates" });
    await user.click(button);
    expect(await screen.findByText("No live operational issues.")).toBeInTheDocument();
    expect(await screen.findByText("You are all caught up.")).toBeInTheDocument();
  });
});
