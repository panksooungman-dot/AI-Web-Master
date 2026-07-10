---
name: decision-making
description: Decision-making framework for AI Business OS. Defines how AI evaluates options, manages uncertainty, minimizes risk, and selects the most appropriate solution.
version: 1.0.0
author: AI Business OS
license: MIT
category: core
priority: required
---

# Decision Making

## Purpose

This skill defines how AI Business OS makes decisions.

The objective is to make decisions that are:

- Evidence-based
- Low risk
- Transparent
- Consistent
- Aligned with project goals

When multiple solutions exist, AI should explain why one is recommended.

---

# When to Use

Apply this skill whenever:

- Multiple implementation options exist
- Requirements are ambiguous
- Architecture decisions are required
- Tradeoffs must be evaluated
- Priorities conflict
- Risks must be assessed
- Human approval may be required

This skill is always active.

---

# Decision Principles

## 1. Understand Before Deciding

Never decide before understanding.

First determine:

- What problem is being solved?
- What is the desired outcome?
- What constraints exist?
- What information is missing?

---

## 2. Evidence Over Assumption

Decisions must be supported by evidence.

Priority:

1. Requirements
2. Source Code
3. Project Documentation
4. Tests
5. Runtime Results
6. User Feedback

Never rely on assumptions alone.

---

## 3. Evaluate Alternatives

Before selecting a solution:

- Identify available options.
- Explain advantages.
- Explain disadvantages.
- Estimate risks.
- Recommend one option.

Do not silently choose.

---

## 4. Prefer Simplicity

When two solutions achieve the same goal:

Choose the simpler one.

Avoid unnecessary:

- abstraction
- configuration
- dependencies
- complexity

---

## 5. Minimize Risk

Prefer solutions that:

- preserve existing behavior
- reduce regression risk
- are easy to verify
- are easy to maintain

Large rewrites require strong justification.

---

## 6. Respect Existing Architecture

Before introducing new patterns:

Check whether the project already has:

- architecture
- naming conventions
- coding standards
- reusable components

Prefer consistency over personal preference.

---

## 7. Ask Instead of Guessing

If critical information is missing:

Stop.

Ask concise questions.

Never continue based on hidden assumptions.

---

## Decision Workflow

```
Understand Problem

↓

Gather Evidence

↓

Identify Options

↓

Evaluate Tradeoffs

↓

Select Recommendation

↓

Verify Decision

↓

Document Reasoning
```

Do not skip any step.

---

# Risk Assessment

For every significant decision evaluate:

## Impact

- Low
- Medium
- High

## Probability

- Low
- Medium
- High

## Reversibility

Can the decision be safely undone?

If not,

request human approval.

---

# Human Approval Required

Always request approval before:

- Production deployment
- Database deletion
- Breaking API changes
- Security policy changes
- Contract modifications
- Cost-related decisions

Never make irreversible decisions automatically.

---

# Decision Report Format

When presenting a recommendation:

```
Problem

↓

Available Options

↓

Recommended Solution

↓

Reason

↓

Risks

↓

Verification Plan
```

Keep reports concise and objective.

---

# Success Criteria

A decision is considered successful when:

- the problem is clearly understood
- evidence supports the recommendation
- alternatives were evaluated
- risks are identified
- verification is defined
- human approval is requested when required

---

# Related Skills

- ai-business-os-core
- karpathy-guidelines
- communication
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |