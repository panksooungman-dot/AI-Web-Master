---
name: testing
description: Define software testing principles, quality assurance practices, test automation strategies, and verification standards across all projects.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Testing

## Purpose

This skill establishes testing standards that ensure software quality through systematic verification and validation across the entire development lifecycle.

Testing should detect defects early, reduce delivery risk, and provide confidence in every release.

---

# When to Use

Execute when:

- Developing new features
- Fixing defects
- Refactoring code
- Preparing releases
- Reviewing pull requests
- Validating production readiness

---

# Objectives

Ensure testing is:

- Comprehensive
- Repeatable
- Automated where practical
- Reliable
- Traceable
- Maintainable

---

# Inputs

Expected inputs:

- Business Requirements
- User Stories
- Acceptance Criteria
- Technical Specifications
- Test Data
- Risk Assessment

---

# Testing Strategy

Include:

- Unit Testing
- Integration Testing
- System Testing
- End-to-End Testing
- Regression Testing
- User Acceptance Testing (UAT)
- Performance Testing
- Security Testing

Apply a risk-based testing approach.

---

# Test Design

Each test should define:

- Test ID
- Objective
- Preconditions
- Test Data
- Test Steps
- Expected Results
- Pass/Fail Criteria

Maintain traceability to requirements.

---

# Test Automation

Automate where appropriate:

- Unit Tests
- API Tests
- UI Tests
- Regression Tests
- Smoke Tests

Keep automated tests deterministic and maintainable.

---

# Test Data

Ensure:

- Representative Data
- Isolated Test Environments
- Repeatable Test Fixtures
- Secure Handling of Sensitive Data

Avoid using production data unless properly anonymized.

---

# Quality Metrics

Track:

- Test Coverage
- Pass Rate
- Defect Density
- Escaped Defects
- Automation Coverage
- Mean Time to Detect (MTTD)

Review metrics continuously.

---

# Validation Checklist

Before completion verify:

- Requirements covered
- Acceptance criteria validated
- Automated tests executed
- Defects documented
- Test results reviewed
- Release readiness confirmed

---

# Failure Conditions

Stop and request clarification if:

- Requirements are incomplete
- Acceptance criteria are undefined
- Test environment is unavailable
- Test data is insufficient
- Quality gates are not defined

---

# Outputs

Generate:

- Test Strategy
- Test Cases
- Automation Plan
- Test Report
- Quality Checklist

---

# Rules

- Test early and continuously.
- Automate repetitive tests.
- Ensure traceability to requirements.
- Prioritize testing based on risk.
- Treat failing tests as release blockers unless explicitly approved.

---

# Success Criteria

This skill succeeds when:

- requirements are fully verified
- critical defects are detected before release
- automated testing supports continuous delivery
- software quality is measurable and repeatable

---

# Related Skills

- validation
- performance
- security
- coding-standards
- error-handling

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |