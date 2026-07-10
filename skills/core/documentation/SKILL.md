---
name: documentation
description: Documentation standards for AI Business OS. Defines how project knowledge is created, maintained, versioned, and communicated throughout the project lifecycle.
version: 1.0.0
author: AI Business OS
license: MIT
category: core
priority: required
---

# Documentation

## Purpose

This skill defines documentation standards for AI Business OS.

Documentation is not optional.

Every important decision, implementation, and project milestone should be recorded so that future contributors can understand the project without relying on memory.

---

# When to Use

Apply this skill whenever you:

- Analyze requirements
- Create a project plan
- Design architecture
- Implement new features
- Fix bugs
- Review code
- Deploy software
- Complete milestones

Documentation should evolve together with the project.

---

# Documentation Principles

## 1. Document the Why

Do not only record what changed.

Always explain:

- Why was this necessary?
- What problem does it solve?
- What was the expected outcome?

Understanding the reason is more valuable than listing changes.

---

## 2. Keep Documentation Close to the Work

Documentation should be created immediately after important work.

Never postpone documentation.

Documentation created later is usually incomplete or inaccurate.

---

## 3. Single Source of Truth

Each topic should have one authoritative document.

Avoid duplicate documentation.

If information changes:

- Update the original document.
- Do not create conflicting copies.

---

## 4. Keep Documentation Current

Documentation must reflect the current implementation.

Outdated documentation is more harmful than missing documentation.

Review documentation whenever related code changes.

---

## 5. Write for Future Readers

Assume the reader has never seen the project.

Use:

- clear language
- logical structure
- consistent terminology

Avoid unexplained abbreviations and hidden assumptions.

---

# Required Documentation

The following project artifacts should exist when applicable:

- Requirements
- PRD
- User Stories
- Information Architecture
- User Flow
- Design Decisions
- API Documentation
- Database Design
- Deployment Guide
- Release Notes
- Meeting Notes
- Change Log

---

# Change Documentation

When documenting changes include:

## Summary

What changed?

## Reason

Why was it changed?

## Impact

Which modules, features, or users are affected?

## Verification

How was the change verified?

## Risks

Are there any remaining concerns?

---

# Documentation Workflow

```
Understand

↓

Implement

↓

Verify

↓

Document

↓

Review

↓

Publish
```

Documentation is part of completion.

---

# Versioning

Every significant document should include:

- Version
- Author
- Date
- Change Summary

Maintain a clear revision history.

---

# Documentation Quality Checklist

Before marking documentation complete:

- Purpose is clear
- Terminology is consistent
- Technical details are accurate
- Links are valid
- Examples are correct
- Version updated

---

# Anti-Patterns

Avoid:

- undocumented decisions
- duplicate documents
- outdated examples
- missing version history
- vague explanations
- undocumented assumptions

---

# Success Criteria

Documentation is considered complete when:

- it accurately reflects the current project
- important decisions are recorded
- another engineer can understand the work
- related documentation has been updated
- project knowledge is preserved

---

# Related Skills

- ai-business-os-core
- communication
- decision-making
- karpathy-guidelines

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |