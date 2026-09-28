import type { NextConfig } from "next";

// A full script CSP needs per-request nonces for Next's inline scripts; until
// that is added, block framing, plugins, and <base> rewriting.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep local preview runs from writing generated agent instruction files.
  agentRules: false,
  // Dashboard edits must also appear during local design/development sessions.
  experimental: { serverComponentsHmrCache: false },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
