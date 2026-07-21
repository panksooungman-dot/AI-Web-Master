# AI Business OS Skills

## Overview

The `skills` directory contains the AI capability definitions used by AI Business OS.

A Skill packages the knowledge, conventions, and expected output structure an AI agent
needs for a specific role, domain, or workflow. Skills are the source of truth that
`agents/` and `prompts/` reference — role-level detail lives here, not duplicated
elsewhere (`docs/architecture/AI_CONTENT_MAPPING.md`).

---

## Objectives

- Standardize AI capabilities across roles and domains
- Keep role/domain knowledge in one place (avoid duplication with `agents/`, `prompts/`)
- Support multi-agent collaboration with a consistent `SKILL.md` structure
- Make capabilities reusable across projects

---

## Directory Structure

```
skills/
├── core/          Cross-cutting operating principles (communication, decision-making, documentation, ...)
├── domains/        Industry/domain knowledge (saas, ecommerce, fintech, healthcare, ...)
├── experts/        Role definitions (backend-engineer, frontend-engineer, qa-engineer, ...)
├── shared/          Cross-role technical conventions (api-design, authentication, testing, ...)
├── templates/       Document templates (prd, adr, runbook, postmortem, ...)
└── workflows/        Process definitions (intake, planning, development, release, ...)
```

Each subdirectory contains its own `SKILL.md` (and, where the category is large enough,
its own `README.md`) describing that category's scope in detail.

---

## Available Categories

| Category | Purpose |
|---|---|
| `core/` | Operating principles every Skill inherits from |
| `domains/` | Business/industry-specific context |
| `experts/` | Role-level definitions — the merge target for `agents/*.md` (`docs/architecture/AI_CONTENT_MAPPING.md`) |
| `shared/` | Reusable technical conventions used across roles |
| `templates/` | Standard document formats |
| `workflows/` | Process/handoff definitions |

---

## Related Directories

```
agents/
```

AI role registry — `agents/*.md` are Legacy Stubs that point into `skills/experts/`.

```
prompts/
```

Prompt Library — references `skills/` for detailed capability definitions.

```
memory/
```

Memory Definitions

```
orchestration/
```

Workflow Coordination

```
docs/05_AI/
```

AI Documentation

---

## Version

AI Business OS v1.1
