import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import Activity from "./Activity";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const firstItem = { id: 9, admin_id: 2, admin_username: "haiqal", action: "stock_moved", entity_type: "inventory", entity_id: 4, description: "Recorded supplier receipt for Bahulu.", metadata_json: null, created_at: "2026-09-10T10:00:00Z" };
const secondItem = { id: 8, admin_id: null, admin_username: null, action: "paid", entity_type: "payment", entity_id: 5, description: "Payment confirmed.", metadata_json: null, created_at: "2026-09-10T09:00:00Z" };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={client}><Activity /></QueryClientProvider>, "/activity");
}

describe("Activity", () => {
  it("shows readable actor/action details and loads the next audit page", async () => {
    server.use(
      http.get("http://localhost:8000/api/team", () => HttpResponse.json([])),
      http.get("http://localhost:8000/api/activity", ({ request }) => new URL(request.url).searchParams.get("offset") === "1" ? HttpResponse.json({ items: [secondItem], total: 2 }) : HttpResponse.json({ items: [firstItem], total: 2 })),
    );
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText("Recorded supplier receipt for Bahulu.")).toBeInTheDocument();
    expect(screen.getAllByText("Stock Moved").length).toBeGreaterThan(0);
    expect(screen.getByText(/haiqal/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Payment confirmed.")).toBeInTheDocument();
    expect(screen.getByText(/System/)).toBeInTheDocument();
  });

  it("offers a retry action when the audit request fails", async () => {
    let attempts = 0;
    server.use(
      http.get("http://localhost:8000/api/team", () => HttpResponse.json([])),
      http.get("http://localhost:8000/api/activity", () => { attempts += 1; return attempts === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json({ items: [], total: 0 }); }),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("No activity matches these filters.")).toBeInTheDocument());
  });
});
