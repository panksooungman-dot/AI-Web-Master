---
name: code-review
description: Review source code to ensure correctness, maintainability, security, consistency, and compliance with project standards before release.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Code Review

## Purpose

This skill defines the code review process for AI Business OS.

Its objective is to ensure every code change meets quality standards before merging or deployment.

Code review improves reliability, maintainability, readability, and knowledge sharing.

---

# When to Use

Execute after:

- quality/testing

Execute before:

- security-review
- performance
- release/deployment

---

# Objectives

Verify that code is:

- Correct
- Readable
- Maintainable
- Secure
- Consistent
- Well Tested

---

# Inputs

Expected inputs:

- Pull Request
- Source Code
- Test Results
- Architecture Document
- Coding Standards
- Feature Requirements

---

# Review Scope

Review:

- Business Logic
- Architecture Compliance
- Code Style
- Naming
- Error Handling
- Security
- Performance
- Testing
- Documentation

---

# Architecture Compliance

Verify that code:

- follows approved architecture
- respects module boundaries
- avoids circular dependencies
- uses proper abstractions
- minimizes coupling

---

# Code Quality

Check:

- Readability
- Simplicity
- Reusability
- Maintainability
- Consistency

Prefer simple solutions over clever implementations.

---

# Naming

Ensure names are:

- Descriptive
- Consistent
- Intent Revealing

Avoid abbreviations without clear meaning.

---

# Error Handling

Verify:

- Exceptions handled
- Errors logged
- User-friendly messages
- No sensitive information exposed

---

# Security Review

Check for:

- Input validation
- Authentication
- Authorization
- Secrets management
- Injection risks
- XSS
- CSRF

Flag all security concerns.

---

# Performance Review

Review:

- Database queries
- Loops
- API calls
- Memory usage
- Network requests
- Rendering efficiency

Optimize only when justified.

---

# Testing Review

Verify:

- Unit tests
- Integration tests
- Edge cases
- Regression coverage

Every critical path should be tested.

---

# Documentation

Ensure updates include:

- Comments where necessary
- API documentation
- Architecture notes
- Migration notes
- Changelog entries

---

# Review Workflow

```text
Review Requirements

↓

Review Architecture

↓

Review Implementation

↓

Review Tests

↓

Review Security

↓

Review Performance

↓

Approve or Request Changes

↓

Merge
```

---

# Outputs

Generate:

- Review Report
- Review Comments
- Approval Status
- Improvement Suggestions
- Technical Debt Notes

---

# Validation Checklist

Before approval verify:

- Requirements satisfied
- Tests passing
- Security reviewed
- Performance acceptable
- Documentation updated
- No blocking issues remain

---

# Failure Conditions

Reject or request changes if:

- Business logic is incorrect
- Tests are missing
- Critical security issues exist
- Code violates architecture
- Significant duplication is introduced
- Documentation is incomplete

---

# Rules

- Review behavior, not personal style.
- Explain requested changes clearly.
- Prioritize correctness over preference.
- Encourage reusable solutions.
- Block merges only for significant issues.

---

# Success Criteria

This skill succeeds when:

- code meets project standards
- critical issues are resolved
- reviewers approve the implementation
- code is ready for security validation

---

# Next Skills

Invoke:

```text
security-review

↓

performance

↓

accessibility
```

---

# Related Skills

- testing
- security-review
- performance
- accessibility
- bug-triage
- regression-testing

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |