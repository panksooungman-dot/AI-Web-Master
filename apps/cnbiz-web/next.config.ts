import path from "path";
import type { NextConfig } from "next";

// CNBIZ.KR no longer takes AI website-builder requests directly — /request (and its submission
// API/page) redirects to the external consultation product instead of 404ing for anyone with an
// old link bookmarked.
//
// AI Business OS Rewiring (Phase 1): /contact used to redirect here too, on the premise that
// cnbiz.ai.kr's chatbot was the only real intake path (see REWIRING_REPORT.md — that premise was
// never confirmed and CHATBOT_API_KEY was never even configured in Production). /contact is now a
// real page on cnbiz.kr again (app/contact/page.tsx) that posts straight to the internal
// POST /api/inquiries, so it's intentionally no longer in the redirect list below.
const CNBIZ_AI_URL = process.env.NEXT_PUBLIC_CNBIZ_AI_URL || "https://cnbiz.ai.kr";

// lib/ai/bridge.ts, lib/aiJobs/executor.ts, app/api/websites/route.ts shell out to
// `node packages/cli/dist/index.js` (dynamically-built path, not a static import), so Next.js's
// build-time file tracing never discovers it on its own — the Vercel deployment shipped without
// packages/cli/dist at all, and every route that shells out to it failed at runtime with
// "packages/cli가 아직 빌드되지 않았습니다." (confirmed via Vercel function logs, 2026-08-05).
// packages/cli's own runtime dependencies (chalk/commander/fs-extra/ora + their transitive deps)
// are npm-workspace-hoisted into the repo root node_modules and aren't otherwise referenced by
// apps/cnbiz-web, so they must be listed explicitly too (computed from package-lock.json's
// dependency graph for chalk/commander/fs-extra/ora — not a guess).
const CLI_RUNTIME_DEPS = [
  "ansi-regex",
  "ansi-styles",
  "chalk",
  "cli-cursor",
  "cli-spinners",
  "color-convert",
  "color-name",
  "commander",
  "emoji-regex",
  "fs-extra",
  "get-east-asian-width",
  "graceful-fs",
  "has-flag",
  "is-interactive",
  "is-unicode-supported",
  "jsonfile",
  "log-symbols",
  "mimic-function",
  "onetime",
  "ora",
  "restore-cursor",
  "signal-exit",
  "stdin-discarder",
  "string-width",
  "strip-ansi",
  "supports-color",
  "universalify",
];

const CLI_TRACE_INCLUDES = [
  "../../packages/cli/package.json",
  "../../packages/cli/dist/**/*",
  ...CLI_RUNTIME_DEPS.map((dep) => `../../node_modules/${dep}/**/*`),
];

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cnbiz/design-system",
    "@cnbiz/dev-inspector",
    "@cnbiz/ui",
    "@cnbiz/layout-primitives",
    "@cnbiz/utils",
  ],
  // apps/cnbiz-web is two levels below the monorepo root — without this, tracing can't reach
  // ../../packages/cli at all (outputFileTracingIncludes globs are resolved relative to this app's
  // directory, but the root sets the outer boundary tracing is allowed to walk up into).
  outputFileTracingRoot: path.join(process.cwd(), "..", ".."),
  outputFileTracingIncludes: {
    "/api/ai-jobs/**": CLI_TRACE_INCLUDES,
    "/api/websites": CLI_TRACE_INCLUDES,
    "/api/external/inquiries": CLI_TRACE_INCLUDES,
  },
  async redirects() {
    return [{ source: "/request", destination: CNBIZ_AI_URL, permanent: true }];
  },
};

export default nextConfig;
