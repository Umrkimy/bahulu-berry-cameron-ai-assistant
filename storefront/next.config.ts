import type { NextConfig } from "next";

// The Content-Security-Policy (with a per-request script nonce) is set in
// proxy.ts. Checkout leaves for the payment page with location.assign, which
// form-action does not cover.
const securityHeaders = [
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
