---
name: user-story
description: Transform product requirements into user-centered stories with clear acceptance criteria for design, development, and testing.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# User Story

## Purpose

This skill converts the Product Requirements Document (PRD) into actionable User Stories.

User Stories describe product functionality from the user's perspective and become the foundation for design, development, and quality assurance.

A User Story should explain **who**, **what**, and **why**.

---

# When to Use

Execute after:

- planning/prd

Execute before:

- ia
- user-flow
- feature-planning

---

# Objectives

Create user-centered stories that:

- describe user goals
- define business value
- support feature planning
- provide clear acceptance criteria
- reduce implementation ambiguity

---

# Inputs

Expected inputs:

- Product Requirements Document
- Requirement Specification
- Business Goals
- Target Users
- Scope Definition

---

# Story Format

Use the standard format:

```
As a <user>

I want <goal>

So that <business value>
```

Example:

```
As a customer

I want to search products

So that I can quickly find items I want to purchase.
```

---

# User Identification

Identify user roles such as:

- Guest
- Customer
- Administrator
- Manager
- Employee
- Partner

Each story should belong to one primary user.

---

# Story Rules

Every story should:

- describe one user goal
- deliver measurable value
- be independently testable
- avoid implementation details
- remain small enough for one iteration

---

# Acceptance Criteria

Each story must include acceptance criteria.

Example:

```
Given

User is on the login page

When

Valid credentials are entered

Then

The user is redirected to the dashboard.
```

Acceptance criteria should be:

- clear
- testable
- measurable

---

# Story Prioritization

Assign priority using:

- Must Have
- Should Have
- Could Have
- Won't Have

Explain why the priority was assigned.

---

# Dependencies

Identify:

- prerequisite stories
- related features
- external dependencies
- business dependencies

---

# Story Workflow

```
Review PRD

↓

Identify User Roles

↓

Identify User Goals

↓

Write User Stories

↓

Define Acceptance Criteria

↓

Assign Priority

↓

Review

↓

Approve

↓

Pass to IA
```

---

# Outputs

Generate:

- User Story List
- Acceptance Criteria
- Priority Matrix
- Story Dependencies
- User Role Mapping

---

# Quality Checklist

Every User Story should be:

- user-focused
- independent
- valuable
- testable
- understandable
- concise

---

# Rules

- Focus on user value.
- Do not describe implementation.
- One story should solve one problem.
- Avoid combining multiple features into one story.
- Acceptance criteria must be objective.

---

# Success Criteria

This skill succeeds when:

- all major requirements have corresponding User Stories
- every story has acceptance criteria
- priorities are assigned
- stories are understandable by designers, developers, and testers
- planning can continue without additional clarification

---

# Next Skills

Invoke in order:

```
ia

↓

user-flow

↓

feature-planning
```

---

# Related Skills

- prd
- requirement-analysis
- ai-business-os-core
- communication
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |