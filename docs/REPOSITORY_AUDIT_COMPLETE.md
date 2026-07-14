# REPOSITORY AUDIT — COMPLETE

> A single merged document combining all previously-generated audit reports in `docs/`:
> `PROJECT_STATUS.md`, `PROJECT_AUDIT.md`, `CLI_AUDIT.md`, `AGENT_AUDIT.md`, `WORKFLOW_AUDIT.md`,
> `WEBSITE_BUILDER_AUDIT.md`, `DASHBOARD_AUDIT.md`, `CODE_QUALITY.md`, `TECH_DEBT.md`,
> `FEATURE_MATRIX.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`.
>
> This file was produced purely by merging the content of those existing reports — **no repository
> re-scan was performed and no source code was modified** to produce it. Every underlying claim was
> originally backed by a file path at the time its source report was generated; those citations are
> preserved verbatim below. Where a source report itself notes a directly-verified correction to an
> earlier sub-audit's claim (e.g. the `AI-Web-Master/` git-tracking status), that correction is
> preserved as the authoritative version here too.

---

## Table of Contents

- [Part 0 — Executive Report](#part-0--executive-report)
- [Part 1 — Project Audit (Overview, Directory Structure, Marketplace, Documentation)](#part-1--project-audit)
- [Part 2 — CLI Audit](#part-2--cli-audit)
- [Part 3 — Agent System Audit](#part-3--agent-system-audit)
- [Part 4 — Workflow System Audit](#part-4--workflow-system-audit)
- [Part 5 — Website Builder Audit](#part-5--website-builder-audit)
- [Part 6 — Dashboard & API Audit](#part-6--dashboard--api-audit)
- [Part 7 — Code Quality Audit](#part-7--code-quality-audit)
- [Part 8 — Technical Debt & Security Audit](#part-8--technical-debt--security-audit)
- [Part 9 — Feature Matrix](#part-9--feature-matrix)
- [Part 10 — Implementation Status](#part-10--implementation-status)
- [Part 11 — Roadmap / Next Priorities](#part-11--roadmap--next-priorities)

---

## Part 0 — Executive Report

*(Source: `docs/PROJECT_STATUS.md`)*

### 1. Executive Summary

`ai-web-master` is an npm-workspaces monorepo bundling four largely-independent things: an internal
"Development OS" dashboard at the repo root, the production CNBIZ client website (`apps/cnbiz-web`),
a globally-installable AI CLI (`packages/cli`, the `ai` command), and a large documentation/prompt
scaffolding layer at the repo root that is not wired into any of the runtime code (Part 1).

The engineering core is real and substantially working: four live LLM provider integrations, a
functioning Agent Runtime with simulation fallback, a working sequential Workflow Engine plus a
non-duplicative DAG-based Orchestrator on top of it, a 6-tool Tool System, and — built and fully
verified in the immediately preceding session — a production-capable Website Builder (`ai website
create`) that generates an 11-page Next.js site with a design system, SEO, assets, and deployment
files, confirmed via a real `npm install` + `npm run build` + `npm run lint` + live route checks
(Part 5).

Against that, the project carries two systemic weaknesses that cut across every area: **automated
test coverage is 0%** (no test files exist anywhere; the CI workflow that claims to run tests always
reports success regardless — Part 7), and **onboarding/reference documentation is largely
empty** (`getting-started.md`, `installation.md`, `faq.md` are 0 lines; no CLI command reference
exists — Part 1). Compounding this, the documented one-command installer
(`packages/cli/install.ps1`) has been silently broken (0 bytes) since a commit that emptied it and
was never restored, with nothing in CI catching it (Part 8). A full nested clone of this
same repository is also tracked in git as an orphaned submodule gitlink (Part 1,
directly verified via `git ls-tree`).

**Bottom line**: the project is a working proof of a genuinely capable architecture, self-consistently
at the "Phase 0: Foundation" stage its own roadmap claims (`docs/01_PMO/PROJECT_ROADMAP.md`), but is
not yet safe to treat as production-hardened — the missing safety net (tests, CI that means what it
says, a working installer) is the highest-leverage gap to close next, ahead of new features.

### 2. Current Development Progress

*(Method: each feature row in Part 9 — Feature Matrix — scored ✅=1 / 🟡=0.5 / ❌=0 and averaged
per area — a directional estimate, not a precision metric.)*

| Area | Estimate | Notes |
|---|---|---|
| **Core Platform** (CLI + Agent + Workflow + Runtime + Marketplace, blended) | **~60–65%** | Execution primitives are real; agentic capability (tool-calling loop, multi-turn, streaming) and resume/retry are the main gaps |
| **CLI** | ~74% | 13 of 19 tracked commands/features fully complete; marketplace `add`/`remove`/`update` inconsistency and a missing `ai new` top-level registration are the notable gaps |
| **Agent** | ~56% | Runtime, Prompt Engine, Memory, Provider Layer, Tool System all complete; no tool-calling loop, multi-turn, or streaming; no real agent instances persisted in this repo's own root |
| **Workflow** | ~64% | Sequential engine + Orchestrator (parallel/DAG) both real and non-duplicative; resume/retry are unimplemented stubs; conditional branching is recognized but not evaluated |
| **Runtime** (Provider Layer, Prompt Engine, Tool System, Memory) | Folded into Agent/Workflow above | All four sub-systems independently rated ✅ Complete |
| **Website Builder** | **~70%** | Fully built and verified this session against a 10-requirement spec; gaps are explicit scope trade-offs (no email delivery, no blog CMS, no dark mode, no per-type page customization) |
| **Dashboard** | ~55–60% blended | Developer tooling (`app/developer/*`) ~85% complete with real backends; public-facing site + auth ~35% (broken contact form, no login/signup backend, zero authentication anywhere) |
| **Marketplace** | ~55–60% | Publish/install/search real and functional; versioning is exact-string-only; `add`/`remove`/`update` target the wrong directory; root `marketplace/` folder itself unpopulated |

**Overall Project Completion: ~50–55%** (see §10 for the basis of this figure).

### 3. Completed Features (✅)

*(Non-exhaustive highlights; full lists in Part 9 — Feature Matrix.)*

- **CLI**: `ai menu`, `ai project`, `ai devmode`, `ai deploy`, `ai create agent/workflow/skill`, `ai run`, `ai workflow run`, `ai orchestrator run/status/stop`, `ai memory`, `ai provider`, `ai tools`, `ai website create`, `ai publish/install/search`
- **Agent System**: Runtime (load/validate/execute), Prompt Engine, Memory persistence, Provider Layer (Anthropic, OpenAI, Gemini, Ollama — all real HTTP integrations), Tool System (6 tools: filesystem, terminal, git, github, http, browser)
- **Workflow System**: Definition/loading/validation, sequential execution with duplicate-run locking, DAG-based parallel execution via the Orchestrator
- **Website Builder**: 11 site types, fixed 11-page generation, design system (tokens/theme/theme.css), 12 reusable components, full SEO (robots/sitemap/OG image/manifest/JSON-LD/per-page metadata), SVG asset generation, deployment files, Provider-Layer-driven content with deterministic fallback — end-to-end verified (install/build/lint/serve/curl all passed)
- **Dashboard**: Terminal, Workspace, GitHub, AI, Logs, Settings managers and Project management UI, all wired to real backend services
- **Marketplace**: Publish, install, search
- **Security hygiene**: no hardcoded secrets found repo-wide; `.env` handling correct; `npm audit` CI check is real and functional

### 4. Partially Implemented Features (🟡)

- **Marketplace versioning** — exact-string equality only, no semver comparison, no rollback (`marketplace/providers/local.ts:62`)
- **Marketplace `add`/`remove`/`update`** — operate on `packages/<name>` while `publish`/`install`/`search` operate on `agents/`/`workflows/`/`skills/` — inconsistent target directories
- **CLI `--version`** — only the Commander-default `-V` works; a lowercase `-v` alias claimed in past CHANGELOG history is absent
- **Orchestrator conditional branching** — the `condition` field is recognized and labeled but not actually evaluated (`orchestrator/scheduler.ts:79`)
- **API input validation** (Dashboard) — present but entirely manual/ad-hoc across 33 routes; no schema-validation library used anywhere in the repo
- **CI lint workflow** — only lints the root workspace; `packages/cli` and `apps/cnbiz-web` are excluded by `eslint.config.mjs`'s own ignore list and never linted in CI

### 5. Missing Features (❌)

- **Testing**: zero automated test files anywhere; no test framework configured in any `package.json`
- **Agent tool-calling loop**: agents cannot autonomously invoke their declared tools
- **Multi-turn conversation** and **streaming responses** in the Agent Runtime
- **Workflow resume/retry**: both explicitly throw `NOT_IMPLEMENTED`; the CLI flags for them silently restart from scratch instead
- **`ai new` as a direct top-level command**: documented in README/CHANGELOG but only reachable via the interactive menu
- **CLI command reference / API reference documentation**: none exist
- **`docs/getting-started.md`, `docs/installation.md`, `docs/faq.md`**: all 0 lines
- **Website Builder**: real email delivery (contact/newsletter routes log only), blog post detail pages / CMS, dark mode, per-site-type page customization, interactive-menu integration
- **Dashboard**: any authentication/authorization, `/admin` screen, working `/login` and `/signup` backends, root-app `/api/contact` route (contact form calls a route that doesn't exist in this app)
- **Marketplace**: remote/online registry (by design, not an oversight), a populated root-level `marketplace/` directory matching the real implementation's output location

### 6. Critical Issues (P0)

1. **Broken CLI installer** — `packages/cli/install.ps1` and 5 sibling files (`README.md`, `ai.cmd`, `ai.ps1`, `install.sh`, `Setup.cmd`) are 0 bytes, emptied by commit `4c3d5af` and never restored. `scripts/setup.ps1`'s documented one-command install flow currently cannot complete.
2. **Orphaned nested git submodule** — `AI-Web-Master/` is a full 7.9 MB clone of this repository, tracked in git as a gitlink (mode `160000`) with no `.gitmodules` file, directly verified via `git ls-tree`.
3. **CI test workflow reports false positives** — `.github/workflows/test.yml` unconditionally prints "✓" for unit/integration/E2E tests regardless of whether any test ran (none exist).
4. **CI docs workflow would fail if triggered** — 16 zero-byte `skills/shared/**/README.md` files, a missing `skills/README.md`, an empty `LICENSE`, and other empty `.md` files would all trip its empty-file check.
5. **CI lint workflow has incomplete coverage** — `packages/cli` and `apps/cnbiz-web` are never linted in CI.
6. **Public contact form is broken** — posts to `/api/contact`, which does not exist in the root Development OS app (only in the separate `apps/cnbiz-web`).
7. **Repo bloat committed to git** — multi-megabyte dump files (`structure.txt` 2.3 MB, `tree.txt` 2.7 MB, `typescript-files.txt` 1.0 MB) plus a stray `test-project/` artifact.
8. **Empty `LICENSE` file** — present but contains no license text.

### 7. Technical Debt

- **Silent in-memory-only state** appears to be a recurring pattern across the codebase (one confirmed instance already required a persisted-file fix for dev-server status); other modules (e.g. the Orchestrator's own status/lock handling) have not been individually audited for the same risk.
- **`resumeWorkflow`/`retryWorkflow`** are advertised via CLI flags but silently restart from scratch — a correctness risk for any workflow with non-idempotent steps (e.g. one that commits/pushes to git).
- **Two overlapping workflow-execution commands** (`ai workflow run` vs `ai orchestrator run`) operate on the same file format with different capabilities and no documentation distinguishing when to use which.
- **Generator duplication** — `generators/{agent,skill,workflow}.ts` are ~95% identical (~90 duplicated lines), a low-severity but easy consolidation opportunity.
- **`ai new` documentation/registration mismatch** — referenced as a top-level command in CHANGELOG history but not currently registered as one.
- **Marketplace command inconsistency** — `add`/`remove`/`update` vs. `publish`/`install`/`search` target different directories.
- **Documented vs. built architecture gap** — `ARCHITECTURE.md` describes a `src/` 4-layer Clean Architecture that the project's own roadmap admits was never built; the real app lives in `app/`/`lib/`/`components/`.
- **Root-level prompt/spec scaffolding duplicates concepts** implemented separately (and disconnectedly) in `packages/cli/src/*`, with no cross-reference — confirmed as a real source of navigational confusion by two independent audits.
- **Security**: no hardcoded secrets and correct `.env` hygiene, but **zero authentication anywhere** in the Dashboard/API layer, including an unauthenticated endpoint (`/api/terminal`) that executes arbitrary shell commands — acceptable only if this app is never exposed beyond localhost.

### 8. Recommended Next Tasks (Top 10)

1. Restore `packages/cli/install.ps1` and its 5 sibling files so the documented install flow works again.
2. Resolve the `AI-Web-Master/` orphaned git submodule (either properly configure or remove from the index).
3. Replace `.github/workflows/test.yml` with a workflow that reports failure when no tests exist, or stand up a real minimal test suite (start with `packages/cli`) so it has something true to report.
4. Fix `.github/workflows/docs.yml`'s empty-file check (populate the 16 `skills/shared/**` stubs + `skills/README.md` + `LICENSE`, or adjust its expectations).
5. Extend CI linting to `packages/cli` and `apps/cnbiz-web`.
6. Fix the public contact form / missing `/api/contact` route in the root Dev OS app.
7. Write `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md`, and a CLI command reference.
8. Implement `resumeWorkflow`/`retryWorkflow` for real, or remove the `--resume`/`--retry` flags until they are.
9. Fix the marketplace `add`/`remove`/`update` commands to target the same directories as `publish`/`install`/`search`.
10. Add authentication to the Dashboard/API layer, starting with the unauthenticated `/api/terminal` command-execution endpoint.

### 9. Version Recommendation

Root `package.json` is currently `0.1.0`; `packages/cli/package.json` is currently `1.1.0`.

**Recommendation: hold the CLI package below `2.0.0` and do not tag any package as a `1.x` stable release yet if it isn't already publicly relied upon** — a `1.x` version number conventionally signals a stable, trustworthy public API, but the CLI currently ships with a broken installer, 0% test coverage, and CI that misreports its own health. If `packages/cli` at `1.1.0` has not yet been published/distributed externally, consider whether a `0.x` line more honestly reflects its current maturity going forward.

**Concretely**:
- After the P0 fixes in §6 are done (installer restored, CI made honest, contact form fixed): tag as **`0.2.0`** (root) / **`1.2.0`** (CLI, if already public) — a minor bump, since these are fixes to previously-broken functionality plus the new Website Builder feature, not breaking changes.
- Do not consider a **`1.0.0`** milestone (for the root project) or continued confident `1.x` iteration (for the CLI) until: automated test coverage exists for at least the core execution paths (Agent Runtime, Workflow Engine, Content Engine), the installer is verified working end-to-end by CI (not just by manual sessions), and the empty onboarding docs are filled in.
- The Website Builder feature itself, having been built and verified end-to-end this session, is release-quality for what it claims to do — it should be called out explicitly in release notes once the surrounding P0 issues are resolved.

### 10. Overall Completion (%)

**~50–55%.**

This figure is derived by averaging the per-area scores in §2 and then weighting down for the two cross-cutting systemic gaps that discount every area's practical trustworthiness: **testing (~0%)** and **documentation (~12%)**. The underlying execution engineering (CLI, Agent System, Workflow System, Website Builder) individually scores meaningfully higher (56–74%), but a project's true completion is bounded by its weakest cross-cutting dependency — and here, the absence of any automated regression safety net means every other "complete" feature is complete only by manual verification, which is why the blended overall figure sits meaningfully below the strongest individual area.

---

## Part 1 — Project Audit

*(Source: `docs/PROJECT_AUDIT.md`. Repository-wide audit — read-only, no source modified, no commits created.
Where two sub-audits disagreed, this section uses directly-verified evidence — commands re-run by the
auditor — over secondhand claims, and says so explicitly.)*

### 1. Project Overview

#### Purpose

`D:\ai-web-master` (`package.json` name `ai-web-master`, v0.1.0, private) is **not a single project** — it is an npm-workspaces monorepo hosting four distinct, only loosely-related things at once:

1. **"Development OS"** — a Next.js app living at the **repo root itself** (`app/`, `lib/`, `components/`). Root `package.json` has `dev`/`build`/`start`/`lint` scripts using `next`. This is an internal dev-tooling app (Terminal, Workspace, GitHub, AI, Logs, Settings managers under `app/developer/*`), documented extensively in `docs/01_PMO/CHANGELOG.md`.
2. **CNBIZ client website v2** — `apps/cnbiz-web`, the real `cnbiz.kr` production site (own `package.json`, own deployment).
3. **AI Business OS CLI** — `packages/cli` (`@ai-business-os/cli`, bin `ai`), a globally-installable Node.js CLI implementing agents, workflows, an orchestrator, a marketplace, and (as of this session) a website generator.
4. **A large "AI Business OS" documentation/scaffolding layer** at repo root (`agents/`, `prompts/`, `skills/`, `memory/`, `orchestration/`, `mcp/`, `examples/`, `marketplace/`) — mostly prompt/spec markdown content, largely **disconnected from runtime code** (see §9 and §2 table below).

#### Architecture (as documented vs. as built)

`docs/02_DEVELOPMENT/ARCHITECTURE.md` prescribes a Clean Architecture with a `src/` 4-layer split (Presentation → Business → API → Data). `docs/01_PMO/PROJECT_ROADMAP.md` itself states current phase is **"Phase 0: Foundation"** and explicitly marks `src/` as `🔲 문서만, 코드 미작성` (docs only, no code written). The actual root Next.js app lives in `app/`/`lib/`/`components/`, not `src/`. **The documented architecture and the built architecture are different things; the roadmap doc is self-aware of this gap.**

#### Monorepo structure

Confirmed in `package.json:5-8`:

```json
"workspaces": ["apps/*", "packages/*"]
```

**`apps/*` on disk:** only `apps/cnbiz-web` exists (`ls apps/`).

**`packages/*` on disk:** 11 entries — `agents/`, `cli/`, `design-system/`, `dev-inspector/`, `layout-primitives/`, `prompts/`, `skills/`, `templates/`, `ui/`, `utils/`, `workflows/`.

⚠️ **Mismatch**: only **6 of 11** have their own `package.json` and are therefore real npm workspace members: `cli`, `design-system`, `dev-inspector`, `layout-primitives`, `ui`, `utils`. The other 5 — `packages/agents/`, `packages/prompts/`, `packages/skills/`, `packages/templates/`, `packages/workflows/` — contain **only a single README.md each**, describing an intended structure (e.g. `backend-engineer/`, `coding/`, `authentication/` subpackages) that does not exist on disk. Since npm requires a `package.json` to register a workspace, these 5 are not actually workspace members despite matching the `packages/*` glob path.

`packages/README.md` describes the packages directory as hosting packages "installed, updated, published, and reused... through the AI Business OS CLI and Marketplace" — this framing is misleading for the 5 doc-only stubs.

#### Apps

| App | Path | Real? | Evidence |
|---|---|---|---|
| Development OS | repo root `app/` | ✅ Real, actively developed | Root `package.json` scripts; extensive `docs/01_PMO/CHANGELOG.md` history |
| CNBIZ Website v2 | `apps/cnbiz-web` | ✅ Real, production (`cnbiz.kr`) | Own `package.json`, own `REQUEST.md`, WBS tracks it as the live site |

#### Packages (real workspace members only)

| Package | Path | Purpose | Evidence |
|---|---|---|---|
| `@ai-business-os/cli` | `packages/cli` | The `ai` CLI — see Part 2 | `packages/cli/package.json` |
| design-system | `packages/design-system` | Color/typography/layout tokens for `apps/cnbiz-web` | `packages/design-system/tokens.ts`, `theme.css` |
| dev-inspector | `packages/dev-inspector` | Visual Editor overlay used by `ai devmode` | referenced by `packages/cli/src/lib/devInspectorInstall.js` |
| layout-primitives | `packages/layout-primitives` | `Container`/`Section`/`MobileDrawer` for `apps/cnbiz-web` | consumed by `apps/cnbiz-web/components/*` |
| ui | `packages/ui` | `Button`/`LinkButton`/`Input`/`Textarea`/`Card` for `apps/cnbiz-web` | consumed by `apps/cnbiz-web/components/*` |
| utils | `packages/utils` | `cn()` class-merge helper | consumed across `apps/cnbiz-web` |

### 2. Directory Structure

Every top-level directory at repo root, verified with `ls -la`:

| Directory | Role (evidence) | Status |
|---|---|---|
| `app/` | Root Next.js app — Development OS UI (`app/developer/*`) + legacy CNBIZ v1 public pages | Real |
| `apps/` | npm workspace apps; only `apps/cnbiz-web` | Real |
| `packages/` | npm workspace packages; 6 real / 5 doc-only stubs (see §1) | Mixed |
| `components/`, `lib/`, `public/` | Root Next.js app supporting code | Real |
| `docs/` | Numbered doc system `00_COMPANY` … `09_WORK_HISTORY` + `99_ARCHIVE` | Real, see "Documentation" below |
| `scripts/` | PowerShell install/dev scripts (`setup.ps1`, `ai-business-os.ps1`) | Real |
| `agents/` (root) | `README.md` + 9 role-prompt docs (`ai-engineer.md`, `backend-engineer.md`, etc.), 230–253 lines each | Real content, **but `grep -rn "agents/" --include=*.ts` (excluding `packages/cli/src/templates`) returns zero matches** — not referenced by any runtime code. Pure prompt-library documentation, distinct from `packages/cli/src/runtime`'s actual agent loader which reads from a **project-local** `agents/` folder (i.e. wherever the CLI is run, not this specific directory) |
| `prompts/` (root) | 7 files (`coder.md`, `documenter.md`, `planner.md`, `reviewer.md`, `system.md`, `tester.md` + README), 166–233 lines | Same pattern — real content, not code-referenced |
| `memory/` (root) | 6 files (`coding-memory.md`, `conversation-memory.md`, `decision-memory.md`, `knowledge-memory.md`, `project-memory.md` + README), 160–272 lines | Documents a memory *concept*; distinct from the actually-implemented `packages/cli/src/memory/*` runtime (see Part 3) |
| `orchestration/` (root) | 5 files (`coordination.md`, `execution-policy.md`, `routing.md`, `workflow.md` + README), 243–348 lines | Same pattern — spec docs, distinct from the real `packages/cli/src/orchestrator/*` code |
| `mcp/` (root) | 9 files on MCP server usage conventions (`browser.md`, `context7.md`, `filesystem.md`, `github.md`, `playwright.md`, `postgres.md`, `sequential-thinking.md`, `supabase.md` + README), 246–335 lines each | Documentation only — no actual MCP server config in the repo |
| `examples/` (root) | 6 files; `examples/ai-agent-example.md` is **0 lines** (empty stub); `basic-project.md`, `ecommerce-template.md`, `saas-template.md`, `workflow-example.md` have real 184–353 line content | Mixed |
| `marketplace/` (root) | `README.md`, `release.md`, `manifest.json` (76 lines) + 5 subfolders each containing only a README stub, no `index.json`, no actual packages | Documentation scaffold, **disconnected from the real marketplace runtime** — see §9 |
| `skills/` (root) | 141 files under `skills/core/*` and `skills/domains/*` | Real, substantial — largest scaffolding directory. 16 zero-byte `README.md` stubs remain under `skills/shared/**` (see Part 7) |
| `.github/` | CI workflows + `CODEOWNERS`/`PULL_REQUEST_TEMPLATE.md` | Real, but see Part 7 for CI-quality findings |
| `.claude/`, `.cursor/` | Editor/agent tool config | Real |
| `tests/` | `tests/{unit,integration,e2e,fixtures,mocks,performance,security,reports}/` | **Every subfolder contains only a README.md — zero actual test files** |
| `test-project/` (root) | `agents/`, `prompts/`, `skills/`, `templates/`, `workflows/`, `ai-business-os.json`, `README.md` | **Stray generated artifact** from testing `ai new`/`ai create` — `test-project/README.md` and `test-project/ai-business-os.json` are git-tracked (`git ls-files -- test-project`); its own content confirms `"Generated by AI Business OS CLI"`, `createdAt: 2026-07-11T15:39:08.976Z` |
| `AI-Web-Master/` (root) | ⚠️ **A full nested clone of this same repository**, complete with its own `.git`, `app/`, `apps/`, `packages/`, `docs/`, etc. | **Anomaly — see below, directly verified** |
| Stray root files | `apps-tree.txt`, `packages-tree.txt`, `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), `backup.bat`, `start-wor.bat` | All **committed to git** (confirmed via `git ls-files`) — large `find`/`tree` dump files and ad-hoc batch scripts. Repo bloat |
| `node_modules/`, `.next/`, `.playwright-mcp/`, `package-lock.json`, `tsconfig.tsbuildinfo` | Standard build/dependency artifacts | Normal |

#### `AI-Web-Master/` — directly verified

Two of the five research sub-audits disagreed on whether this nested directory is git-ignored or git-tracked. The auditor re-ran the checks directly rather than trust either claim:

```
$ git status --short -- AI-Web-Master        → (no output — clean, matches HEAD)
$ git check-ignore -v AI-Web-Master          → (no output — NOT ignored)
$ git ls-files -- AI-Web-Master              → AI-Web-Master
$ git ls-tree HEAD -- AI-Web-Master          → 160000 commit a23abdfdf9c12b6a2c67e2ee6602679ca128fba4  AI-Web-Master
$ ls -la .gitmodules                          → No such file or directory
```

**Ground truth: `AI-Web-Master/` is tracked in the git index as a submodule "gitlink" (mode `160000`) pointing at commit `a23abdf` — the very first commit in this repo's own history — with no `.gitmodules` file anywhere in the repo.** This is git's standard (and easy to miss) behavior when a directory containing its own `.git` folder is `git add`ed from a parent repo: git silently records a commit-pointer instead of the files, without warning. The nested clone itself (verified separately) has its own remote `https://github.com/panksooungman-dot/AI-Web-Master.git` and is 7.9 MB on disk. It is not gitignored, so `git status`/`git add -A` in the parent repo will not show it as dirty (it only tracks the gitlink pointer), but it physically sits in the working tree and doubles the results of any directory-wide `find`/`grep` unless explicitly excluded. See Part 8 for remediation options (not executed — audit only).

#### Documentation

Doc tree: 58 markdown files under `docs/` (`find docs -type f -name "*.md"`).

**Confirmed empty (0 lines):** `docs/faq.md`, `docs/getting-started.md`, `docs/installation.md`, `docs/04_OPERATIONS/README.md`, `docs/99_ARCHIVE/README.md`. These match `docs/01_PMO/PROJECT_ROADMAP.md`'s own "Phase 5: AI Business OS Productization (Planned)" table, which lists exactly these three getting-started/installation/faq docs as `🔲 Planned` — the roadmap's self-assessment is accurate.

`docs/README.md` is intentionally a 5-line lightweight index (per `docs/01_PMO/CHANGELOG.md` 2026-07-10 entry), not a stub.

**README files:**
- Root `README.md` — real content, states current phase honestly ("Phase 0 — Foundation, 애플리케이션 코드 미작성") and documents the `ai` CLI install flow. Documents `ai new` as a command (see Part 2 for why this is currently inaccurate).
- `packages/cli/README.md` — **effectively empty** (see Part 7 — 0 bytes, emptied by commit `4c3d5af` and never restored).
- `packages/README.md` — real content but conflates the 5 doc-only stub packages with the 6 real ones (see §1).

**Missing documentation:**
- No single CLI command reference (closest equivalent is scattered `--help` text plus CHANGELOG entries — see Part 2).
- No API reference for the Provider Layer / Tool System / Workflow Engine public interfaces.
- `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md` — empty, as noted above.
- No document reconciling the *actual* on-disk structure (root Development OS app + `apps/cnbiz-web` + `packages/cli` + the root-level doc-scaffolding layer) against the idealized architecture in `ARCHITECTURE.md`.
- No document explaining the relationship (or lack thereof) between root-level `agents/`/`prompts/`/`skills/`/`memory/`/`orchestration/`/`mcp/`/`marketplace/` and the functionally-similar-but-separate implementations inside `packages/cli/src/*` — this naming overlap is a real source of confusion (confirmed independently by two sub-audits).

### 9. Marketplace

Real implementation: `packages/cli/src/marketplace/` (5 files, 309 lines) + `packages/cli/src/commands/{publish,install,search,update,remove}.ts`.

| Capability | Status | Evidence |
|---|---|---|
| Publish | ✅ Implemented | `commands/publish.ts` → `discoverLocalPackages()` scans `<cwd>/{agents,workflows,skills}/` for dirs with `manifest.json` (`marketplace/index.ts:33-59`) → `LocalMarketplaceProvider.publish()` copies into `<cwd>/marketplace/<type>s/<name>/` and appends `<cwd>/marketplace/index.json` (`marketplace/providers/local.ts:56-86`). Handles duplicate-version publish via `ALREADY_PUBLISHED` error |
| Install | ✅ Implemented | `commands/install.ts` → `LocalMarketplaceProvider.install()` (`local.ts:88-103`) copies `<cwd>/marketplace/<type>s/<name>/` to a target dir; `NOT_FOUND`/`DUPLICATE_PACKAGE` errors handled |
| Search | ✅ Implemented | `commands/search.ts` → `LocalMarketplaceProvider.list({type, keyword})` — case-insensitive name+description match (`local.ts:37-54`) |
| Versioning | 🟡 Partial | No semver comparison, no automatic bump, no rollback. Only check is exact-string equality (`local.ts:62`) blocking re-publish of an identical version string. `PackageManifest.version` (`marketplace/types.ts:20`) is free text set by the package author |

**Design note (not a defect):** `MarketplaceProvider` is an interface with a single implementation, `LocalMarketplaceProvider` — the code comment at `marketplace/index.ts:14-18` states this is deliberate, so a future remote registry can be added without touching the commands. **There is currently no remote/online marketplace** — everything is scoped to the local filesystem of whatever `cwd` the CLI runs in.

⚠️ **Disconnect**: `getMarketplaceRoot(cwd) = path.join(cwd, "marketplace")` — the real marketplace state is wherever `ai publish` was run, **not** the root-level `marketplace/` directory in this repo. That root directory has no `index.json` and its 5 subfolders contain only README stubs describing an intended structure. **The functional marketplace code has apparently never been run against this repository's own root.**

---

## Part 2 — CLI Audit

*(Source: `docs/CLI_AUDIT.md`. Scope: `packages/cli/src/index.ts` (entry/routing), `packages/cli/bin/ai.js`,
`packages/cli/src/commands/**`, the interactive menu (`packages/cli/src/commands/menu/**`,
`packages/cli/src/session/**`). Read-only audit — nothing modified.)*

### Top-level commands (registered in `src/index.ts`)

| Command | Description | Status | File(s) | Notes |
|---|---|---|---|---|
| `ai menu` (also bare `ai`) | Interactive numbered menu | ✅ Complete | `commands/menu/index.js` → `session/SessionManager.js` | State-machine driven; bare `ai` with no args also routes here (`index.ts:150-153`) |
| `ai project` | Project launcher — pick recent project, auto-`chdir`, show Git status, offer devmode | ✅ Complete | `commands/project.js` | Reuses `devmode()` |
| `ai devmode` | VS Code + `npm run dev` (auto port detect) + browser preview + Visual Editor | ✅ Complete | `commands/devmode.js`, `lib/devServer.js`, `lib/devInspectorInstall.js` | Windows-oriented (`spawnSync` with `shell:true`, `code.cmd`) |
| `ai deploy` | Push current branch to remote after checks | ✅ Complete | `commands/deploy.js` | Interactive y/N prompts only, no `--yes` flag for CI use |
| `ai register` | Register a path in the global project registry (non-interactive) | ✅ Complete | `commands/register.js` | |
| `ai create agent/workflow/skill <name>` | Scaffold generators | ✅ Complete | `commands/create.ts` → `create-agent.ts`/`create-workflow.ts`/`create-skill.ts` → `generators/*.ts` | See Part 7 for duplication across the 3 generators |
| `ai run <agent-name>` | Execute a single Agent via Runtime | ✅ Complete | `commands/run.ts` → `runtime/runtime.ts` | Falls back to `[simulated]` output if no provider configured |
| `ai workflow create <name>` | Scaffold a workflow | ✅ Complete | `commands/workflow.ts` → `workflow-create.ts` | |
| `ai workflow run <name> [--resume] [--retry]` | Execute workflow steps sequentially | 🟡 Partial | `commands/workflow-run.ts` → `workflow/runtime.ts` | `--resume`/`--retry` print "not implemented yet (placeholder)" and silently re-run from the start (`workflow-run.ts:20-26`); `workflow/runtime.ts:159-165` — `resumeWorkflow()`/`retryWorkflow()` both `throw new WorkflowError("NOT_IMPLEMENTED", ...)` |
| `ai memory list/show/clear/export` | Inspect `.runtime/memory/*.json` | ✅ Complete | `commands/memory.ts` → `memory/commands.js` | |
| `ai orchestrator run/status/stop` | Dependency-aware parallel workflow execution | ✅ Complete | `commands/orchestrator.ts` → `orchestrator/runtime.ts`, `manager.ts` | Confirmed wired: `src/index.ts:13,95` |
| `ai provider list/use/test/models` | Manage LLM providers | ✅ Complete | `commands/provider.ts` → `providers/manager.ts` | |
| `ai tools list/test [id]` | Inspect/smoke-test Tool System | ✅ Complete | `commands/tools.ts` → `tools/manager.ts` | |
| `ai website create` | 8-step AI pipeline + Content Engine → full Next.js site generator | ✅ Complete | `commands/website.ts` → `website/builder.ts` | Options: `--name --site-type --type --audience --brand --language --out --provider`. See Part 5. **Not exposed in `menu.json` or root README** |
| `ai init [project]` | Bootstrap a bare AI-Business-OS folder skeleton (`agents/skills/prompts/templates/workflows` + README + `ai-business-os.json`) | ✅ Complete (narrow scope) | `commands/init.ts` | Overlaps in purpose with `ai create`/`ai new` with no cross-reference between them — undocumented distinction |
| `ai add <package>` | Create a bare package dir under `packages/<name>` (README + package.json only) | 🟡 Partial / likely legacy | `commands/add.ts` | Writes to `packages/`, which is **not** the directory `install`/`publish`/`remove`/`update` operate on (those use `agents/`/`workflows/`/`skills/`) — looks like a leftover from an earlier design |
| `ai install <package> [--type]` | Install a marketplace package into `agents/`/`workflows/`/`skills/` | ✅ Complete | `commands/install.ts` → `marketplace/*` | |
| `ai doctor` | Environment + project-structure check | ✅ Complete | `commands/doctor.ts` | Checks for dirs `packages, agents, skills, prompts, templates, workflows, marketplace, memory, orchestration, .github` unconditionally, regardless of project type |
| `ai search [keyword] [--type]` | Search marketplace index | ✅ Complete | `commands/search.ts` | |
| `ai remove <package>` | Delete `packages/<name>` | 🟡 Partial | `commands/remove.ts` | Operates on `packages/`, not `agents/`/`workflows/`/`skills/` — **inconsistent with `install`/`publish`**; removing an installed agent/workflow/skill via `ai remove` will not find it |
| `ai update <package>` | Re-copy `marketplace/<name>` → `packages/<name>` | 🟡 Partial | `commands/update.ts` | Same `packages/` vs. `agents/workflows/skills` mismatch as `add`/`remove` |
| `ai publish [package]` | Publish local `agents/`/`workflows/`/`skills/` to marketplace | ✅ Complete | `commands/publish.ts` → `marketplace/*` | |
| `--version`/`-V` | Print CLI version (+ build commit) | 🟡 Partial vs. docs | `src/index.ts:40` (`program.version(CLI_VERSION)`) | Commander's default flag for `.version()` is `-V` (capital). `docs/01_PMO/CHANGELOG.md` (2026-07-09 (4)) claims a lowercase `ai -v` was added — **not present** in current `index.ts`; no custom `-v` alias registered anywhere |

#### `ai new` — documented but not a top-level command

Root `README.md:58` documents `ai new` as a direct CLI command ("새 프로젝트 생성"). **`src/index.ts` has no `program.command("new")` registration.** `commands/new.js` (`newProject()`) exists but is wired **only** into the interactive menu's project flow (`session/states/projectState.js:4,36`, reached via `ai menu` → "프로젝트 관리" → new-project). Running `ai new` directly in a shell would hit Commander's unknown-command error.

**Status: ❌ Missing (as a direct command) / ✅ Complete (as a menu-only feature).** Evidence: full read of `src/index.ts` (no "new" command block) vs. `README.md:58` vs. `session/states/projectState.js:4`.

### Interactive menu (`ai menu` / bare `ai`)

Config-driven via `src/config/menu.json`, executed by `session/SessionManager.js` (a state machine — replacing an older recursive-loop design per `docs/01_PMO/CHANGELOG.md` 2026-07-08/09 entries).

| Key | Label | Type | Handler |
|---|---|---|---|
| 1 | 설치/업데이트 | one-shot action | `commands/menu/actions.js:install()` — runs `scripts/setup.ps1` via `spawnSync`, checks exit code |
| 2 | 개발 시작 | state | `session/states/developmentOSState.js` (calls `devmode()`) |
| 3 | 프로젝트 관리 | state | `session/states/projectState.js` — list/select/**New Project** (`newProject` from `commands/new.js`) |
| 4 | 환경 점검 | one-shot action | `actions.js:healthCheck()` → `doctorCommand()` |
| 5 | UI Explorer | one-shot action | `actions.js:uiExplorer()` — opens `http://localhost:3000/developer/ui-map` (requires a dev server already running; no check performed) |
| 6 | Claude Code | one-shot action | `actions.js:claude()` — `spawnSync("claude.cmd", …)` |
| 7 | ChatGPT | one-shot action | `actions.js:chatgpt()` — opens chat.openai.com in browser |
| 8 | Git 관리 | state | `session/states/gitState.js` — status/pull/commit+push submenu |
| 9 | 설정 | state | `session/states/settingsState.js` — only "open config folder"; shows config dir path + registered-project count |
| 0 | 종료 | exit | `SessionManager.js` |

**`ai website create` has no menu entry** — confirmed via `menu.json`, no `website` key/action among the 9 items.

### CLI documentation vs. reality

- Root `README.md` documents install flow + `ai doctor`/`ai new`/`ai devmode` only (lines 56-64). The `ai new` reference is inaccurate (see above). No mention anywhere of `ai website create`, `ai workflow`, `ai memory`, `ai orchestrator`, `ai provider`, `ai tools`, `ai project`, `ai deploy`, `ai register`, marketplace commands, or the interactive menu system.
- `packages/cli/README.md` is effectively empty (0 bytes — see Part 7), despite being the CLI package's own README.
- No dedicated CLI command-reference document exists anywhere under `docs/`.

### Summary status

| Area | Status |
|---|---|
| Core commands (project/devmode/deploy/create/run/memory/provider/tools/doctor) | ✅ Complete |
| Orchestrator commands | ✅ Complete |
| Workflow resume/retry | ❌ Missing (explicit placeholder) |
| Marketplace commands (publish/install/search) | ✅ Complete |
| Marketplace commands (add/remove/update) | 🟡 Partial — inconsistent target directory (`packages/` vs `agents/workflows/skills`) |
| Website Builder command | ✅ Complete (see Part 5) |
| `ai new` as a direct command | ❌ Missing (menu-only) |
| `-v`/`--version` short flag | ❌ Missing vs. CHANGELOG claim |
| CLI documentation | ❌ Missing (no command reference, stale root README) |

---

## Part 3 — Agent System Audit

*(Source: `docs/AGENT_AUDIT.md`. Scope: `packages/cli/src/runtime/`, `packages/cli/src/memory/`,
`packages/cli/src/prompt/`, `packages/cli/src/templates/agent/`, `packages/cli/src/generators/agent.ts`,
plus Provider Layer and Tool System. Read-only audit — nothing modified.)*

### Agent template structure

`packages/cli/src/templates/agent/` produces, per generated agent:

- `agent.json` — metadata (name/type/version/description/author/createdAt/`tools[]`)
- `config.json` — `{"entryPrompt":"prompt.md","variables":{},"memory":{"enabled":true}}`. **Dead reference**: points to `prompt.md`, which does not exist in the template (only `system.md`/`user.md`/`examples.md`/`prompt.json` exist). `runtime/loader.ts:153` requires `config.json` to be present, but its contents (`entryPrompt`, `variables`, `memory.enabled`) are **never read anywhere** in `runtime/executor.ts` or `context.ts` (confirmed via grep — no consumer). It is a required-but-inert file.
- `manifest.json` — looks like duplicate metadata, but is actually consumed by a **different** system: `marketplace/index.ts`/`marketplace/manifest.ts` (packaging/publish), not the agent runtime.
- `prompt.json` — optional version/author metadata for the prompt files, validated by `prompt/validator.ts`.
- `system.md` / `user.md` / `examples.md` — the actual prompt content, `{{var}}`-templated.

**Status: 🟡 Partial** — functional but carries an unused `config.json` schema (`entryPrompt`, `variables`, `memory.enabled` all dead).

### Agent Runtime

Files: `runtime/loader.ts`, `context.ts`, `executor.ts`, `runtime.ts`, `types.ts`.

- `loader.ts:loadAgent()` — resolves `agents/<name>`, falls back to `marketplace/agents/<name>` (lines 14-29). Requires `agent.json` + `config.json` (`REQUIRED_FILES`, line 9). Validates metadata (name/type/semver version/description/author/createdAt, and that every `tools[]` entry is a known tool id — `validateAgentMetadata`, lines 31-95). Delegates prompt-file loading to `prompt/loader.ts` and tool resolution to `tools/manager.ts:loadTools()` (both reused, not reimplemented).
- `context.ts:createRuntimeContext()` — builds `RuntimeContext { project, cwd, timestamp, variables, memory }`; `project` and prior-step `memory` come from `memory/manager.ts:getOrCreateMemory()`.
- `executor.ts:executeAgent()` — renders the prompt via `prompt/engine.ts:buildPrompt()`, then (as of this session) calls the shared `ProviderManager.complete()` helper (`providers/manager.ts`), which does resolve → chat → simulate-fallback in one place. Never throws unless a provider was **explicitly** requested via `--provider` and that call fails — otherwise it silently falls back to a `"[simulated] ..."` string output.
- `runtime.ts:runAgent()` — top-level `ai run <agent>` orchestration: acquires a file lock (`.runtime/locks/<name>.lock`, prevents concurrent duplicate runs) → load → context → execute → log (`.runtime/logs/<name>.log`) → history (`.runtime/history.json`).

**Missing-agent behavior**: `workflow/executor.ts:executeStep()` (lines 65-79) catches `RuntimeError` with code `NOT_FOUND` and returns a **successful simulated** step instead of failing — this lets a workflow be sketched before every referenced agent exists. A structurally-broken agent package (missing files, bad metadata/version) is *not* simulated — it's a real failure that halts the workflow.

**Status: ✅ Complete** for its designed scope (single-turn prompt execution with simulation fallback).

### Prompt system

Files: `prompt/engine.ts`, `loader.ts`, `renderer.ts`, `validator.ts`.

- `loadPromptSet()` reads `system.md` (required), `user.md`/`examples.md` (optional, empty string if absent), `prompt.json` (optional metadata).
- `renderer.ts:renderPromptTemplate()` — regex `\{\{\s*([\w.]+)\s*\}\}`, supports dot-paths (e.g. `{{memory.requirements}}`). Missing values render as **empty string**, not left as literal `{{...}}` text — this differs from the code-scaffolding template engine in `generators/template.ts`, which leaves unknown placeholders untouched.
- Declared variables (`prompt/types.ts:PromptVariables`): `agent`, `project`, `workflow`, `memory`, `step`, `input`, `output`, plus an open `[key: string]: unknown` index — so any agent-spec-specific variable (e.g. the Website Builder pipeline's `siteType`/`siteTypeLabel`) renders correctly too.
- `buildPrompt()` composes `system` → (optional `## Examples`) → (optional rendered `user.md`) into one `combined` string.

**Status: ✅ Complete.**

### Memory usage

Files: `memory/manager.ts`, `storage.ts`, `types.ts`, `loader.ts`, `exporter.ts`, `commands.ts`.

- Storage: `.runtime/memory/<workflow>.json` (per-workflow/agent-name file), audit trail at `.runtime/history/<workflow>.json`, exports at `.runtime/exports/memory-<workflow>.json`.
- `MemoryRecord = { workflow, version, createdAt, updatedAt, context: {project,cwd,variables,user,environment}, steps: Record<agentName, StepMemory> }`; `StepMemory = {status, input, output, startedAt?, finishedAt?, error?}`.
- `getOrCreateMemory()` never overwrites existing memory (idempotent create); `updateStep()` merges one step's status/input/output and always appends a history entry.
- CLI surface: `ai memory list|show|clear|export` (`memory/commands.ts`).

**Status: ✅ Complete.**

### Real agent instances vs. generator capability

Searched the whole repository (excluding `node_modules`, `dist`, and the nested `AI-Web-Master/` clone) for real `agent.json` files outside `packages/cli/src/templates/`. **None found.** The root `agents/`, `marketplace/agents/`, `packages/agents/`, and `lib/agents/` directories all exist but contain no real `agent.json` instances.

The Website Builder's 8-agent pipeline (`packages/cli/src/website/agents.ts`, `WEBSITE_AGENT_SPECS`) does generate real `agents/<name>/agent.json` + `system.md` files — but only inside whatever **output project directory** `ai website create` targets (verified this session by generating a test project). This repo's own root has never had `ai website create` run against it, so no persistent agent instances exist here. **The agent runtime is fully implemented and independently exercised via the Website Builder's workflow, but is not "in use" in this repo's own `agents/` folder.**

### Missing agent features

Compared against what a "complete" agent runtime typically needs:

- **No multi-turn conversation** — `executor.ts` sends exactly one system+user message pair per execution; no accumulated conversation history across turns.
- **No tool-calling loop** — `agent.tools` is resolved to `Tool[]` instances and mentioned as a text note in the prompt (`toolNote` in `executor.ts`), but the LLM response is never parsed for tool-call requests, and there's no loop that executes a tool and feeds the result back to the model. Tools are only invoked directly by CLI code (e.g. `website/scaffold.ts` calling `executeTool("filesystem", ...)`), never by the agent itself.
- **No streaming** — `AIProvider.chat()` (`providers/provider.ts`) returns a single awaited `ChatResponse`; no streaming interface exists.
- **No agent-to-agent handoff protocol** beyond simple sequential/parallel `{{input}}`/`{{output}}` chaining via the Workflow Engine or Orchestrator.
- **No automatic retry on transient provider failures** — a failed non-explicit provider falls back to simulation once; no retry-with-backoff.
- **`config.json`'s `memory.enabled`/`entryPrompt` fields are unused** — memory is always on and the entry prompt is always `system.md`, regardless of what `config.json` declares.

### Runtime infrastructure the Agent System depends on

#### Provider Layer

`packages/cli/src/providers/{anthropic,openai,gemini,ollama,provider,registry,manager,types}.ts` — all four providers are **real HTTP API implementations**, not stubs:

| Provider | Endpoint | Default model | Auth |
|---|---|---|---|
| Anthropic | `https://api.anthropic.com/v1` (Messages API) | `claude-sonnet-5` | `ANTHROPIC_API_KEY` |
| OpenAI | `https://api.openai.com/v1` (Chat Completions) | `gpt-4o-mini` | `OPENAI_API_KEY` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta` | `gemini-1.5-flash` | `GEMINI_API_KEY`, maps `assistant`→`model` role |
| Ollama | `http://localhost:11434` (local) | `llama3` | none — host-based; `validate()` does a live `/api/tags` probe |

Shared helper: `provider.ts:providerFetchJson()` (15s default timeout; non-2xx and JSON-parse failures both become a typed `ProviderError`).

Config: `providers/manager.ts` — `.runtime/config/providers.json`, auto-created with `${ENV_VAR}` placeholder syntax on first read (`interpolateEnv()` resolves from `process.env` at read time — actual key values are never written to disk by this code path, only env-var references).

**This session's refactor** (confirmed present): `ProviderManager.complete({providerId, systemPrompt, userPrompt, fallbackLabel})` centralizes resolve→chat→simulate-fallback. `runtime/executor.ts` (Agent Runtime) and `website/content.ts` (Website Builder Content Engine) both call this one method — no duplicated provider-call logic between the two call sites.

**Status: ✅ Complete.**

#### Tool System

`packages/cli/src/tools/{registry,types,filesystem,terminal,git,github,http,browser,manager}.ts` — 6 tools registered in `tools/registry.ts:TOOLS`, all real implementations:

1. `filesystem` — read/write/list/exists, path-scoped to `cwd` (rejects `../` escapes via `resolveScopedPath`, throws `FORBIDDEN_PATH`)
2. `terminal` — `child_process.exec` with 30s default timeout, 10 MB max buffer, returns `{stdout,stderr,exitCode}`
3. `git` — thin wrapper that builds a `git <args>` string and delegates to the `terminal` tool (reused, not reimplemented)
4. `github` — GitHub REST API (`api.github.com`) for repo/issues/pulls, optional `GITHUB_TOKEN` bearer auth
5. `http` — generic fetch wrapper with timeout
6. `browser` — plain HTTP fetch + regex-based HTML title/text extraction — explicitly documented in-code as NOT a real JS-rendering browser (directs users to the Playwright MCP for real browser automation)

Tools are invoked two ways: (a) declared in an agent's `agent.json:tools[]` and validated/loaded but **never auto-invoked** by the agent itself (no tool-calling loop — see above), or (b) called directly by CLI code via `tools/manager.ts:executeTool(id, input)` (e.g. the Website Builder writing `PLANNING.md`).

**Status: ✅ Complete** as a directly-invokable tool library; 🟡 **not integrated into agent execution** as an agentic tool-use loop.

### Summary status

| Feature | Status | Evidence |
|---|---|---|
| Agent template scaffolding | 🟡 Partial | `templates/agent/config.json` has dead fields |
| Agent Runtime (load/validate/execute) | ✅ Complete | `runtime/{loader,executor,context,runtime}.ts` |
| Prompt Engine | ✅ Complete | `prompt/{engine,renderer,loader,validator}.ts` |
| Memory persistence | ✅ Complete | `memory/{manager,storage,loader}.ts` |
| Provider Layer (4 vendors) | ✅ Complete | `providers/*.ts` |
| Tool System (6 tools) | ✅ Complete (as a library) | `tools/*.ts` |
| Tool-calling loop (agent autonomously invokes tools) | ❌ Missing | no consumer found for tool-call parsing |
| Multi-turn conversation | ❌ Missing | `executor.ts` — single message pair only |
| Streaming | ❌ Missing | `ChatResponse` is non-streaming |
| Real persisted agent instances in this repo | ❌ Missing | none found outside generated output projects |

---

## Part 4 — Workflow System Audit

*(Source: `docs/WORKFLOW_AUDIT.md`. Scope: `packages/cli/src/workflow/`, `packages/cli/src/orchestrator/`,
`packages/cli/src/templates/workflow/`, `packages/cli/src/generators/workflow.ts`. Read-only audit —
nothing modified.)*

### Workflow definition & loading

- **Definition**: `workflow.json = {name, version(semver), steps: [{agent: string, ...open fields}]}` (`workflow/types.ts`). `WorkflowStepDefinition` deliberately allows arbitrary extra fields (`[key: string]: unknown`) for forward-compatibility — this is exactly what the Orchestrator's `dependsOn`/`parallel`/`condition` fields use (see below), without requiring a schema change to the base type.
- **Loading**: `workflow/loader.ts:loadWorkflow()` — same local-then-marketplace resolution pattern as agents (`workflows/<name>` → `marketplace/workflows/<name>`), validated by `workflow/validator.ts:validateWorkflowJson()` (name, semver version, steps array, each step has a non-empty `agent` string).

### Workflow execution (`workflow/runtime.ts:runWorkflow()`)

Sequence: acquire lock (`.runtime/workflow/locks/<name>.lock`) → load → `getOrCreateMemory()` → **sequential** loop over steps calling `workflow/executor.ts:executeStep()` for each, chaining `{{input}}`/`{{output}}` via `previousOutput` → per-step memory update → log (`.runtime/workflow/logs/<name>.log`) → history (`.runtime/workflow/history.json`). **Stop on error**: a failed step halts all remaining steps.

**Existing workflow instances**: only the Website Builder's `website-builder` workflow (8 steps: business-analyst → site-planner → ui-designer → component-generator → page-generator → seo-generator → qa → project-generator), created on demand by `website/workflow.ts:ensureWebsiteWorkflow()` **inside the output project directory** — same caveat as agents: no persistent `workflows/` instance exists in this repo's own root.

### Reusable workflow step patterns

- `stepLabel()` (`workflow/executor.ts:9-19`) converts an agent id like `"ui-designer"` into a human label `"UI Designer"` using an acronym table (`ui,ux,ai,qa,api,seo,os,ci,cd` → uppercased). **Reused, not duplicated**, by the Orchestrator's Planner (`orchestrator/planner.ts:1,48` imports `stepLabel` directly).
- `{{input}}`/`{{output}}` step chaining is the base reusable mechanism both the plain Workflow Runtime and the Orchestrator rely on.

### Missing / explicitly-placeholder features

- **`resumeWorkflow()`/`retryWorkflow()`** (`workflow/runtime.ts:159-165`) are explicit stubs: `throw new WorkflowError("NOT_IMPLEMENTED", ...)`. The `ai workflow run --resume`/`--retry` flags exist in `commands/workflow-run.ts` and print a yellow "not implemented yet (placeholder)" warning, then **silently re-run the workflow from the start** instead of erroring out or refusing — see Part 8 item 3 for the risk this poses to non-idempotent steps (e.g. duplicate commits/pushes).
- `workflow/runtime.ts` itself has **no parallel execution, no conditional branching, no dependency graph** — it is a flat sequential list.
- **No per-step retry or fallback-step mechanism** beyond stop-on-error, in either engine.

### The Orchestrator — a second, more capable engine on the same file format

`packages/cli/src/orchestrator/` (Planner + Scheduler + Executor) is layered on top of the exact same `workflow.json` format and is **not dead code** — confirmed wired end-to-end:

- `orchestrator/planner.ts:createExecutionPlan()` builds a dependency graph from each step's optional `dependsOn: string[]` or `parallel: true` field, falling back to a strict sequential dependency on the previous step when neither is present — **100% backward-compatible** with plain `workflow.json` files that have neither field.
- Topologically sorts into `ExecutionStage`s; `orchestrator/scheduler.ts:runPlan()` executes each stage's steps via `Promise.all` when a stage has more than one step (true parallelism).
- Persists live status to `.runtime/orchestrator/status.json`.
- Supports graceful stop mid-run via a stop-flag file checked at each stage boundary (`ai orchestrator stop`).
- A `condition` field is recognized and labeled `"conditional"` in output, but **not evaluated** — `scheduler.ts:79` explicitly logs `"conditional — evaluation not yet implemented"`.
- `orchestrator/executor.ts:executeStage()` explicitly **reuses** `workflow/executor.ts:executeStep()` for each individual step (a code comment states this is intentional, to avoid duplicating the Agent Runtime call path including simulation fallback) — so there is no duplication of the actual step-execution logic between the two engines.
- CLI surface confirmed registered: `src/index.ts:13,95` imports/registers `buildOrchestratorCommand()`; `commands/orchestrator.ts` implements `ai orchestrator run <workflow> [--provider]`, `ai orchestrator status`, `ai orchestrator stop`.

**Net effect**: this repo has **two workflow execution engines** operating on the same `workflow.json` file format — `workflow/runtime.ts` (simple sequential, via `ai workflow run`) and `orchestrator/runtime.ts` (DAG-based, parallel, stoppable, via `ai orchestrator run`). They don't duplicate step-execution logic (Orchestrator reuses `workflow/executor.ts`), but the two overlapping top-level commands are a likely source of user confusion — see Part 8.

### Summary status

| Feature | Status | Evidence |
|---|---|---|
| Workflow definition/loading/validation | ✅ Complete | `workflow/{types,loader,validator}.ts` |
| Sequential execution (`ai workflow run`) | ✅ Complete | `workflow/runtime.ts` |
| Resume | ❌ Missing (explicit stub) | `workflow/runtime.ts:159-161` |
| Retry | ❌ Missing (explicit stub) | `workflow/runtime.ts:163-165` |
| Parallel/DAG execution | ✅ Complete (via Orchestrator, not base engine) | `orchestrator/{planner,scheduler}.ts` |
| Conditional branching | 🟡 Partial — recognized, not evaluated | `orchestrator/scheduler.ts:79` |
| Graceful stop | ✅ Complete (Orchestrator only) | `orchestrator/scheduler.ts`, `commands/orchestrator.ts` |
| Locking against duplicate concurrent runs | ✅ Complete | `workflow/runtime.ts` (`.runtime/workflow/locks/`) |
| Two overlapping execution engines on one format | 🟡 Architecture note, not a defect | `workflow/runtime.ts` vs `orchestrator/runtime.ts` |

---

## Part 5 — Website Builder Audit

*(Source: `docs/WEBSITE_BUILDER_AUDIT.md`. Scope: `packages/cli/src/website/{types,content,scaffold,builder,agents,workflow}.ts`,
`packages/cli/src/commands/website.ts`, `packages/cli/src/templates/website/**`. This is the CLI's
`ai website create` feature ("Website Builder v2"), built and directly verified in this same working
session (implementation, `npx tsc --noEmit`, full `npm install` + `npm run build` + `npm run lint` +
`npm run start` + route-by-route `curl` check against a generated project, then a second generation
run to confirm the `--site-type` fallback path). Read-only for this audit pass itself.)*

### Current implementation

`ai website create` runs an 8-step Planning pipeline (existing Workflow Engine, `website/workflow.ts`, `website/agents.ts`) unchanged from its prior version, then generates the actual project via:

1. **Content Engine** (`website/content.ts`, 462 lines) — builds a deterministic default `SiteContent` object (`buildDefaultContent()`) from the user's inputs (project name, business type, target audience, brand, site type), then attempts one Provider Layer call (`ProviderManager.complete()`) asking for a large JSON object of prose overrides (headline, subheadline, per-page intros, features, testimonials, values, services, products, pricing plans, FAQ, blog posts, SEO title/description). The AI response is parsed leniently (`parseOverrides()`) and merged field-by-field (`mergeOverrides()`) — any missing/malformed field falls back to the deterministic default, and a JSON-parse failure discards the whole AI response with no error, keeping the deterministic defaults. **This guarantees a working project regardless of whether a provider is configured.**
2. **Generator** (`generators/website.ts` → `generators/template.ts:generateFromTemplate()`, the same generic template-copy engine used by `ai create agent/workflow/skill`) — copies `templates/website/` to the target directory, substituting `{{var}}` placeholders (extended this session to also render `.svg` files, for brand-colored logo/icon/placeholder assets).
3. **Tool System** — `PLANNING.md` (a transcript of the 8-step pipeline's planning output) is written via `executeTool("filesystem", ...)`, the same Tool System used elsewhere in the CLI.

No new execution engine was introduced — the feature is a composition of the existing Generator, Workflow Engine, Prompt Engine (`renderPromptTemplate` used to build the Content Engine's system prompt), Provider Layer, and Tool System.

### Supported website types

11 types, defined in `website/types.ts` (`WEBSITE_TYPES` const, 184 lines total): `website` (general/default), `landing`, `portfolio`, `corporate`, `agency`, `dental`, `hospital`, `restaurant`, `shopping`, `blog`, `education`.

Selected via `--site-type <type>` (`commands/website.ts`). An unrecognized value prints a warning and falls back to `"website"` — **directly verified this session**: `ai website create --site-type bogus-type ...` printed `⚠ Unknown site type "bogus-type" — falling back to "website" (general)` and generated a project with the general palette (`--primary: #2563eb`).

Each type maps to:
- A distinct color palette (`PALETTES` — primary/primaryDark/secondary/accent per type; background/foreground/muted/border/success/warning/danger shared across all types) — `types.ts:BRAND_COLORS`.
- Content vocabulary (`SITE_TYPE_COPY` — label, hero kicker, product noun, pricing noun, 3 feature titles, 4 service titles per type) used by the Content Engine's deterministic defaults.

**Design trade-off (not a defect, but worth stating plainly)**: the site *type* changes color palette and content vocabulary, but **not** which pages get generated — every type produces the same fixed 11-page set (see below). A "restaurant" site therefore gets a SaaS-style "Pricing" page with subscription tiers ($0/mo, $49/mo, Enterprise), which is a mismatch for that business type unless the generated content is hand-edited afterward. This was a deliberate scope-reduction decision during implementation, not an oversight — flagged here as a known limitation.

### Supported pages

All 11 requested page types are generated **unconditionally, every run**, regardless of site type:

| Page | Route | File |
|---|---|---|
| Home | `/` | `app/page.tsx` |
| About | `/about` | `app/about/page.tsx` |
| Services | `/services` | `app/services/page.tsx` |
| Products | `/products` | `app/products/page.tsx` |
| Pricing | `/pricing` | `app/pricing/page.tsx` |
| FAQ | `/faq` | `app/faq/page.tsx` |
| Blog | `/blog` | `app/blog/page.tsx` |
| Contact | `/contact` | `app/contact/page.tsx` |
| Privacy | `/privacy` | `app/privacy/page.tsx` |
| Terms | `/terms` | `app/terms/page.tsx` |
| 404 | any unmatched route | `app/not-found.tsx` |

**Missing**: no individual blog-post detail pages (`/blog/[slug]`) — the Blog page is a listing of placeholder excerpts only, with no linked detail route. No CMS/database — all content is static, generation-time text in `lib/content.ts`, editable only by hand afterward.

### Design system

- `styles/tokens.ts` — raw tokens (colors from the resolved palette, plus static typography/layout/radius/breakpoints scale, mirroring the convention in `packages/design-system/tokens.ts`).
- `styles/theme.ts` — semantic layer combining `tokens.ts` + site identity (`name`, `type`) into one `theme` export.
- `styles/theme.css` — Tailwind v4 `@theme inline` block mapping CSS custom properties to Tailwind color utilities (`bg-primary`, `text-foreground`, `border-border`, etc.), following the exact same pattern already used by `packages/design-system/theme.css`.

**Missing**: no dark-mode variant (`@media (prefers-color-scheme: dark)`) — confirmed by grep, `styles/theme.css` has no such block, unlike some other assets in this repo. No design-token documentation generated alongside the code.

### Components

12 components generated per project (`templates/website/components/`): `Header`, `Navbar`, `Footer`, `Hero`, `Features`, `CTA`, `Testimonials`, `Pricing`, `FAQ`, `ContactForm`, `Newsletter`, `JsonLd` — plus one unlisted-but-reasonable helper, `Container`, factored out to avoid repeating the `mx-auto max-w-6xl px-6` wrapper in every other component. All 11 requested component names are present.

`ContactForm` and `Newsletter` are Client Components with real fetch-based submission (`"use client"`); `FAQ` and `Navbar` are Client Components for interactivity (accordion, mobile menu); the rest are Server Components.

### SEO

- `app/robots.ts` → `/robots.txt` (Next.js file convention, same pattern as `apps/cnbiz-web/app/robots.ts`)
- `app/sitemap.ts` → `/sitemap.xml`, all 11 non-404 routes with per-route priority/changeFrequency
- `app/opengraph-image.tsx` → dynamic PNG via `next/og`'s `ImageResponse`, same pattern as the repo-root `app/opengraph-image.tsx`
- `public/manifest.json` → PWA manifest, referenced via `metadata.manifest` in `app/layout.tsx`
- Per-page `export const metadata: Metadata` on every route
- Organization JSON-LD (`components/JsonLd.tsx`, rendered once in `app/layout.tsx`)

**Missing**: no `twitter:image` distinct from the OG image (falls back to it, standard behavior, not necessarily a gap). No structured data beyond Organization (no BreadcrumbList, no per-page `Article`/`Product` schema).

### Assets

- `app/icon.svg` — Next.js file-convention favicon/app icon, brand-initial monogram on the primary color
- `public/logo.svg` — wordmark version (icon + project name text)
- `public/images/placeholder-{wide,square,portrait}.svg` — 3 generic placeholder images in the muted/border palette colors

**Missing**: no raster fallback (`.ico`/`.png`) for older browsers/platforms that don't support SVG favicons. No AI-generated imagery — all assets are procedurally-drawn SVG shapes/text, not illustration or photography.

### Deployment

- `.env.example` — `NEXT_PUBLIC_SITE_URL` (wired: `lib/site-config.ts` reads `process.env.NEXT_PUBLIC_SITE_URL` at runtime, overriding the generation-time placeholder domain) + commented-out `CONTACT_EMAIL_TO`/`CONTACT_EMAIL_FROM`/`RESEND_API_KEY` placeholders (documented but unused by the generated code — see below)
- `vercel.json` — minimal framework/build/dev/install command config
- `README.md` — full project structure, design system explanation, content-editing instructions, deployment steps

`app/api/contact/route.ts` and `app/api/newsletter/route.ts` — real server-side validation (required fields, email regex, honeypot on the contact form) and `console.log` on success. **No actual email delivery is wired in** — the `.env.example` documents `RESEND_API_KEY` etc. as an extension point, but the route code never reads those variables or calls any email provider. Forms "work" (return `{success:true}` and clear) but a real submission is only visible in server logs.

### Missing features (explicit, for the roadmap)

- No page-set customization by site type (all 11 pages always generated — see "Design system trade-off" above)
- No blog post detail pages / CMS
- No actual email delivery (contact/newsletter routes log to console only)
- No dark mode
- No `ai website update` / regenerate-in-place command — only `create`; editing after generation is manual file editing
- No language localization of the deterministic default content — `buildDefaultContent()` always writes English text regardless of the `--language` input; only the AI-enrichment prompt is instructed to "Write in {{language}}", so non-English output only happens when a provider is actually configured and succeeds
- No automated test coverage for the generator itself (consistent with the rest of the repo — see Part 7)
- No accessibility audit run beyond default `eslint-config-next` linting (which passed with zero warnings on the generated project)
- Not exposed in the interactive `ai menu` (see Part 2)

### Verification performed this session

- `packages/cli` — `npx tsc --noEmit` passed (after excluding `src/templates/**` from the CLI's own tsconfig, since template source files intentionally contain `{{var}}` placeholders that are not valid standalone TypeScript)
- `npm run build` (CLI package) — succeeded, `dist/templates` correctly mirrors `src/templates`
- Generated a real project (`ai website create --site-type dental ...`) — 51 files produced, no leftover unsubstituted `{{...}}` placeholders (confirmed via `grep -rn "{{"`, all remaining matches were legitimate JS/JSX double-brace syntax: `style={{...}}`, `dangerouslySetInnerHTML={{...}}`, JSX prop objects)
- `npm install` in the generated project — succeeded (356 packages)
- `npm run build` — succeeded: all 11 pages + `/api/contact` + `/api/newsletter` + `robots.txt`/`sitemap.xml`/`opengraph-image`/`icon.svg` built without error
- `npm run lint` — zero warnings/errors
- `npm run start` + `curl` against every route — all 200 (or 404 for an intentionally-missing route), dental palette color (`#0ea5e9`) confirmed present in `manifest.json`'s `theme_color`
- `/api/contact` and `/api/newsletter` — real POST requests returned `{"success":true}`
- Regenerated with an invalid `--site-type` to confirm the fallback warning + default palette

### Summary status

| Feature | Status | Evidence |
|---|---|---|
| Site type selection (11 types + fallback) | ✅ Complete | `website/types.ts`, verified this session |
| Fixed 11-page generation | ✅ Complete | `templates/website/app/**`, verified this session |
| Per-site-type page customization | ❌ Missing | design trade-off, see above |
| Design system (tokens/theme/theme.css) | ✅ Complete | `templates/website/styles/*` |
| 12 components | ✅ Complete | `templates/website/components/*` |
| SEO (robots/sitemap/OG/manifest/JSON-LD/metadata) | ✅ Complete | `templates/website/app/{robots,sitemap,opengraph-image}.ts(x)`, `public/manifest.json` |
| Assets (logo/icon/placeholders) | ✅ Complete (SVG only, no raster) | `templates/website/app/icon.svg`, `public/*` |
| Deployment files (.env.example/vercel.json/README) | ✅ Complete | `templates/website/{.env.example,vercel.json,README.md}` |
| Content generation via Provider Layer | ✅ Complete, with deterministic fallback | `website/content.ts` |
| Actual email delivery | ❌ Missing | `templates/website/app/api/{contact,newsletter}/route.ts` — logs only |
| Blog detail pages / CMS | ❌ Missing | `templates/website/app/blog/page.tsx` — listing only |
| Dark mode | ❌ Missing | `templates/website/styles/theme.css` |
| CLI menu integration | ❌ Missing | not in `menu.json` |

---

## Part 6 — Dashboard & API Audit

*(Source: `docs/DASHBOARD_AUDIT.md`. Scope: repo-root `app/**` (the "Development OS" dashboard,
distinct from `apps/cnbiz-web`) and every real API route in this repo. Read-only audit — nothing modified.)*

### ⚠️ Cross-cutting note

`AI-Web-Master/` (repo root) is a full nested clone of this same repository, tracked as a broken git
submodule gitlink (see Part 1 for directly-verified evidence). It silently doubles the
results of any repo-wide `find`/`grep`. All findings below exclude it.

### Dashboard (`app/**` at repo root)

Root `app/` hosts **two coexisting products**: the public CNBIZ v1 marketing site (`/`, `/about`, `/services`, `/portfolio`, `/contact`) and the internal Development OS (`/developer/*`, `/projects*`, `/login`, `/signup`). `apps/cnbiz-web/` is the separate, real production site and is out of scope for this file.

`docs/UI_MAP.md` (dated 2026-07-07) already documents this area in detail; its claims were spot-checked against current code and found accurate, with one addition: `app/developer/ui-map/page.tsx` now exists and is linked from `components/developer/DeveloperNav.tsx` (post-dates the doc).

#### Developer pages — backend wiring

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

#### Public-site pages (v1, unauthenticated)

| Page | Route | Status | Evidence |
|---|---|---|---|
| Login | `/login` | 🟡 UI only, no backend | `app/login/page.tsx` — `handleSubmit` only calls `e.preventDefault()`, no `fetch` anywhere in file |
| Signup | `/signup` | 🟡 UI only, no backend | same pattern |
| Home/About/Services | `/`, `/about`, `/services` | ✅ Static content | Real content, no forms |
| Portfolio | `/portfolio` | 🟡 Placeholder | "Coming soon" section only |
| Contact | `/contact` | ❌ Broken | `components/sections/ContactForm.tsx:80` calls `fetch("/api/contact")`, but **`app/api/contact/route.ts` does not exist at repo root** — confirmed via `ls`. Every submission fails. (Note: `apps/cnbiz-web` — a *separate* Next app — does have a fully working `/api/contact`; this finding is specific to the root Development OS app's copy of the marketing pages.) |

#### Missing dashboard functionality

- **No authentication/authorization anywhere** — repo-wide grep for `getServerSession|auth\(|Authorization|cookies\(\)|jwt` across `app/api/**` returns zero matches. Every API and page is open.
- **No `/admin` screen** — the route doesn't exist; only referenced as a disallow entry in `app/robots.ts`.
- **No customer/CRM management screen** — no such route or data model anywhere under `app/`.
- **No marketplace UI** — nothing under `app/` consumes the CLI's marketplace system (see Part 1 §9).

### API routes (this repo's own running app)

33 `route.ts` files under root `app/api/**`. **None use a validation library** (zero matches for `zod` etc. repo-wide) — validation is ad-hoc manual type-guards where present, absent elsewhere. **Zero authentication on any route.**

| Route | Methods | Purpose | Backend service | Validation |
|---|---|---|---|---|
| `/api/terminal` | GET, POST | GET returns cwd; POST executes an **arbitrary shell command string** | `lib/terminal/server.ts:executeShellCommand` | Manual type-guard only — `command` and `cwd` are both fully caller-controlled. **Flagged in Part 8 as an unauthenticated remote-command-execution endpoint by design (a local dev tool, but worth noting explicitly)** |
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

#### Not part of this repo's own running app (noted for completeness, excluded from the table above)

- `apps/cnbiz-web/app/api/contact/route.ts` — separate Next.js app, fully implemented with validation, honeypot, rate-limiting, and email notification.
- `packages/cli/src/templates/website/app/api/{contact,newsletter}/route.ts` (and its mirror in `packages/cli/dist/templates/...`) — CLI **template source** copied into *generated* websites by `ai website create`; does not run in this repo. See Part 5.

### Summary status

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

---

## Part 7 — Code Quality Audit

*(Source: `docs/CODE_QUALITY.md`. Scope: Testing (coverage, build verification), TODO/FIXME/XXX/HACK,
duplicate code, dead code, unused files, unused exports. Read-only audit — nothing modified.
Security findings and architecture-level technical debt are in Part 8; this section covers
code-hygiene findings only.)*

### Testing

**Test files: 0.** `find` for `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `**/__tests__/**` across the entire repository returned no matches.

**`tests/` is a documentation scaffold, not a test suite.** `tests/{unit,integration,e2e,fixtures,mocks,performance,security,reports}/` each contain only a `README.md` and zero actual test files.

**No test framework is configured anywhere:**
- Root `package.json` scripts: `dev`, `build`, `start`, `lint` — no `test`.
- `packages/cli/package.json` scripts: `build`, `dev`, `start`, `clean` — no `test`.
- `apps/cnbiz-web/package.json` scripts: `dev`, `build`, `start`, `lint` — no `test`.
- The only test-adjacent dependency in the whole monorepo is `playwright` (`^1.61.1`) in root `devDependencies` — but there is no `playwright.config.*` anywhere. This is the interactive Playwright **MCP tool** used ad hoc during dev sessions (per root `CLAUDE.md`'s "Playwright 사용 원칙"), not an automated test runner.

**CI is decorative for testing** (`.github/workflows/test.yml`):

```yaml
- name: Run Unit Tests
  run: |
    if [ -f package.json ]; then
      npm run test:unit --if-present
    ...
- name: Generate Test Summary
  run: |
    echo "✓ Unit Tests"
    echo "✓ Integration Tests"
    echo "✓ End-to-End Tests"
```

`test:unit`/`test:integration`/`test:e2e` scripts do not exist in any `package.json`, so `--if-present` silently no-ops every step — yet the final step unconditionally prints "✓" for all three regardless of whether anything ran. **This workflow reports success on every push with zero actual test execution.**

**`.github/workflows/lint.yml` only lints the root workspace.** It runs `npm run lint --if-present` from the repo root. Root `eslint.config.mjs` explicitly does `globalIgnores(["apps/**", "packages/**"])` — confirmed by reading the file — so CI never lints `packages/cli` or `apps/cnbiz-web`, even though both have their own `lint` scripts that would need a separate invocation (e.g. `npm run lint --workspaces`) to actually run in CI.

**`.github/workflows/docs.yml` would currently fail if triggered** — see "Unused/orphaned files" below.

**Conclusion: 0% automated test coverage.** All verification documented in `docs/01_PMO/CHANGELOG.md`'s history has been manual/live (curl requests, Playwright MCP snapshots, `npm run build`), one-off, and not repeatable via CI.

### TODO / FIXME / XXX / HACK

Grep across real source (`.ts`/`.tsx`, excluding `node_modules`/`dist`/the nested `AI-Web-Master/` clone) found **only intentional, non-debt occurrences**:

- `packages/cli/src/generators/{agent,skill,workflow}.ts` — default placeholder description text (`"TODO — describe what this agent does"`) that gets written into **scaffolded output for end users**, not a marker of incomplete CLI code.
- `apps/cnbiz-web/components/sections/{ContactInfoSection,PortfolioPlaceholderSection}.tsx` — literal "TODO" **UI badges** shown to site visitors for unconfirmed business facts (documented, intentional, per `docs/01_PMO/CHANGELOG.md` 2026-07-04 entry).

No FIXME/XXX/HACK found anywhere in real code. **Zero actual code-debt TODOs.**

#### Explicit unimplemented placeholders (honest, self-labeled — not hidden TODOs)

- `packages/cli/src/workflow/runtime.ts:159-165` — `resumeWorkflow()`/`retryWorkflow()` both immediately `throw new WorkflowError("NOT_IMPLEMENTED", ...)`.
- `packages/cli/src/commands/workflow-run.ts:21,25` — `--resume`/`--retry` flags print a warning and fall back to running from scratch.
- `packages/cli/src/orchestrator/scheduler.ts:79` — conditional stage evaluation is labeled but not implemented.

### Duplicate code

**`packages/cli/src/generators/{agent,skill,workflow}.ts` are ~95% identical** (46/41/41 lines respectively, 128 total). Each does: destructure `{name, cwd, description="TODO...", author="AI Business OS", version="1.0.0"}` → `assertValidName(name)` → build `targetDir = path.join(cwd, "<agents|skills|workflows>", name)` → call `generateFromTemplate({templateType, targetDir, variables: {name, className: toPascalCase(name), description, author, version, createdAt, createdAtDate}})` → return `{name, targetDir, files}`. The only real differences are the `templateType` string, the target subfolder, and default description text.

**Refactoring opportunity**: collapse into one `generateScaffold(kind, options)` function with a 3-entry lookup table, eliminating roughly 90 lines of duplication.

**Not flagged as duplication (false-positive check)**: `packages/cli/src/providers/{anthropic,openai,gemini,ollama}.ts` are structurally similar but each necessarily implements a different wire format (different auth headers, endpoints, request/response shapes). This is the expected shape of an adapter layer, and the common HTTP/timeout/error-handling logic is already correctly factored out into `providerFetchJson()` in `provider.ts`.

### Dead / unreachable code

- **`packages/cli/src/orchestrator/*` is fully implemented and wired**, not dead. Confirmed reachable: `commands/orchestrator.ts` → `buildOrchestratorCommand()` → registered at `src/index.ts:95`.
- **`packages/cli/src/commands/new.js`'s `newProject()` has no top-level CLI registration.** Full read of `src/index.ts` confirms `menu`, `project`, `devmode`, `deploy`, `register`, `create` (+ `create-agent`/`create-workflow`/`create-skill`), `run`, `workflow` (+ `workflow-create`/`workflow-run`), `memory`, `orchestrator`, `provider`, `tools`, `website`, `init`, `add`, `install`, `doctor`, `search`, `remove`, `update`, `publish` are registered — **there is no `.command("new")`**. `new.js` is reachable only via `session/states/projectState.js` (the interactive menu's project-registration flow). See Part 2 for the doc-mismatch this causes.

### Unused / orphaned files

- **`packages/cli/install.ps1`, `packages/cli/README.md`, `packages/cli/ai.cmd`, `packages/cli/ai.ps1`, `packages/cli/install.sh`, `packages/cli/Setup.cmd` are all 0 bytes — and this is committed, not a local accident.** Verified via `git status --short` (clean, matches HEAD) and `git show HEAD:packages/cli/install.ps1 | wc -c` → `0`. Root cause traced via `git show --stat 4c3d5af` ("docs: complete packages documentation", 2026-07-11 18:07:25): that commit deleted **338 lines** from `install.ps1` (→ 0), plus emptied `README.md`, `ai.cmd`, `ai.ps1`, `install.sh`, and 20 lines from `package.json`, while adding new `packages/{README,agents,prompts,skills,templates,workflows}/README.md` docs in the same commit. Later commits (`803471b`, `a4ae983`, `4e7900d`, `a23abdf`) restored `package.json` and `src/index.ts` to full working state, **but never restored `install.ps1`/`README.md`/`ai.cmd`/`ai.ps1`/`install.sh`/`Setup.cmd`.** They remain empty at current HEAD.
  - **Live impact**: `scripts/setup.ps1` (repo root, the documented one-command installer) directly calls `packages/cli/install.ps1` (`scripts/setup.ps1:182,186`). Since that script is now empty, running `scripts/setup.ps1` today cannot install the global `ai` command via that path. `setup.ps1` does verify `ai.cmd` actually got created (line 208/218), so it will correctly *report* failure rather than falsely claim success — but the documented install flow is currently broken. See Part 8 item 1.
- **16 zero-byte `README.md` stub files under `skills/`**: `skills/shared/README.md` plus `skills/shared/{api-design,authentication,authorization,coding-standards,database,design-system,documentation,error-handling,logging,monitoring,performance,security,testing,validation}/README.md`, and `skills/templates/README.md`. (`docs/01_PMO/CHANGELOG.md`'s 2026-07-10 entry mentioned "14" category-index stubs as unresolved; the current actual count is 16.) **This is also why `.github/workflows/docs.yml` would fail if run**: its "Check Empty Markdown Files" step does `find . -name "*.md" -size 0` and `exit 1` on any match — these 16 files plus `LICENSE`, `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/README.md`, `docs/{faq,getting-started,installation}.md`, `docs/04_OPERATIONS/README.md`, `docs/99_ARCHIVE/README.md`, and the 6 empty `packages/cli/*` files above would all trigger that failure. Separately, `docs.yml` also requires a `skills/README.md` at that exact path, which does not exist (there is `skills/core/SKILL.md`, `skills/domains/SKILL.md`, `skills/experts/SKILL.md`, but no `skills/README.md`) — a second independent reason that workflow would fail.
- `LICENSE` at repo root is 0 bytes — the file exists (implying intent to license) but has no actual license text.
- `test-project/` (repo root) — stray artifact from testing `ai new`, partially git-tracked (`test-project/README.md`, `test-project/ai-business-os.json`). See Part 1 §2.
- Large committed dump files: `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), `apps-tree.txt`, `packages-tree.txt` — all tracked via `git ls-files`. See Part 8.
- The root-level `cli/` directory flagged as a deletion candidate in the 2026-07-10 CHANGELOG entry no longer exists on disk (resolved at some point since, with no CHANGELOG entry documenting the removal).

### Unused exports

Not exhaustively verified — a full cross-repo import graph was out of scope for this pass. Spot checks on the orchestrator module (confirmed fully referenced, see above) and the provider registry (`packages/cli/src/providers/registry.ts`, confirmed referenced) found no unused-export issues. No additional findings beyond the dead-code items already listed above.

### Summary status

| Area | Status | Evidence |
|---|---|---|
| Automated test coverage | ❌ Missing (0%) | no test files anywhere; no test script in any `package.json` |
| CI test workflow | ❌ Misleading (always reports success) | `.github/workflows/test.yml` |
| CI lint workflow | 🟡 Partial (root workspace only) | `.github/workflows/lint.yml`, `eslint.config.mjs` |
| CI docs workflow | ❌ Would fail if run | `.github/workflows/docs.yml` vs. 16+ empty `.md` files |
| TODO/FIXME/HACK debt | ✅ None found | grep, whole repo |
| Duplicate code | 🟡 One concrete instance (generators) | `generators/{agent,skill,workflow}.ts` |
| Dead code | 🟡 One instance (`ai new` unregistered) | `src/index.ts` vs `commands/new.js` |
| Orphaned/empty committed files | ❌ Multiple (installer scripts, skills stubs, LICENSE) | see above |

---

## Part 8 — Technical Debt & Security Audit

*(Source: `docs/TECH_DEBT.md`. Scope: security (secrets, API keys, unsafe code, validation) and
architecture-level technical debt. Read-only audit — nothing modified, nothing fixed.)*

### Security

#### Secrets / API keys

**No hardcoded secrets found.** Searched the entire repository (excluding `node_modules`/`.git`/`dist`/the nested `AI-Web-Master/` clone) for AWS keys (`AKIA...`), Google API keys (`AIza...`), GitHub tokens (`ghp_...`), OpenAI-style keys (`sk-...`), Slack tokens (`xoxb-...`), and PEM private-key headers. The only match was the pattern definition itself inside `.github/workflows/security.yml` (the CI script that greps for these patterns) — a false positive, not a real secret.

**`.env` handling is correct:**
- Only `.env.example` files are committed (`apps/cnbiz-web/.env.example`, `packages/cli/src/templates/website/.env.example`) — both are value-less templates.
- `apps/cnbiz-web/.env.local` exists on disk with a real API key but is confirmed **not tracked by git** (`git ls-files | grep .env.local` → no match).
- Root `.gitignore` has `.env*.local` plus an explicit `!.env.example` exception.

**`security.yml` CI workflow does real work** (unlike `test.yml`): runs `npm audit --audit-level=high` and greps for secret patterns with `exit 1` on match. This is a genuine, functioning check.

#### Unsafe code patterns

- **No `eval(`** anywhere in the repository.
- **`dangerouslySetInnerHTML`** — 2 occurrences, both low-risk: `app/layout.tsx:69` and `packages/cli/src/templates/website/components/JsonLd.tsx:15`. Both feed `JSON.stringify()` of a locally-constructed, non-user-controlled object (site config / Organization schema) into a `<script type="application/ld+json">` tag — the standard Next.js pattern for JSON-LD, carrying no injection risk since there is no unsanitized user input in the payload.
- **`child_process.exec()`** (the shell-string variant, vulnerable to metacharacter injection if fed unsanitized input) appears in exactly one place: `packages/cli/src/tools/terminal.ts:1`. This backs the CLI's `terminal` Tool, which is explicitly designed to run arbitrary shell commands on behalf of an agent/user — an inherent property of a terminal tool, not a bug, but the caller-supplied command string does reach `exec()` directly. **Also relevant**: `app/api/terminal/route.ts` (repo-root dashboard) exposes an unauthenticated HTTP endpoint that runs an arbitrary shell command string (via `lib/terminal/server.ts:executeShellCommand`) with no auth check.
- All other `child_process` usage across the repo uses `spawn`/`spawnSync`/`execFile` (argument-array form) or `execSync` with fully static, hardcoded strings (`"node -v"`, `"npm -v"`, `"git --version"`, `"netstat -ano -p tcp"` in `doctor.ts` and `devServer.js`) — no interpolated input reaches any of these, so no injection risk there.

#### API validation

Spot-checked: `app/api/contact/route.ts` (root Dev OS, though note it doesn't actually exist — see Part 6) and the newly-generated `packages/cli/src/templates/website/app/api/{contact,newsletter}/route.ts` templates validate required fields and email format server-side before processing. No schema-validation library (`zod` etc.) is used anywhere in the repo — validation is entirely manual/ad-hoc, present in most but not all of the 33 root API routes (see Part 6 for the full table).

#### Security summary

| Item | Status | Evidence |
|---|---|---|
| Hardcoded secrets | ✅ None found | repo-wide grep |
| `.env` hygiene | ✅ Correct | `.gitignore`, `git ls-files` |
| `eval()` usage | ✅ None found | repo-wide grep |
| `dangerouslySetInnerHTML` risk | ✅ Low (trusted data only) | `app/layout.tsx:69`, `JsonLd.tsx:15` |
| Shell-injection-capable `exec()` | 🟡 Present, by design (terminal tool) | `tools/terminal.ts`, `app/api/terminal/route.ts` |
| API authentication | ❌ Missing everywhere | see Part 6 |
| Schema-based input validation | ❌ Missing (manual checks only) | no `zod`/similar anywhere |
| `npm audit` in CI | ✅ Present and functional | `.github/workflows/security.yml` |

### Architecture issues & refactoring opportunities

1. **Broken installer, uncaught by any safety net.** `packages/cli/install.ps1` and 5 sibling files were silently emptied by commit `4c3d5af` and never restored (see Part 7), and no CI check would have caught it — `test.yml` fakes success, `lint.yml` doesn't touch `packages/cli`, and there's no "does the installer still work" check anywhere. This is a direct consequence of zero test coverage combined with CI that reports false positives — the two problems compound.

2. **In-memory-only runtime state, recurring pattern.** Several `docs/01_PMO/CHANGELOG.md` entries (root Development OS side) independently document the same class of bug being found and fixed for Dev Server status (`lib/data/devservers.json` was added specifically so state survives process restarts and is visible across processes). This suggests in-memory-only state that doesn't survive restarts or cross-process visibility has recurred multiple times in this codebase; it wasn't feasible to audit every module (e.g. the Orchestrator's own status/lock files) for this same class of issue within this pass.

3. **`resumeWorkflow`/`retryWorkflow` are advertised via CLI flags but are silent no-ops that restart from scratch.** `ai workflow run --resume`/`--retry` exist and are documented in `--help`, but instead of resuming/retrying they print an easy-to-miss warning and re-run the entire workflow from the beginning. For any workflow with non-idempotent steps (e.g. a step that commits and pushes to git), this could cause real duplicate side effects. See Part 4.

4. **Self-referential nested git clone.** `AI-Web-Master/` at repo root is a 7.9 MB duplicate of the entire repository sitting inside itself, tracked as an orphaned git submodule gitlink (mode `160000`, pointing at commit `a23abdf`) with no `.gitmodules` file anywhere in the repo (directly verified — see Part 1). This bloats every full clone and silently doubles the results of any repo-wide scan unless a tool knows to exclude it (it confused multiple sub-audits performed for this report before being caught). **Not fixed as part of this audit** (read-only); remediation would be `git rm --cached AI-Web-Master` followed by either deleting the nested directory or adding it to `.gitignore`, at the user's discretion.

5. **Two overlapping workflow-execution commands.** `ai workflow run` (simple, sequential) and `ai orchestrator run` (DAG-based, parallel, stoppable) both operate on the identical `workflow.json` format and are both fully implemented and CLI-reachable. They don't duplicate step-execution logic (the Orchestrator explicitly reuses `workflow/executor.ts`), but having two top-level commands that do overlapping jobs with different capabilities is a likely source of user confusion with no documentation distinguishing when to use which. See Part 4.

6. **Generator duplication.** `generators/{agent,skill,workflow}.ts` are ~95% identical (see Part 7) — low severity, easy, contained refactor opportunity (~90 lines).

7. **`ai new` is referenced across CHANGELOG history as if it were a top-level command, but is not currently registered** in `src/index.ts` (only reachable via the interactive menu). Either the docs/CHANGELOG are stale or a deregistration was accidental at some point; worth reconciling one way or the other. See Part 2.

8. **CI gives false confidence.** `test.yml` always prints "✓" regardless of whether any test ran; `docs.yml` would fail outright if triggered (16+ zero-byte `.md` files, missing `skills/README.md`); `lint.yml` never touches `packages/cli` or `apps/cnbiz-web`. It's unclear from this repo alone whether these workflows are currently enabled/passing on the real GitHub remote — worth confirming directly, since a red or silently-skipped CI provides no actual safety net for changes to this codebase.

9. **Marketplace command inconsistency.** `ai add`/`ai remove`/`ai update` operate on `packages/<name>`, while `ai publish`/`ai install`/`ai search` operate on `agents/`/`workflows/`/`skills/`. A package published and installed via the "correct" marketplace flow cannot be removed or updated via `ai remove`/`ai update`, because those commands look in the wrong directory. See Part 2.

10. **Documented architecture vs. built architecture.** `docs/02_DEVELOPMENT/ARCHITECTURE.md` prescribes a `src/` 4-layer Clean Architecture that, per the roadmap's own admission, has never been built — the real root app lives in `app/`/`lib/`/`components/`. Low urgency (the roadmap is self-aware) but worth resolving one way or the other so the architecture doc reflects reality or a concrete migration plan.

11. **Root-level documentation/scaffolding layer duplicates concepts implemented separately in `packages/cli/src/*`, with no cross-reference.** `agents/`, `prompts/`, `memory/`, `orchestration/`, `marketplace/` at repo root are all prompt/spec markdown, not code, and are not referenced by any of the functionally-equivalent runtime code in `packages/cli/src/{runtime,prompt,memory,orchestrator,marketplace}/`. The naming overlap is confirmed (independently, by two separate sub-audits) to be a real source of potential confusion for anyone navigating the repo.

### Repo hygiene (lower severity, still real)

- Large dump files committed to git: `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), plus `apps-tree.txt`, `packages-tree.txt`, `backup.bat`, `start-wor.bat`.
- `test-project/` — stray generated test artifact, partially committed.
- `LICENSE` — 0 bytes, present but empty.

---

## Part 9 — Feature Matrix

*(Source: `docs/FEATURE_MATRIX.md`. Consolidated status table across the whole repository.
✅ Complete / 🟡 Partial / ❌ Missing.)*

### CLI

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

### Agent System

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

### Workflow System

| Feature | Status | Evidence |
|---|---|---|
| Definition/loading/validation | ✅ Complete | `packages/cli/src/workflow/{types,loader,validator}.ts` |
| Sequential execution | ✅ Complete | `packages/cli/src/workflow/runtime.ts` |
| Parallel/DAG execution | ✅ Complete (Orchestrator only) | `packages/cli/src/orchestrator/{planner,scheduler}.ts` |
| Conditional branching | 🟡 Partial (recognized, not evaluated) | `packages/cli/src/orchestrator/scheduler.ts:79` |
| Resume | ❌ Missing | `workflow/runtime.ts:159-161` |
| Retry | ❌ Missing | `workflow/runtime.ts:163-165` |
| Duplicate-run locking | ✅ Complete | `.runtime/workflow/locks/` |

### Website Builder

| Feature | Status | Evidence |
|---|---|---|
| Site type selection (11 types) | ✅ Complete | `packages/cli/src/website/types.ts` |
| Fixed 11-page generation | ✅ Complete | `packages/cli/src/templates/website/app/**` |
| Per-type page customization | ❌ Missing | design trade-off, Part 5 |
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

### Dashboard

| Feature | Status | Evidence |
|---|---|---|
| Terminal/Workspace/GitHub/AI/Logs/Settings managers | ✅ Complete, real backends | `app/developer/*`, Part 6 |
| Project management UI | ✅ Complete, real backends | `app/projects/**` |
| Public contact form | ❌ Broken (missing API route) | `components/sections/ContactForm.tsx` vs. absent `app/api/contact/route.ts` |
| Login/Signup | ❌ Missing backend | `app/login/page.tsx`, `app/signup/page.tsx` |
| Authentication | ❌ Missing | zero matches repo-wide |
| Admin screen | ❌ Missing | route doesn't exist |
| API input validation | 🟡 Partial (manual only) | 33 routes, no schema library |

### Runtime Infrastructure

| Feature | Status | Evidence |
|---|---|---|
| Orchestrator | ✅ Complete, wired | `src/index.ts:95` |
| Provider Layer | ✅ Complete | see Agent System table |
| Prompt Engine | ✅ Complete | see Agent System table |
| Tool System | ✅ Complete (library); not agentic | see Agent System table |
| Memory Manager | ✅ Complete | see Agent System table |

### Marketplace

| Feature | Status | Evidence |
|---|---|---|
| Publish | ✅ Complete | `packages/cli/src/commands/publish.ts` |
| Install | ✅ Complete | `packages/cli/src/commands/install.ts` |
| Search | ✅ Complete | `packages/cli/src/commands/search.ts` |
| Versioning | 🟡 Partial | `marketplace/providers/local.ts:62` |
| Remote/online registry | ❌ Missing (local-only by design) | `marketplace/index.ts:14-18` |
| Root `marketplace/` directory actually populated | ❌ Missing (README stubs only) | Part 1 §9 |

### Testing & CI

| Feature | Status | Evidence |
|---|---|---|
| Unit/integration/E2E tests | ❌ Missing (0 files) | Part 7 |
| Test framework configured | ❌ Missing | no `test` script in any `package.json` |
| CI test workflow (meaningful) | ❌ Missing (always reports success) | `.github/workflows/test.yml` |
| CI lint workflow (full monorepo) | 🟡 Partial (root only) | `.github/workflows/lint.yml` |
| CI security workflow | ✅ Complete, functional | `.github/workflows/security.yml` |
| CI docs workflow | ❌ Broken (would fail if run) | `.github/workflows/docs.yml` |

### Documentation

| Feature | Status | Evidence |
|---|---|---|
| Root README | ✅ Complete, accurate about Phase 0 | `README.md` |
| `packages/cli/README.md` | ❌ Missing (0 bytes) | Part 7 |
| `docs/getting-started.md` | ❌ Missing (0 lines) | Part 1 |
| `docs/installation.md` | ❌ Missing (0 lines) | Part 1 |
| `docs/faq.md` | ❌ Missing (0 lines) | Part 1 |
| CLI command reference | ❌ Missing | none found |
| API reference | ❌ Missing | none found |
| Architecture doc matching built reality | ❌ Missing | `ARCHITECTURE.md` describes unbuilt `src/` layers |

### Security

| Feature | Status | Evidence |
|---|---|---|
| Secrets management | ✅ Correct | Part 8 |
| No hardcoded credentials | ✅ Confirmed | repo-wide grep |
| API authentication | ❌ Missing everywhere | Part 8 |
| Schema-based input validation | ❌ Missing | no `zod`/similar anywhere |
| `npm audit` in CI | ✅ Complete | `.github/workflows/security.yml` |

---

## Part 10 — Implementation Status

*(Source: `docs/IMPLEMENTATION_STATUS.md`. Method: each area's rows in Part 9 — Feature Matrix — are
scored ✅ = 1, 🟡 = 0.5, ❌ = 0, then averaged. This is a rough, evidence-grounded estimate for
prioritization purposes — not a precision metric.)*

### Core Platform (CLI + Agent System + Workflow System + Runtime + Marketplace)

**Estimate: ~60–65% complete.**

Breakdown by sub-area:

| Sub-area | Score | Rows |
|---|---|---|
| CLI commands | ~74% | 13 ✅ / 2 🟡 / 4 ❌ of 19 |
| Agent System | ~56% | 5 ✅ / 0 🟡 / 4 ❌ of 9 |
| Workflow System | ~64% | 4 ✅ / 1 🟡 / 2 ❌ of 7 |
| Marketplace | ~58% | 3 ✅ / 1 🟡 / 2 ❌ of 6 |

**What's strong**: the execution primitives are genuinely complete and real — 4 working LLM provider integrations, a functioning (if non-agentic) tool system, a working sequential Workflow Engine, and a working DAG-based Orchestrator layered cleanly on top of it without duplicating logic. All confirmed via direct code reading, not assumed.

**What's holding it back**: no tool-calling loop (agents can't autonomously use their declared tools), no multi-turn conversation, no streaming, `resumeWorkflow`/`retryWorkflow` are stubs that silently misbehave rather than fail loudly, and the marketplace's `add`/`remove`/`update` commands target the wrong directory relative to `publish`/`install`. Zero automated test coverage means regressions in any of this would not be caught automatically.

### Website Builder

**Estimate: ~70% complete** against the 10-requirement spec this session implemented against.

| Requirement | Status |
|---|---|
| Site types | ✅ Complete (11 types) |
| Pages | ✅ Complete (fixed 11-page set; not customized per type) |
| Design system | ✅ Complete |
| Reusable components | ✅ Complete (12, incl. 1 unlisted helper) |
| SEO | ✅ Complete |
| Content via Provider Layer | ✅ Complete, with deterministic fallback |
| Assets | ✅ Complete (SVG only, no raster fallback) |
| Deployment files | ✅ Complete |
| Reuse (no duplicated runtime logic) | ✅ Complete — Generator/Workflow/Prompt/Provider/Tool System all reused, no new execution engine added |
| End-to-end verification | ✅ Complete — `npm install`/`build`/`lint`/`start` + route-by-route `curl` all passed this session |

This is, by a clear margin, the most recently and most thoroughly verified part of the repository (built and tested in this same session, including a real `npm install` + production build + live route checks — not just code review). The gaps that remain (no email delivery, no blog CMS, no dark mode, no per-type page customization, no menu integration) are scoping trade-offs made explicitly during implementation, not accidental gaps — see Part 5 for the full list.

### Dashboard

**Estimate: developer tooling ~85% complete; public-facing site + auth ~35% complete; blended ~55–60%.**

The internal developer tooling (`app/developer/*` — Terminal, Workspace, GitHub, AI, Logs, Settings, Project management) is real, wired to genuine backend services, and extensively exercised per `docs/01_PMO/CHANGELOG.md`'s history. This part is close to done for its intended scope.

The public-facing side (`/`, `/login`, `/signup`, `/portfolio`, `/contact`) is weaker: the contact form calls an API route that doesn't exist at this app's root (`app/api/contact/route.ts` is absent — confirmed via `ls`), login/signup have no backend at all, and there is no authentication anywhere in the app. Since a "dashboard" implies some access control in most people's mental model, and this one has none, the blended estimate is pulled down substantially by this gap.

### Marketplace

**Estimate: ~55–60% complete.**

Publish/install/search are real and functional (`packages/cli/src/marketplace/*`). Versioning is naive (exact-string equality only, no semver). The CLI has a second command family (`add`/`remove`/`update`) that operates on a different, inconsistent target directory (`packages/<name>` instead of `agents/`/`workflows/`/`skills/`), effectively making it impossible to remove or update something installed via the "correct" flow. The repo's own root `marketplace/` directory is not populated with anything the real implementation produced — it's a separate set of README stubs describing an intended structure. There is no remote/online registry (by explicit design, not a gap — see Part 1 §9).

### Overall Project

**Estimate: ~50–55% complete**, weighted down primarily by two systemic gaps that cut across every area above:

1. **Testing: ~0%.** No test files exist anywhere in the repository, no test framework is configured in any `package.json`, and the CI workflow that claims to run tests (`test.yml`) always reports success regardless of what actually happened. This means "complete" features above are complete by manual verification only, with no regression safety net.
2. **Documentation: ~12%.** Core onboarding docs (`getting-started.md`, `installation.md`, `faq.md`) are empty files; there's no CLI command reference and no API reference; the installer itself (`packages/cli/install.ps1`) has been silently broken (0 bytes) since commit `4c3d5af` with nothing catching it.

The project's own `docs/01_PMO/PROJECT_ROADMAP.md` self-identifies as "Phase 0: Foundation" — this audit's findings are broadly consistent with that self-assessment: substantial, genuinely-working execution infrastructure (CLI, agents, workflows, providers, tools, and now a solid Website Builder), but built on a foundation with no automated verification and incomplete onboarding/reference documentation, plus several concrete pieces of unresolved repo hygiene (nested git clone, broken installer, stray committed artifacts) that a Phase 1 hardening pass should address before further feature work.

---

## Part 11 — Roadmap / Next Priorities

*(Source: `docs/ROADMAP.md`. Recommendations limited strictly to features/fixes that are **not
already implemented**, per the evidence gathered above. Nothing here restates a feature already
marked ✅ Complete in Part 9 — Feature Matrix.)*

### P0 — Repo hygiene & broken tooling (fix before building more on top)

These are things that are supposed to already work and currently don't, silently.

1. **Restore `packages/cli/install.ps1` (and `README.md`, `ai.cmd`, `ai.ps1`, `install.sh`, `Setup.cmd`)** — all 6 files are 0 bytes at current HEAD, emptied by commit `4c3d5af` and never restored. `scripts/setup.ps1` directly depends on `install.ps1` to install the global `ai` command; that path is currently broken. Evidence: Part 7.
2. **Resolve the nested `AI-Web-Master/` git submodule gitlink** — a 7.9 MB duplicate of the whole repo tracked at mode `160000` with no `.gitmodules` file. Either remove it from the index (`git rm --cached AI-Web-Master`) or properly configure it as a real submodule, whichever was intended. Evidence: Part 1, directly verified via `git ls-tree`.
3. **Fix or remove `.github/workflows/test.yml`** — it currently reports "✓ Unit Tests / ✓ Integration Tests / ✓ End-to-End Tests" unconditionally, regardless of whether any test ran (none exist). This is worse than no CI at all, because it looks like coverage exists when it doesn't. Evidence: Part 7.
4. **Fix `.github/workflows/docs.yml`** — would fail immediately if triggered, due to 16 zero-byte `skills/shared/**/README.md` stubs, a missing `skills/README.md`, an empty `LICENSE`, and several other empty `.md` files. Either populate the missing content or adjust the workflow's expectations. Evidence: Part 7.
5. **Extend `.github/workflows/lint.yml` to cover `packages/cli` and `apps/cnbiz-web`** — currently only lints the root workspace (root `eslint.config.mjs` explicitly ignores `apps/**`/`packages/**`). Evidence: Part 7.
6. **Fix the public contact form** — `components/sections/ContactForm.tsx` (root Dev OS app) posts to `/api/contact`, which does not exist in this app (it only exists in the separate `apps/cnbiz-web`). Either add the missing route or point the form at the correct app. Evidence: Part 6.
7. **Remove or gitignore repo bloat**: `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), `apps-tree.txt`, `packages-tree.txt`, and the stray `test-project/` artifact. Evidence: Part 7, Part 1.
8. **Populate `LICENSE`** — currently 0 bytes despite the file existing (implying intent to add one). Evidence: Part 7.

### P1 — Testing (currently 0% — the single biggest structural gap)

9. **Stand up an actual test framework** in at least `packages/cli` (highest-value target — it's the most logic-dense, least-covered piece) — e.g. Vitest or Jest, with `test` scripts wired into `package.json` and into a corrected `test.yml`.
10. **Add unit tests for the Content Engine's merge/parse logic** (`packages/cli/src/website/content.ts:parseOverrides`/`mergeOverrides`) — this is exactly the kind of string-parsing/fallback logic most likely to silently regress.
11. **Add unit tests for the Workflow/Orchestrator engines** (`workflow/runtime.ts`, `orchestrator/scheduler.ts`) — sequencing, locking, and stop-on-error behavior are all currently unverified except by manual runs during development sessions.
12. **Populate the `tests/` directory structure that already exists** (`tests/{unit,integration,e2e}/`) — the scaffold is there, described in each subfolder's README, but contains zero actual tests.

### P2 — Documentation gaps

13. **Write `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md`** — all three are currently empty files, already tracked as "Planned" in `docs/01_PMO/PROJECT_ROADMAP.md`'s own Phase 5 table.
14. **Write a CLI command reference** — no single document currently lists all `ai <command>` usage; the closest equivalent is scattered `--help` text and CHANGELOG entries. Evidence: Part 2.
15. **Restore or rewrite `packages/cli/README.md`** — currently effectively empty despite being the CLI package's own README.
16. **Document the relationship between the root-level prompt/spec layer (`agents/`, `prompts/`, `memory/`, `orchestration/`, `marketplace/`) and the functionally-separate runtime implementations in `packages/cli/src/*`** — confirmed by two independent sub-audits as a real source of navigational confusion given the naming overlap.

### P3 — Agent System capability gaps

17. **Implement a tool-calling loop** so agents can actually invoke their declared `tools[]` autonomously, rather than tools only being callable directly from CLI code. Evidence: Part 3.
18. **Implement multi-turn conversation support** in `runtime/executor.ts` — currently exactly one system+user message pair per execution.
19. **Implement `resumeWorkflow`/`retryWorkflow`** properly (`workflow/runtime.ts:159-165`), or remove the `--resume`/`--retry` CLI flags until they're real — right now they silently restart from scratch, which is a correctness risk for non-idempotent workflow steps.
20. **Reconcile the two overlapping workflow-execution commands** (`ai workflow run` vs `ai orchestrator run`) — either document clearly when to use which, or merge them into one command with an opt-in parallel mode.

### P4 — CLI consistency fixes

21. **Fix the marketplace `add`/`remove`/`update` commands** to target `agents/`/`workflows/`/`skills/` (matching `publish`/`install`/`search`) instead of `packages/<name>`.
22. **Register `ai new` as a direct top-level command** (or update all documentation/CHANGELOG references to stop describing it as one) — currently it's reachable only through the interactive menu.
23. **Add a real `-v`/lowercase version alias** if that's still desired (a past CHANGELOG entry claims it was added; it currently isn't present in `src/index.ts`).

### P5 — Website Builder enhancements (already solid; these are genuine gaps, not core fixes)

24. **Wire up actual email delivery** for the generated `app/api/contact` and `app/api/newsletter` routes — currently they validate and log only; `.env.example` documents `RESEND_API_KEY` etc. but no code reads them.
25. **Add blog post detail pages** (`/blog/[slug]`) to the generated site — currently only a listing page exists.
26. **Add a dark-mode variant** to the generated design system (`styles/theme.css` currently has no `prefers-color-scheme` block).
27. **Consider per-site-type page-set customization** — right now every site type gets the same fixed 11 pages, which is a mismatch for some business types (e.g. a "restaurant" site getting a SaaS-style subscription pricing page).
28. **Expose `ai website create` in the interactive menu** (`menu.json`) — currently only reachable as a direct CLI invocation.

### P6 — Dashboard / security

29. **Add authentication to the root Development OS app** — currently zero auth anywhere, including on `/api/terminal`, which executes arbitrary shell commands. This is acceptable for a strictly local dev tool but should not be exposed beyond localhost without auth.
30. **Add schema-based input validation** (e.g. `zod`) across the 33 root API routes — currently all validation is manual/ad-hoc.
31. **Wire real backends for `/login` and `/signup`**, or remove them if they're not meant to be functional yet.

---

None of the P0–P6 items above restate anything already marked ✅ Complete in Part 9 — Feature Matrix. Items are grouped by urgency (P0 = broken/misleading right now, P6 = genuine but lower-urgency enhancement), not by estimated effort.

---

*End of merged document. Source reports (`docs/PROJECT_STATUS.md`, `docs/PROJECT_AUDIT.md`,
`docs/CLI_AUDIT.md`, `docs/AGENT_AUDIT.md`, `docs/WORKFLOW_AUDIT.md`, `docs/WEBSITE_BUILDER_AUDIT.md`,
`docs/DASHBOARD_AUDIT.md`, `docs/CODE_QUALITY.md`, `docs/TECH_DEBT.md`, `docs/FEATURE_MATRIX.md`,
`docs/IMPLEMENTATION_STATUS.md`, `docs/ROADMAP.md`) remain in place as standalone files; this
document is a consolidated reading copy, not a replacement for them.*
