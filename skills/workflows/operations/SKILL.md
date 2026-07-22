---
name: workflows-operations
description: Standard procedure for post-release monitoring and support.
version: 0.1.0
author: AI Business OS
license: MIT
category: workflow
status: draft
---

# Operations

> **Status: draft** — minimal structure only. Expand with concrete monitoring/incident
> procedures as real cases accumulate.

## Purpose

Monitors a released change and handles issues that surface afterward, feeding new problems back
into Intake rather than patching ad hoc.

## Position in Pipeline

```
Release → [ Operations ] → (feeds back into Intake if issues surface)
```

## Responsibilities

- Monitor the released change (see `skills/shared/monitoring/SKILL.md`)
- Triage incidents using `skills/templates/incident-report/SKILL.md` /
  `skills/templates/postmortem/SKILL.md`
- Route new issues back to Intake rather than handling them outside the pipeline

## Related

- `skills/workflows/intake/SKILL.md` (feedback loop)
- `skills/shared/monitoring/SKILL.md`
