import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-integration", workers: 1, timeout: 120_000,
  outputDir: "../output/playwright/integration-results",
  use: { baseURL: "http://127.0.0.1:4174", actionTimeout: 15_000, navigationTimeout: 60_000, trace: "off", screenshot: "only-on-failure" },
  webServer: [
    { command: "uv run python tests/serve_storefront_e2e.py", cwd: "../backend", url: "http://127.0.0.1:8100/health", timeout: 120_000 },
    { command: "npm run dev -- --host 127.0.0.1 --port 4174", url: "http://127.0.0.1:4174", env: { VITE_API_BASE_URL: "http://127.0.0.1:8100/api", VITE_STOREFRONT_BASE_URL: "http://127.0.0.1:3100" }, timeout: 120_000 },
    { command: "npm run dev -- --hostname 127.0.0.1 --port 3100", cwd: "../storefront", url: "http://127.0.0.1:3100", env: { STOREFRONT_SERVER_API_BASE_URL: "http://127.0.0.1:8100/api", NEXT_PUBLIC_WHATSAPP_NUMBER: "" }, timeout: 120_000 },
  ],
});
