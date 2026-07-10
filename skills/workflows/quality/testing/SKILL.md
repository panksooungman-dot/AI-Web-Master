---
name: testing
description: Plan, execute, and validate comprehensive testing across the application to ensure functionality, reliability, quality, and production readiness.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Testing

## Purpose

This skill defines the testing strategy for the application.

Its objective is to verify that every feature behaves correctly, satisfies business requirements, and is ready for production deployment.

Testing should identify defects as early as possible while providing confidence in system quality.

---

# When to Use

Execute after:

- development/integration

Execute before:

- code-review
- security-review
- performance
- release/deployment

---

# Objectives

Verify that the application is:

- Correct
- Reliable
- Stable
- Maintainable
- Production Ready

---

# Inputs

Expected inputs:

- PRD
- User Stories
- Feature Planning
- Architecture Document
- Integrated Application
- API Documentation

---

# Test Strategy

Execute multiple testing levels:

- Unit Testing
- Integration Testing
- End-to-End Testing
- System Testing
- Acceptance Testing

Each level should validate different responsibilities.

---

# Unit Testing

Verify:

- Business Logic
- Utility Functions
- Components
- Services

Requirements:

- Fast
- Isolated
- Repeatable

---

# Integration Testing

Validate:

- API Integration
- Database Operations
- Authentication
- Payment Flow
- External Services

Ensure modules communicate correctly.

---

# End-to-End Testing

Verify complete user journeys.

Examples:

- Registration
- Login
- Checkout
- Profile Update
- Order Creation
- Payment Completion

Tests should simulate real user behavior.

---

# Functional Testing

Confirm:

- Features behave as specified
- Business rules are enforced
- Validation works correctly
- Edge cases are handled

---

# Regression Testing

Verify that:

- Existing functionality remains operational
- Bug fixes do not introduce new defects
- Previous releases remain stable

Run after every significant change.

---

# Smoke Testing

Before deployment verify:

- Application starts
- Authentication works
- APIs respond
- Database connects
- Critical pages load

---

# Test Data

Prepare:

- Valid Data
- Invalid Data
- Boundary Values
- Large Datasets
- Empty States

Avoid using production data unless explicitly authorized.

---

# Bug Reporting

Every defect should include:

- Summary
- Severity
- Priority
- Steps to Reproduce
- Expected Result
- Actual Result
- Environment
- Screenshots or Logs

---

# Severity Levels

Classify defects as:

- Critical
- High
- Medium
- Low

Prioritize based on business impact.

---

# Automation

Automate whenever practical:

- Unit Tests
- Integration Tests
- End-to-End Tests
- Regression Tests

Manual testing should focus on exploratory scenarios.

---

# Workflow

```text
Review Requirements

↓

Prepare Test Plan

↓

Prepare Test Data

↓

Execute Unit Tests

↓

Execute Integration Tests

↓

Execute End-to-End Tests

↓

Execute Regression Tests

↓

Report Defects

↓

Retest

↓

Approve Quality
```

---

# Outputs

Generate:

- Test Plan
- Test Cases
- Test Execution Report
- Defect Report
- Test Coverage Report
- Release Recommendation

---

# Validation Checklist

Before completion verify:

- Critical features tested
- User journeys verified
- Bugs documented
- Regression completed
- Test coverage acceptable
- No unresolved critical defects

---

# Failure Conditions

Stop and request clarification if:

- Requirements are incomplete
- Acceptance criteria are undefined
- Test environment is unavailable
- Critical dependencies are missing
- Build is unstable

---

# Rules

- Test behavior, not implementation.
- Prioritize business-critical workflows.
- Automate repetitive tests.
- Every reported defect must be reproducible.
- Never skip regression before release.

---

# Success Criteria

This skill succeeds when:

- all critical requirements pass
- no critical defects remain
- regression tests pass
- business workflows are validated
- the application is ready for formal review

---

# Next Skills

Invoke:

```text
code-review

↓

security-review

↓

performance
```

---

# Related Skills

- integration
- code-review
- security-review
- performance
- accessibility
- deployment

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |