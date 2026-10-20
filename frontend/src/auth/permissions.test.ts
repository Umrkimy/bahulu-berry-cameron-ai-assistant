import { describe, expect, it } from "vitest";

import { can, isOwner, roleLabels } from "./permissions";

describe("role permissions", () => {
  it("gives Managers day-to-day control but keeps Owner-only areas closed", () => {
    const manager = { role: "MANAGER" as const };
    expect(can(manager, "tasks.manage")).toBe(true);
    expect(can(manager, "products.manage")).toBe(true);
    expect(can(manager, "reports.view")).toBe(true);
    expect(isOwner(manager)).toBe(false);
    expect(roleLabels[manager.role]).toBe("Manager");
  });

  it("lets Staff view and update enquiries only", () => {
    const staff = { role: "STAFF" as const };
    expect(can(staff, "enquiries.view")).toBe(true);
    expect(can(staff, "enquiries.update")).toBe(true);
    expect(can(staff, "enquiries.manage")).toBe(false);
    expect(can(staff, "tasks.manage")).toBe(false);
    expect(can(staff, "orders.cancel")).toBe(false);
    expect(can(null, "enquiries.view")).toBe(false);
  });
});
