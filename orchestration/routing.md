# Routing Rules

## Overview

Routing determines how AI Business OS analyzes incoming requests and assigns them to the most appropriate Agent, Prompt, Memory, and Workflow.

The routing system ensures every task is handled by the right expertise while maintaining consistency, efficiency, and traceability.

---

# Purpose

Provide deterministic and scalable task routing across all AI Business OS components.

---

# Routing Principles

Every request should be:

- Classified correctly
- Routed consistently
- Context-aware
- Traceable
- Reproducible
- Efficient

---

# Routing Pipeline

```text
User Request
      │
      ▼
Intent Detection
      │
      ▼
Context Collection
      │
      ▼
Complexity Assessment
      │
      ▼
Agent Selection
      │
      ▼
Prompt Selection
      │
      ▼
Memory Loading
      │
      ▼
Workflow Execution
```

---

# Request Categories

## Business

Examples:

- Business planning
- Requirement analysis
- Stakeholder analysis
- Market analysis

Primary Agent:

- Business Analyst

---

## Product

Examples:

- Feature planning
- Roadmap creation
- Backlog prioritization
- MVP definition

Primary Agent:

- Product Manager

---

## Architecture

Examples:

- System design
- API architecture
- Database design
- Infrastructure planning

Primary Agent:

- Solution Architect

---

## Development

Examples:

- Backend implementation
- Frontend implementation
- API development
- Bug fixes

Primary Agents:

- Backend Engineer
- Frontend Engineer
- AI Engineer

---

## AI Engineering

Examples:

- Prompt Engineering
- RAG
- MCP
- AI Agents
- LLM Integration

Primary Agent:

- AI Engineer

---

## Infrastructure

Examples:

- CI/CD
- Deployment
- Monitoring
- Cloud Infrastructure

Primary Agent:

- DevOps Engineer

---

## Testing

Examples:

- Test plans
- Test execution
- Regression testing
- Release validation

Primary Agent:

- QA Engineer

---

## Documentation

Examples:

- API documentation
- User guides
- Technical documentation
- Release notes

Primary Agent:

- Technical Writer

---

# Agent Mapping

| Request Type | Primary Agent |
|--------------|---------------|
| Business | Business Analyst |
| Product | Product Manager |
| Architecture | Solution Architect |
| Backend | Backend Engineer |
| Frontend | Frontend Engineer |
| AI | AI Engineer |
| DevOps | DevOps Engineer |
| Testing | QA Engineer |
| Documentation | Technical Writer |

---

# Prompt Mapping

| Agent | Prompt |
|--------|--------|
| Business Analyst | planner.md |
| Product Manager | planner.md |
| Solution Architect | reviewer.md |
| Backend Engineer | coder.md |
| Frontend Engineer | coder.md |
| AI Engineer | coder.md |
| DevOps Engineer | reviewer.md |
| QA Engineer | tester.md |
| Technical Writer | documenter.md |

---

# Memory Loading Rules

Always load:

- project-memory.md
- conversation-memory.md

Load when required:

- decision-memory.md
- coding-memory.md
- knowledge-memory.md

---

# Multi-Agent Routing

When a request spans multiple domains:

1. Identify the primary objective.
2. Select the lead Agent.
3. Route supporting tasks to specialized Agents.
4. Synchronize outputs.
5. Validate before completion.

Example:

```text
Business Request

↓

Business Analyst

↓

Product Manager

↓

Solution Architect

↓

Backend Engineer

↓

Frontend Engineer

↓

AI Engineer

↓

DevOps Engineer

↓

QA Engineer

↓

Technical Writer
```

---

# Routing Priorities

Priority order:

1. User intent
2. Business impact
3. Project context
4. Approved decisions
5. Available memory
6. Workflow dependencies

---

# Error Handling

If routing fails:

1. Re-evaluate request intent.
2. Check available context.
3. Select the closest matching Agent.
4. Escalate to multi-agent workflow if needed.
5. Record the routing decision.

---

# Quality Guidelines

Routing should always be:

- Deterministic
- Explainable
- Consistent
- Efficient
- Context-aware
- Auditable

---

# Constraints

Never:

- Route without understanding intent.
- Skip context loading.
- Ignore approved workflows.
- Assign incompatible Agents.
- Bypass validation.

---

# Related Documents

- orchestration/README.md
- orchestration/workflow.md
- orchestration/coordination.md
- orchestration/execution-policy.md
- agents/README.md
- prompts/README.md
- memory/README.md

---

# Version

AI Business OS v1.1