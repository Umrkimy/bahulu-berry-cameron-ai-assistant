import axios from "axios";

export interface ApiError {
  message: string;
  fieldErrors: Record<string, string>;
  status?: number;
  retryAfterSeconds?: number;
}

type ValidationDetail = {
  loc?: Array<string | number>;
  msg?: string;
};

function getValidationErrors(detail: unknown): Record<string, string> {
  if (!Array.isArray(detail)) {
    return {};
  }

  return detail.reduce<Record<string, string>>((errors, item: ValidationDetail) => {
    if (!item || typeof item !== "object" || !Array.isArray(item.loc)) return errors;
    const field = item.loc?.at(-1);
    if (typeof field === "string" && item.msg && !errors[field]) {
      errors[field] = item.msg;
    }
    return errors;
  }, {});
}

export function getApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { message: "We couldn't complete that action. Please try again.", fieldErrors: {} };
  }

  if (!error.response) {
    return { message: "Can't reach the dashboard server. Check your connection and try again.", fieldErrors: {} };
  }

  const { status, data } = error.response;
  const detail = data?.detail;
  const retryAfterHeader = (error.response.headers as Record<string, unknown> | undefined)?.["retry-after"];
  const retryAfter = Number(typeof detail === "object" && detail !== null ? detail.retry_after_seconds ?? retryAfterHeader : retryAfterHeader);
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined;

  if (status === 429) {
    return {
      message: retryAfterSeconds ? `Too many requests. Try again in ${retryAfterSeconds} seconds.` : "Too many requests. Please wait a moment and try again.",
      fieldErrors: {},
      status,
      retryAfterSeconds,
    };
  }

  if (status === 401) {
    return { message: window.location.pathname === "/login" ? "Invalid email or password." : "Your session has expired. Please sign in again.", fieldErrors: {}, status };
  }
  if (status === 403) {
    return { message: "You don't have permission to do this.", fieldErrors: {}, status };
  }
  if (status === 404) {
    return { message: "This record is no longer available. Refresh and try again.", fieldErrors: {} };
  }
  if (status >= 500) {
    return { message: "Something went wrong on our side. No changes were saved. Please try again.", fieldErrors: {} };
  }

  const validationFieldErrors = getValidationErrors(detail);
  const detailFieldErrors =
    detail && typeof detail === "object" && !Array.isArray(detail)
      ? detail.field_errors ?? {}
      : {};
  const fieldErrors = Object.keys(validationFieldErrors).length > 0
    ? validationFieldErrors
    : Object.fromEntries(Object.entries(detailFieldErrors && typeof detailFieldErrors === "object" && !Array.isArray(detailFieldErrors) ? detailFieldErrors : {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  if (typeof detail?.field === "string" && typeof detail?.message === "string") fieldErrors[detail.field] = detail.message;
  if (Object.keys(fieldErrors).length > 0) {
    return { message: "Please correct the highlighted fields.", fieldErrors };
  }
  if (typeof detail === "object" && typeof detail?.message === "string") {
    return { message: detail.message, fieldErrors: {} };
  }
  if (typeof detail === "string") {
    return { message: detail, fieldErrors: {} };
  }
  return { message: "We couldn't save your changes. Please try again.", fieldErrors: {} };
}
