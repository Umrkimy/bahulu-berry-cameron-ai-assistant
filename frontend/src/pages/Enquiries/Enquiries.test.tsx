import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import Enquiries from "./Enquiries";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const workingEnquiry = {
  id: 7, title: "Delivery question", notes: "Customer wants an approved delivery answer.", source: "WHATSAPP", contact_name: "Aina", reply_contact: "0123456789", status: "WORKING",
  created_by_admin_id: 1, status_updated_by_admin_id: 1, status_updated_at: "2026-09-10T10:00:00Z", task_id: null, task: null,
  created_at: "2026-09-10T09:00:00Z", updated_at: "2026-09-10T10:00:00Z",
};

function renderPage(path = "/enquiries") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={client}><Enquiries /></QueryClientProvider>, path);
}

describe("Enquiries", () => {
  it("records an Owner-only enquiry with optional contact information", async () => {
    let received: unknown;
    server.use(
      http.get("http://localhost:8000/api/enquiries", () => HttpResponse.json([])),
      http.get("http://localhost:8000/api/enquiries/summary", () => HttpResponse.json({ NEW: 0, WORKING: 0, RESOLVED: 0, SPAM: 0 })),
      http.post("http://localhost:8000/api/enquiries", async ({ request }) => { received = await request.json(); return HttpResponse.json({ ...workingEnquiry, ...(received as object), id: 8, status: "NEW", status_updated_at: null, status_updated_by_admin_id: null }, { status: 201 }); }),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Record enquiry" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Short title/), { target: { value: "Question about a product" } });
    fireEvent.change(within(dialog).getByLabelText(/Contact name/), { target: { value: "Aina" } });
    fireEvent.change(within(dialog).getByLabelText(/Reply contact/), { target: { value: "0123456789" } });
    fireEvent.change(within(dialog).getByLabelText(/Private notes/), { target: { value: "Reply using only approved product information." } });
    await user.click(within(dialog).getByRole("button", { name: "Save enquiry" }));
    await waitFor(() => expect(received).toEqual({ title: "Question about a product", notes: "Reply using only approved product information.", source: "WHATSAPP", contact_name: "Aina", reply_contact: "0123456789" }));
  });

  it("only offers private task handoff for working enquiries", async () => {
    let handoff: unknown;
    server.use(
      http.get("http://localhost:8000/api/enquiries", ({ request }) => new URL(request.url).searchParams.get("status") === "SPAM" ? HttpResponse.json([]) : HttpResponse.json([workingEnquiry])),
      http.get("http://localhost:8000/api/enquiries/summary", () => HttpResponse.json({ NEW: 0, WORKING: 1, RESOLVED: 0, SPAM: 2 })),
      http.get("http://localhost:8000/api/team", () => HttpResponse.json([{ id: 3, username: "staff", email: "staff@example.test", role: "STAFF", is_active: true, is_superuser: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }])),
      http.post("http://localhost:8000/api/enquiries/7/task", async ({ request }) => { handoff = await request.json(); return HttpResponse.json({ ...workingEnquiry, task_id: 21, task: { id: 21, title: "Confirm delivery", description: "Use the approved information.", priority: "NORMAL", status: "OPEN", due_at: null, assigned_admin_id: 3, created_by_admin_id: 1, context_type: null, context_id: null, context_label: null, completion_note: null, completed_at: null, created_at: "2026-09-10T10:00:00Z", updated_at: "2026-09-10T10:00:00Z" } }, { status: 201 }); }),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Create task" }));
    fireEvent.change(await screen.findByLabelText(/Final instructions/), { target: { value: "Use the approved information." } });
    await user.click(await screen.findByRole("combobox", { name: "Assign to" }));
    await user.click(screen.getByText("staff"));
    await user.click(screen.getByRole("button", { name: "Create linked task" }));
    await waitFor(() => expect(handoff).toMatchObject({ title: "Delivery question", instructions: "Use the approved information.", assigned_admin_id: 3, priority: "NORMAL" }));
  });

  it("filters spam explicitly", async () => {
    server.use(
      http.get("http://localhost:8000/api/enquiries", ({ request }) => new URL(request.url).searchParams.get("status") === "SPAM" ? HttpResponse.json([]) : HttpResponse.json([workingEnquiry])),
      http.get("http://localhost:8000/api/enquiries/summary", () => HttpResponse.json({ NEW: 0, WORKING: 1, RESOLVED: 0, SPAM: 2 })),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("combobox", { name: "Status" }));
    const spamOption = screen.getAllByRole("option", { hidden: true }).find((option) => option.textContent === "Spam");
    expect(spamOption).toBeDefined();
    await user.click(spamOption!);
    await waitFor(() => expect(screen.getByText("No spam enquiries.")).toBeInTheDocument());
  });
});
