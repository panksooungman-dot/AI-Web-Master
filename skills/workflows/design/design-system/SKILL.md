---
name: design-system
description: Create and maintain a scalable design system that provides reusable foundations, components, design tokens, and guidelines for consistent product design.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Design System

## Purpose

This skill establishes a unified design system for the project.

The objective is to ensure visual consistency, improve design efficiency, and enable reusable UI components across the product.

The design system becomes the single source of truth for designers and developers.

---

# When to Use

Execute after:

- design/figma

Execute before:

- ui-design
- prototype
- frontend

---

# Objectives

Create a reusable design foundation including:

- Design Tokens
- Components
- Layout Rules
- Typography
- Color System
- Iconography
- Accessibility Standards

---

# Inputs

Expected inputs:

- Figma Workspace
- Brand Guidelines
- PRD
- User Stories
- Information Architecture
- User Flow

---

# Design Tokens

Define reusable tokens.

## Colors

Include:

- Primary
- Secondary
- Success
- Warning
- Error
- Neutral
- Background
- Surface
- Border

---

## Typography

Define:

- Font Families
- Font Sizes
- Font Weights
- Line Heights
- Letter Spacing

---

## Spacing

Create spacing scale.

Example

```
4
8
12
16
24
32
40
48
64
```

Use a consistent scale.

---

## Border Radius

Define:

- Small
- Medium
- Large
- Full

---

## Elevation

Document shadow levels.

Examples:

- Card
- Modal
- Dropdown
- Floating Button

---

# Grid System

Define layouts for:

- Mobile
- Tablet
- Desktop

Specify:

- Columns
- Margins
- Gutters
- Breakpoints

---

# Components

Create reusable components.

Examples:

- Button
- Input
- Select
- Checkbox
- Radio
- Card
- Modal
- Drawer
- Navigation
- Table
- Badge
- Avatar
- Toast
- Tooltip

Every component should define:

- Variants
- States
- Sizes
- Properties
- Usage Rules

---

# Component States

Document:

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Error
- Success

---

# Icons

Define:

- Icon Library
- Icon Size
- Stroke Width
- Usage Rules

---

# Accessibility

Ensure:

- WCAG compliance
- Color contrast
- Keyboard navigation
- Focus visibility
- Screen reader compatibility

Accessibility is mandatory.

---

# Naming Convention

Use clear names.

Examples

```
Button/Primary

Input/Text

Card/Product

Navigation/Header

Modal/Confirm
```

Avoid ambiguous naming.

---

# Documentation

Document:

- Component Purpose
- Usage
- Do
- Don't
- Variants
- Accessibility Notes

---

# Workflow

```
Review Figma

↓

Define Tokens

↓

Build Components

↓

Create Variants

↓

Document Usage

↓

Validate Accessibility

↓

Publish Design System

↓

Pass to UI Design
```

---

# Outputs

Generate:

- Design Tokens
- Component Library
- Typography Scale
- Color System
- Grid System
- Accessibility Guide
- Component Documentation

---

# Rules

- Reuse before creating.
- Components must be modular.
- Tokens should never be duplicated.
- Maintain naming consistency.
- Keep visual language unified.

---

# Validation Checklist

Before completion verify:

- Tokens created
- Components reusable
- Variants complete
- Accessibility verified
- Documentation updated
- Naming consistent

---

# Success Criteria

This skill succeeds when:

- every UI element uses the design system
- components are reusable
- tokens are centralized
- accessibility standards are met
- UI design can proceed without inconsistencies

---

# Next Skills

Invoke:

```
ui-design

↓

ux-review

↓

prototype
```

---

# Related Skills

- figma
- ui-design
- prototype
- asset-management
- frontend

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |