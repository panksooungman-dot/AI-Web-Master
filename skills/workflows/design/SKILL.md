---
name: workflows-design
description: Standard procedure for making architecture/UX decisions before implementation starts.
version: 0.1.0
author: AI Business OS
license: MIT
category: workflow
status: draft
---

# Design

> **Status: draft** — minimal structure only. Expand with concrete decision-record conventions
> as real cases accumulate.

## Purpose

Resolves architecturally significant decisions flagged by Planning before Development starts,
so implementation doesn't need to make structural choices mid-build. Uses
`skills/templates/architecture-decision-record/SKILL.md` for the output format.

## Position in Pipeline

```
Planning → [ Design ] → Development → Quality → Release → Operations
```

## Responsibilities

- Resolve architecture/UX decisions the Planning stage flagged as significant
- Confirm the change fits existing architecture (`docs/02_DEVELOPMENT/ARCHITECTURE.md`) before
  handing off
- Record the decision (ADR) so Development doesn't re-litigate it

## Related

- `skills/workflows/development/SKILL.md` (next stage)
- `skills/templates/architecture-decision-record/SKILL.md`
