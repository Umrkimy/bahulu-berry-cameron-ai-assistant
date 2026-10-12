// Customer accounts stay hidden until Umar and the client approve them.
export function isAccountsEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return environment.STOREFRONT_ACCOUNTS_ENABLED === "true";
}

export const CUSTOMER_COOKIE = "bbc_customer_session";

type AccountRoute = {
  path: string;
  // Needs the visitor's session cookie, forwarded as a bearer header.
  auth: boolean;
  // "set": the API returned a fresh session to keep; "clear": the session ended.
  session?: "set" | "clear";
  download?: boolean;
};

// Only these calls reach the API; anything else is a 404 from the storefront.
export const accountRoutes: Record<string, AccountRoute> = {
  "POST code": { path: "/code", auth: false },
  "POST code/verify": { path: "/code/verify", auth: false, session: "set" },
  "POST password/sign-in": { path: "/password/sign-in", auth: false, session: "set" },
  "GET me": { path: "/me", auth: true },
  "PATCH me": { path: "/me", auth: true },
  "POST password": { path: "/password", auth: true, session: "set" },
  "POST sign-out": { path: "/sign-out", auth: true, session: "clear" },
  "GET orders": { path: "/orders", auth: true },
  "GET export": { path: "/export", auth: true, download: true },
  "POST delete": { path: "/delete", auth: true, session: "clear" },
};

export function findAccountRoute(method: string, segments: string[]): AccountRoute | null {
  if (segments.some((segment) => !/^[a-z-]+$/.test(segment))) return null;
  return accountRoutes[`${method.toUpperCase()} ${segments.join("/")}`] ?? null;
}

// HttpOnly so page scripts never see it; Lax so it is not sent on cross-site
// posts; Secure always (browsers treat http://localhost as secure too).
export function sessionCookie(token: string, expiresAt: string) {
  return { name: CUSTOMER_COOKIE, value: token, httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", expires: new Date(expiresAt) };
}

export type CustomerAccount = {
  email: string;
  full_name: string | null;
  phone_number: string | null;
  locale: "en" | "ms";
  has_password: boolean;
  created_at: string;
};
