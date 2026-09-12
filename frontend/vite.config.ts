import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("echarts") || id.includes("echarts-for-react")) return "charts";
          if (id.includes("@mantine")) return "mantine";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("react") || id.includes("scheduler")) return "react";
          if (id.includes("motion")) return "motion";
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
