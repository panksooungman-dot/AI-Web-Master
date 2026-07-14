# CLI AUDIT

> Scope: `packages/cli/src/index.ts` (entry/routing), `packages/cli/bin/ai.js`, `packages/cli/src/commands/**`,
> the interactive menu (`packages/cli/src/commands/menu/**`, `packages/cli/src/session/**`).
> Read-only audit — nothing modified.

---

## Top-level commands (registered in `src/index.ts`)

| Command | Description | Status | File(s) | Notes |
|---|---|---|---|---|
| `ai menu` (also bare `ai`) | Interactive numbered menu | ✅ Complete | `commands/menu/index.js` → `session/SessionManager.js` | State-machine driven; bare `ai` with no args also routes here (`index.ts:150-153`) |
| `ai project` | Project launcher — pick recent project, auto-`chdir`, show Git status, offer devmode | ✅ Complete | `commands/project.js` | Reuses `devmode()` |
| `ai devmode` | VS Code + `npm run dev` (auto port detect) + browser preview + Visual Editor | ✅ Complete | `commands/devmode.js`, `lib/devServer.js`, `lib/devInspectorInstall.js` | Windows-oriented (`spawnSync` with `shell:true`, `code.cmd`) |
| `ai deploy` | Push current branch to remote after checks | ✅ Complete | `commands/deploy.js` | Interactive y/N prompts only, no `--yes` flag for CI use |
| `ai register` | Register a path in the global project registry (non-interactive) | ✅ Complete | `commands/register.js` | |
| `ai create agent/workflow/skill <name>` | Scaffold generators | ✅ Complete | `commands/create.ts` → `create-agent.ts`/`create-workflow.ts`/`create-skill.ts` → `generators/*.ts` | See `CODE_QUALITY.md` for duplication across the 3 generators |
| `ai run <agent-name>` | Execute a single Agent via Runtime | ✅ Complete | `commands/run.ts` → `runtime/runtime.ts` | Falls back to `[simulated]` output if no provider configured |
| `ai workflow create <name>` | Scaffold a workflow | ✅ Complete | `commands/workflow.ts` → `workflow-create.ts` | |
| `ai workflow run <name> [--resume] [--retry]` | Execute workflow steps sequentially | 🟡 Partial | `commands/workflow-run.ts` → `workflow/runtime.ts` | `--resume`/`--retry` print "not implemented yet (placeholder)" and silently re-run from the start (`workflow-run.ts:20-26`); `workflow/runtime.ts:159-165` — `resumeWorkflow()`/`retryWorkflow()` both `throw new WorkflowError("NOT_IMPLEMENTED", ...)` |
| `ai memory list/show/clear/export` | Inspect `.runtime/memory/*.json` | ✅ Complete | `commands/memory.ts` → `memory/commands.js` | |
| `ai orchestrator run/status/stop` | Dependency-aware parallel workflow execution | ✅ Complete | `commands/orchestrator.ts` → `orchestrator/runtime.ts`, `manager.ts` | Confirmed wired: `src/index.ts:13,95` |
| `ai provider list/use/test/models` | Manage LLM providers | ✅ Complete | `commands/provider.ts` → `providers/manager.ts` | |
| `ai tools list/test [id]` | Inspect/smoke-test Tool System | ✅ Complete | `commands/tools.ts` → `tools/manager.ts` | |
| `ai website create` | 8-step AI pipeline + Content Engine → full Next.js site generator | ✅ Complete | `commands/website.ts` → `website/builder.ts` | Options: `--name --site-type --type --audience --brand --language --out --provider`. See `WEBSITE_BUILDER_AUDIT.md`. **Not exposed in `menu.json` or root README** |
| `ai init [project]` | Bootstrap a bare AI-Business-OS folder skeleton (`agents/skills/prompts/templates/workflows` + README + `ai-business-os.json`) | ✅ Complete (narrow scope) | `commands/init.ts` | Overlaps in purpose with `ai create`/`ai new` with no cross-reference between them — undocumented distinction |
| `ai add <package>` | Create a bare package dir under `packages/<name>` (README + package.json only) | 🟡 Partial / likely legacy | `commands/add.ts` | Writes to `packages/`, which is **not** the directory `install`/`publish`/`remove`/`update` operate on (those use `agents/`/`workflows/`/`skills/`) — looks like a leftover from an earlier design |
| `ai install <package> [--type]` | Install a marketplace package into `agents/`/`workflows/`/`skills/` | ✅ Complete | `commands/install.ts` → `marketplace/*` | |
| `ai doctor` | Environment + project-structure check | ✅ Complete | `commands/doctor.ts` | Checks for dirs `packages, agents, skills, prompts, templates, workflows, marketplace, memory, orchestration, .github` unconditionally, regardless of project type |
| `ai search [keyword] [--type]` | Search marketplace index | ✅ Complete | `commands/search.ts` | |
| `ai remove <package>` | Delete `packages/<name>` | 🟡 Partial | `commands/remove.ts` | Operates on `packages/`, not `agents/`/`workflows/`/`skills/` — **inconsistent with `install`/`publish`**; removing an installed agent/workflow/skill via `ai remove` will not find it |
| `ai update <package>` | Re-copy `marketplace/<name>` → `packages/<name>` | 🟡 Partial | `commands/update.ts` | Same `packages/` vs. `agents/workflows/skills` mismatch as `add`/`remove` |
| `ai publish [package]` | Publish local `agents/`/`workflows/`/`skills/` to marketplace | ✅ Complete | `commands/publish.ts` → `marketplace/*` | |
| `--version`/`-V` | Print CLI version (+ build commit) | 🟡 Partial vs. docs | `src/index.ts:40` (`program.version(CLI_VERSION)`) | Commander's default flag for `.version()` is `-V` (capital). `docs/01_PMO/CHANGELOG.md` (2026-07-09 (4)) claims a lowercase `ai -v` was added — **not present** in current `index.ts`; no custom `-v` alias registered anywhere |

### `ai new` — documented but not a top-level command

Root `README.md:58` documents `ai new` as a direct CLI command ("새 프로젝트 생성"). **`src/index.ts` has no `program.command("new")` registration.** `commands/new.js` (`newProject()`) exists but is wired **only** into the interactive menu's project flow (`session/states/projectState.js:4,36`, reached via `ai menu` → "프로젝트 관리" → new-project). Running `ai new` directly in a shell would hit Commander's unknown-command error.

**Status: ❌ Missing (as a direct command) / ✅ Complete (as a menu-only feature).** Evidence: full read of `src/index.ts` (no "new" command block) vs. `README.md:58` vs. `session/states/projectState.js:4`.

---

## Interactive menu (`ai menu` / bare `ai`)

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

---

## CLI documentation vs. reality

- Root `README.md` documents install flow + `ai doctor`/`ai new`/`ai devmode` only (lines 56-64). The `ai new` reference is inaccurate (see above). No mention anywhere of `ai website create`, `ai workflow`, `ai memory`, `ai orchestrator`, `ai provider`, `ai tools`, `ai project`, `ai deploy`, `ai register`, marketplace commands, or the interactive menu system.
- `packages/cli/README.md` is effectively empty (0 bytes — see `CODE_QUALITY.md`), despite being the CLI package's own README.
- No dedicated CLI command-reference document exists anywhere under `docs/`.

## Summary status

| Area | Status |
|---|---|
| Core commands (project/devmode/deploy/create/run/memory/provider/tools/doctor) | ✅ Complete |
| Orchestrator commands | ✅ Complete |
| Workflow resume/retry | ❌ Missing (explicit placeholder) |
| Marketplace commands (publish/install/search) | ✅ Complete |
| Marketplace commands (add/remove/update) | 🟡 Partial — inconsistent target directory (`packages/` vs `agents/workflows/skills`) |
| Website Builder command | ✅ Complete (see `WEBSITE_BUILDER_AUDIT.md`) |
| `ai new` as a direct command | ❌ Missing (menu-only) |
| `-v`/`--version` short flag | ❌ Missing vs. CHANGELOG claim |
| CLI documentation | ❌ Missing (no command reference, stale root README) |
