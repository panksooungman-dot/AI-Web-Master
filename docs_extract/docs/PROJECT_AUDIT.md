# PROJECT AUDIT

> Repository-wide audit. Read-only analysis — no source code was modified, no commits created.
> Generated: 2026-07-12. Every claim below is backed by a file path; where two automated sub-audits
> disagreed, this document uses directly-verified evidence (commands re-run by the auditor) over
> secondhand claims, and says so explicitly.

---

## 1. Project Overview

### Purpose

`D:\ai-web-master` (`package.json` name `ai-web-master`, v0.1.0, private) is **not a single project** — it is an npm-workspaces monorepo hosting four distinct, only loosely-related things at once:

1. **"Development OS"** — a Next.js app living at the **repo root itself** (`app/`, `lib/`, `components/`). Root `package.json` has `dev`/`build`/`start`/`lint` scripts using `next`. This is an internal dev-tooling app (Terminal, Workspace, GitHub, AI, Logs, Settings managers under `app/developer/*`), documented extensively in `docs/01_PMO/CHANGELOG.md`.
2. **CNBIZ client website v2** — `apps/cnbiz-web`, the real `cnbiz.kr` production site (own `package.json`, own deployment).
3. **AI Business OS CLI** — `packages/cli` (`@ai-business-os/cli`, bin `ai`), a globally-installable Node.js CLI implementing agents, workflows, an orchestrator, a marketplace, and (as of this session) a website generator.
4. **A large "AI Business OS" documentation/scaffolding layer** at repo root (`agents/`, `prompts/`, `skills/`, `memory/`, `orchestration/`, `mcp/`, `examples/`, `marketplace/`) — mostly prompt/spec markdown content, largely **disconnected from runtime code** (see §9 and §2 table below).

### Architecture (as documented vs. as built)

`docs/02_DEVELOPMENT/ARCHITECTURE.md` prescribes a Clean Architecture with a `src/` 4-layer split (Presentation → Business → API → Data). `docs/01_PMO/PROJECT_ROADMAP.md` itself states current phase is **"Phase 0: Foundation"** and explicitly marks `src/` as `🔲 문서만, 코드 미작성` (docs only, no code written). The actual root Next.js app lives in `app/`/`lib/`/`components/`, not `src/`. **The documented architecture and the built architecture are different things; the roadmap doc is self-aware of this gap.**

### Monorepo structure

Confirmed in `package.json:5-8`:

```json
"workspaces": ["apps/*", "packages/*"]
```

**`apps/*` on disk:** only `apps/cnbiz-web` exists (`ls apps/`).

**`packages/*` on disk:** 11 entries — `agents/`, `cli/`, `design-system/`, `dev-inspector/`, `layout-primitives/`, `prompts/`, `skills/`, `templates/`, `ui/`, `utils/`, `workflows/`.

⚠️ **Mismatch**: only **6 of 11** have their own `package.json` and are therefore real npm workspace members: `cli`, `design-system`, `dev-inspector`, `layout-primitives`, `ui`, `utils`. The other 5 — `packages/agents/`, `packages/prompts/`, `packages/skills/`, `packages/templates/`, `packages/workflows/` — contain **only a single README.md each**, describing an intended structure (e.g. `backend-engineer/`, `coding/`, `authentication/` subpackages) that does not exist on disk. Since npm requires a `package.json` to register a workspace, these 5 are not actually workspace members despite matching the `packages/*` glob path.

`packages/README.md` describes the packages directory as hosting packages "installed, updated, published, and reused... through the AI Business OS CLI and Marketplace" — this framing is misleading for the 5 doc-only stubs.

### Apps

| App | Path | Real? | Evidence |
|---|---|---|---|
| Development OS | repo root `app/` | ✅ Real, actively developed | Root `package.json` scripts; extensive `docs/01_PMO/CHANGELOG.md` history |
| CNBIZ Website v2 | `apps/cnbiz-web` | ✅ Real, production (`cnbiz.kr`) | Own `package.json`, own `REQUEST.md`, WBS tracks it as the live site |

### Packages (real workspace members only)

| Package | Path | Purpose | Evidence |
|---|---|---|---|
| `@ai-business-os/cli` | `packages/cli` | The `ai` CLI — see `CLI_AUDIT.md` | `packages/cli/package.json` |
| design-system | `packages/design-system` | Color/typography/layout tokens for `apps/cnbiz-web` | `packages/design-system/tokens.ts`, `theme.css` |
| dev-inspector | `packages/dev-inspector` | Visual Editor overlay used by `ai devmode` | referenced by `packages/cli/src/lib/devInspectorInstall.js` |
| layout-primitives | `packages/layout-primitives` | `Container`/`Section`/`MobileDrawer` for `apps/cnbiz-web` | consumed by `apps/cnbiz-web/components/*` |
| ui | `packages/ui` | `Button`/`LinkButton`/`Input`/`Textarea`/`Card` for `apps/cnbiz-web` | consumed by `apps/cnbiz-web/components/*` |
| utils | `packages/utils` | `cn()` class-merge helper | consumed across `apps/cnbiz-web` |

---

## 2. Directory Structure

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
| `memory/` (root) | 6 files (`coding-memory.md`, `conversation-memory.md`, `decision-memory.md`, `knowledge-memory.md`, `project-memory.md` + README), 160–272 lines | Documents a memory *concept*; distinct from the actually-implemented `packages/cli/src/memory/*` runtime (see `AGENT_AUDIT.md`) |
| `orchestration/` (root) | 5 files (`coordination.md`, `execution-policy.md`, `routing.md`, `workflow.md` + README), 243–348 lines | Same pattern — spec docs, distinct from the real `packages/cli/src/orchestrator/*` code |
| `mcp/` (root) | 9 files on MCP server usage conventions (`browser.md`, `context7.md`, `filesystem.md`, `github.md`, `playwright.md`, `postgres.md`, `sequential-thinking.md`, `supabase.md` + README), 246–335 lines each | Documentation only — no actual MCP server config in the repo |
| `examples/` (root) | 6 files; `examples/ai-agent-example.md` is **0 lines** (empty stub); `basic-project.md`, `ecommerce-template.md`, `saas-template.md`, `workflow-example.md` have real 184–353 line content | Mixed |
| `marketplace/` (root) | `README.md`, `release.md`, `manifest.json` (76 lines) + 5 subfolders each containing only a README stub, no `index.json`, no actual packages | Documentation scaffold, **disconnected from the real marketplace runtime** — see §9 |
| `skills/` (root) | 141 files under `skills/core/*` and `skills/domains/*` | Real, substantial — largest scaffolding directory. 16 zero-byte `README.md` stubs remain under `skills/shared/**` (see `CODE_QUALITY.md`) |
| `.github/` | CI workflows + `CODEOWNERS`/`PULL_REQUEST_TEMPLATE.md` | Real, but see `CODE_QUALITY.md` for CI-quality findings |
| `.claude/`, `.cursor/` | Editor/agent tool config | Real |
| `tests/` | `tests/{unit,integration,e2e,fixtures,mocks,performance,security,reports}/` | **Every subfolder contains only a README.md — zero actual test files** |
| `test-project/` (root) | `agents/`, `prompts/`, `skills/`, `templates/`, `workflows/`, `ai-business-os.json`, `README.md` | **Stray generated artifact** from testing `ai new`/`ai create` — `test-project/README.md` and `test-project/ai-business-os.json` are git-tracked (`git ls-files -- test-project`); its own content confirms `"Generated by AI Business OS CLI"`, `createdAt: 2026-07-11T15:39:08.976Z` |
| `AI-Web-Master/` (root) | ⚠️ **A full nested clone of this same repository**, complete with its own `.git`, `app/`, `apps/`, `packages/`, `docs/`, etc. | **Anomaly — see below, directly verified** |
| Stray root files | `apps-tree.txt`, `packages-tree.txt`, `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), `backup.bat`, `start-wor.bat` | All **committed to git** (confirmed via `git ls-files`) — large `find`/`tree` dump files and ad-hoc batch scripts. Repo bloat |
| `node_modules/`, `.next/`, `.playwright-mcp/`, `package-lock.json`, `tsconfig.tsbuildinfo` | Standard build/dependency artifacts | Normal |

### `AI-Web-Master/` — directly verified

Two of the five research sub-audits disagreed on whether this nested directory is git-ignored or git-tracked. The auditor re-ran the checks directly rather than trust either claim:

```
$ git status --short -- AI-Web-Master        → (no output — clean, matches HEAD)
$ git check-ignore -v AI-Web-Master          → (no output — NOT ignored)
$ git ls-files -- AI-Web-Master              → AI-Web-Master
$ git ls-tree HEAD -- AI-Web-Master          → 160000 commit a23abdfdf9c12b6a2c67e2ee6602679ca128fba4  AI-Web-Master
$ ls -la .gitmodules                          → No such file or directory
```

**Ground truth: `AI-Web-Master/` is tracked in the git index as a submodule "gitlink" (mode `160000`) pointing at commit `a23abdf` — the very first commit in this repo's own history — with no `.gitmodules` file anywhere in the repo.** This is git's standard (and easy to miss) behavior when a directory containing its own `.git` folder is `git add`ed from a parent repo: git silently records a commit-pointer instead of the files, without warning. The nested clone itself (verified separately) has its own remote `https://github.com/panksooungman-dot/AI-Web-Master.git` and is 7.9 MB on disk. It is not gitignored, so `git status`/`git add -A` in the parent repo will not show it as dirty (it only tracks the gitlink pointer), but it physically sits in the working tree and doubles the results of any directory-wide `find`/`grep` unless explicitly excluded. See `TECH_DEBT.md` for remediation options (not executed — audit only).

### Documentation

Doc tree: 58 markdown files under `docs/` (`find docs -type f -name "*.md"`).

**Confirmed empty (0 lines):** `docs/faq.md`, `docs/getting-started.md`, `docs/installation.md`, `docs/04_OPERATIONS/README.md`, `docs/99_ARCHIVE/README.md`. These match `docs/01_PMO/PROJECT_ROADMAP.md`'s own "Phase 5: AI Business OS Productization (Planned)" table, which lists exactly these three getting-started/installation/faq docs as `🔲 Planned` — the roadmap's self-assessment is accurate.

`docs/README.md` is intentionally a 5-line lightweight index (per `docs/01_PMO/CHANGELOG.md` 2026-07-10 entry), not a stub.

**README files:**
- Root `README.md` — real content, states current phase honestly ("Phase 0 — Foundation, 애플리케이션 코드 미작성") and documents the `ai` CLI install flow. Documents `ai new` as a command (see `CLI_AUDIT.md` for why this is currently inaccurate).
- `packages/cli/README.md` — **effectively empty** (see `CODE_QUALITY.md` — 0 bytes, emptied by commit `4c3d5af` and never restored).
- `packages/README.md` — real content but conflates the 5 doc-only stub packages with the 6 real ones (see §1).

**Missing documentation:**
- No single CLI command reference (closest equivalent is scattered `--help` text plus CHANGELOG entries — see `CLI_AUDIT.md`).
- No API reference for the Provider Layer / Tool System / Workflow Engine public interfaces.
- `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md` — empty, as noted above.
- No document reconciling the *actual* on-disk structure (root Development OS app + `apps/cnbiz-web` + `packages/cli` + the root-level doc-scaffolding layer) against the idealized architecture in `ARCHITECTURE.md`.
- No document explaining the relationship (or lack thereof) between root-level `agents/`/`prompts/`/`skills/`/`memory/`/`orchestration/`/`mcp/`/`marketplace/` and the functionally-similar-but-separate implementations inside `packages/cli/src/*` — this naming overlap is a real source of confusion (confirmed independently by two sub-audits).

---

## 9. Marketplace

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

## Cross-references

- CLI command inventory → `CLI_AUDIT.md`
- Agent/Workflow/Runtime internals → `AGENT_AUDIT.md`, `WORKFLOW_AUDIT.md`
- Website Builder → `WEBSITE_BUILDER_AUDIT.md`
- Dashboard pages + API routes → `DASHBOARD_AUDIT.md`
- Testing, TODOs, duplication, dead code → `CODE_QUALITY.md`
- Security findings + architecture debt → `TECH_DEBT.md`
- Consolidated status table → `FEATURE_MATRIX.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`
