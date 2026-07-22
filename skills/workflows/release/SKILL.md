---
name: workflows-release
description: Standard procedure for shipping a verified change (versioning, changelog, deployment trigger).
version: 0.1.0
author: AI Business OS
license: MIT
category: workflow
status: draft
---

# Release

> **Status: draft** — minimal structure only. Expand with concrete release checklists as real
> cases accumulate.

## Purpose

Ships a change that has passed Quality. In this repository, release means merging to `main`
(direct push is prohibited, see `docs/02_DEVELOPMENT/CNBIZ_RULES.md` 5.4) and recording the
change via the `changelog-writer` Agent/`skills/templates/changelog/SKILL.md`.

## Position in Pipeline

```
Quality → [ Release ] → Operations
```

## Responsibilities

- Confirm Quality actually signed off before proceeding
- Record the change in `docs/01_PMO/CHANGELOG.md`
- Hand off to Operations for post-release monitoring

## Related

- `skills/workflows/operations/SKILL.md` (next stage)
- `skills/templates/changelog/SKILL.md`
