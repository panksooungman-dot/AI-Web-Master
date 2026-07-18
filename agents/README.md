# AI Agents

## Overview

The `agents` directory defines the AI roles used by AI Business OS.

An Agent represents a professional role rather than a single prompt.

Each Agent is responsible for making decisions, collaborating with other Agents, and executing tasks within its domain.

---

## Objectives

- Standardize AI roles
- Enable multi-agent collaboration
- Separate responsibilities
- Improve decision quality
- Support workflow orchestration

---

## Agent Lifecycle

Business Request

↓

Business Analyst

↓

Product Manager

↓

Solution Architect

↓

Implementation

├── Backend Engineer
├── Frontend Engineer
├── AI Engineer
└── DevOps Engineer

↓

QA Engineer

↓

Technical Writer

↓

Release

---

## Available Agents

> ⚠️ **통합 진행 중 (2026-07-19)**: 각 Agent 문서의 상세 정의는 `skills/experts/<role>/SKILL.md`로
> 순차 통합되고 있습니다(`docs/architecture/AI_CONTENT_MAPPING.md` 참고). "Status" 열이
> `Merged`인 항목은 이미 통합 완료 — 해당 `agents/*.md`는 요약 + 링크만 남기고 상세는
> `skills/experts/`를 기준으로 참고하세요.

| Agent | Responsibility | Status |
|--------|----------------|--------|
| Business Analyst | Requirement analysis | Pending |
| Product Manager | Product planning | Pending |
| Solution Architect | System architecture | Pending |
| Backend Engineer | API / Database | Merged → `skills/experts/backend-engineer/SKILL.md` |
| Frontend Engineer | UI / UX | Merged → `skills/experts/frontend-engineer/SKILL.md` |
| AI Engineer | LLM / AI features | Merged → `skills/experts/ai-engineer/SKILL.md` |
| DevOps Engineer | Infrastructure / CI/CD | Pending |
| QA Engineer | Quality assurance | Pending |
| Technical Writer | Documentation | Pending |

---

## Collaboration Rules

Agents do not work independently.

Each Agent:

- receives input
- performs analysis
- produces output
- hands off work to the next Agent

Agents should not bypass the workflow unless explicitly instructed.

---

## Directory Structure

```
agents/

README.md

business-analyst.md

product-manager.md

solution-architect.md

backend-engineer.md

frontend-engineer.md

ai-engineer.md

devops-engineer.md

qa-engineer.md

technical-writer.md
```

---

## Standard Agent Template

Every Agent document must contain:

- Role
- Mission
- Responsibilities
- Inputs
- Outputs
- Workflow
- Decision Rules
- Collaboration
- Skills
- Constraints

---

## Related Directories

```
skills/
```

Knowledge base

```
prompts/
```

Prompt Library

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