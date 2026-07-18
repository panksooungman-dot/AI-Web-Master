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

> ✅ **통합 완료 (9/9, 2026-07-19)**: 각 Agent 문서의 상세 정의는 전부 `skills/experts/<role>/SKILL.md`로
> 통합되었습니다(`docs/architecture/AI_CONTENT_MAPPING.md` 참고). 해당 `agents/*.md`는
> 요약 + 링크만 남긴 Legacy Stub이며, 상세는 `skills/experts/`를 기준으로 참고하세요.

| Agent | Responsibility | Status |
|--------|----------------|--------|
| Business Analyst | Requirement analysis | Merged → `skills/experts/business-analyst/SKILL.md` |
| Product Manager | Product planning | Merged → `skills/experts/product-manager/SKILL.md` |
| Solution Architect | System architecture | Merged → `skills/experts/solution-architect/SKILL.md` |
| Backend Engineer | API / Database | Merged → `skills/experts/backend-engineer/SKILL.md` |
| Frontend Engineer | UI / UX | Merged → `skills/experts/frontend-engineer/SKILL.md` |
| AI Engineer | LLM / AI features | Merged → `skills/experts/ai-engineer/SKILL.md` |
| DevOps Engineer | Infrastructure / CI/CD | Merged → `skills/experts/devops-engineer/SKILL.md` |
| QA Engineer | Quality assurance | Merged → `skills/experts/qa-engineer/SKILL.md` |
| Technical Writer | Documentation | Merged → `skills/experts/technical-writer/SKILL.md` |

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

> ⚠️ **2026-07-19 기준 9/9 전부 Merged 상태라 이 템플릿을 따르는 현재 문서는 없다.** 아래는
> Legacy Stub으로 축소되기 전 `agents/*.md`가 따르던 이력상의 템플릿이며, 상세 정의는 전부
> `skills/experts/<role>/SKILL.md` 쪽 구조를 기준으로 한다. 신규 직군이 추가될 경우에만
> 참고할 것.

Every Agent document previously contained (pre-CS-08 template, kept for historical reference):

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