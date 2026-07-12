# CODE QUALITY AUDIT

> Scope: Testing (coverage, build verification), TODO/FIXME/XXX/HACK, duplicate code, dead code,
> unused files, unused exports. Read-only audit — nothing modified.
> Security findings and architecture-level technical debt are in `TECH_DEBT.md`; this file covers
> code-hygiene findings only.

---

## Testing

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

---

## TODO / FIXME / XXX / HACK

Grep across real source (`.ts`/`.tsx`, excluding `node_modules`/`dist`/the nested `AI-Web-Master/` clone) found **only intentional, non-debt occurrences**:

- `packages/cli/src/generators/{agent,skill,workflow}.ts` — default placeholder description text (`"TODO — describe what this agent does"`) that gets written into **scaffolded output for end users**, not a marker of incomplete CLI code.
- `apps/cnbiz-web/components/sections/{ContactInfoSection,PortfolioPlaceholderSection}.tsx` — literal "TODO" **UI badges** shown to site visitors for unconfirmed business facts (documented, intentional, per `docs/01_PMO/CHANGELOG.md` 2026-07-04 entry).

No FIXME/XXX/HACK found anywhere in real code. **Zero actual code-debt TODOs.**

### Explicit unimplemented placeholders (honest, self-labeled — not hidden TODOs)

- `packages/cli/src/workflow/runtime.ts:159-165` — `resumeWorkflow()`/`retryWorkflow()` both immediately `throw new WorkflowError("NOT_IMPLEMENTED", ...)`.
- `packages/cli/src/commands/workflow-run.ts:21,25` — `--resume`/`--retry` flags print a warning and fall back to running from scratch.
- `packages/cli/src/orchestrator/scheduler.ts:79` — conditional stage evaluation is labeled but not implemented.

---

## Duplicate code

**`packages/cli/src/generators/{agent,skill,workflow}.ts` are ~95% identical** (46/41/41 lines respectively, 128 total). Each does: destructure `{name, cwd, description="TODO...", author="AI Business OS", version="1.0.0"}` → `assertValidName(name)` → build `targetDir = path.join(cwd, "<agents|skills|workflows>", name)` → call `generateFromTemplate({templateType, targetDir, variables: {name, className: toPascalCase(name), description, author, version, createdAt, createdAtDate}})` → return `{name, targetDir, files}`. The only real differences are the `templateType` string, the target subfolder, and default description text.

**Refactoring opportunity**: collapse into one `generateScaffold(kind, options)` function with a 3-entry lookup table, eliminating roughly 90 lines of duplication.

**Not flagged as duplication (false-positive check)**: `packages/cli/src/providers/{anthropic,openai,gemini,ollama}.ts` are structurally similar but each necessarily implements a different wire format (different auth headers, endpoints, request/response shapes). This is the expected shape of an adapter layer, and the common HTTP/timeout/error-handling logic is already correctly factored out into `providerFetchJson()` in `provider.ts`.

---

## Dead / unreachable code

- **`packages/cli/src/orchestrator/*` is fully implemented and wired**, not dead. Confirmed reachable: `commands/orchestrator.ts` → `buildOrchestratorCommand()` → registered at `src/index.ts:95`.
- **`packages/cli/src/commands/new.js`'s `newProject()` has no top-level CLI registration.** Full read of `src/index.ts` confirms `menu`, `project`, `devmode`, `deploy`, `register`, `create` (+ `create-agent`/`create-workflow`/`create-skill`), `run`, `workflow` (+ `workflow-create`/`workflow-run`), `memory`, `orchestrator`, `provider`, `tools`, `website`, `init`, `add`, `install`, `doctor`, `search`, `remove`, `update`, `publish` are registered — **there is no `.command("new")`**. `new.js` is reachable only via `session/states/projectState.js` (the interactive menu's project-registration flow). See `CLI_AUDIT.md` for the doc-mismatch this causes.

---

## Unused / orphaned files

- **`packages/cli/install.ps1`, `packages/cli/README.md`, `packages/cli/ai.cmd`, `packages/cli/ai.ps1`, `packages/cli/install.sh`, `packages/cli/Setup.cmd` are all 0 bytes — and this is committed, not a local accident.** Verified via `git status --short` (clean, matches HEAD) and `git show HEAD:packages/cli/install.ps1 | wc -c` → `0`. Root cause traced via `git show --stat 4c3d5af` ("docs: complete packages documentation", 2026-07-11 18:07:25): that commit deleted **338 lines** from `install.ps1` (→ 0), plus emptied `README.md`, `ai.cmd`, `ai.ps1`, `install.sh`, and 20 lines from `package.json`, while adding new `packages/{README,agents,prompts,skills,templates,workflows}/README.md` docs in the same commit. Later commits (`803471b`, `a4ae983`, `4e7900d`, `a23abdf`) restored `package.json` and `src/index.ts` to full working state, **but never restored `install.ps1`/`README.md`/`ai.cmd`/`ai.ps1`/`install.sh`/`Setup.cmd`.** They remain empty at current HEAD.
  - **Live impact**: `scripts/setup.ps1` (repo root, the documented one-command installer) directly calls `packages/cli/install.ps1` (`scripts/setup.ps1:182,186`). Since that script is now empty, running `scripts/setup.ps1` today cannot install the global `ai` command via that path. `setup.ps1` does verify `ai.cmd` actually got created (line 208/218), so it will correctly *report* failure rather than falsely claim success — but the documented install flow is currently broken. See `TECH_DEBT.md` item 1.
- **16 zero-byte `README.md` stub files under `skills/`**: `skills/shared/README.md` plus `skills/shared/{api-design,authentication,authorization,coding-standards,database,design-system,documentation,error-handling,logging,monitoring,performance,security,testing,validation}/README.md`, and `skills/templates/README.md`. (`docs/01_PMO/CHANGELOG.md`'s 2026-07-10 entry mentioned "14" category-index stubs as unresolved; the current actual count is 16.) **This is also why `.github/workflows/docs.yml` would fail if run**: its "Check Empty Markdown Files" step does `find . -name "*.md" -size 0` and `exit 1` on any match — these 16 files plus `LICENSE`, `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/README.md`, `docs/{faq,getting-started,installation}.md`, `docs/04_OPERATIONS/README.md`, `docs/99_ARCHIVE/README.md`, and the 6 empty `packages/cli/*` files above would all trigger that failure. Separately, `docs.yml` also requires a `skills/README.md` at that exact path, which does not exist (there is `skills/core/SKILL.md`, `skills/domains/SKILL.md`, `skills/experts/SKILL.md`, but no `skills/README.md`) — a second independent reason that workflow would fail.
- `LICENSE` at repo root is 0 bytes — the file exists (implying intent to license) but has no actual license text.
- `test-project/` (repo root) — stray artifact from testing `ai new`, partially git-tracked (`test-project/README.md`, `test-project/ai-business-os.json`). See `PROJECT_AUDIT.md` §2.
- Large committed dump files: `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), `apps-tree.txt`, `packages-tree.txt` — all tracked via `git ls-files`. See `TECH_DEBT.md`.
- The root-level `cli/` directory flagged as a deletion candidate in the 2026-07-10 CHANGELOG entry no longer exists on disk (resolved at some point since, with no CHANGELOG entry documenting the removal).

## Unused exports

Not exhaustively verified — a full cross-repo import graph was out of scope for this pass. Spot checks on the orchestrator module (confirmed fully referenced, see above) and the provider registry (`packages/cli/src/providers/registry.ts`, confirmed referenced) found no unused-export issues. No additional findings beyond the dead-code items already listed above.

## Summary status

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
