---
name: karpathy-guidelines
description: Behavioral guidelines for writing, reviewing, and maintaining software. Use to reduce common LLM coding mistakes and improve engineering quality.
version: 1.0.0
author: AI Business OS
license: MIT
category: core
priority: required
---

# Karpathy Guidelines

## Purpose

This skill defines engineering behaviors that reduce common AI coding mistakes.

It focuses on **how to think before writing code**, not on any specific technology.

Every development-related skill should follow these principles.

---

# When to Use

Apply this skill whenever you:

- Write new code
- Modify existing code
- Refactor code
- Review pull requests
- Debug issues
- Investigate bugs
- Generate architecture
- Create tests

---

# Core Principles

## 1. Think Before Coding

Never assume.

Before implementation:

- Understand the request.
- Identify unknowns.
- State assumptions explicitly.
- Ask questions if information is missing.
- Compare possible approaches.
- Recommend the simplest solution.

Do not silently guess.

---

## 2. Simplicity First

The best solution is the simplest solution that satisfies the requirement.

Avoid:

- unnecessary abstraction
- speculative design
- future-proofing
- overengineering
- unused configuration

Ask yourself:

> Would an experienced engineer write less code?

If yes, simplify.

---

## 3. Surgical Changes

Only modify code related to the requested task.

Do not:

- refactor unrelated modules
- rename unrelated variables
- change formatting everywhere
- reorganize folders unnecessarily
- rewrite working code

Every modified line should directly support the requested change.

---

## 4. Goal-Driven Execution

Before implementation define measurable success.

Example

```
Goal

✓ Build succeeds

✓ Tests pass

✓ Browser works

✓ No regression

✓ Feature completed
```

Without measurable goals the task is incomplete.

---

# Engineering Rules

## Preserve Existing Behavior

Never break working functionality unless explicitly requested.

Always consider backward compatibility.

---

## Minimize Risk

Prefer incremental changes over large rewrites.

Small verified improvements are better than large speculative ones.

---

## Follow Existing Conventions

Respect the project's:

- folder structure
- naming conventions
- architecture
- coding style
- documentation style

Consistency is more valuable than personal preference.

---

## Verify Everything

Never assume code works.

Verify with:

- Build
- Lint
- Tests
- Runtime
- Manual validation

---

## Document Important Decisions

When making non-obvious decisions document:

- Why
- Alternatives
- Tradeoffs
- Impact

Future maintainers should understand the reasoning.

---

# Anti-Patterns

Avoid:

- Guessing requirements
- Overengineering
- Large unrelated refactors
- Hidden assumptions
- Premature optimization
- Magic values
- Duplicate logic
- Dead code
- Incomplete implementations

---

# Workflow

```
Understand

↓

Analyze

↓

Plan

↓

Implement

↓

Verify

↓

Document

↓

Complete
```

Never skip verification.

---

# Success Criteria

This skill succeeds when:

- assumptions are explicit
- implementation is minimal
- only necessary files changed
- verification completed
- documentation updated if required
- requested goal achieved

---

# Related Skills

- ai-business-os-core
- communication
- decision-making
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |