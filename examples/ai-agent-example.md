# AI Agent Example

## Overview

This example demonstrates multi-agent collaboration within AI Business OS — how a single
request is split across specialized Agents that hand off work to one another rather than one
Agent attempting the entire task.

---

# Purpose

Show how `agents/` (roles), `prompts/` (instructions), and `memory/` (shared context) work
together during a multi-step task.

---

# Example Scenario

## User Request

```text
Add a "Recent Activity" widget to the Development OS dashboard that shows the last 10
terminal/git/AI events.
```

## Agent Sequence

```
Business Analyst   → clarifies scope: read-only widget, existing Event Bus as data source
Solution Architect  → confirms no new storage needed, reuses lib/events/eventBus.ts
Frontend Engineer   → implements the widget component and wires it to the existing events API
QA Engineer         → verifies the widget renders with 0/1/10+ events and no console errors
Technical Writer     → records the change in docs/01_PMO/CHANGELOG.md
```

Each Agent receives only the context relevant to its step (see
`docs/05_AI/TOKEN_POLICY.md`) and hands its output to the next Agent rather than re-deriving
the full request from scratch.

---

# Demonstrates

- Task delegation across specialized roles instead of one generic pass
- Reuse of existing components/data sources before building new ones
- A validation step (QA) before the task is considered done
- Recording the outcome so the next session/agent has the context (Memory)

---

# Related Documents

- `agents/README.md`
- `examples/workflow-example.md`
- `docs/05_AI/WORKFLOW.md`
