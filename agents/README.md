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

| Agent | Responsibility |
|--------|----------------|
| Business Analyst | Requirement analysis |
| Product Manager | Product planning |
| Solution Architect | System architecture |
| Backend Engineer | API / Database |
| Frontend Engineer | UI / UX |
| AI Engineer | LLM / AI features |
| DevOps Engineer | Infrastructure / CI/CD |
| QA Engineer | Quality assurance |
| Technical Writer | Documentation |

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