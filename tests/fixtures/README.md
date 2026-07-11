# Test Fixtures

## Overview

The `fixtures` directory contains reusable test data for AI Business OS.

Fixtures provide deterministic, version-controlled datasets that enable repeatable and reliable testing across Unit, Integration, End-to-End, Performance, and Security test suites.

Using standardized fixtures improves consistency, simplifies test maintenance, and reduces duplicated test data.

---

# Purpose

Provide reusable, predictable, and isolated test data for every AI Business OS test suite.

---

# Objectives

- Standardize test data
- Improve test consistency
- Reduce duplicated datasets
- Enable repeatable testing
- Support automated CI/CD
- Simplify maintenance

---

# Directory Structure

```text
tests/fixtures/
│
├── README.md
├── agents/
├── prompts/
├── skills/
├── memory/
├── workflows/
├── marketplace/
├── mcp/
├── users/
├── projects/
└── samples/
```

---

# Fixture Categories

## Agents

Sample agent definitions.

Examples:

- Backend Engineer
- Frontend Engineer
- QA Engineer
- AI Engineer

---

## Prompts

Reusable prompt examples.

Examples:

- Coding
- Planning
- Reviewing
- Testing
- Documentation

---

## Skills

Reusable skill datasets.

Examples:

- Authentication
- Database
- API Development
- RAG
- Deployment

---

## Memory

Sample memory records.

Examples:

- Project Memory
- Task Memory
- Decision Memory
- Conversation Memory

---

## Workflows

Workflow execution samples.

Examples:

- Feature Development
- Bug Fix
- Release Workflow
- Code Review

---

## Marketplace

Marketplace package samples.

Examples:

- Agent Packages
- Skill Packages
- Templates
- Workflows

---

## MCP

Mock MCP responses.

Examples:

- GitHub
- Filesystem
- PostgreSQL
- Supabase
- Browser
- Context7

---

# Fixture Requirements

Every fixture should be:

- Reusable
- Deterministic
- Version controlled
- Well documented
- Easy to understand
- Independent

---

# Naming Convention

Use descriptive names.

Examples:

```text
backend-engineer.json

sample-project.json

feature-workflow.yaml

prompt-coder.md
```

---

# Data Policy

Fixtures should contain:

- Sample data
- Mock responses
- Dummy credentials
- Placeholder values

Never include:

- Production data
- Personal information
- Real credentials
- API keys
- Access tokens
- Sensitive business data

---

# Version Control

Fixtures should:

- Be committed to Git
- Follow semantic changes
- Be reviewed during Pull Requests
- Maintain backward compatibility when practical

---

# Validation Checklist

Before adding a fixture:

- Structure validated
- Format verified
- No sensitive data
- Naming follows conventions
- Documentation updated
- Reusability confirmed

---

# Best Practices

Always:

- Keep fixtures small.
- Make data realistic.
- Reuse existing fixtures.
- Organize by component.
- Remove obsolete fixtures.
- Document fixture purpose.

Never:

- Duplicate fixture data.
- Store production information.
- Commit secrets.
- Use inconsistent formats.

---

# CI/CD Integration

Fixtures should be used by:

- Unit Tests
- Integration Tests
- End-to-End Tests
- Performance Tests
- Security Tests

Fixture validation should run automatically during CI.

---

# Success Criteria

Fixture management is successful when:

- Test data is reusable.
- Fixtures are version controlled.
- Tests remain deterministic.
- No sensitive data is exposed.
- Maintenance effort is minimized.

---

# Related Documents

- tests/README.md
- tests/unit/README.md
- tests/integration/README.md
- tests/mocks/README.md
- tests/reports/README.md

---

# Version

AI Business OS v1.1