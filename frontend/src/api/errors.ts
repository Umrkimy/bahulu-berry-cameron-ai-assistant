import axios from "axios";

export interface ApiError {
  message: string;
  fieldErrors: Record<string, string>;
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

  if (status === 401) {
    return { message: window.location.pathname === "/login" ? "Invalid email or password." : "Your session has expired. Please sign in again.", fieldErrors: {} };
  }
  if (status === 403) {
    return { message: "You don't have permission to do this.", fieldErrors: {} };
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
      ? detail.field_errors
      : {};
  const fieldErrors = Object.keys(validationFieldErrors).length > 0
    ? validationFieldErrors
    : detailFieldErrors;
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
