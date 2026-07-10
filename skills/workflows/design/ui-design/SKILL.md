---
name: ui-design
description: Transform the design system into production-ready user interface designs by creating consistent, accessible, and responsive screens based on approved planning artifacts.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# UI Design

## Purpose

This skill creates production-ready user interface designs using the approved Design System.

The objective is to transform product requirements into clear, consistent, and developer-friendly screen designs.

UI Design focuses on visual communication, usability, and implementation readiness.

---

# When to Use

Execute after:

- design/figma
- design/design-system

Execute before:

- ux-review
- prototype
- development/frontend

---

# Objectives

Create UI screens that:

- follow the Design System
- satisfy User Stories
- support User Flows
- are responsive
- are accessible
- are ready for implementation

---

# Inputs

Expected inputs:

- PRD
- User Stories
- Information Architecture
- User Flow
- Design System
- Figma Workspace

---

# Screen Design

Design every required screen.

Examples:

- Landing Page
- Dashboard
- Login
- Registration
- Product List
- Product Detail
- Cart
- Checkout
- Profile
- Settings
- Admin

---

# Layout Rules

Each screen should include:

- Header
- Main Content
- Navigation
- Footer (when applicable)
- Empty States
- Error States
- Loading States

Maintain layout consistency.

---

# Component Usage

Use only approved components.

Avoid creating duplicate components.

Prefer:

- Component Variants
- Auto Layout
- Variables
- Shared Styles

---

# Responsive Design

Prepare layouts for:

- Mobile
- Tablet
- Desktop

Verify:

- spacing
- alignment
- typography
- touch targets
- navigation

---

# Accessibility

Ensure:

- WCAG compliance
- readable typography
- sufficient contrast
- keyboard accessibility
- visible focus states

Accessibility is required.

---

# Visual Hierarchy

Establish clear hierarchy using:

- Typography
- Spacing
- Color
- Size
- Elevation

Users should immediately understand the most important action.

---

# Interaction States

Design all required states.

Examples:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Error
- Success
- Empty

---

# UI Workflow

```
Review Design System

↓

Review User Flow

↓

Design Screens

↓

Apply Components

↓

Apply Responsive Rules

↓

Validate Accessibility

↓

Review Consistency

↓

Prepare Developer Handoff

↓

Pass to UX Review
```

---

# Outputs

Generate:

- Complete Screen Designs
- Responsive Layouts
- Interaction States
- Developer Handoff Notes
- UI Specifications

---

# Rules

- Never bypass the Design System.
- Reuse components whenever possible.
- Keep layouts simple.
- Minimize visual noise.
- Optimize readability.
- Maintain consistency across every screen.

---

# Validation Checklist

Before completion verify:

- All required screens exist
- Components follow Design System
- Responsive layouts verified
- Accessibility checked
- Interaction states completed
- Developer handoff prepared

---

# Success Criteria

This skill succeeds when:

- every required screen is designed
- the UI is consistent
- accessibility standards are satisfied
- responsive layouts are complete
- developers can implement without ambiguity

---

# Next Skills

Invoke:

```
ux-review

↓

prototype
```

---

# Related Skills

- figma
- design-system
- prototype
- frontend
- communication

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |