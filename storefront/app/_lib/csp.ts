// Per-request script policy. Next.js reads the nonce from the request's CSP
// header and stamps it on its own inline scripts, so injected markup without
// the nonce cannot run. Styles stay 'unsafe-inline' because React style
// attributes and next/font need it; scripts are the XSS risk.
export const FRAME_SOURCES = ["https://www.tiktok.com", "https://www.google.com"] as const;

export function buildContentSecurityPolicy(nonce: string, development = false): string {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  // React's development build evaluates source maps and refresh code.
  if (development) scriptSources.push("'unsafe-eval'");
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws:" : ""}`,
    `frame-src 'self' ${FRAME_SOURCES.join(" ")}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (!development) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
