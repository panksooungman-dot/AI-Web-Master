---
name: workflows-quality
description: Standard procedure for verifying a change before release (testing, review, validation).
version: 0.1.0
author: AI Business OS
license: MIT
category: workflow
status: draft
---

# Quality

> **Status: draft** — minimal structure only. Expand with concrete QA checklists as real cases
> accumulate.

## Purpose

Verifies a Development-stage change before it reaches Release, per
`skills/shared/testing/SKILL.md` and the QA Engineer Skill (`skills/experts/qa-engineer/`).

## Position in Pipeline

```
Development → [ Quality ] → Release → Operations
```

## Responsibilities

- Verify the change against what was actually asked (Intake/Planning), not just "does it run"
- Confirm build/lint/test pass (see `.github/workflows/{lint,test}.yml` for this repository's
  automated checks)
- Block Release if verification wasn't actually performed — never assume a check passed

## Related

- `skills/workflows/release/SKILL.md` (next stage)
- `skills/shared/testing/SKILL.md`
