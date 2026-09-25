import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep local preview runs from writing generated agent instruction files.
  agentRules: false,
  // Dashboard edits must also appear during local design/development sessions.
  experimental: { serverComponentsHmrCache: false },
};

export default nextConfig;
