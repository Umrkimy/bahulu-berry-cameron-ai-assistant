import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

describe("password reset screens", () => {
  it("submits a reset request and shows the account-enumeration-safe response", async () => {
    server.use(http.post("http://localhost:8000/api/auth/password-reset/request", async ({ request }) => {
      expect(await request.json()).toEqual({ email: "owner@example.test" });
      return HttpResponse.json({ message: "If an active account matches that email, a secure reset link has been sent." });
    }));
    const user = userEvent.setup();
    renderWithProviders(<ForgotPassword />, "/forgot-password");

    await user.type(screen.getByRole("textbox", { name: /email/i }), "owner@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent("If an active account matches that email");
  });

  it("explains when the reset link is missing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPassword />, "/reset-password");

    await user.type(screen.getByLabelText(/^new password \*$/i), "new-password");
    await user.type(screen.getByLabelText(/^confirm new password \*$/i), "new-password");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(screen.getByRole("alert")).toHaveTextContent("This password link is invalid or incomplete.");
  });

  it("submits a valid new password and prevents a second submission", async () => {
    let requests = 0;
    server.use(http.post("http://localhost:8000/api/auth/password-reset/confirm", async ({ request }) => {
      requests += 1;
      expect(await request.json()).toEqual({ token: "a-valid-reset-token-that-is-long-enough", password: "new-password" });
      return HttpResponse.json({ message: "Your password has been reset. Please sign in with your new password." });
    }));
    const user = userEvent.setup();
    renderWithProviders(<ResetPassword />, "/reset-password?token=a-valid-reset-token-that-is-long-enough");

    await user.type(screen.getByLabelText(/^new password \*$/i), "new-password");
    await user.type(screen.getByLabelText(/^confirm new password \*$/i), "new-password");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Your password has been reset");
    expect(requests).toBe(1);
    expect(screen.getByRole("button", { name: "Reset password" })).toBeDisabled();
  });
});
