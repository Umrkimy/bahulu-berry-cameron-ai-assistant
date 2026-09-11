import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AppNavbar from "./AppNavbar";
import { renderWithProviders } from "../../test/render";

vi.mock("../../auth/useAuth", () => ({
  default: () => ({ admin: { username: "umar", role: "OWNER" }, logout: vi.fn() }),
}));

vi.mock("./NotificationBell", () => ({
  default: () => <button type="button" aria-label="Open updates" />,
}));

describe("AppNavbar mobile controls", () => {
  it("keeps search, updates, and account controls together in the compact action group", () => {
    renderWithProviders(<AppNavbar mobileOpened={false} onToggleNavigation={vi.fn()} />);

    const actions = document.querySelector(".header-actions");
    expect(actions).not.toBeNull();
    expect(actions).toContainElement(screen.getByRole("button", { name: "Open quick search" }));
    expect(actions).toContainElement(screen.getByRole("button", { name: "Open updates" }));
    expect(actions).toContainElement(screen.getByRole("button", { name: "Open account menu" }));
  });
});
