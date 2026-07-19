# AI Business OS Prompt Library

## Overview

The `prompts` directory contains the standardized prompt definitions used by AI Business OS.

Each prompt provides consistent instructions for a specific role or workflow and is designed to work together with the Agent, Memory, and Orchestration layers.

---

# Objectives

- Standardize AI interactions
- Improve response consistency
- Reduce prompt duplication
- Support multi-agent workflows
- Maintain reusable prompt templates

---

# Prompt Architecture

Business Request

↓

System Prompt

↓

Role Prompt

↓

Task Prompt

↓

Execution

↓

Validation

↓

Response

---

# Available Prompts

> ✅ **통합 완료 (6/6, 2026-07-19)**: `system.md`를 제외한 5개 프롬프트의 `# Expected
> Output Structure`는 전부 대응하는 `skills/experts/<role>/SKILL.md`로 통합되었습니다
> (`docs/architecture/AI_CONTENT_MAPPING.md`·`docs/architecture/P3_PHASE2_REVIEW.md`
> 참고). 해당 `prompts/*.md`는 요약 + 링크만 남긴 Legacy Stub이며, 상세는
> `skills/experts/`를 기준으로 참고하세요. `system.md`는 병합 대상이 아니라 15개
> SKILL.md 전체가 참조하는 전역 규칙 문서로 그대로 유지됩니다.

| Prompt | Purpose | Status |
|---------|---------|--------|
| system.md | Global AI behavior and operating rules | Kept as-is — referenced (not merged) by all 15 `skills/experts/*/SKILL.md` |
| planner.md | Business planning and product planning | Merged → `skills/experts/{business-analyst,product-manager}/SKILL.md` |
| coder.md | Software development and implementation | Merged → `skills/experts/{backend-engineer,frontend-engineer,ai-engineer}/SKILL.md` |
| reviewer.md | Architecture and code review | Merged → `skills/experts/{solution-architect,devops-engineer,qa-engineer}/SKILL.md` |
| tester.md | Quality assurance and testing | Merged → `skills/experts/{qa-engineer,backend-engineer,frontend-engineer,ai-engineer,devops-engineer}/SKILL.md` |
| documenter.md | Documentation generation | Merged → `skills/experts/{technical-writer,product-manager,qa-engineer}/SKILL.md` |

---

# Prompt Categories

## System

Defines the global operating rules for AI Business OS.

## Planning

Supports requirement analysis and product planning.

## Development

Supports implementation and coding activities.

## Review

Supports architecture validation and code review.

## Testing

Supports software quality assurance.

## Documentation

Supports technical writing and knowledge management.

---

# Design Principles

Every prompt should be:

- Clear
- Consistent
- Reusable
- Modular
- Versioned
- Easy to maintain

---

# Integration

The Prompt Library works together with:

```
agents/
```

Defines AI roles.

```
skills/
```

Defines AI capabilities.

```
memory/
```

Defines retained knowledge.

```
orchestration/
```

Defines workflow coordination.

---

# Prompt Lifecycle

Request

↓

Context Collection

↓

Prompt Selection

↓

Execution

↓

Validation

↓

Output

↓

Memory Update

---

# Related Directories

```
skills/experts/
```

Detailed role definitions — the source of truth for `# Expected Output Structure` since the CS-08 Phase 2 merge (2026-07-19).

---

# Version

AI Business OS v1.1