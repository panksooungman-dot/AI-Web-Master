---
name: workflows-business
description: Cross-cutting business process — approvals, stakeholder communication, and prioritization — that runs alongside the Intake→Operations pipeline rather than as a single stage in it.
version: 0.1.0
author: AI Business OS
license: MIT
category: workflow
status: draft
---

# Business

> **Status: draft** — minimal structure only. Expand with concrete approval/communication
> procedures as real cases accumulate.

## Purpose

Unlike the other seven Skills in `skills/workflows/`, Business is not a single pipeline stage —
it runs alongside every stage, covering approvals (`AGENTS.md` 2.3) and stakeholder
communication that any stage may need to trigger.

## Position in Pipeline

```
Intake → Planning → Design → Development → Quality → Release → Operations
   ↑___________________ Business (cross-cutting) ___________________↑
```

## Responsibilities

- Route approval-gated decisions to Human Lead (`AGENTS.md` 2.3 — `package.json` 수정, 새
  라이브러리 설치, 환경 변수 변경, DB 스키마 변경, 배포 설정 변경)
- Keep stakeholders informed at handoff points, not only at Release
- Prioritize competing requests across the pipeline

## Related

- `skills/README.md`
- `AGENTS.md`
