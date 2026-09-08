import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/static/**" },
      { protocol: "http", hostname: "api", port: "8000", pathname: "/static/**" },
    ],
  },
};

export default nextConfig;
