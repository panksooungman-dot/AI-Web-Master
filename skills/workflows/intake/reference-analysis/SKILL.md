---
name: reference-analysis
description: Analyze client references such as websites, Figma files, PDFs, images, applications, and documents to extract UI, UX, business logic, features, and technical requirements.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Reference Analysis

## Purpose

This skill analyzes all client-provided reference materials and converts them into structured project knowledge.

The objective is to understand what the client expects before planning, design, or development begins.

Reference materials should never be copied directly.
Instead, they should be analyzed to identify reusable ideas, patterns, and requirements.

---

# When to Use

Use this skill whenever the client provides:

- Website URLs
- Figma files
- Mobile applications
- PDF documents
- Images
- Wireframes
- PowerPoint files
- Existing products
- Competitor services

Execute after:

```
client-inquiry
```

Execute before:

```
planning/prd
```

---

# Objectives

Extract and organize information about:

- Business goals
- UI patterns
- UX flows
- Functional requirements
- Information architecture
- Design systems
- Technical implementation ideas

---

# Supported Reference Types

## Websites

Analyze:

- Navigation
- Layout
- Components
- User Flow
- Responsive Behavior
- Branding

---

## Figma

Analyze:

- Design System
- Components
- Variables
- Typography
- Color Tokens
- Auto Layout
- Prototype Flow

---

## Mobile Apps

Analyze:

- Navigation
- Screen Flow
- User Experience
- Feature Set
- Interaction Patterns

---

## Images

Analyze:

- Layout
- Visual Style
- Colors
- Typography
- Component Structure

---

## Documents

Analyze:

- Requirements
- Business Rules
- Process Flow
- Constraints
- KPIs

---

# Analysis Workflow

```
Collect References

↓

Identify Reference Type

↓

Analyze UI

↓

Analyze UX

↓

Analyze Features

↓

Analyze Business Flow

↓

Identify Design Patterns

↓

Identify Technical Requirements

↓

Summarize Findings

↓

Pass to PRD
```

---

# UI Analysis

Identify:

- Header
- Footer
- Navigation
- Hero Sections
- Cards
- Forms
- Tables
- Buttons
- Layout Patterns

---

# UX Analysis

Identify:

- User Journey
- Navigation Flow
- Interaction Pattern
- Error Handling
- Empty States
- Success States

---

# Feature Analysis

Extract:

- Authentication
- Search
- Filtering
- Cart
- Payment
- Dashboard
- Notifications
- Admin Features

Separate mandatory features from optional features.

---

# Business Analysis

Understand:

- Business Model
- Revenue Flow
- Target Users
- Customer Journey
- Operational Process

---

# Technical Analysis

Identify:

- Frontend Patterns
- Backend Requirements
- API Integrations
- Database Needs
- Authentication Methods
- Third-party Services

---

# Design System Analysis

Identify:

- Color Palette
- Typography
- Spacing
- Icons
- Components
- Grid System
- Responsive Rules

---

# Deliverables

Produce:

- Reference Summary
- UI Analysis Report
- UX Analysis Report
- Feature Inventory
- Business Flow Summary
- Technical Notes
- Design System Notes
- Recommended Improvements

---

# Rules

- Analyze, do not copy.
- Respect intellectual property.
- Focus on patterns rather than exact implementation.
- Identify strengths and weaknesses.
- Explain why each reference is useful.
- Separate observations from assumptions.

---

# Success Criteria

This skill succeeds when:

- All references have been analyzed.
- UI and UX patterns are documented.
- Features are categorized.
- Business goals are understood.
- Technical implications are identified.
- Planning can begin with confidence.

---

# Next Skill

After completion, invoke:

```
planning/prd
```

---

# Related Skills

- client-inquiry
- requirement-analysis
- ai-business-os-core
- communication
- decision-making
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |