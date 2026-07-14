# TECHNICAL DEBT & SECURITY AUDIT

> Scope: security (secrets, API keys, unsafe code, validation) and architecture-level technical debt.
> Read-only audit — nothing modified, nothing fixed.

---

## Security

### Secrets / API keys

**No hardcoded secrets found.** Searched the entire repository (excluding `node_modules`/`.git`/`dist`/the nested `AI-Web-Master/` clone) for AWS keys (`AKIA...`), Google API keys (`AIza...`), GitHub tokens (`ghp_...`), OpenAI-style keys (`sk-...`), Slack tokens (`xoxb-...`), and PEM private-key headers. The only match was the pattern definition itself inside `.github/workflows/security.yml` (the CI script that greps for these patterns) — a false positive, not a real secret.

**`.env` handling is correct:**
- Only `.env.example` files are committed (`apps/cnbiz-web/.env.example`, `packages/cli/src/templates/website/.env.example`) — both are value-less templates.
- `apps/cnbiz-web/.env.local` exists on disk with a real API key but is confirmed **not tracked by git** (`git ls-files | grep .env.local` → no match).
- Root `.gitignore` has `.env*.local` plus an explicit `!.env.example` exception.

**`security.yml` CI workflow does real work** (unlike `test.yml` — see `CODE_QUALITY.md`): runs `npm audit --audit-level=high` and greps for secret patterns with `exit 1` on match. This is a genuine, functioning check.

### Unsafe code patterns

- **No `eval(`** anywhere in the repository.
- **`dangerouslySetInnerHTML`** — 2 occurrences, both low-risk: `app/layout.tsx:69` and `packages/cli/src/templates/website/components/JsonLd.tsx:15`. Both feed `JSON.stringify()` of a locally-constructed, non-user-controlled object (site config / Organization schema) into a `<script type="application/ld+json">` tag — the standard Next.js pattern for JSON-LD, carrying no injection risk since there is no unsanitized user input in the payload.
- **`child_process.exec()`** (the shell-string variant, vulnerable to metacharacter injection if fed unsanitized input) appears in exactly one place: `packages/cli/src/tools/terminal.ts:1`. This backs the CLI's `terminal` Tool, which is explicitly designed to run arbitrary shell commands on behalf of an agent/user — an inherent property of a terminal tool, not a bug, but the caller-supplied command string does reach `exec()` directly. **Also relevant**: `app/api/terminal/route.ts` (repo-root dashboard) exposes an unauthenticated HTTP endpoint that runs an arbitrary shell command string (via `lib/terminal/server.ts:executeShellCommand`) with no auth check — see "Architecture issues" below.
- All other `child_process` usage across the repo uses `spawn`/`spawnSync`/`execFile` (argument-array form) or `execSync` with fully static, hardcoded strings (`"node -v"`, `"npm -v"`, `"git --version"`, `"netstat -ano -p tcp"` in `doctor.ts` and `devServer.js`) — no interpolated input reaches any of these, so no injection risk there.

### API validation

Spot-checked: `app/api/contact/route.ts` (root Dev OS, though note it doesn't actually exist — see `DASHBOARD_AUDIT.md`) and the newly-generated `packages/cli/src/templates/website/app/api/{contact,newsletter}/route.ts` templates validate required fields and email format server-side before processing. No schema-validation library (`zod` etc.) is used anywhere in the repo — validation is entirely manual/ad-hoc, present in most but not all of the 33 root API routes (see `DASHBOARD_AUDIT.md` for the full table).

### Security summary

| Item | Status | Evidence |
|---|---|---|
| Hardcoded secrets | ✅ None found | repo-wide grep |
| `.env` hygiene | ✅ Correct | `.gitignore`, `git ls-files` |
| `eval()` usage | ✅ None found | repo-wide grep |
| `dangerouslySetInnerHTML` risk | ✅ Low (trusted data only) | `app/layout.tsx:69`, `JsonLd.tsx:15` |
| Shell-injection-capable `exec()` | 🟡 Present, by design (terminal tool) | `tools/terminal.ts`, `app/api/terminal/route.ts` |
| API authentication | ❌ Missing everywhere | see `DASHBOARD_AUDIT.md` |
| Schema-based input validation | ❌ Missing (manual checks only) | no `zod`/similar anywhere |
| `npm audit` in CI | ✅ Present and functional | `.github/workflows/security.yml` |

---

## Architecture issues & refactoring opportunities

1. **Broken installer, uncaught by any safety net.** `packages/cli/install.ps1` and 5 sibling files were silently emptied by commit `4c3d5af` and never restored (see `CODE_QUALITY.md`), and no CI check would have caught it — `test.yml` fakes success, `lint.yml` doesn't touch `packages/cli`, and there's no "does the installer still work" check anywhere. This is a direct consequence of zero test coverage combined with CI that reports false positives — the two problems compound.

2. **In-memory-only runtime state, recurring pattern.** Several `docs/01_PMO/CHANGELOG.md` entries (root Development OS side) independently document the same class of bug being found and fixed for Dev Server status (`lib/data/devservers.json` was added specifically so state survives process restarts and is visible across processes). This suggests in-memory-only state that doesn't survive restarts or cross-process visibility has recurred multiple times in this codebase; it wasn't feasible to audit every module (e.g. the Orchestrator's own status/lock files) for this same class of issue within this pass.

3. **`resumeWorkflow`/`retryWorkflow` are advertised via CLI flags but are silent no-ops that restart from scratch.** `ai workflow run --resume`/`--retry` exist and are documented in `--help`, but instead of resuming/retrying they print an easy-to-miss warning and re-run the entire workflow from the beginning. For any workflow with non-idempotent steps (e.g. a step that commits and pushes to git), this could cause real duplicate side effects. See `WORKFLOW_AUDIT.md`.

4. **Self-referential nested git clone.** `AI-Web-Master/` at repo root is a 7.9 MB duplicate of the entire repository sitting inside itself, tracked as an orphaned git submodule gitlink (mode `160000`, pointing at commit `a23abdf`) with no `.gitmodules` file anywhere in the repo (directly verified — see `PROJECT_AUDIT.md`). This bloats every full clone and silently doubles the results of any repo-wide scan unless a tool knows to exclude it (it confused multiple sub-audits performed for this report before being caught). **Not fixed as part of this audit** (read-only); remediation would be `git rm --cached AI-Web-Master` followed by either deleting the nested directory or adding it to `.gitignore`, at the user's discretion.

5. **Two overlapping workflow-execution commands.** `ai workflow run` (simple, sequential) and `ai orchestrator run` (DAG-based, parallel, stoppable) both operate on the identical `workflow.json` format and are both fully implemented and CLI-reachable. They don't duplicate step-execution logic (the Orchestrator explicitly reuses `workflow/executor.ts`), but having two top-level commands that do overlapping jobs with different capabilities is a likely source of user confusion with no documentation distinguishing when to use which. See `WORKFLOW_AUDIT.md`.

6. **Generator duplication.** `generators/{agent,skill,workflow}.ts` are ~95% identical (see `CODE_QUALITY.md`) — low severity, easy, contained refactor opportunity (~90 lines).

7. **`ai new` is referenced across CHANGELOG history as if it were a top-level command, but is not currently registered** in `src/index.ts` (only reachable via the interactive menu). Either the docs/CHANGELOG are stale or a deregistration was accidental at some point; worth reconciling one way or the other. See `CLI_AUDIT.md`.

8. **CI gives false confidence.** `test.yml` always prints "✓" regardless of whether any test ran; `docs.yml` would fail outright if triggered (16+ zero-byte `.md` files, missing `skills/README.md`); `lint.yml` never touches `packages/cli` or `apps/cnbiz-web`. It's unclear from this repo alone whether these workflows are currently enabled/passing on the real GitHub remote — worth confirming directly, since a red or silently-skipped CI provides no actual safety net for changes to this codebase.

9. **Marketplace command inconsistency.** `ai add`/`ai remove`/`ai update` operate on `packages/<name>`, while `ai publish`/`ai install`/`ai search` operate on `agents/`/`workflows/`/`skills/`. A package published and installed via the "correct" marketplace flow cannot be removed or updated via `ai remove`/`ai update`, because those commands look in the wrong directory. See `CLI_AUDIT.md`.

10. **Documented architecture vs. built architecture.** `docs/02_DEVELOPMENT/ARCHITECTURE.md` prescribes a `src/` 4-layer Clean Architecture that, per the roadmap's own admission, has never been built — the real root app lives in `app/`/`lib/`/`components/`. Low urgency (the roadmap is self-aware) but worth resolving one way or the other so the architecture doc reflects reality or a concrete migration plan.

11. **Root-level documentation/scaffolding layer duplicates concepts implemented separately in `packages/cli/src/*`, with no cross-reference.** `agents/`, `prompts/`, `memory/`, `orchestration/`, `marketplace/` at repo root are all prompt/spec markdown, not code, and are not referenced by any of the functionally-equivalent runtime code in `packages/cli/src/{runtime,prompt,memory,orchestrator,marketplace}/`. The naming overlap is confirmed (independently, by two separate sub-audits) to be a real source of potential confusion for anyone navigating the repo.

## Repo hygiene (lower severity, still real)

- Large dump files committed to git: `structure.txt` (2.3 MB), `tree.txt` (2.7 MB), `typescript-files.txt` (1.0 MB), plus `apps-tree.txt`, `packages-tree.txt`, `backup.bat`, `start-wor.bat`.
- `test-project/` — stray generated test artifact, partially committed.
- `LICENSE` — 0 bytes, present but empty.
