import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Mirrors the root `vitest.config.ts` (same `@/*` alias convention as this app's
 * `tsconfig.json`). Covers the AI Business OS test suites that moved here alongside
 * `app/developer`, `app/login`, `app/projects`, and `app/api/**` — root keeps only the
 * `packages/cli`-focused suites (`tests/cli`, `tests/ai-platform-cli`, `tests/marketplace-cli`),
 * which are independent of either Next.js app.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["lib/**/*.ts"],
      exclude: ["**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
