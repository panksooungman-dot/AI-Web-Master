---
name: prototype
description: Create interactive prototypes that validate user flows, interactions, and product behavior before development begins.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Prototype

## Purpose

This skill creates interactive prototypes that simulate the final product experience.

The objective is to validate user interactions, navigation, task completion, and business flows before implementation begins.

A prototype should answer how the product behaves, not merely how it looks.

---

# When to Use

Execute after:

- design/ui-design
- design/ux-review

Execute before:

- development/architecture
- development/frontend

---

# Objectives

Create prototypes that:

- validate user journeys
- demonstrate interactions
- verify navigation
- support stakeholder reviews
- reduce implementation risk

---

# Inputs

Expected inputs:

- PRD
- User Stories
- Information Architecture
- User Flow
- UI Design
- UX Review

---

# Prototype Scope

Create interactive flows for:

- Authentication
- Onboarding
- Dashboard
- CRUD Operations
- Checkout
- Payment
- Settings
- Administration
- Error Recovery

Focus on critical business flows first.

---

# Interaction Design

Prototype interactions including:

- Click
- Hover
- Drag
- Scroll
- Swipe
- Modal
- Drawer
- Tabs
- Accordion
- Form Validation

---

# Navigation

Verify:

- Primary Navigation
- Secondary Navigation
- Back Navigation
- Deep Links
- Breadcrumbs

Users should never become lost.

---

# State Simulation

Prototype:

- Loading
- Success
- Error
- Empty
- Disabled
- Offline

Represent realistic product behavior.

---

# Animation

Use animation only when it:

- improves understanding
- provides feedback
- supports orientation

Avoid unnecessary motion.

---

# Validation

Verify:

- User can complete tasks
- Navigation is intuitive
- Interaction timing feels natural
- Edge cases are covered

---

# Workflow

```
Review UI Design

↓

Define Prototype Scope

↓

Connect Screens

↓

Create Interactions

↓

Simulate States

↓

Review User Journey

↓

Stakeholder Validation

↓

Finalize Prototype

↓

Pass to Asset Management
```

---

# Outputs

Generate:

- Interactive Prototype
- Flow Demonstrations
- Interaction Specifications
- Review Notes
- Validation Report

---

# Rules

- Prototype business-critical flows first.
- Prioritize usability over visual polish.
- Keep interactions realistic.
- Ensure every primary task can be completed.
- Reflect actual product behavior.

---

# Validation Checklist

Before completion verify:

- All key flows connected
- Interactions functional
- Error states included
- Navigation verified
- Stakeholder review completed

---

# Success Criteria

This skill succeeds when:

- stakeholders can validate the product experience
- major interaction issues are identified
- business flows are verified
- development can begin with confidence

---

# Next Skills

Invoke:

```
asset-management

↓

development/architecture
```

---

# Related Skills

- figma
- ui-design
- ux-review
- architecture

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |