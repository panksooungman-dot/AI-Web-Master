# PROJECT STATUS — Current vs. Audit

> Comparison of the CURRENT repository state against the existing audit reports
> (`PROJECT_STATUS.md`, `PROJECT_AUDIT.md`, `FEATURE_MATRIX.md`, `IMPLEMENTATION_STATUS.md`,
> `ROADMAP.md`, plus supporting `CLI_AUDIT.md`/`CODE_QUALITY.md`/`TECH_DEBT.md`/`DASHBOARD_AUDIT.md`).
> This is a diff, not a new audit — no repository re-scan was performed beyond checking the specific
> items the existing reports flagged, and no source code was modified.
>
> **Key fact established below: `git log` shows the current `HEAD` (`deaeb45`) *is* the commit that
> added the audit reports. No commit has landed since. `git diff --stat HEAD` is empty.** The only
> filesystem changes since the audit are new untracked doc files (`docs/PROJECT_STATUS.md`,
> `docs/REPOSITORY_AUDIT_COMPLETE.md`, `docs.zip`, `docs_extract/`) — themselves audit artifacts, not
> code fixes. Practically every item verified below is therefore unchanged from what the audit
> already reported.

---

# Completed Since Audit

**None.** Every P0/P1/P2/P3 item checked below (installer files, submodule, CI workflows, contact
route, marketplace commands, `ai new`, `-v` flag, website menu integration, auth, resume/retry,
tests) was independently re-verified against the current working tree and matches the audit's
findings exactly. No commits exist between the audit commit and now.

One minor **audit correction** (not a fix, a count discrepancy): `TECH_DEBT.md`/`ROADMAP.md` state
"16 zero-byte `skills/shared/**/README.md` files" — the current count is **15**. This is most likely
a pre-existing miscount in the original audit rather than a change, since no commits have landed
since. Noted for accuracy, not listed as progress.

---

# Remaining P0

All 8 items from `ROADMAP.md` §P0 are confirmed still present:

1. **Installer files still 0 bytes** — `packages/cli/install.ps1`, `README.md`, `ai.cmd`, `ai.ps1`, `install.sh`, `Setup.cmd` all confirmed 0 bytes at current HEAD.
2. **`AI-Web-Master/` still a gitlink submodule** — `git ls-tree HEAD -- AI-Web-Master` still shows mode `160000` pointing at `a23abdf`, no `.gitmodules`, and the 7.9 MB nested clone is still present on disk.
3. **`test.yml` still reports on nonexistent tests** — uses `npm run test:unit --if-present` / `test:integration --if-present`; since no `package.json` in the repo defines those scripts, the `--if-present` flag makes each step a silent no-op that still exits 0 (functionally the same false-positive behavior the audit described).
4. **`docs.yml` would still fail if triggered** — `skills/README.md` is confirmed **missing** (required by the workflow's `REQUIRED` array); `skills/shared/**` still has 15 zero-byte `README.md` stubs; `LICENSE` is still 0 bytes.
5. **`lint.yml` still root-only** — root `eslint.config.mjs` still explicitly `globalIgnores(["apps/**", "packages/**"])`; CI lint step has no separate job for either workspace.
6. **Root Dev OS contact form still broken** — `app/api/` has no `contact/` route (confirmed via directory listing: `agents, dev-inspector, devserver, logs, projects, prompts, sessions, terminal, workflows, workspaces` — no `contact`). The form in `components/sections/ContactForm.tsx` still posts to a route that doesn't exist in this app (it only exists in `apps/cnbiz-web`).
7. **Repo bloat still committed** — `structure.txt`, `tree.txt`, `typescript-files.txt`, `apps-tree.txt`, `packages-tree.txt`, `backup.bat`, `start-wor.bat` all still `git ls-files`-tracked; `test-project/` still present and tracked.
8. **`LICENSE` still empty** — 0 bytes.

---

# Remaining P1

9. **No test framework anywhere** — `tests/{unit,integration,e2e,fixtures,mocks,performance,security,reports}/` each still contain only a `README.md`; zero actual test files confirmed.
10. **No unit tests for Content Engine** (`packages/cli/src/website/content.ts`) — unchanged.
11. **No unit tests for Workflow/Orchestrator engines** — unchanged.
12. **`tests/` scaffold still unpopulated** — same as #9.

---

# Remaining P2

13. **Onboarding docs still empty** — `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md` all confirmed 0 bytes/0 lines.
14. **No CLI command reference** — still absent.
15. **`packages/cli/README.md` still empty** (0 bytes, part of the P0 installer-files group above).
16. **No document reconciling root-level `agents/`/`prompts/`/`memory/`/`orchestration/`/`marketplace/` scaffolding with the separate `packages/cli/src/*` runtime** — still absent.

---

# Current Feature Completion

Unchanged from `IMPLEMENTATION_STATUS.md` — re-verified spot checks below confirm no drift:

| Area | Audit Estimate | Current Status |
|---|---|---|
| Core Platform (CLI+Agent+Workflow+Runtime+Marketplace) | ~60–65% | **Unchanged** — `resumeWorkflow`/`retryWorkflow` still throw `NOT_IMPLEMENTED` (`packages/cli/src/workflow/runtime.ts:159-165`, re-verified verbatim) |
| CLI | ~74% | **Unchanged** — `ai website create` confirmed still registered (`index.ts:98`, `buildWebsiteCommand()`); `ai new` confirmed still **not** registered as a top-level command (`new.js` exists on disk but is never imported/wired in `index.ts`); `.version(CLI_VERSION)` confirmed still Commander-default (no explicit `-v` alias flag string), so lowercase `-v` remains unsupported |
| Website Builder | ~70% | **Unchanged** — not present in `packages/cli/src/config/menu.json` (confirmed: 9 menu items, no "website" entry) |
| Dashboard | ~55–60% blended | **Unchanged** — zero auth confirmed (`find app -iname "*auth*"` empty; no `authenticate`/`isAuthenticated`/`requireAuth` in `app/api`) |
| Marketplace | ~55–60% | **Unchanged** — `add.ts`/`remove.ts` still target `path.join(projectRoot, "packages")` while `update.ts` still targets `path.join(projectRoot, "marketplace")` — the directory inconsistency the audit flagged is confirmed still present, verbatim |
| Testing & CI | ~0% / false-positive | **Unchanged** — see P1/P0 above |

**Overall Project Completion: ~50–55%** (no change from audit — no code has been touched).

---

# Current Technical Debt

Unchanged from `TECH_DEBT.md`, with the one count correction noted above:

- `resumeWorkflow`/`retryWorkflow` still silently-wrong stubs (throw `NOT_IMPLEMENTED`, but CLI flags advertising resume/retry still exist per the audit's original finding).
- Marketplace `add`/`remove`/`update` (`packages/<name>`) vs. `publish`/`install`/`search` (`agents/`/`workflows/`/`skills/` under `marketplace/`) directory mismatch confirmed unchanged.
- `ai new` documentation/registration mismatch confirmed unchanged (file exists, not wired).
- Zero authentication across the Dashboard/API layer confirmed unchanged, including the unauthenticated `/api/terminal` arbitrary-command-execution endpoint.
- Nested `AI-Web-Master/` gitlink confirmed unchanged and still occupying working-tree space.
- Documented (`ARCHITECTURE.md` `src/` 4-layer) vs. built (`app/`/`lib/`/`components/`) architecture gap confirmed unchanged — no `src/` directory has been created.
- **Minor correction**: `skills/shared/**` zero-byte README count is 15, not the 16 previously cited — immaterial to remediation effort, noted for record accuracy only.

---

# Recommended Next Tasks

Unchanged priority order from `ROADMAP.md` — since no work has landed, the original top-10 stands
as-is. Restated here in the same order, because none of it can be deprioritized yet:

1. Restore `packages/cli/install.ps1` and its 5 sibling files (0 bytes → real content) so the documented install flow works again.
2. Resolve the `AI-Web-Master/` orphaned gitlink (`git rm --cached AI-Web-Master` or configure as a real submodule).
3. Replace `.github/workflows/test.yml`'s `--if-present`-masked false positive with a workflow that fails when no tests exist, or stand up a real minimal suite in `packages/cli` first.
4. Fix `.github/workflows/docs.yml`'s required-file check — populate `skills/README.md` (currently missing entirely, not just empty) + the 15 `skills/shared/**` stubs + `LICENSE`.
5. Extend CI linting to `packages/cli` and `apps/cnbiz-web` (currently both excluded via `eslint.config.mjs` `globalIgnores`).
6. Fix the root Dev OS app's contact form — either add `app/api/contact/route.ts` or repoint the form.
7. Write `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md` (all still literally 0 bytes) and a CLI command reference.
8. Implement `resumeWorkflow`/`retryWorkflow` for real, or remove the flags advertising them.
9. Fix marketplace `add`/`remove`/`update` to target the same `marketplace/{agents,workflows,skills}/` layout as `publish`/`install`/`search`.
10. Add authentication to the Dashboard/API layer, starting with `/api/terminal`.

No re-prioritization is warranted — the repository has not moved since the audit was written.
