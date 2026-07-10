---
name: figma
description: Transform approved planning artifacts into a structured Figma design workspace including pages, frames, components, variables, and design specifications.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Figma

## Purpose

This skill transforms planning artifacts into a structured Figma workspace.

The objective is to prepare a scalable design environment before UI design begins.

The Figma file should become the single source of truth for all visual design work.

---

# When to Use

Execute after:

- planning/prd
- planning/user-story
- planning/ia
- planning/user-flow
- planning/feature-planning

Execute before:

- design-system
- ui-design
- prototype

---

# Objectives

Create a Figma workspace that includes:

- Project pages
- Design structure
- Layout foundations
- Variables
- Components
- Shared assets

---

# Inputs

Expected inputs:

- Product Requirements Document
- User Stories
- Information Architecture
- User Flow
- Feature Planning
- Brand Guidelines
- Reference Analysis

---

# Figma File Structure

Create the following pages.

```
📄 Cover

📄 Design System

📄 Components

📄 Wireframes

📄 UI Design

📄 Prototype

📄 Assets

📄 Archive
```

---

# Frame Structure

Organize frames by feature.

Example

```
Authentication

├── Login
├── Register
├── Forgot Password

Dashboard

├── Home
├── Analytics
├── Settings
```

---

# Variables

Prepare variables for:

- Colors
- Typography
- Spacing
- Radius
- Shadows
- Grid
- Breakpoints

Never hardcode repeated values.

---

# Components

Create reusable components.

Examples:

- Button
- Input
- Card
- Modal
- Navigation
- Table
- Badge
- Avatar
- Tabs
- Dialog

Use component variants where appropriate.

---

# Auto Layout

Every layout should:

- use Auto Layout
- support resizing
- maintain spacing
- support responsive behavior

Avoid manual positioning whenever possible.

---

# Naming Convention

Use consistent naming.

Examples

```
Button/Primary

Button/Secondary

Input/Text

Card/Product

Navigation/Header
```

Avoid ambiguous names.

---

# Responsive Design

Prepare layouts for:

- Mobile
- Tablet
- Desktop

Use constraints and Auto Layout appropriately.

---

# Design Tokens

Organize:

- Color Tokens
- Typography Tokens
- Spacing Tokens
- Elevation Tokens

Keep tokens reusable.

---

# Documentation

Document:

- Page purpose
- Component usage
- Variant rules
- Naming conventions
- Design decisions

---

# Workflow

```
Review Planning

↓

Create Figma File

↓

Create Pages

↓

Create Variables

↓

Create Components

↓

Create Layouts

↓

Review Structure

↓

Prepare Design System

↓

Pass to UI Design
```

---

# Outputs

Generate:

- Figma Workspace
- Page Structure
- Component Library
- Variable Collection
- Layout Templates
- Design Documentation

---

# Rules

- Design before implementation.
- Reuse components whenever possible.
- Keep naming consistent.
- Separate reusable assets from screen layouts.
- Build for scalability.
- Follow the approved planning artifacts.

---

# Validation Checklist

Before completion verify:

- Pages created
- Variables organized
- Components reusable
- Auto Layout applied
- Naming consistent
- Responsive structure prepared

---

# Success Criteria

This skill succeeds when:

- the Figma workspace is organized
- reusable components are prepared
- variables are defined
- layouts are scalable
- UI Design can begin immediately

---

# Next Skills

Invoke:

```
design-system

↓

ui-design

↓

prototype
```

---

# Related Skills

- prd
- user-story
- ia
- user-flow
- feature-planning
- design-system
- ui-design

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |