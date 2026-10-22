import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import WhatsAppInbox from "./WhatsAppInbox";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const API = "http://localhost:8000/api/support";
const page = (items: unknown[]) => ({ items, page: 1, page_size: 50, total: items.length, total_pages: 1 });
const waiting = {
  id: 7, provider: "SIMULATOR", contact_reference: "60100000002", language: "EN", support_request_id: 3,
  handoff_state: "HUMAN_REQUESTED", assigned_admin_id: null, last_message: "I want 3 boxes for Saturday",
  last_direction: "INBOUND", last_at: "2026-10-22T02:00:00Z", pending_drafts: 0,
};
const messages = [
  { id: 1, direction: "INBOUND", outcome: "MENU", content: "5", author_admin_id: null, processed_at: "2026-10-22T01:59:00Z", expires_at: null },
  { id: 2, direction: "OUTBOUND", outcome: "AUTO_REPLY", content: "Thanks! Our staff will reply here as soon as they can.", author_admin_id: null, processed_at: "2026-10-22T01:59:01Z", expires_at: null },
  { id: 3, direction: "INBOUND", outcome: "HANDOFF", content: "I want 3 boxes for Saturday", author_admin_id: null, processed_at: "2026-10-22T02:00:00Z", expires_at: null },
];

function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={client}><WhatsAppInbox currentAdmin={{ id: 9, role: "STAFF" }} names={new Map()} /></QueryClientProvider>, "/whatsapp");
}

describe("WhatsAppInbox", () => {
  it("lists chats that need staff and shows the thread with Berry's replies", async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get(`${API}/conversations`, ({ request }) => { params = new URL(request.url).searchParams; return HttpResponse.json(page([waiting])); }),
      http.get(`${API}/conversations/7/messages`, () => HttpResponse.json(messages)),
      http.get(`${API}/drafts`, () => HttpResponse.json(page([]))),
    );
    const user = userEvent.setup();
    renderInbox();

    await user.click(await screen.findByText("+60100000002"));
    expect(params?.get("needs_attention")).toBe("true");
    expect(await screen.findByText("Thanks! Our staff will reply here as soon as they can.")).toBeInTheDocument();
    expect(screen.getAllByText(/Berry \(automatic\)/)).toHaveLength(1);
    expect(screen.getAllByText("Waiting for staff").length).toBeGreaterThan(0);
  });

  it("shows whether each reply was delivered", async () => {
    server.use(
      http.get(`${API}/conversations`, () => HttpResponse.json(page([waiting]))),
      http.get(`${API}/conversations/7/messages`, () => HttpResponse.json([
        { ...messages[1], id: 4, outcome: "READ" },
        { ...messages[1], id: 5, outcome: "SEND_FAILED", delivery_error: "131031 Business Account locked" },
      ])),
      http.get(`${API}/drafts`, () => HttpResponse.json(page([]))),
    );
    const user = userEvent.setup();
    renderInbox();

    await user.click(await screen.findByText("+60100000002"));
    expect(await screen.findByText("Read")).toBeInTheDocument();
    expect(screen.getByText(/Not delivered \(131031 Business Account locked\)/)).toBeInTheDocument();
  });

  it("lets staff take a waiting chat", async () => {
    let claimed = false;
    server.use(
      http.get(`${API}/conversations`, () => HttpResponse.json(page([waiting]))),
      http.get(`${API}/conversations/7/messages`, () => HttpResponse.json(messages)),
      http.get(`${API}/drafts`, () => HttpResponse.json(page([]))),
      http.post(`${API}/requests/3/claim`, () => { claimed = true; return HttpResponse.json({}); }),
    );
    const user = userEvent.setup();
    renderInbox();

    await user.click(await screen.findByText("+60100000002"));
    await user.click(await screen.findByRole("button", { name: "Take this chat" }));
    await waitFor(() => expect(claimed).toBe(true));
  });

  it("says when nothing needs staff", async () => {
    server.use(
      http.get(`${API}/conversations`, () => HttpResponse.json(page([]))),
      http.get(`${API}/drafts`, () => HttpResponse.json(page([]))),
    );
    renderInbox();
    expect(await screen.findByText(/Nothing needs you right now/)).toBeInTheDocument();
  });
});
