import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone CommonJS utility scripts (not part of the Next.js app source).
    "*.cjs",
    // Separate workspace projects (apps/cnbiz-web, packages/*) — each lints itself.
    "apps/**",
    "packages/**",
  ]),
]);

export default eslintConfig;
