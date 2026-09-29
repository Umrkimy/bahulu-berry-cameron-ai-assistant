// Website checkout helpers. The backend prices the order and creates the
// payment; this module only shapes and checks what the customer typed.

export type CheckoutContact = {
  full_name: string;
  phone_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
};

export type CheckoutField = keyof CheckoutContact | "privacy";
export type CheckoutErrors = Partial<Record<CheckoutField, "required" | "invalid">>;

export type CheckoutStatus = { enabled: boolean; test_mode: boolean };
export type CheckoutResult = { order_number: number; total_amount: string; payment_url: string; tracking_token: string };

export const emptyContact: CheckoutContact = { full_name: "", phone_number: "", email: "", address: "", city: "", state: "", postal_code: "" };

// Malaysia's states and federal territories, for the delivery address.
export const MALAYSIAN_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis", "Pulau Pinang",
  "Sabah", "Sarawak", "Selangor", "Terengganu", "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
] as const;

export const PENDING_CHECKOUT_KEY = "bbc-pending-checkout-v1";

// Mirrors the backend: Malaysian local numbers, or international with "+".
export function isValidPhone(value: string): boolean {
  const compact = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(compact) || /^0\d{9,10}$/.test(compact);
}

export function validateCheckout(contact: CheckoutContact, privacyAccepted: boolean): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const required: (keyof CheckoutContact)[] = ["full_name", "phone_number", "address", "city", "state", "postal_code"];
  for (const field of required) if (!contact[field].trim()) errors[field] = "required";
  if (contact.full_name.trim() && contact.full_name.trim().length < 2) errors.full_name = "invalid";
  if (contact.phone_number.trim() && !isValidPhone(contact.phone_number)) errors.phone_number = "invalid";
  if (contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors.email = "invalid";
  if (contact.address.trim() && contact.address.trim().length < 5) errors.address = "invalid";
  if (contact.postal_code.trim() && !/^\d{5}$/.test(contact.postal_code.trim())) errors.postal_code = "invalid";
  if (!privacyAccepted) errors.privacy = "required";
  // Report problems in the order the form shows them.
  const order: CheckoutField[] = ["full_name", "phone_number", "email", "address", "city", "postal_code", "state", "privacy"];
  return Object.fromEntries(order.filter((field) => errors[field]).map((field) => [field, errors[field]])) as CheckoutErrors;
}

// The checkout form is split into three steps; each field belongs to one.
export type CheckoutStep = 1 | 2 | 3;
export const CHECKOUT_STEP_FIELDS: Record<CheckoutStep, CheckoutField[]> = {
  1: ["full_name", "phone_number", "email"],
  2: ["address", "city", "postal_code", "state"],
  3: ["privacy"],
};

export function errorsForStep(errors: CheckoutErrors, step: CheckoutStep): CheckoutErrors {
  return Object.fromEntries(CHECKOUT_STEP_FIELDS[step].filter((field) => errors[field]).map((field) => [field, errors[field]])) as CheckoutErrors;
}

// The earliest step with a problem, so the customer is sent back to fix it.
export function firstStepWithErrors(errors: CheckoutErrors): CheckoutStep | null {
  for (const step of [1, 2, 3] as const) if (Object.keys(errorsForStep(errors, step)).length) return step;
  return null;
}

export function checkoutPayload(
  items: { productId: number; quantity: number }[],
  contact: CheckoutContact,
  locale: "en" | "ms",
) {
  const trimmed = Object.fromEntries(Object.entries(contact).map(([key, value]) => [key, value.trim()])) as CheckoutContact;
  return {
    items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    contact: { ...trimmed, email: trimmed.email || null },
    locale,
    privacy_notice_accepted: true as const,
  };
}

// The same key is reused while the submitted body is unchanged, so a retry
// after a network error returns the same order instead of creating another.
export function idempotencyKeyFor(body: string, previous: { body: string; key: string } | null, makeKey: () => string) {
  return previous && previous.body === body ? previous : { body, key: makeKey() };
}

const CONTACT_FIELDS = new Set<string>(Object.keys(emptyContact));

// The API can reject a value the browser check let through (for example a
// reserved email domain). Point at the field it named instead of a vague error.
export function serverFieldErrors(detail: unknown): CheckoutErrors {
  if (!Array.isArray(detail)) return {};
  const errors: CheckoutErrors = {};
  for (const item of detail) {
    const loc = (item as { loc?: unknown })?.loc;
    if (!Array.isArray(loc) || loc.length < 3 || loc[0] !== "body" || loc[1] !== "contact") continue;
    const field = loc[2];
    if (typeof field === "string" && CONTACT_FIELDS.has(field)) errors[field as keyof CheckoutContact] = "invalid";
  }
  return errors;
}

export type CheckoutFailure = "unavailable" | "changed" | "closed" | "contact" | "payment" | "invalid" | "busy" | "network";

export function checkoutFailure(status: number, code: string | undefined): CheckoutFailure {
  if (code === "UNAVAILABLE") return "unavailable";
  if (code === "IDEMPOTENCY_MISMATCH") return "changed";
  if (code === "CHECKOUT_CLOSED") return "closed";
  if (code === "CONTACT_US") return "contact";
  if (code === "PAYMENT_UNAVAILABLE" || status === 503) return "payment";
  if (status === 422 || code === "INVALID_PHONE") return "invalid";
  if (status === 429) return "busy";
  return "network";
}

// Only follow an https payment page handed back by our own API.
export function safePaymentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
