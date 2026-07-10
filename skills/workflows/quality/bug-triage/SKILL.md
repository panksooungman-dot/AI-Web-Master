---
name: bug-triage
description: Evaluate, classify, prioritize, assign, and track software defects to ensure efficient resolution and maintain overall product quality.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Bug Triage

## Purpose

This skill defines the process for evaluating, prioritizing, assigning, and managing software defects.

The objective is to ensure engineering teams focus on the highest-impact issues while maintaining transparency and predictable release quality.

Bug triage is a decision-making process, not just bug tracking.

---

# When to Use

Execute after:

- quality/accessibility

Execute before:

- regression-testing
- release/deployment

---

# Objectives

Ensure every reported issue is:

- Validated
- Classified
- Prioritized
- Assigned
- Tracked
- Resolved

---

# Inputs

Expected inputs:

- Bug Reports
- Test Results
- Accessibility Report
- Security Report
- Performance Report
- User Feedback

---

# Bug Validation

Confirm:

- Reproducibility
- Expected Behavior
- Actual Behavior
- Environment
- Supporting Evidence

Reject duplicates or invalid reports.

---

# Classification

Assign a category.

Examples:

- UI
- UX
- Functional
- Performance
- Security
- Accessibility
- API
- Database
- Infrastructure

---

# Severity

Assign severity:

- Critical
- High
- Medium
- Low

Severity measures technical and business impact.

---

# Priority

Assign priority:

- P0 — Immediate
- P1 — High
- P2 — Normal
- P3 — Low

Priority reflects implementation urgency.

---

# Ownership

Assign a responsible owner.

Examples:

- Frontend
- Backend
- DevOps
- QA
- Design
- Product

Each bug must have exactly one owner.

---

# Status Lifecycle

Track progress through:

```text
New

↓

Validated

↓

Assigned

↓

In Progress

↓

Fixed

↓

Verified

↓

Closed
```

Reopen if verification fails.

---

# Release Impact

Determine whether the bug:

- Blocks Release
- Delays Feature
- Requires Hotfix
- Can Wait

Critical production issues should block release.

---

# Root Cause Analysis

For recurring or critical issues, document:

- Root Cause
- Contributing Factors
- Corrective Action
- Preventive Action

---

# Workflow

```text
Receive Report

↓

Validate

↓

Classify

↓

Assess Severity

↓

Assign Priority

↓

Assign Owner

↓

Track Progress

↓

Verify Fix

↓

Close
```

---

# Outputs

Generate:

- Triage Report
- Prioritized Bug List
- Assignment Matrix
- Release Risk Assessment
- Resolution Summary

---

# Validation Checklist

Before completion verify:

- Every bug validated
- Severity assigned
- Priority assigned
- Owner assigned
- Status updated
- Release blockers identified

---

# Failure Conditions

Stop release if:

- Critical defects remain unresolved
- Security blockers exist
- Data loss is possible
- Core user flows are broken
- Ownership is undefined

---

# Rules

- Prioritize customer impact.
- Separate severity from priority.
- Do not close without verification.
- Record evidence for every critical issue.
- Keep stakeholders informed.

---

# Success Criteria

This skill succeeds when:

- all defects are triaged
- release blockers are identified
- ownership is clear
- high-priority issues are scheduled
- regression testing can begin

---

# Next Skills

```text
regression-testing

↓

release/deployment
```

---

# Related Skills

- testing
- code-review
- security-review
- performance
- accessibility
- regression-testing

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |