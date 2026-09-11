import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { theme } from "../../theme";
import AppLayout from "./AppLayout";

vi.mock("./AppNavbar", () => ({ default: () => <div>Navigation bar</div> }));
vi.mock("./AppSidebar", () => ({ default: () => <div>Sidebar</div> }));
vi.mock("./CommandPalette", () => ({ default: () => null }));
vi.mock("../common/motion/PageReveal", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

function Dashboard() {
  return <><h1>Dashboard</h1><Link to="/inventory">Go to inventory</Link></>;
}

function Inventory() {
  return <h1>Inventory</h1>;
}

describe("AppLayout accessibility", () => {
  it("provides a skip link and labelled main workspace", () => {
    render(<MantineProvider theme={theme}><MemoryRouter initialEntries={["/dashboard"]}><Routes><Route element={<AppLayout />}><Route path="/dashboard" element={<Dashboard />} /></Route></Routes></MemoryRouter></MantineProvider>);
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main", { name: "Admin workspace" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus to main content after an in-app navigation", async () => {
    render(<MantineProvider theme={theme}><MemoryRouter initialEntries={["/dashboard"]}><Routes><Route element={<AppLayout />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/inventory" element={<Inventory />} /></Route></Routes></MemoryRouter></MantineProvider>);
    fireEvent.click(screen.getByRole("link", { name: "Go to inventory" }));
    const main = screen.getByRole("main", { name: "Admin workspace" });
    await waitFor(() => expect(main).toHaveFocus());
  });
});
