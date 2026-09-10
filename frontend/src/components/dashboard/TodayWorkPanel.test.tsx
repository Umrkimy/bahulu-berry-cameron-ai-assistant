import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TodayWorkPanel from "./TodayWorkPanel";
import { renderWithProviders } from "../../test/render";

const tasksState = vi.hoisted(() => ({ data: undefined as unknown, isLoading: false, error: null as unknown }));

vi.mock("@tanstack/react-query", async (importOriginal) => ({ ...(await importOriginal<typeof import("@tanstack/react-query")>()), useQuery: () => tasksState }));

const dashboard = {
  customers: { total: 0 }, products: { total: 0 },
  orders: { total: 8, pending: 2, paid: 4, completed: 3, cancelled: 1 },
  sales: { revenue: "0", monthly_target: "0", monthly_revenue: "0", today_revenue: "0", progress: 0 },
  inventory: { total_items: 4, low_stock: 1, out_of_stock: 1 }, recent_orders: [], recent_products: [],
};

describe("TodayWorkPanel", () => {
  it("shows a Staff member only their work without duplicating live attention", () => {
    tasksState.data = [{ id: 1, title: "Pack order", priority: "HIGH", status: "OPEN", context_label: "Order #10" }];
    renderWithProviders(<TodayWorkPanel dashboard={dashboard} role="STAFF" />);
    expect(screen.getByText("My work")).toBeInTheDocument();
    expect(screen.queryByText("Team work")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs attention")).not.toBeInTheDocument();
    expect(screen.getByText("Pack order")).toBeInTheDocument();
  });

  it("shows the Owner team label and calm empty task state", () => {
    tasksState.data = [];
    renderWithProviders(<TodayWorkPanel dashboard={dashboard} role="OWNER" />);
    expect(screen.getByText("Team work")).toBeInTheDocument();
    expect(screen.getByText("No open tasks right now.")).toBeInTheDocument();
  });
});
