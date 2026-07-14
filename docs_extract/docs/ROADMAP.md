# NEXT PRIORITIES

> Recommendations limited strictly to features/fixes that are **not already implemented**, per the
> evidence gathered in `PROJECT_AUDIT.md`, `CLI_AUDIT.md`, `AGENT_AUDIT.md`, `WORKFLOW_AUDIT.md`,
> `WEBSITE_BUILDER_AUDIT.md`, `DASHBOARD_AUDIT.md`, `CODE_QUALITY.md`, and `TECH_DEBT.md`.
> Nothing here restates a feature already marked ✅ Complete in `FEATURE_MATRIX.md`.

---

## P0 — Repo hygiene & broken tooling (fix before building more on top)

These are things that are supposed to already work and currently don't, silently.

1. **Restore `packages/cli/install.ps1` (and `README.md`, `ai.cmd`, `ai.ps1`, `install.sh`, `Setup.cmd`)** — all 6 files are 0 bytes at current HEAD, emptied by commit `4c3d5af` and never restored. `scripts/setup.ps1` directly depends on `install.ps1` to install the global `ai` command; that path is currently broken. Evidence: `CODE_QUALITY.md`.
2. **Resolve the nested `AI-Web-Master/` git submodule gitlink** — a 7.9 MB duplicate of the whole repo tracked at mode `160000` with no `.gitmodules` file. Either remove it from the index (`git rm --cached AI-Web-Master`) or properly configure it as a real submodule, whichever was intended. Evidence: `PROJECT_AUDIT.md`, directly verified via `git ls-tree`.
3. **Fix or remove `.github/workflows/test.yml`** — it currently reports "✓ Unit Tests / ✓ Integration Tests / ✓ End-to-End Tests" unconditionally, regardless of whether any test ran (none exist). This is worse than no CI at all, because it looks like coverage exists when it doesn't. Evidence: `CODE_QUALITY.md`.
4. **Fix `.github/workflows/docs.yml`** — would fail immediately if triggered, due to 16 zero-byte `skills/shared/**/README.md` stubs, a missing `skills/README.md`, an empty `LICENSE`, and several other empty `.md` files. Either populate the missing content or adjust the workflow's expectations. Evidence: `CODE_QUALITY.md`.
5. **Extend `.github/workflows/lint.yml` to cover `packages/cli` and `apps/cnbiz-web`** — currently only lints the root workspace (root `eslint.config.mjs` explicitly ignores `apps/**`/`packages/**`). Evidence: `CODE_QUALITY.md`.
6. **Fix the public contact form** — `components/sections/ContactForm.tsx` (root Dev OS app) posts to `/api/contact`, which does not exist in this app (it only exists in the separate `apps/cnbiz-web`). Either add the missing route or point the form at the correct app. Evidence: `DASHBOARD_AUDIT.md`.
7. **Remove or gitignore repo bloat**: `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), `apps-tree.txt`, `packages-tree.txt`, and the stray `test-project/` artifact. Evidence: `CODE_QUALITY.md`, `PROJECT_AUDIT.md`.
8. **Populate `LICENSE`** — currently 0 bytes despite the file existing (implying intent to add one). Evidence: `CODE_QUALITY.md`.

## P1 — Testing (currently 0% — the single biggest structural gap)

9. **Stand up an actual test framework** in at least `packages/cli` (highest-value target — it's the most logic-dense, least-covered piece) — e.g. Vitest or Jest, with `test` scripts wired into `package.json` and into a corrected `test.yml`.
10. **Add unit tests for the Content Engine's merge/parse logic** (`packages/cli/src/website/content.ts:parseOverrides`/`mergeOverrides`) — this is exactly the kind of string-parsing/fallback logic most likely to silently regress.
11. **Add unit tests for the Workflow/Orchestrator engines** (`workflow/runtime.ts`, `orchestrator/scheduler.ts`) — sequencing, locking, and stop-on-error behavior are all currently unverified except by manual runs during development sessions.
12. **Populate the `tests/` directory structure that already exists** (`tests/{unit,integration,e2e}/`) — the scaffold is there, described in each subfolder's README, but contains zero actual tests.

## P2 — Documentation gaps

13. **Write `docs/getting-started.md`, `docs/installation.md`, `docs/faq.md`** — all three are currently empty files, already tracked as "Planned" in `docs/01_PMO/PROJECT_ROADMAP.md`'s own Phase 5 table.
14. **Write a CLI command reference** — no single document currently lists all `ai <command>` usage; the closest equivalent is scattered `--help` text and CHANGELOG entries. Evidence: `CLI_AUDIT.md`.
15. **Restore or rewrite `packages/cli/README.md`** — currently effectively empty despite being the CLI package's own README.
16. **Document the relationship between the root-level prompt/spec layer (`agents/`, `prompts/`, `memory/`, `orchestration/`, `marketplace/`) and the functionally-separate runtime implementations in `packages/cli/src/*`** — confirmed by two independent sub-audits as a real source of navigational confusion given the naming overlap.

## P3 — Agent System capability gaps

17. **Implement a tool-calling loop** so agents can actually invoke their declared `tools[]` autonomously, rather than tools only being callable directly from CLI code. Evidence: `AGENT_AUDIT.md`.
18. **Implement multi-turn conversation support** in `runtime/executor.ts` — currently exactly one system+user message pair per execution.
19. **Implement `resumeWorkflow`/`retryWorkflow`** properly (`workflow/runtime.ts:159-165`), or remove the `--resume`/`--retry` CLI flags until they're real — right now they silently restart from scratch, which is a correctness risk for non-idempotent workflow steps.
20. **Reconcile the two overlapping workflow-execution commands** (`ai workflow run` vs `ai orchestrator run`) — either document clearly when to use which, or merge them into one command with an opt-in parallel mode.

## P4 — CLI consistency fixes

21. **Fix the marketplace `add`/`remove`/`update` commands** to target `agents/`/`workflows/`/`skills/` (matching `publish`/`install`/`search`) instead of `packages/<name>`.
22. **Register `ai new` as a direct top-level command** (or update all documentation/CHANGELOG references to stop describing it as one) — currently it's reachable only through the interactive menu.
23. **Add a real `-v`/lowercase version alias** if that's still desired (a past CHANGELOG entry claims it was added; it currently isn't present in `src/index.ts`).

## P5 — Website Builder enhancements (already solid; these are genuine gaps, not core fixes)

24. **Wire up actual email delivery** for the generated `app/api/contact` and `app/api/newsletter` routes — currently they validate and log only; `.env.example` documents `RESEND_API_KEY` etc. but no code reads them.
25. **Add blog post detail pages** (`/blog/[slug]`) to the generated site — currently only a listing page exists.
26. **Add a dark-mode variant** to the generated design system (`styles/theme.css` currently has no `prefers-color-scheme` block).
27. **Consider per-site-type page-set customization** — right now every site type gets the same fixed 11 pages, which is a mismatch for some business types (e.g. a "restaurant" site getting a SaaS-style subscription pricing page).
28. **Expose `ai website create` in the interactive menu** (`menu.json`) — currently only reachable as a direct CLI invocation.

## P6 — Dashboard / security

29. **Add authentication to the root Development OS app** — currently zero auth anywhere, including on `/api/terminal`, which executes arbitrary shell commands. This is acceptable for a strictly local dev tool but should not be exposed beyond localhost without auth.
30. **Add schema-based input validation** (e.g. `zod`) across the 33 root API routes — currently all validation is manual/ad-hoc.
31. **Wire real backends for `/login` and `/signup`**, or remove them if they're not meant to be functional yet.

---

None of the above restates anything already marked ✅ Complete in `FEATURE_MATRIX.md`. Items are grouped by urgency (P0 = broken/misleading right now, P6 = genuine but lower-urgency enhancement), not by estimated effort.
