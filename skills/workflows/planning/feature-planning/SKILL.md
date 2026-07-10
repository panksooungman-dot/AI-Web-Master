---
name: feature-planning
description: Break down the approved PRD, User Stories, IA, and User Flows into implementable product features with priorities, dependencies, and release planning.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Feature Planning

## Purpose

This skill transforms product requirements into a structured feature roadmap.

The objective is to define what features will be built, their priorities, dependencies, and release strategy before implementation begins.

A feature should represent a complete unit of business value.

---

# When to Use

Execute after:

- planning/prd
- planning/user-story
- planning/ia
- planning/user-flow

Execute before:

- planning/task-planning
- design
- development

---

# Objectives

Create a complete feature plan that:

- groups related functionality
- defines feature boundaries
- establishes priorities
- identifies dependencies
- supports implementation planning

---

# Inputs

Expected inputs:

- Product Requirements Document
- User Stories
- Information Architecture
- User Flow
- Business Goals

---

# Feature Definition

Each feature should include:

- Feature ID
- Feature Name
- Description
- Business Value
- Owner
- Priority
- Status

Example:

```
Feature: User Authentication

Description:
Allow users to register, log in, and manage sessions securely.
```

---

# Feature Categories

Organize features such as:

- Authentication
- User Management
- Dashboard
- Product Catalog
- Search
- Shopping Cart
- Checkout
- Payment
- Notifications
- Administration

---

# Priority

Assign one priority:

- Must Have
- Should Have
- Could Have
- Won't Have

Provide a reason for each priority.

---

# Dependencies

Document:

- Required APIs
- Database tables
- External services
- Shared components
- Related features

---

# MVP Planning

Separate features into:

## MVP

Required for initial release.

## Phase 2

Future improvements.

## Backlog

Ideas for future consideration.

---

# Release Planning

Assign each feature to a release.

Example:

```
Release 1.0

- Login
- Registration
- Dashboard

Release 1.1

- Notifications
- Analytics
```

---

# Feature Workflow

```
Review PRD

↓

Review User Stories

↓

Review IA

↓

Review User Flow

↓

Identify Features

↓

Group Features

↓

Assign Priorities

↓

Identify Dependencies

↓

Create MVP

↓

Plan Releases

↓

Approve
```

---

# Outputs

Generate:

- Feature List
- Feature Roadmap
- MVP Definition
- Priority Matrix
- Dependency Map
- Release Plan

---

# Rules

- One feature should deliver a complete business capability.
- Avoid duplicate features.
- Keep feature boundaries clear.
- Prioritize business value over technical complexity.
- Features should be independently testable whenever possible.

---

# Success Criteria

This skill succeeds when:

- all requirements are mapped to features
- MVP is clearly defined
- priorities are assigned
- dependencies are documented
- release planning is complete

---

# Next Skills

Invoke:

```
task-planning

↓

milestone
```

---

# Related Skills

- prd
- user-story
- ia
- user-flow
- task-planning
- ai-business-os-core

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |