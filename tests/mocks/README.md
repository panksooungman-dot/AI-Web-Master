# Test Mocks

## Overview

The `mocks` directory contains mock objects, fake services, stubs, and simulated external dependencies used during testing.

Mocks allow AI Business OS components to be tested independently without requiring access to live APIs, databases, MCP servers, or external services.

Using mocks improves test speed, reliability, and repeatability.

---

# Purpose

Provide reusable mock implementations that isolate components from external dependencies during testing.

---

# Objectives

- Isolate external dependencies
- Improve test reliability
- Accelerate test execution
- Simulate failure scenarios
- Enable deterministic testing
- Support automated CI/CD

---

# Directory Structure

```text
tests/mocks/
│
├── README.md
├── agents/
├── prompts/
├── skills/
├── memory/
├── workflows/
├── mcp/
├── api/
├── database/
├── services/
└── responses/
```

---

# Mock Categories

## Agents

Mock agent behaviors.

Examples:

- Backend Engineer
- Frontend Engineer
- QA Engineer
- AI Engineer

---

## Prompts

Mock prompt responses.

Examples:

- Code Generation
- Planning
- Documentation
- Testing

---

## Skills

Mock reusable capabilities.

Examples:

- Authentication
- Database
- API Development
- RAG

---

## Memory

Mock memory storage.

Examples:

- Project Memory
- Task Memory
- Decision Memory
- Conversation Memory

---

## MCP

Mock MCP servers.

Supported servers:

- GitHub
- Filesystem
- Browser
- Playwright
- PostgreSQL
- Supabase
- Context7
- Sequential Thinking

---

## API

Mock API endpoints.

Examples:

- Success responses
- Validation failures
- Unauthorized requests
- Server errors
- Timeout responses

---

## Database

Mock database operations.

Examples:

- CRUD operations
- Transactions
- Connection failures
- Empty datasets
- Query errors

---

# Mock Requirements

Every mock should be:

- Reusable
- Deterministic
- Independent
- Lightweight
- Well documented
- Easy to maintain

---

# Naming Convention

Use descriptive names.

Examples:

```text
mock-agent.json

mock-memory.json

mock-github-response.json

mock-api-error.json
```

---

# Mock Behavior

Mocks should simulate:

- Successful execution
- Validation failures
- Authentication errors
- Authorization failures
- Network timeouts
- Service unavailability
- Partial failures
- Unexpected exceptions

---

# Mock Data Policy

Mocks may contain:

- Sample responses
- Placeholder values
- Dummy identifiers
- Test credentials

Never include:

- Production credentials
- API keys
- Access tokens
- Customer information
- Sensitive business data

---

# Validation Checklist

Before adding a mock:

- Structure validated
- Response format verified
- No sensitive information
- Naming follows conventions
- Documentation updated
- Reusability confirmed

---

# Best Practices

Always:

- Keep mocks simple.
- Match real interfaces.
- Cover success and failure cases.
- Reuse common mocks.
- Version mock responses.
- Document expected behavior.

Never:

- Hard-code production values.
- Depend on external services.
- Duplicate existing mocks.
- Commit sensitive information.

---

# CI/CD Integration

Mocks should be used by:

- Unit Tests
- Integration Tests
- End-to-End Tests
- Performance Tests
- Security Tests

Mock validation should execute automatically during CI pipelines.

---

# Success Criteria

Mock management is successful when:

- External dependencies are isolated.
- Tests execute consistently.
- Responses are predictable.
- Mock implementations remain maintainable.
- No sensitive information is exposed.

---

# Related Documents

- tests/README.md
- tests/fixtures/README.md
- tests/unit/README.md
- tests/integration/README.md
- tests/reports/README.md

---

# Version

AI Business OS v1.1