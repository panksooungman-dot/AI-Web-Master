# Skills

## Overview

The `skills` directory is the active skill library for AI Business OS. Each `SKILL.md` defines a
reusable, structured unit of expertise — a role, a domain, a shared technical concern, a
document template, or a repeatable workflow — that an AI agent (or a person) can load for a
specific task.

Unlike `agents/`, `prompts/`, `memory/`, and `orchestration/` (which are legacy/pointer
directories whose real content already moved elsewhere — see each folder's own `README.md`),
`skills/` holds the actual, current content: 125 `SKILL.md` files across six categories.

---

## Directory Structure

```
skills/
├── core/        (6)  — cross-cutting operating principles every agent follows
├── domains/     (12) — industry/business-domain knowledge (fintech, healthcare, ecommerce, ...)
├── experts/     (16) — professional roles (backend-engineer, qa-engineer, solution-architect, ...)
├── shared/      (15) — technical concerns shared across roles (auth, database, testing, ...)
├── templates/   (16) — document templates (PRD, ADR, runbook, test-plan, ...)
└── workflows/   (60) — repeatable business/design/development/quality/release/operations procedures
```

Each `SKILL.md` follows the same frontmatter shape (`name`, `description`, `version`, `author`,
`license`, `category`, `priority`, optional `status`/`sources`), so any tool that loads skills can
treat all six categories uniformly.

---

## Categories

### `core/`
Operating principles that apply regardless of role or task — how to communicate, make decisions,
document work, and the project's own foundational guidelines (`ai-business-os-core`).

### `domains/`
Business-domain context (AI, corporate, CRM, ecommerce, education, ERP, fintech, healthcare,
marketplace, mobile-app, SaaS) that informs how a task should be approached in that industry.

### `experts/`
Professional roles — the successor to the now-merged `agents/*.md` role definitions (see
`agents/README.md`). This is the authoritative source for role responsibilities going forward.

### `shared/`
Technical concerns that cut across multiple roles: API design, authentication, authorization,
database, design system, documentation, error handling, logging, monitoring, performance,
security, testing, validation.

### `templates/`
Standard document shapes to fill in rather than reinvent: API spec, architecture decision
record, BRD, changelog, database schema, incident report, meeting notes, postmortem, PRD, project
plan, release note, runbook, test case, test plan, user story.

### `workflows/`
Repeatable, multi-step procedures grouped by phase: business, design, development, intake,
operations, planning, quality, release.

---

## Related Directories

```
agents/          Legacy role stubs — merged into skills/experts/
prompts/          Legacy prompt library — merged into skills/
docs/05_AI/       AI operating documentation (not the skill definitions themselves)
```
