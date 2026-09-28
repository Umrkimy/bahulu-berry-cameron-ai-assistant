import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MediaLibrary from "./MediaLibrary";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const auth = vi.hoisted(() => ({ role: "OWNER" }));
vi.mock("../../auth/useAuth", () => ({ default: () => ({ admin: { role: auth.role } }) }));

const asset = {
  id: 4, title: "Approved packet photo", note: "Front of packet", mime_type: "image/webp",
  width: 900, height: 1200, byte_size: 220000, is_archived: false,
  created_at: "2026-09-28T10:00:00Z", updated_at: "2026-09-28T10:00:00Z",
  usage_count: 1, usages: [{ product_id: 7, product_name: "Fictional Bahulu", placement_id: 9, position: 0 }],
  content_path: "/api/media/4/content", was_reused: false,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={client}><MediaLibrary /></QueryClientProvider>, "/media");
}

describe("MediaLibrary", () => {
  beforeEach(() => { auth.role = "OWNER"; });

  it("shows reusable media details and saves internal metadata", async () => {
    let update: unknown;
    server.use(
      http.get("http://localhost:8000/api/media", () => HttpResponse.json({ items: [asset], page: 1, page_size: 24, total: 1, pages: 1 })),
      http.get("http://localhost:8000/api/media/4/content", () => new HttpResponse(null, { status: 200, headers: { "Content-Type": "image/webp" } })),
      http.patch("http://localhost:8000/api/media/4", async ({ request }) => { update = await request.json(); return HttpResponse.json({ ...asset, ...(update as object) }); }),
    );
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText("Approved packet photo")).toBeInTheDocument();
    expect(screen.getByText("Used by 1 product")).toBeInTheDocument();
    expect(screen.getByText("Fictional Bahulu")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit Approved packet photo" }));
    const dialog = await screen.findByRole("dialog");
    const title = within(dialog).getByRole("textbox", { name: "Internal title" });
    await user.clear(title); await user.type(title, "Updated packet photo");
    await user.click(within(dialog).getByRole("button", { name: "Save details" }));
    expect(update).toEqual({ title: "Updated packet photo", note: "Front of packet" });
  });

  it("gives Staff a read-only library", async () => {
    auth.role = "STAFF";
    server.use(
      http.get("http://localhost:8000/api/media", () => HttpResponse.json({ items: [asset], page: 1, page_size: 24, total: 1, pages: 1 })),
      http.get("http://localhost:8000/api/media/4/content", () => new HttpResponse(null, { status: 200, headers: { "Content-Type": "image/webp" } })),
    );
    renderPage();
    expect(await screen.findByText("Read-only access")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload photos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Approved packet photo" })).not.toBeInTheDocument();
  });
});
