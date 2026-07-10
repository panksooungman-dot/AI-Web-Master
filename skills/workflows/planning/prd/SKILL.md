---
name: prd
description: Create a comprehensive Product Requirements Document (PRD) from validated requirements and project context. The PRD serves as the single source of truth for planning, design, development, and testing.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Product Requirements Document (PRD)

## Purpose

This skill transforms validated business requirements into a complete Product Requirements Document (PRD).

The PRD is the primary planning document for the project and serves as the single source of truth for all downstream activities.

A PRD should describe **what** will be built and **why**, not how it will be implemented.

---

# When to Use

Execute after:

- client-inquiry
- requirement-analysis
- reference-analysis
- project-creation

Execute before:

- user-story
- ia
- user-flow
- feature-planning

---

# Objectives

Produce a PRD that clearly defines:

- Business goals
- Product vision
- Project scope
- Functional requirements
- Non-functional requirements
- User roles
- Success criteria
- Constraints

---

# Inputs

Expected inputs:

- Client Inquiry Summary
- Requirement Specification
- Reference Analysis
- Approved Scope
- Business Goals
- Project Metadata

---

# PRD Structure

## 1. Project Overview

Include:

- Project Name
- Client
- Business Domain
- Product Type
- Version
- Author
- Date

---

## 2. Product Vision

Describe:

- Why this product exists
- Business objectives
- Expected outcomes
- Target market

---

## 3. Problem Statement

Define:

- Current problems
- User pain points
- Business challenges

Avoid proposing solutions in this section.

---

## 4. Goals

List measurable goals.

Examples:

- Increase conversion rate
- Reduce manual work
- Improve user experience
- Increase customer retention

Goals should be measurable whenever possible.

---

## 5. Target Users

Identify:

- Primary Users
- Secondary Users
- Administrators
- Internal Staff

Describe each user group's needs.

---

## 6. Scope

Separate clearly.

### In Scope

Features included.

### Out of Scope

Features intentionally excluded.

---

## 7. Functional Requirements

Organize by feature.

Each feature should include:

- Name
- Description
- Business Value
- Priority
- Dependencies

---

## 8. Non-Functional Requirements

Include:

- Performance
- Security
- Accessibility
- Reliability
- Scalability
- Browser Support
- Mobile Support

---

## 9. Business Rules

Document:

- Validation rules
- Permissions
- Approval flows
- Operational constraints

---

## 10. Assumptions

List every assumption explicitly.

Never hide assumptions.

---

## 11. Risks

Identify:

- Business Risks
- Technical Risks
- Schedule Risks
- Dependency Risks

Include mitigation strategies.

---

## 12. Success Metrics

Define measurable outcomes.

Examples:

- Task completion rate
- Response time
- Error rate
- Conversion rate
- Customer satisfaction

---

# Workflow

```
Collect Inputs

↓

Understand Business Goals

↓

Define Product Vision

↓

Define Scope

↓

Organize Requirements

↓

Document Business Rules

↓

Identify Risks

↓

Define Success Metrics

↓

Generate PRD

↓

Review

↓

Approve
```

---

# Outputs

Generate:

- Product Requirements Document
- Scope Definition
- Feature Summary
- Business Rules
- Success Metrics
- Risk Summary

---

# Rules

- Focus on business requirements.
- Do not include implementation details.
- Keep requirements testable.
- Remove ambiguity whenever possible.
- Separate facts from assumptions.
- Maintain one source of truth.

---

# Deliverables

The completed PRD should enable:

- User Story creation
- Information Architecture
- User Flow
- Feature Planning
- Design
- Development
- QA

without requiring additional clarification.

---

# Success Criteria

This skill succeeds when:

- Product vision is clear.
- Scope is defined.
- Requirements are complete.
- Business rules are documented.
- Success metrics are measurable.
- Planning can continue without ambiguity.

---

# Next Skills

Invoke in order:

```
user-story

↓

ia

↓

user-flow

↓

feature-planning
```

---

# Related Skills

- project-creation
- requirement-analysis
- reference-analysis
- ai-business-os-core
- communication
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |