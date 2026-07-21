---
name: workflows-development
description: Standard procedure for implementation once design decisions are settled.
version: 0.1.0
author: AI Business OS
license: MIT
category: workflow
status: draft
---

# Development

> **Status: draft** — minimal structure only. Expand with concrete implementation checklists as
> real cases accumulate.

## Purpose

Implements the plan produced by Planning/Design, using the relevant `skills/experts/` role
Skill(s) and `skills/shared/coding-standards/SKILL.md` conventions.

## Position in Pipeline

```
Design → [ Development ] → Quality → Release → Operations
```

## Responsibilities

- Implement per the Design stage's decisions — don't introduce new architectural choices here
- Follow `skills/shared/coding-standards/SKILL.md` and the relevant Expert Skill's conventions
- Hand off to Quality with a clear description of what changed and why

## Related

- `skills/workflows/quality/SKILL.md` (next stage)
- `skills/shared/coding-standards/SKILL.md`
