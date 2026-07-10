---
name: regression-testing
description: Execute regression testing to verify that new changes have not introduced defects into existing functionality before release.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Regression Testing

## Purpose

This skill validates that recent code changes have not negatively impacted existing functionality.

The objective is to ensure application stability, maintain user confidence, and prevent regressions before deployment.

Regression testing should be performed after bug fixes, feature additions, refactoring, dependency updates, and release candidates.

---

# When to Use

Execute after:

- quality/bug-triage

Execute before:

- release/deployment

---

# Objectives

Verify that:

- Existing features continue to work
- Fixed defects remain resolved
- Critical user flows are stable
- No unintended side effects exist
- Release quality is maintained

---

# Inputs

Expected inputs:

- Test Plan
- Test Cases
- Bug Fixes
- Integrated Application
- Release Candidate
- Previous Test Results

---

# Regression Scope

Cover:

- Authentication
- Authorization
- User Management
- Dashboard
- Navigation
- Forms
- CRUD Operations
- Search
- Notifications
- Payments
- External Integrations

Prioritize business-critical functionality.

---

# Test Coverage

Verify:

- Previously fixed bugs
- Core business workflows
- High-risk modules
- Shared components
- Common user journeys
- Cross-module interactions

Focus first on areas affected by recent changes.

---

# Execution Strategy

Perform:

- Automated Regression Tests
- Manual Regression Tests
- Smoke Verification
- Cross-browser Testing
- Responsive Testing

Use automation whenever practical.

---

# Test Environment

Ensure:

- Environment matches production
- Test data is prepared
- External services are available or mocked
- Configuration is validated

---

# Result Classification

Record results as:

- Passed
- Failed
- Blocked
- Skipped

Every failed test should reference a tracked defect.

---

# Defect Handling

When failures occur:

- Document the issue
- Assign severity
- Link affected feature
- Notify responsible owner
- Re-test after the fix

Regression failures must be resolved before release unless explicitly accepted.

---

# Release Readiness

Confirm:

- No unresolved critical defects
- All critical regression tests passed
- High-priority defects addressed
- Product Owner approval obtained (if required)

---

# Workflow

```text
Review Release Candidate

↓

Select Regression Suite

↓

Prepare Environment

↓

Execute Automated Tests

↓

Execute Manual Tests

↓

Record Results

↓

Report Defects

↓

Verify Fixes

↓

Approve Release
```

---

# Outputs

Generate:

- Regression Test Report
- Test Execution Summary
- Defect Summary
- Coverage Report
- Release Readiness Report

---

# Validation Checklist

Before completion verify:

- Critical regression suite passed
- Previously fixed defects verified
- No new critical issues introduced
- Test evidence documented
- Release readiness confirmed

---

# Failure Conditions

Stop release if:

- Critical regression tests fail
- Core user journeys are broken
- High-severity defects remain unresolved
- Test environment is invalid
- Required regression coverage is incomplete

---

# Rules

- Always execute regression tests before release.
- Prioritize high-risk and business-critical workflows.
- Re-test all resolved defects.
- Keep regression suites up to date.
- Record reproducible evidence for every failure.

---

# Success Criteria

This skill succeeds when:

- all critical regression tests pass
- no release-blocking regressions exist
- product stability is verified
- the application is approved for deployment

---

# Next Skills

```text
release/deployment

↓

release/monitoring

↓

release/rollback
```

---

# Related Skills

- testing
- bug-triage
- code-review
- security-review
- performance
- deployment

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |