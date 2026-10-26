import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import api from "../api/axios";
import { server } from "../test/server";
import ProtectedRoute from "./ProtectedRoute";

vi.mock("./useAuth", () => ({ default: () => ({ isAuthenticated: false, loading: false }) }));

function LoginProbe() {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

describe("signed-out visits", () => {
  const original = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("goes to the login page with the requested page and no expiry notice", () => {
    render(<MemoryRouter initialEntries={["/orders?status=PENDING"]}><Routes><Route path="/login" element={<LoginProbe />} /><Route path="/orders" element={<ProtectedRoute><p>Orders</p></ProtectedRoute>} /></Routes></MemoryRouter>);
    expect(screen.getByText("/login?next=%2Forders%3Fstatus%3DPENDING")).toBeInTheDocument();
  });

  it("only reports an expired session when a signed-in request is refused", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { pathname: "/orders", search: "", assign } });
    server.use(
      http.get("http://localhost:8000/api/auth/me", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
      http.get("http://localhost:8000/api/orders", () => HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })),
    );

    await expect(api.get("/auth/me")).rejects.toThrow();
    expect(assign).not.toHaveBeenCalled();

    await expect(api.get("/orders")).rejects.toThrow();
    expect(assign).toHaveBeenCalledWith("/login?reason=session-expired&next=%2Forders");
  });
});
