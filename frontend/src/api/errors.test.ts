import { describe, expect, it } from "vitest";
import { getApiError } from "./errors";

const failure = (detail: unknown, status = 400) => ({ isAxiosError: true, response: { status, data: { detail } } });

describe("safe API errors", () => {
  it("handles structured messages without field errors", () => {
    expect(getApiError(failure({ message: "Choose an active supplier." })).message).toBe("Choose an active supplier.");
  });
  it("maps legacy field errors and ignores malformed validation entries", () => {
    expect(getApiError(failure({ field: "reason", message: "Enter a reason." })).fieldErrors).toEqual({ reason: "Enter a reason." });
    expect(getApiError(failure([null, {}, { loc: ["body", "name"], msg: "Name is required." }])).fieldErrors).toEqual({ name: "Name is required." });
  });
  it("never shows server errors and tolerates malformed field mappings", () => {
    expect(getApiError(failure({ field_errors: "invalid" })).fieldErrors).toEqual({});
    expect(getApiError(failure("SQL secret", 500)).message).not.toContain("SQL");
  });
});
