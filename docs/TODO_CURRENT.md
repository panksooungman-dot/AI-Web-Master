# TODO — Current Verified State

> Verification pass against the CURRENT repository (`HEAD` = `deaeb45`, no commits since the
> existing audit reports were added). Every item below was individually re-checked against the
> working tree in this session (file sizes, `git ls-tree`, grep of actual source) — this is a
> verification of `docs/PROJECT_STATUS.md` / `docs/PROJECT_STATUS_CURRENT.md`, not a new audit.
> No source code was modified to produce this report.

---

# Completed

- ✅ **Provider Layer** — 4 real LLM integrations present and wired: `packages/cli/src/providers/{anthropic,openai,gemini,ollama}.ts` + `manager.ts` + `registry.ts`.
- ✅ **Website Builder core generator** — `ai website create` registered (`buildWebsiteCommand()` in `packages/cli/src/index.ts`); 11-page generation logic intact.
- ✅ **Workflow / Orchestrator execution paths** — sequential engine and DAG-based Orchestrator both registered and functional (only resume/retry/conditional are stubs — see P0/P1 below).
- ✅ **CLI core commands** — `ai workflow`, `ai memory`, `ai orchestrator`, `ai provider`, `ai tools`, `ai website` all registered in `index.ts`.
- ✅ **`security.yml` CI workflow** — actually runs `npm audit` (the one CI workflow that is not a false positive).
- ✅ **Root `marketplace/` folder structure** — `agents/`, `workflows/`, `skills/`, `templates/`, `prompts/`, `manifest.json` exist (content is stub-only, tracked as P2 below).

---

# Remaining P0

1. ❌ **CLI installer files still 0 bytes** — confirmed via direct byte-size check: `packages/cli/install.ps1`, `packages/cli/README.md`, `packages/cli/ai.cmd`, `packages/cli/ai.ps1`, `packages/cli/install.sh`, `packages/cli/Setup.cmd` — all 6 files are 0 bytes. The documented one-command install flow cannot complete.
2. ❌ **`AI-Web-Master/` orphaned gitlink submodule** — `git ls-tree HEAD -- AI-Web-Master` still shows mode `160000` → commit `a23abdf`; no `.gitmodules` file exists; the 7.9 MB nested clone is still present on disk.
3. ❌ **`test.yml` reports false positives** — `npm run test:unit --if-present` / `test:integration --if-present` silently no-op (no such scripts exist anywhere) and the job still exits 0, i.e. CI always reports tests as passing even though zero tests exist.
4. ❌ **`docs.yml` would fail if triggered** — `skills/README.md` is confirmed **missing** (required by the workflow's `REQUIRED` array); `skills/shared/**` still has **15** zero-byte `README.md` stubs (not 16 as originally miscounted — confirmed via direct count); `LICENSE` confirmed 0 bytes.
5. ❌ **`lint.yml` has incomplete coverage** — root `eslint.config.mjs` still explicitly `globalIgnores(["apps/**", "packages/**"])`; no separate CI job lints `packages/cli` or `apps/cnbiz-web`.
6. ❌ **Root Dev OS contact form still broken** — `app/api/` confirmed to have no `contact/` route (only `agents, dev-inspector, devserver, logs, projects, prompts, sessions, terminal, workflows, workspaces`); `components/sections/ContactForm.tsx:80` still `fetch("/api/contact")` against a route that only exists in the separate `apps/cnbiz-web` app.
7. ❌ **Repo bloat still committed** — `structure.txt`, `tree.txt`, `typescript-files.txt`, `apps-tree.txt`, `packages-tree.txt`, `backup.bat`, `start-wor.bat` all confirmed still `git ls-files`-tracked; `test-project/` still present and tracked.
8. ❌ **`LICENSE` still empty** — confirmed 0 bytes.

---

# Remaining P1

9. ❌ **No test framework/files anywhere** — `tests/{unit,integration,e2e,fixtures,mocks,performance,security,reports}/` each confirmed to contain only a `README.md`; a repo-wide search for `*.test.ts`/`*.test.js`/`*.spec.ts` (excluding `node_modules`, `AI-Web-Master`) returned zero results.
10. ❌ **`resumeWorkflow`/`retryWorkflow` unimplemented** — `packages/cli/src/workflow/runtime.ts:159-165` confirmed still throwing `WorkflowError("NOT_IMPLEMENTED", ...)` verbatim for both functions.
11. ❌ **Orchestrator conditional branching not evaluated** — `packages/cli/src/orchestrator/scheduler.ts:79` confirmed still literally labels the stage `"conditional — evaluation not yet implemented"`.
12. ❌ **Marketplace `add`/`remove`/`update` directory mismatch** — confirmed via source: `add.ts`/`remove.ts` operate on `path.join(projectRoot, "packages")`; `update.ts` reads from `marketplace/<pkg>` but writes to `packages/<pkg>` — inconsistent with `publish`/`install`/`search`, which operate under `marketplace/{agents,workflows,skills}/`.
13. ❌ **Zero authentication across Dashboard/API** — confirmed no `*auth*` files under `app/`, no `requireAuth`/`isAuthenticated`/`authenticate(` anywhere in `app/api`; `/api/terminal` remains an unauthenticated arbitrary-shell-command endpoint. `app/login`/`app/signup` exist as page shells only — no `fetch(`/`action=` found, i.e. no backend wiring.
14. ❌ **`ai new` not registered as a top-level command** — `packages/cli/src/commands/new.js` exists on disk but confirmed not imported/wired anywhere in `packages/cli/src/index.ts`; only reachable via the interactive menu.
15. ❌ **CLI `-v` lowercase alias absent** — `index.ts:40` confirmed still plain `.version(CLI_VERSION)` with no explicit `-v` flag string (only Commander's default `-V` works).
16. ❌ **Website Builder not in interactive menu** — `packages/cli/src/config/menu.json` confirmed to have 9 items, none referencing "website"/`ai website create`.

---

# Remaining P2

17. ❌ **Onboarding docs still empty** — `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md` all confirmed 0 bytes.
18. ❌ **No CLI command reference** — confirmed absent (no matching file under `docs/`).
19. ❌ **`packages/cli/README.md` still empty** — 0 bytes (also part of the P0 installer-files group).
20. ❌ **No doc reconciling root-level scaffolding vs. `packages/cli/src/*` runtime** — no document found cross-referencing `agents/`, `prompts/`, `memory/`, `orchestration/` (root) against the actual runtime in `packages/cli/src/*`.
21. ❌ **Marketplace root content is stub-only** — `marketplace/{agents,prompts,skills,templates,workflows}/` each confirmed to contain only a `README.md`; no real published packages.
22. ⚠ **Agent Runtime tool-calling loop / multi-turn / streaming** — no corresponding code found in `packages/cli/src/runtime/executor.ts` in this pass (grep-only check); recommend a fuller read-through of `runtime/` and any `agent*` modules before treating this as fully confirmed, since this pass did not execute the runtime directly.

---

# Next Recommended Tasks

*(Unchanged priority order — nothing has landed since the audit, so no re-prioritization is warranted.)*

1. Restore the 6 zero-byte installer files (`packages/cli/install.ps1`, `README.md`, `ai.cmd`, `ai.ps1`, `install.sh`, `Setup.cmd`) so the documented install flow works again.
2. Resolve the `AI-Web-Master/` orphaned gitlink (`git rm --cached AI-Web-Master` or configure as a real submodule).
3. Replace `test.yml`'s `--if-present`-masked false positive with a workflow that fails when no tests exist, or stand up a minimal real suite in `packages/cli` first.
4. Fix `docs.yml`'s required-file check — add `skills/README.md`, populate the 15 `skills/shared/**` stubs, and populate `LICENSE`.
5. Extend CI linting to `packages/cli` and `apps/cnbiz-web` (currently excluded via `eslint.config.mjs` `globalIgnores`).
6. Fix the root Dev OS contact form — add `app/api/contact/route.ts` or repoint `ContactForm.tsx` to the working implementation in `apps/cnbiz-web`.
7. Write `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md`, and a CLI command reference.
8. Implement `resumeWorkflow`/`retryWorkflow` for real, or remove the flags advertising them until they are.
9. Fix marketplace `add`/`remove`/`update` to target the same `marketplace/{agents,workflows,skills}/` layout as `publish`/`install`/`search`.
10. Add authentication to the Dashboard/API layer, starting with the unauthenticated `/api/terminal` command-execution endpoint.
