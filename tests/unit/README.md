# Unit Testing

## Overview

The `unit` test suite validates individual components of AI Business OS in complete isolation.

Each unit test focuses on a single function, module, Agent, Prompt, Skill, or utility without relying on external systems or integrations.

Unit tests provide the first layer of quality assurance and should execute quickly and consistently.

---

# Purpose

Provide fast, reliable validation for every individual component before integration and end-to-end testing.

---

# Objectives

- Verify component correctness
- Detect regressions early
- Improve maintainability
- Increase confidence during development
- Support automated CI/CD pipelines

---

# Scope

Unit tests should cover:

- Agents
- Prompts
- Skills
- Utilities
- Configuration
- Validation logic
- Memory components
- Helper functions

Unit tests should **not** depend on:

- Databases
- External APIs
- MCP Servers
- File systems
- Network requests

---

# Directory Structure

```text
tests/unit/
│
├── README.md
├── agents/
├── prompts/
├── skills/
├── memory/
├── utils/
└── fixtures/
```

---

# Testing Principles

Every unit test should be:

- Independent
- Repeatable
- Deterministic
- Fast
- Easy to understand

Each test should validate one behavior only.

---

# Naming Convention

Recommended format:

```text
<Component>_<Behavior>_<ExpectedResult>
```

Examples:

```text
BackendEngineer_ShouldGenerateAPI()

PromptFormatter_ShouldReturnMarkdown()

MemoryStore_ShouldSaveContext()
```

---

# Test Workflow

```text
Create Test Case

↓

Prepare Test Data

↓

Execute Component

↓

Validate Result

↓

Report Status
```

---

# Test Coverage

Target coverage:

| Component | Minimum Coverage |
|------------|-----------------:|
| Agents | 90% |
| Prompts | 90% |
| Skills | 90% |
| Utilities | 95% |
| Configuration | 100% |

---

# Assertions

Every test should validate:

- Expected output
- Error handling
- Edge cases
- Invalid inputs
- Default behavior

---

# Test Data

Use:

- Fixtures
- Mock objects
- Static sample data

Avoid:

- Production data
- Live API responses
- External dependencies

---

# Error Handling

Every component should be tested for:

- Invalid input
- Missing configuration
- Null values
- Empty collections
- Unexpected exceptions

---

# Best Practices

Always:

- Test one behavior at a time.
- Keep tests isolated.
- Use descriptive names.
- Remove duplicated logic.
- Keep execution fast.
- Review failed tests immediately.

Never:

- Depend on execution order.
- Modify shared state.
- Access production resources.
- Ignore flaky tests.
- Combine unrelated assertions.

---

# CI/CD Integration

Unit tests should execute:

- On every commit
- On every pull request
- Before integration tests
- Before release builds

---

# Success Criteria

Unit testing is successful when:

- All tests pass
- Coverage targets are achieved
- Tests execute consistently
- No external dependencies exist
- Failures are easy to diagnose

---

# Related Documents

- tests/README.md
- tests/integration/README.md
- tests/fixtures/README.md
- tests/mocks/README.md
- agents/qa-engineer.md
- prompts/tester.md

---

# Version

AI Business OS v1.1