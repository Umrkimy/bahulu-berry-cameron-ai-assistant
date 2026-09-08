import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

import Settings from "./Settings";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={queryClient}><Settings /></QueryClientProvider>, "/settings");
}

describe("Settings", () => {
  it("shows a temporary admin-only brand preview and safe email readiness", async () => {
    server.use(
      http.get("http://localhost:8000/api/settings/email-status", () => HttpResponse.json({ mode: "delivery", delivery_enabled: true, sender: "Bahulu Berry Cameron <admin@example.test>", reset_link_expiry_minutes: 30 })),
      http.get("http://localhost:8000/api/team", () => HttpResponse.json([])),
    );
    renderSettings();

    expect(screen.getByRole("img", { name: /temporary brand preview/i })).toHaveAttribute("src", "/logo.jpeg");
    expect(await screen.findByText("Delivery enabled")).toBeVisible();
    expect(screen.getByText("Bahulu Berry Cameron <admin@example.test>")).toBeVisible();
    expect(screen.getByText("30 minutes")).toBeVisible();
  });

  it("selects an active account and requests confirmation before sending a reset link", async () => {
    let resetRequested = false;
    server.use(
      http.get("http://localhost:8000/api/settings/email-status", () => HttpResponse.json({ mode: "test", delivery_enabled: false, sender: null, reset_link_expiry_minutes: 30 })),
      http.get("http://localhost:8000/api/team", () => HttpResponse.json([{ id: 4, username: "staff", email: "staff@example.test", role: "STAFF", is_active: true, is_superuser: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }])),
      http.post("http://localhost:8000/api/settings/password-reset/4", () => { resetRequested = true; return HttpResponse.json({ message: "A secure reset link has been requested for the selected account." }, { status: 202 }); }),
    );
    const confirmation = vi.spyOn(modals, "openConfirmModal");
    const success = vi.spyOn(notifications, "show");
    const user = userEvent.setup();
    renderSettings();

    await user.click(await screen.findByRole("combobox", { name: "Active team member" }));
    await user.click(screen.getByText("staff — staff@example.test"));
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(confirmation).toHaveBeenCalledWith(expect.objectContaining({ title: "Send secure reset link?" }));
    confirmation.mock.calls[0][0].onConfirm?.();
    await waitFor(() => expect(resetRequested).toBe(true));
    expect(success).toHaveBeenCalledWith(expect.objectContaining({ title: "Reset link requested" }));
    confirmation.mockRestore();
    success.mockRestore();
  });
});
