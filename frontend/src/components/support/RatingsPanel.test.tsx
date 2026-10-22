import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import RatingsPanel from "./RatingsPanel";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const API = "http://localhost:8000/api/support/ratings";
const summary = [
  { admin_id: 2, username: "aina", role: "STAFF", ratings: 4, average: 4.5, low: 0 },
  { admin_id: 3, username: "badrul", role: "MANAGER", ratings: 2, average: 2, low: 1 },
];
const rating = { id: 9, admin_id: 3, username: "badrul", score: 1, comment: "Took a long time to reply", flagged: true, rated_at: "2026-10-22T03:00:00Z", support_request_id: 4 };
const page = (items: unknown[]) => ({ items, page: 1, page_size: 20, total: items.length, total_pages: 1 });

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={client}><RatingsPanel role="OWNER" /></QueryClientProvider>, "/whatsapp");
}

describe("RatingsPanel", () => {
  it("shows each team member's average and the latest comments", async () => {
    server.use(
      http.get(`${API}/summary`, () => HttpResponse.json(summary)),
      http.get(API, () => HttpResponse.json(page([rating]))),
    );
    renderPanel();

    expect(await screen.findByText("aina")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(await screen.findByText("Took a long time to reply")).toBeInTheDocument();
    expect(screen.getByText("Low score")).toBeInTheDocument();
  });

  it("filters the list to one person and to low scores", async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/summary`, () => HttpResponse.json(summary)),
      http.get(API, ({ request }) => { seen.push(new URL(request.url).searchParams); return HttpResponse.json(page([])); }),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click((await screen.findAllByRole("button", { name: "View" }))[1]);
    await user.click(screen.getByRole("switch", { name: "Low scores only" }));
    await waitFor(() => expect(seen.at(-1)?.get("low_only")).toBe("true"));
    expect(seen.at(-1)?.get("admin_id")).toBe("3");
    expect(screen.getByText("Ratings for badrul")).toBeInTheDocument();
  });
});
