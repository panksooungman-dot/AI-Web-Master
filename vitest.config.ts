import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * 최소 테스트 인프라 설정.
 * - `@/*` 별칭은 루트 tsconfig.json의 `paths`(`"@/*": ["./*"]`)와 동일하게 맞춰
 *   `lib/agents/implementations/*`가 사용하는 `@/lib/terminal/server` import가
 *   테스트에서도 그대로 resolve되도록 한다.
 * - CLI(`packages/cli`)는 NodeNext(ESM) + `.js` 확장자 import를 쓰므로, Vite의
 *   TS 리졸버가 `./types.js` → `./types.ts`를 그대로 해석한다(별도 설정 불필요).
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
      include: ["packages/cli/src/**/*.ts", "lib/**/*.ts"],
      exclude: ["packages/cli/src/templates/**", "**/*.d.ts"]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
