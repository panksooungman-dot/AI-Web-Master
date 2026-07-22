---
name: workflows-intake
description: Standard procedure for capturing and triaging an incoming request before planning begins.
version: 0.1.0
author: AI Business OS
license: MIT
category: workflow
status: draft
---

# Intake

> **Status: draft** — minimal structure only. Expand with concrete triage criteria as real
> intake cases accumulate (see `skills/README.md` Rule of Two-style guidance: formalize once
> the pattern repeats, don't pre-build it).

## Purpose

The first stage of the request pipeline (`skills/workflows/SKILL.md`). Captures a request in
enough detail to hand off to Planning, and flags anything that needs Human Lead approval
before work starts (see `AGENTS.md` 2.3 — 승인 필요 작업).

## Position in Pipeline

```
[ Intake ] → Planning → Design → Development → Quality → Release → Operations
```

## Responsibilities

- Record what was asked, by whom, and why
- Identify whether the request touches an approval-gated area (`package.json`, `.env`, DB
  schema, deployment config)
- Hand off to Planning with enough context that Planning doesn't need to re-ask the requester

## Related

- `skills/workflows/planning/SKILL.md` (next stage)
- `docs/05_AI/WORKFLOW.md`
