---
name: workflows
description: Standard process/handoff definitions for each stage of a request's lifecycle — intake, planning, design, development, quality, release, operations — plus cross-cutting business process.
version: 1.0.0
author: AI Business OS
license: MIT
category: index
status: active
---

# Workflows

## Overview

`skills/workflows/` defines the standard operating procedure for each stage a request passes
through, so Agent handoffs (`docs/05_AI/WORKFLOW.md`) follow a consistent sequence regardless
of who's involved.

## Pipeline

```
Intake → Planning → Design → Development → Quality → Release → Operations
                                  ↑
                              Business (cross-cutting)
```

## Contents

| Stage | Purpose |
|---|---|
| `intake/` | Capturing and triaging an incoming request |
| `planning/` | Scoping and sequencing the work |
| `design/` | Architecture/UX decisions before implementation |
| `development/` | Implementation |
| `quality/` | Verification before release |
| `release/` | Shipping the change |
| `operations/` | Post-release monitoring and support |
| `business/` | Cross-cutting business process (approvals, stakeholder communication) |

## Related

- `skills/README.md`
- `docs/05_AI/WORKFLOW.md`
