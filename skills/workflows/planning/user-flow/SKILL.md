---
name: user-flow
description: Design end-to-end user flows that describe how users accomplish their goals across the product based on the approved PRD, User Stories, and Information Architecture.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# User Flow

## Purpose

This skill designs complete user journeys through the product.

Its objective is to describe how users move between pages, complete tasks, and achieve goals before UI design or development begins.

User Flow focuses on user behavior, not interface appearance.

---

# When to Use

Execute after:

- planning/prd
- planning/user-story
- planning/ia

Execute before:

- planning/feature-planning
- design/figma

---

# Objectives

Create user flows that:

- describe user journeys
- identify decision points
- define page transitions
- reduce user friction
- validate business processes

---

# Inputs

Expected inputs:

- Product Requirements Document
- User Stories
- Information Architecture
- Requirement Specification
- Business Goals

---

# User Journey

For each user role identify:

- Entry Point
- Goal
- Navigation Path
- Decision Points
- Exit Point

Example:

```
Visitor

↓

Home

↓

Product List

↓

Product Detail

↓

Cart

↓

Checkout

↓

Payment

↓

Order Complete
```

---

# Flow Types

Design flows for:

- Guest Users
- Registered Users
- Administrators
- Managers
- Internal Staff

---

# Decision Points

Document situations such as:

- Login Required
- Permission Check
- Validation Error
- Payment Success
- Payment Failure
- Empty Search Result

Every branch should have a defined outcome.

---

# Error Flows

Include:

- Invalid Input
- Network Failure
- Authentication Failure
- Permission Denied
- Missing Data

Design recovery paths.

---

# Success Flows

Describe the ideal path from start to goal.

Minimize unnecessary steps.

---

# Alternate Flows

Consider:

- Optional actions
- User cancellation
- Returning users
- Mobile users
- Interrupted sessions

---

# Workflow

```
Review PRD

↓

Review User Stories

↓

Review IA

↓

Identify User Goals

↓

Map User Journeys

↓

Define Decision Points

↓

Review Error Flows

↓

Validate

↓

Pass to Feature Planning
```

---

# Outputs

Generate:

- User Flow Diagram
- Journey Map
- Decision Tree
- Entry/Exit Points
- Error Flow
- Success Flow

---

# Rules

- Design from the user's perspective.
- Minimize clicks.
- Keep navigation intuitive.
- Handle errors gracefully.
- Every flow must have a successful completion path.

---

# Success Criteria

This skill succeeds when:

- every user role has a complete journey
- all decision points are documented
- error flows are covered
- navigation is logical
- feature planning can begin without ambiguity

---

# Next Skills

Invoke:

```
feature-planning

↓

task-planning
```

---

# Related Skills

- prd
- user-story
- ia
- feature-planning
- ai-business-os-core
- communication

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |