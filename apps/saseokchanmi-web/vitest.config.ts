import { defineConfig } from "vitest/config";
import path from "node:path";

/** cnbiz-web과 같은 구성: `@/*` 별칭은 이 앱의 tsconfig.json `paths`와 같다. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
