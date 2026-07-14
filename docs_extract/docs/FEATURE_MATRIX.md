# FEATURE MATRIX

> Consolidated status table across the whole repository. ✅ Complete / 🟡 Partial / ❌ Missing.
> Every row cites a file path from the detailed audit files (`CLI_AUDIT.md`, `AGENT_AUDIT.md`,
> `WORKFLOW_AUDIT.md`, `WEBSITE_BUILDER_AUDIT.md`, `DASHBOARD_AUDIT.md`, `CODE_QUALITY.md`,
> `TECH_DEBT.md`, `PROJECT_AUDIT.md`). Read-only audit — nothing modified.

## CLI

| Feature | Status | Evidence |
|---|---|---|
| Interactive menu (`ai menu`/bare `ai`) | ✅ Complete | `packages/cli/src/session/SessionManager.js` |
| Project launcher (`ai project`) | ✅ Complete | `packages/cli/src/commands/project.js` |
| Dev mode (`ai devmode`) | ✅ Complete | `packages/cli/src/commands/devmode.js` |
| Deploy (`ai deploy`) | ✅ Complete | `packages/cli/src/commands/deploy.js` |
| Scaffolding (`ai create agent/workflow/skill`) | ✅ Complete | `packages/cli/src/commands/create.ts` |
| Agent execution (`ai run`) | ✅ Complete | `packages/cli/src/commands/run.ts` |
| Workflow execution (`ai workflow run`) | ✅ Complete | `packages/cli/src/workflow/runtime.ts` |
| Workflow resume/retry | ❌ Missing | `packages/cli/src/workflow/runtime.ts:159-165` |
| Orchestrator (parallel/DAG) | ✅ Complete | `packages/cli/src/orchestrator/*` |
| Memory inspection (`ai memory`) | ✅ Complete | `packages/cli/src/memory/commands.js` |
| Provider management (`ai provider`) | ✅ Complete | `packages/cli/src/providers/manager.ts` |
| Tool inspection (`ai tools`) | ✅ Complete | `packages/cli/src/tools/manager.ts` |
| Website Builder (`ai website create`) | ✅ Complete | `packages/cli/src/commands/website.ts` |
| Marketplace publish/install/search | ✅ Complete | `packages/cli/src/marketplace/*` |
| Marketplace versioning | 🟡 Partial (string-equality only) | `packages/cli/src/marketplace/providers/local.ts:62` |
| Marketplace add/remove/update | 🟡 Partial (wrong target dir) | `packages/cli/src/commands/{add,remove,update}.ts` |
| `ai new` as direct command | ❌ Missing (menu-only) | `packages/cli/src/index.ts` (no registration) |
| `-v` short version flag | ❌ Missing | `packages/cli/src/index.ts:40` |
| CLI command reference doc | ❌ Missing | none found under `docs/` |

## Agent System

| Feature | Status | Evidence |
|---|---|---|
| Agent Runtime (load/validate/execute) | ✅ Complete | `packages/cli/src/runtime/{loader,executor,context}.ts` |
| Prompt Engine | ✅ Complete | `packages/cli/src/prompt/{engine,renderer}.ts` |
| Memory persistence | ✅ Complete | `packages/cli/src/memory/manager.ts` |
| Provider Layer (4 vendors, real HTTP) | ✅ Complete | `packages/cli/src/providers/{anthropic,openai,gemini,ollama}.ts` |
| Tool System (6 tools) | ✅ Complete | `packages/cli/src/tools/*.ts` |
| Tool-calling loop (agent auto-invokes tools) | ❌ Missing | no consumer found |
| Multi-turn conversation | ❌ Missing | `runtime/executor.ts` — single message pair |
| Streaming responses | ❌ Missing | `providers/provider.ts:ChatResponse` non-streaming |
| Real persisted agent instances in this repo | ❌ Missing | none found outside generated output |

## Workflow System

| Feature | Status | Evidence |
|---|---|---|
| Definition/loading/validation | ✅ Complete | `packages/cli/src/workflow/{types,loader,validator}.ts` |
| Sequential execution | ✅ Complete | `packages/cli/src/workflow/runtime.ts` |
| Parallel/DAG execution | ✅ Complete (Orchestrator only) | `packages/cli/src/orchestrator/{planner,scheduler}.ts` |
| Conditional branching | 🟡 Partial (recognized, not evaluated) | `packages/cli/src/orchestrator/scheduler.ts:79` |
| Resume | ❌ Missing | `workflow/runtime.ts:159-161` |
| Retry | ❌ Missing | `workflow/runtime.ts:163-165` |
| Duplicate-run locking | ✅ Complete | `.runtime/workflow/locks/` |

## Website Builder

| Feature | Status | Evidence |
|---|---|---|
| Site type selection (11 types) | ✅ Complete | `packages/cli/src/website/types.ts` |
| Fixed 11-page generation | ✅ Complete | `packages/cli/src/templates/website/app/**` |
| Per-type page customization | ❌ Missing | design trade-off, `WEBSITE_BUILDER_AUDIT.md` |
| Design system (tokens/theme/theme.css) | ✅ Complete | `packages/cli/src/templates/website/styles/*` |
| 12 reusable components | ✅ Complete | `packages/cli/src/templates/website/components/*` |
| SEO (robots/sitemap/OG/manifest/JSON-LD) | ✅ Complete | `packages/cli/src/templates/website/app/{robots,sitemap,opengraph-image}.ts(x)` |
| Assets (logo/icon/placeholders, SVG only) | ✅ Complete | `packages/cli/src/templates/website/{app/icon.svg,public/*}` |
| Deployment files | ✅ Complete | `.env.example`, `vercel.json`, `README.md` |
| Content generation via Provider Layer | ✅ Complete, with fallback | `packages/cli/src/website/content.ts` |
| Actual email delivery | ❌ Missing | `app/api/{contact,newsletter}/route.ts` — logs only |
| Blog detail pages / CMS | ❌ Missing | `app/blog/page.tsx` — listing only |
| Dark mode | ❌ Missing | `styles/theme.css` |
| CLI menu integration | ❌ Missing | not in `menu.json` |

## Dashboard

| Feature | Status | Evidence |
|---|---|---|
| Terminal/Workspace/GitHub/AI/Logs/Settings managers | ✅ Complete, real backends | `app/developer/*`, `DASHBOARD_AUDIT.md` |
| Project management UI | ✅ Complete, real backends | `app/projects/**` |
| Public contact form | ❌ Broken (missing API route) | `components/sections/ContactForm.tsx` vs. absent `app/api/contact/route.ts` |
| Login/Signup | ❌ Missing backend | `app/login/page.tsx`, `app/signup/page.tsx` |
| Authentication | ❌ Missing | zero matches repo-wide |
| Admin screen | ❌ Missing | route doesn't exist |
| API input validation | 🟡 Partial (manual only) | 33 routes, no schema library |

## Runtime Infrastructure

| Feature | Status | Evidence |
|---|---|---|
| Orchestrator | ✅ Complete, wired | `src/index.ts:95` |
| Provider Layer | ✅ Complete | see Agent System table |
| Prompt Engine | ✅ Complete | see Agent System table |
| Tool System | ✅ Complete (library); not agentic | see Agent System table |
| Memory Manager | ✅ Complete | see Agent System table |

## Marketplace

| Feature | Status | Evidence |
|---|---|---|
| Publish | ✅ Complete | `packages/cli/src/commands/publish.ts` |
| Install | ✅ Complete | `packages/cli/src/commands/install.ts` |
| Search | ✅ Complete | `packages/cli/src/commands/search.ts` |
| Versioning | 🟡 Partial | `marketplace/providers/local.ts:62` |
| Remote/online registry | ❌ Missing (local-only by design) | `marketplace/index.ts:14-18` |
| Root `marketplace/` directory actually populated | ❌ Missing (README stubs only) | `PROJECT_AUDIT.md` §9 |

## Testing & CI

| Feature | Status | Evidence |
|---|---|---|
| Unit/integration/E2E tests | ❌ Missing (0 files) | `CODE_QUALITY.md` |
| Test framework configured | ❌ Missing | no `test` script in any `package.json` |
| CI test workflow (meaningful) | ❌ Missing (always reports success) | `.github/workflows/test.yml` |
| CI lint workflow (full monorepo) | 🟡 Partial (root only) | `.github/workflows/lint.yml` |
| CI security workflow | ✅ Complete, functional | `.github/workflows/security.yml` |
| CI docs workflow | ❌ Broken (would fail if run) | `.github/workflows/docs.yml` |

## Documentation

| Feature | Status | Evidence |
|---|---|---|
| Root README | ✅ Complete, accurate about Phase 0 | `README.md` |
| `packages/cli/README.md` | ❌ Missing (0 bytes) | `CODE_QUALITY.md` |
| `docs/getting-started.md` | ❌ Missing (0 lines) | `PROJECT_AUDIT.md` |
| `docs/installation.md` | ❌ Missing (0 lines) | `PROJECT_AUDIT.md` |
| `docs/faq.md` | ❌ Missing (0 lines) | `PROJECT_AUDIT.md` |
| CLI command reference | ❌ Missing | none found |
| API reference | ❌ Missing | none found |
| Architecture doc matching built reality | ❌ Missing | `ARCHITECTURE.md` describes unbuilt `src/` layers |

## Security

| Feature | Status | Evidence |
|---|---|---|
| Secrets management | ✅ Correct | `TECH_DEBT.md` |
| No hardcoded credentials | ✅ Confirmed | repo-wide grep |
| API authentication | ❌ Missing everywhere | `TECH_DEBT.md` |
| Schema-based input validation | ❌ Missing | no `zod`/similar anywhere |
| `npm audit` in CI | ✅ Complete | `.github/workflows/security.yml` |
