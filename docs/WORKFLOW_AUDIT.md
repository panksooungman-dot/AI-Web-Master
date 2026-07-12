# WORKFLOW SYSTEM AUDIT

> Scope: `packages/cli/src/workflow/`, `packages/cli/src/orchestrator/`, `packages/cli/src/templates/workflow/`,
> `packages/cli/src/generators/workflow.ts`. Read-only audit — nothing modified.

---

## Workflow definition & loading

- **Definition**: `workflow.json = {name, version(semver), steps: [{agent: string, ...open fields}]}` (`workflow/types.ts`). `WorkflowStepDefinition` deliberately allows arbitrary extra fields (`[key: string]: unknown`) for forward-compatibility — this is exactly what the Orchestrator's `dependsOn`/`parallel`/`condition` fields use (see below), without requiring a schema change to the base type.
- **Loading**: `workflow/loader.ts:loadWorkflow()` — same local-then-marketplace resolution pattern as agents (`workflows/<name>` → `marketplace/workflows/<name>`), validated by `workflow/validator.ts:validateWorkflowJson()` (name, semver version, steps array, each step has a non-empty `agent` string).

## Workflow execution (`workflow/runtime.ts:runWorkflow()`)

Sequence: acquire lock (`.runtime/workflow/locks/<name>.lock`) → load → `getOrCreateMemory()` → **sequential** loop over steps calling `workflow/executor.ts:executeStep()` for each, chaining `{{input}}`/`{{output}}` via `previousOutput` → per-step memory update → log (`.runtime/workflow/logs/<name>.log`) → history (`.runtime/workflow/history.json`). **Stop on error**: a failed step halts all remaining steps.

**Existing workflow instances**: only the Website Builder's `website-builder` workflow (8 steps: business-analyst → site-planner → ui-designer → component-generator → page-generator → seo-generator → qa → project-generator), created on demand by `website/workflow.ts:ensureWebsiteWorkflow()` **inside the output project directory** — same caveat as agents (see `AGENT_AUDIT.md`): no persistent `workflows/` instance exists in this repo's own root.

## Reusable workflow step patterns

- `stepLabel()` (`workflow/executor.ts:9-19`) converts an agent id like `"ui-designer"` into a human label `"UI Designer"` using an acronym table (`ui,ux,ai,qa,api,seo,os,ci,cd` → uppercased). **Reused, not duplicated**, by the Orchestrator's Planner (`orchestrator/planner.ts:1,48` imports `stepLabel` directly).
- `{{input}}`/`{{output}}` step chaining is the base reusable mechanism both the plain Workflow Runtime and the Orchestrator rely on.

## Missing / explicitly-placeholder features

- **`resumeWorkflow()`/`retryWorkflow()`** (`workflow/runtime.ts:159-165`) are explicit stubs: `throw new WorkflowError("NOT_IMPLEMENTED", ...)`. The `ai workflow run --resume`/`--retry` flags exist in `commands/workflow-run.ts` and print a yellow "not implemented yet (placeholder)" warning, then **silently re-run the workflow from the start** instead of erroring out or refusing — see `TECH_DEBT.md` item 3 for the risk this poses to non-idempotent steps (e.g. duplicate commits/pushes).
- `workflow/runtime.ts` itself has **no parallel execution, no conditional branching, no dependency graph** — it is a flat sequential list.
- **No per-step retry or fallback-step mechanism** beyond stop-on-error, in either engine.

## The Orchestrator — a second, more capable engine on the same file format

`packages/cli/src/orchestrator/` (Planner + Scheduler + Executor) is layered on top of the exact same `workflow.json` format and is **not dead code** — confirmed wired end-to-end:

- `orchestrator/planner.ts:createExecutionPlan()` builds a dependency graph from each step's optional `dependsOn: string[]` or `parallel: true` field, falling back to a strict sequential dependency on the previous step when neither is present — **100% backward-compatible** with plain `workflow.json` files that have neither field.
- Topologically sorts into `ExecutionStage`s; `orchestrator/scheduler.ts:runPlan()` executes each stage's steps via `Promise.all` when a stage has more than one step (true parallelism).
- Persists live status to `.runtime/orchestrator/status.json`.
- Supports graceful stop mid-run via a stop-flag file checked at each stage boundary (`ai orchestrator stop`).
- A `condition` field is recognized and labeled `"conditional"` in output, but **not evaluated** — `scheduler.ts:79` explicitly logs `"conditional — evaluation not yet implemented"`.
- `orchestrator/executor.ts:executeStage()` explicitly **reuses** `workflow/executor.ts:executeStep()` for each individual step (a code comment states this is intentional, to avoid duplicating the Agent Runtime call path including simulation fallback) — so there is no duplication of the actual step-execution logic between the two engines.
- CLI surface confirmed registered: `src/index.ts:13,95` imports/registers `buildOrchestratorCommand()`; `commands/orchestrator.ts` implements `ai orchestrator run <workflow> [--provider]`, `ai orchestrator status`, `ai orchestrator stop`.

**Net effect**: this repo has **two workflow execution engines** operating on the same `workflow.json` file format — `workflow/runtime.ts` (simple sequential, via `ai workflow run`) and `orchestrator/runtime.ts` (DAG-based, parallel, stoppable, via `ai orchestrator run`). They don't duplicate step-execution logic (Orchestrator reuses `workflow/executor.ts`), but the two overlapping top-level commands are a likely source of user confusion — see `TECH_DEBT.md`.

## Summary status

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
