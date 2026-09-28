import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import DraftReviewQueue from "./DraftReviewQueue";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const API = "http://localhost:8000/api/support/drafts";
const pendingDraft = {
  id: 5, support_request_id: null, conversation_id: 2, language: "EN",
  customer_message: "Can I pick up tomorrow?", body: "Pickup details are confirmed by our support team.", edited_body: null,
  sources: [{ type: "FAQ", id: 1, label: "What are your pickup options?", similarity: null }],
  status: "PENDING_REVIEW", reviewed_by_admin_id: null, reviewed_at: null, created_at: "2026-09-29T02:00:00Z", whatsapp_available: true,
};
const page = (items: unknown[]) => ({ items, page: 1, page_size: 50, total: items.length, total_pages: 1 });

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={client}><DraftReviewQueue /></QueryClientProvider>, "/whatsapp");
}

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

afterEach(() => vi.restoreAllMocks());

describe("DraftReviewQueue", () => {
  it("shows the customer message, suggested reply and cited sources", async () => {
    server.use(http.get(API, () => HttpResponse.json(page([pendingDraft]))));
    renderQueue();
    expect(await screen.findByText("Can I pick up tomorrow?")).toBeInTheDocument();
    expect(screen.getByText("Pickup details are confirmed by our support team.")).toBeInTheDocument();
    expect(screen.getByText(/What are your pickup options\? \(faq\)/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing is sent automatically/)).toBeInTheDocument();
  });

  it("approves, copies the reply and offers a prefilled WhatsApp link", async () => {
    let body: unknown;
    let pending = [pendingDraft];
    const url = "https://wa.me/60123456789?text=Pickup%20details";
    server.use(
      http.get(API, () => HttpResponse.json(page(pending))),
      http.post(`${API}/5/approve`, async ({ request }) => {
        body = await request.json();
        pending = [];
        return HttpResponse.json({ draft: { ...pendingDraft, status: "APPROVED" }, text: pendingDraft.body, whatsapp_url: url });
      }),
    );
    const user = userEvent.setup();
    const writeText = mockClipboard();
    renderQueue();
    await user.click(await screen.findByRole("button", { name: "Approve and copy" }));
    await waitFor(() => expect(body).toEqual({}));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(pendingDraft.body));
    expect(await screen.findByRole("link", { name: "Open in WhatsApp" })).toHaveAttribute("href", url);
    expect(await screen.findByText("No drafts are waiting for review.")).toBeInTheDocument();
  });

  it("sends the edited reply when staff change it", async () => {
    let body: unknown;
    server.use(
      http.get(API, () => HttpResponse.json(page([pendingDraft]))),
      http.post(`${API}/5/approve`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ draft: { ...pendingDraft, status: "EDITED_APPROVED" }, text: "Yes, our team will confirm pickup.", whatsapp_url: null });
      }),
    );
    const user = userEvent.setup();
    mockClipboard();
    renderQueue();
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Edit reply"), { target: { value: "  Yes, our team will confirm pickup.  " } });
    await user.click(screen.getByRole("button", { name: "Approve and copy" }));
    await waitFor(() => expect(body).toEqual({ edited_body: "Yes, our team will confirm pickup." }));
    expect(await screen.findByText(/No WhatsApp number on file/)).toBeInTheDocument();
  });

  it("asks for confirmation before rejecting", async () => {
    let rejected = false;
    server.use(
      http.get(API, () => HttpResponse.json(page(rejected ? [] : [pendingDraft]))),
      http.post(`${API}/5/reject`, () => { rejected = true; return HttpResponse.json({ ...pendingDraft, status: "REJECTED" }); }),
    );
    const user = userEvent.setup();
    renderQueue();
    await user.click(await screen.findByRole("button", { name: "Reject" }));
    expect(rejected).toBe(false);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Reject draft" }));
    await waitFor(() => expect(rejected).toBe(true));
    expect(await screen.findByText("No drafts are waiting for review.")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    server.use(http.get(API, () => HttpResponse.json(page([]))));
    renderQueue();
    expect(await screen.findByText("No drafts are waiting for review.")).toBeInTheDocument();
  });
});
