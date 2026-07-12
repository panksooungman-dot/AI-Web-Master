# AGENT SYSTEM AUDIT

> Scope: `packages/cli/src/runtime/`, `packages/cli/src/memory/`, `packages/cli/src/prompt/`,
> `packages/cli/src/templates/agent/`, `packages/cli/src/generators/agent.ts`, plus Provider Layer
> and Tool System (runtime infrastructure the agent system depends on).
> Read-only audit — nothing modified.

---

## Agent template structure

`packages/cli/src/templates/agent/` produces, per generated agent:

- `agent.json` — metadata (name/type/version/description/author/createdAt/`tools[]`)
- `config.json` — `{"entryPrompt":"prompt.md","variables":{},"memory":{"enabled":true}}`. **Dead reference**: points to `prompt.md`, which does not exist in the template (only `system.md`/`user.md`/`examples.md`/`prompt.json` exist). `runtime/loader.ts:153` requires `config.json` to be present, but its contents (`entryPrompt`, `variables`, `memory.enabled`) are **never read anywhere** in `runtime/executor.ts` or `context.ts` (confirmed via grep — no consumer). It is a required-but-inert file.
- `manifest.json` — looks like duplicate metadata, but is actually consumed by a **different** system: `marketplace/index.ts`/`marketplace/manifest.ts` (packaging/publish), not the agent runtime.
- `prompt.json` — optional version/author metadata for the prompt files, validated by `prompt/validator.ts`.
- `system.md` / `user.md` / `examples.md` — the actual prompt content, `{{var}}`-templated.

**Status: 🟡 Partial** — functional but carries an unused `config.json` schema (`entryPrompt`, `variables`, `memory.enabled` all dead).

---

## Agent Runtime

Files: `runtime/loader.ts`, `context.ts`, `executor.ts`, `runtime.ts`, `types.ts`.

- `loader.ts:loadAgent()` — resolves `agents/<name>`, falls back to `marketplace/agents/<name>` (lines 14-29). Requires `agent.json` + `config.json` (`REQUIRED_FILES`, line 9). Validates metadata (name/type/semver version/description/author/createdAt, and that every `tools[]` entry is a known tool id — `validateAgentMetadata`, lines 31-95). Delegates prompt-file loading to `prompt/loader.ts` and tool resolution to `tools/manager.ts:loadTools()` (both reused, not reimplemented).
- `context.ts:createRuntimeContext()` — builds `RuntimeContext { project, cwd, timestamp, variables, memory }`; `project` and prior-step `memory` come from `memory/manager.ts:getOrCreateMemory()`.
- `executor.ts:executeAgent()` — renders the prompt via `prompt/engine.ts:buildPrompt()`, then (as of this session) calls the shared `ProviderManager.complete()` helper (`providers/manager.ts`), which does resolve → chat → simulate-fallback in one place. Never throws unless a provider was **explicitly** requested via `--provider` and that call fails — otherwise it silently falls back to a `"[simulated] ..."` string output.
- `runtime.ts:runAgent()` — top-level `ai run <agent>` orchestration: acquires a file lock (`.runtime/locks/<name>.lock`, prevents concurrent duplicate runs) → load → context → execute → log (`.runtime/logs/<name>.log`) → history (`.runtime/history.json`).

**Missing-agent behavior**: `workflow/executor.ts:executeStep()` (lines 65-79) catches `RuntimeError` with code `NOT_FOUND` and returns a **successful simulated** step instead of failing — this lets a workflow be sketched before every referenced agent exists. A structurally-broken agent package (missing files, bad metadata/version) is *not* simulated — it's a real failure that halts the workflow.

**Status: ✅ Complete** for its designed scope (single-turn prompt execution with simulation fallback).

---

## Prompt system

Files: `prompt/engine.ts`, `loader.ts`, `renderer.ts`, `validator.ts`.

- `loadPromptSet()` reads `system.md` (required), `user.md`/`examples.md` (optional, empty string if absent), `prompt.json` (optional metadata).
- `renderer.ts:renderPromptTemplate()` — regex `\{\{\s*([\w.]+)\s*\}\}`, supports dot-paths (e.g. `{{memory.requirements}}`). Missing values render as **empty string**, not left as literal `{{...}}` text — this differs from the code-scaffolding template engine in `generators/template.ts`, which leaves unknown placeholders untouched.
- Declared variables (`prompt/types.ts:PromptVariables`): `agent`, `project`, `workflow`, `memory`, `step`, `input`, `output`, plus an open `[key: string]: unknown` index — so any agent-spec-specific variable (e.g. the Website Builder pipeline's `siteType`/`siteTypeLabel`) renders correctly too.
- `buildPrompt()` composes `system` → (optional `## Examples`) → (optional rendered `user.md`) into one `combined` string.

**Status: ✅ Complete.**

---

## Memory usage

Files: `memory/manager.ts`, `storage.ts`, `types.ts`, `loader.ts`, `exporter.ts`, `commands.ts`.

- Storage: `.runtime/memory/<workflow>.json` (per-workflow/agent-name file), audit trail at `.runtime/history/<workflow>.json`, exports at `.runtime/exports/memory-<workflow>.json`.
- `MemoryRecord = { workflow, version, createdAt, updatedAt, context: {project,cwd,variables,user,environment}, steps: Record<agentName, StepMemory> }`; `StepMemory = {status, input, output, startedAt?, finishedAt?, error?}`.
- `getOrCreateMemory()` never overwrites existing memory (idempotent create); `updateStep()` merges one step's status/input/output and always appends a history entry.
- CLI surface: `ai memory list|show|clear|export` (`memory/commands.ts`).

**Status: ✅ Complete.**

---

## Real agent instances vs. generator capability

Searched the whole repository (excluding `node_modules`, `dist`, and the nested `AI-Web-Master/` clone — see `PROJECT_AUDIT.md`) for real `agent.json` files outside `packages/cli/src/templates/`. **None found.** The root `agents/`, `marketplace/agents/`, `packages/agents/`, and `lib/agents/` directories all exist but contain no real `agent.json` instances.

The Website Builder's 8-agent pipeline (`packages/cli/src/website/agents.ts`, `WEBSITE_AGENT_SPECS`) does generate real `agents/<name>/agent.json` + `system.md` files — but only inside whatever **output project directory** `ai website create` targets (verified this session by generating a test project). This repo's own root has never had `ai website create` run against it, so no persistent agent instances exist here. **The agent runtime is fully implemented and independently exercised via the Website Builder's workflow, but is not "in use" in this repo's own `agents/` folder.**

---

## Missing agent features

Compared against what a "complete" agent runtime typically needs:

- **No multi-turn conversation** — `executor.ts` sends exactly one system+user message pair per execution; no accumulated conversation history across turns.
- **No tool-calling loop** — `agent.tools` is resolved to `Tool[]` instances and mentioned as a text note in the prompt (`toolNote` in `executor.ts`), but the LLM response is never parsed for tool-call requests, and there's no loop that executes a tool and feeds the result back to the model. Tools are only invoked directly by CLI code (e.g. `website/scaffold.ts` calling `executeTool("filesystem", ...)`), never by the agent itself.
- **No streaming** — `AIProvider.chat()` (`providers/provider.ts`) returns a single awaited `ChatResponse`; no streaming interface exists.
- **No agent-to-agent handoff protocol** beyond simple sequential/parallel `{{input}}`/`{{output}}` chaining via the Workflow Engine or Orchestrator.
- **No automatic retry on transient provider failures** — a failed non-explicit provider falls back to simulation once; no retry-with-backoff.
- **`config.json`'s `memory.enabled`/`entryPrompt` fields are unused** — memory is always on and the entry prompt is always `system.md`, regardless of what `config.json` declares.

---

## Runtime infrastructure the Agent System depends on

### Provider Layer

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

### Tool System

`packages/cli/src/tools/{registry,types,filesystem,terminal,git,github,http,browser,manager}.ts` — 6 tools registered in `tools/registry.ts:TOOLS`, all real implementations:

1. `filesystem` — read/write/list/exists, path-scoped to `cwd` (rejects `../` escapes via `resolveScopedPath`, throws `FORBIDDEN_PATH`)
2. `terminal` — `child_process.exec` with 30s default timeout, 10 MB max buffer, returns `{stdout,stderr,exitCode}`
3. `git` — thin wrapper that builds a `git <args>` string and delegates to the `terminal` tool (reused, not reimplemented)
4. `github` — GitHub REST API (`api.github.com`) for repo/issues/pulls, optional `GITHUB_TOKEN` bearer auth
5. `http` — generic fetch wrapper with timeout
6. `browser` — plain HTTP fetch + regex-based HTML title/text extraction — explicitly documented in-code as NOT a real JS-rendering browser (directs users to the Playwright MCP for real browser automation)

Tools are invoked two ways: (a) declared in an agent's `agent.json:tools[]` and validated/loaded but **never auto-invoked** by the agent itself (no tool-calling loop — see above), or (b) called directly by CLI code via `tools/manager.ts:executeTool(id, input)` (e.g. the Website Builder writing `PLANNING.md`).

**Status: ✅ Complete** as a directly-invokable tool library; 🟡 **not integrated into agent execution** as an agentic tool-use loop.

---

## Summary status

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
