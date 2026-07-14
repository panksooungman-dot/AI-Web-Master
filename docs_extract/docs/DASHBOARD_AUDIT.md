# DASHBOARD & API AUDIT

> Scope: repo-root `app/**` (the "Development OS" dashboard, distinct from `apps/cnbiz-web`) and
> every real API route in this repo (`app/api/**`, excluding `apps/cnbiz-web` and CLI template output,
> which are noted separately). Read-only audit — nothing modified.

---

## ⚠️ Cross-cutting note

`AI-Web-Master/` (repo root) is a full nested clone of this same repository, tracked as a broken git
submodule gitlink (see `PROJECT_AUDIT.md` for directly-verified evidence). It silently doubles the
results of any repo-wide `find`/`grep`. All findings below exclude it.

---

## Dashboard (`app/**` at repo root)

Root `app/` hosts **two coexisting products**: the public CNBIZ v1 marketing site (`/`, `/about`, `/services`, `/portfolio`, `/contact`) and the internal Development OS (`/developer/*`, `/projects*`, `/login`, `/signup`). `apps/cnbiz-web/` is the separate, real production site and is out of scope for this file.

`docs/UI_MAP.md` (dated 2026-07-07) already documents this area in detail; its claims were spot-checked against current code and found accurate, with one addition: `app/developer/ui-map/page.tsx` now exists and is linked from `components/developer/DeveloperNav.tsx` (post-dates the doc).

### Developer pages — backend wiring

| Page | Route | File | Wired to real backend? | Evidence |
|---|---|---|---|---|
| Dev index | `/developer` | `app/developer/page.tsx` | ✅ Yes (via `DevServerManagerCard`) | Not linked from `DeveloperNav` itself — orphaned entry point |
| Workspace | `/developer/workspace` | `app/developer/workspace/page.tsx` | ✅ Real | `fetch("/api/workspaces")` → `lib/workspaces/registry.ts` (real fs operations) |
| Terminal | `/developer/terminal` | `app/developer/terminal/page.tsx` | ✅ Real | `lib/terminal/client.ts` → `/api/terminal` |
| GitHub | `/developer/github` | `app/developer/github/page.tsx` | ✅ Real | same client → `/api/terminal`, runs real `git` commands |
| AI | `/developer/ai` | `app/developer/ai/page.tsx` | ✅ Real | same client → real `claude --version` etc. process checks |
| Logs | `/developer/logs` | `app/developer/logs/page.tsx` | ✅ Real | `fetch("/api/logs")` |
| Settings | `/developer/settings` | `app/developer/settings/page.tsx` | ✅ Real | `lib/terminal/client.ts` for git config sync; rest is `localStorage` |
| UI Explorer | `/developer/ui-map` | `app/developer/ui-map/page.tsx` | ✅ Real (meta) | Reads/parses `docs/UI_MAP.md` from disk at request time; renders inline iframe previews via `UiMapExplorer` |
| Project list | `/projects` | `app/projects/page.tsx` | ✅ Real, heavily wired | 10 distinct `fetch()` calls: `/api/projects`, `/api/workspaces`, `/api/workflows/runs/*`, `/api/projects/bootstrap`, `/api/projects/import` |
| Project detail | `/projects/[id]` | `app/projects/[id]/page.tsx` | ✅ Real | Reachable only via card click from `/projects`, not in nav |

### Public-site pages (v1, unauthenticated)

| Page | Route | Status | Evidence |
|---|---|---|---|
| Login | `/login` | 🟡 UI only, no backend | `app/login/page.tsx` — `handleSubmit` only calls `e.preventDefault()`, no `fetch` anywhere in file |
| Signup | `/signup` | 🟡 UI only, no backend | same pattern |
| Home/About/Services | `/`, `/about`, `/services` | ✅ Static content | Real content, no forms |
| Portfolio | `/portfolio` | 🟡 Placeholder | "Coming soon" section only |
| Contact | `/contact` | ❌ Broken | `components/sections/ContactForm.tsx:80` calls `fetch("/api/contact")`, but **`app/api/contact/route.ts` does not exist at repo root** — confirmed via `ls`. Every submission fails. (Note: `apps/cnbiz-web` — a *separate* Next app — does have a fully working `/api/contact`; this finding is specific to the root Development OS app's copy of the marketing pages.) |

### Missing dashboard functionality

- **No authentication/authorization anywhere** — repo-wide grep for `getServerSession|auth\(|Authorization|cookies\(\)|jwt` across `app/api/**` returns zero matches. Every API and page is open.
- **No `/admin` screen** — the route doesn't exist; only referenced as a disallow entry in `app/robots.ts`.
- **No customer/CRM management screen** — no such route or data model anywhere under `app/`.
- **No marketplace UI** — nothing under `app/` consumes the CLI's marketplace system (see `PROJECT_AUDIT.md` §9).

---

## API routes (this repo's own running app)

33 `route.ts` files under root `app/api/**`. **None use a validation library** (zero matches for `zod` etc. repo-wide) — validation is ad-hoc manual type-guards where present, absent elsewhere. **Zero authentication on any route.**

| Route | Methods | Purpose | Backend service | Validation |
|---|---|---|---|---|
| `/api/terminal` | GET, POST | GET returns cwd; POST executes an **arbitrary shell command string** | `lib/terminal/server.ts:executeShellCommand` | Manual type-guard only — `command` and `cwd` are both fully caller-controlled. **Flagged in `TECH_DEBT.md` as an unauthenticated remote-command-execution endpoint by design (a local dev tool, but worth noting explicitly)** |
| `/api/workspaces` | GET, POST | List/create real filesystem workspace folders | `lib/workspaces/registry.ts` | Manual required-field check |
| `/api/devserver/{start,stop,restart,status}` | POST/GET | Manage a real child dev-server process per workspace | `lib/devserver/manager.ts` | Present |
| `/api/dev-inspector/{save-text,save-image,save-style}` | POST | Visual Editor overlay wiring | `@cnbiz/dev-inspector/src/server` | Delegated to shared package |
| `/api/logs` | GET | Read Event Bus history (terminal/git/agent/workflow) | `lib/events/eventBus.ts` | n/a (read-only) |
| `/api/projects`, `/api/projects/[id]` | GET, POST, PATCH | CRUD over `lib/projects/registry.ts` (fs-backed JSON) | `lib/projects/registry.ts` | Present |
| `/api/projects/bootstrap` | POST | Runs the 7-step Workflow Engine (create workspace → git init → npm install → commit) | `lib/workflows/engine.ts` | Present |
| `/api/projects/import`, `/api/projects/health` | POST/GET | Import existing folder as project; framework/health detection | `lib/projects/*` | Present |
| `/api/workflows`, `/api/workflows/[id]`, `/api/workflows/[id]/run` | GET/POST | Workflow CRUD + execution trigger | `lib/workflows/registry.ts`, `engine.ts` | Present |
| `/api/workflows/runs`, `.../[id]`, `.../pause`, `.../resume`, `.../cancel`, `.../retry` | GET/POST | Workflow run lifecycle control | `lib/workflows/engine.ts` (Task Queue) | Present |
| `/api/agents`, `/api/agents/run` | GET/POST | List agents; enqueue an agent task | `lib/agents/registry.ts`, `taskQueue.ts` | Present |
| `/api/agents/tasks`, `.../[id]`, `.../cancel` | GET/POST | Task queue inspection + cancellation (real `AbortController` kill) | `lib/agents/taskQueue.ts` | Present |
| `/api/prompts`, `.../[id]`, `.../[id]/execute` | GET/POST | Prompt CRUD with versioning + execution | `lib/prompts/registry.ts`, `executor.ts` | Present |
| `/api/sessions`, `.../[id]`, `.../[id]/run` | GET/POST | AI session CRUD + run | `lib/agents/session.ts` | Present |

### Not part of this repo's own running app (noted for completeness, excluded from the table above)

- `apps/cnbiz-web/app/api/contact/route.ts` — separate Next.js app, fully implemented with validation, honeypot, rate-limiting, and email notification.
- `packages/cli/src/templates/website/app/api/{contact,newsletter}/route.ts` (and its mirror in `packages/cli/dist/templates/...`) — CLI **template source** copied into *generated* websites by `ai website create`; does not run in this repo. See `WEBSITE_BUILDER_AUDIT.md`.

## Summary status

| Feature | Status | Evidence |
|---|---|---|
| Developer tooling pages (Terminal/Workspace/GitHub/AI/Logs/Settings) | ✅ Complete, real backends | see table above |
| Project management UI | ✅ Complete, real backends | `app/projects/**` |
| Public marketing pages | 🟡 Partial (Portfolio placeholder) | `app/portfolio/page.tsx` |
| Public contact form | ❌ Broken (missing API route) | `components/sections/ContactForm.tsx` vs. absent `app/api/contact/route.ts` |
| Login/Signup | ❌ Missing backend | `app/login/page.tsx`, `app/signup/page.tsx` |
| Authentication (any) | ❌ Missing | zero matches repo-wide |
| Admin screen | ❌ Missing | route doesn't exist |
| API input validation | 🟡 Partial — manual, no schema library | 33 routes, ad-hoc checks |
| API authentication | ❌ Missing | zero matches |
