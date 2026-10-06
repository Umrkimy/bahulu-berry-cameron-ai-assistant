import type { NextConfig } from "next";

// A full script CSP needs per-request nonces for Next's inline scripts; until
// that is added, block framing, plugins, <base> rewriting, and off-site form
// posts. Checkout leaves for the payment page with location.assign, which
// form-action does not cover.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Do not advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  // Keep local preview runs from writing generated agent instruction files.
  agentRules: false,
  // Dashboard edits must also appear during local design/development sessions.
  experimental: { serverComponentsHmrCache: false },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
