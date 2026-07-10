---
name: frontend
description: Implement responsive, accessible, and maintainable frontend applications based on the approved architecture, design system, and UI specifications.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Frontend Development

## Purpose

This skill defines how frontend applications are implemented within AI Business OS.

The objective is to transform approved designs into production-ready interfaces that are responsive, accessible, performant, and maintainable.

Frontend implementation must strictly follow the Architecture and Design System.

---

# When to Use

Execute after:

- development/architecture
- design/ui-design
- design/design-system
- design/prototype

Execute before:

- backend
- api
- integration

---

# Objectives

Build frontend applications that are:

- Responsive
- Accessible
- Maintainable
- Reusable
- Performant
- Scalable

---

# Inputs

Expected inputs:

- Architecture Document
- PRD
- User Stories
- UI Design
- Design System
- Prototype

---

# Technology Standards

Prefer:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Use project standards whenever defined.

---

# Component Architecture

Create reusable components.

Structure example:

```
components/
├── ui/
├── layout/
├── forms/
├── navigation/
├── dashboard/
└── shared/
```

Keep components focused on a single responsibility.

---

# Page Structure

Organize pages by feature.

Example:

```
app/

dashboard/

products/

orders/

settings/
```

Avoid unnecessary nesting.

---

# State Management

Use the simplest appropriate solution.

Priority:

1. Local State
2. Context
3. Server State
4. Global State

Avoid unnecessary global state.

---

# Forms

Every form should include:

- Validation
- Error Messages
- Loading State
- Success State
- Accessibility Support

Never trust client validation alone.

---

# Responsive Design

Support:

- Mobile
- Tablet
- Desktop

Verify:

- Layout
- Typography
- Navigation
- Images
- Tables

---

# Accessibility

Ensure:

- Semantic HTML
- Keyboard Navigation
- ARIA Labels
- Focus States
- Color Contrast

Target WCAG AA compliance.

---

# Performance

Optimize:

- Images
- Fonts
- Code Splitting
- Lazy Loading
- Bundle Size
- Rendering

Measure before optimizing.

---

# Error Handling

Provide:

- Error Boundaries
- Empty States
- Loading Indicators
- Retry Options
- Friendly Messages

Never expose technical errors directly.

---

# Code Quality

Requirements:

- TypeScript Strict Mode
- ESLint
- Prettier
- Reusable Components
- Clear Naming
- Small Functions

---

# Testing

Verify:

- Rendering
- User Interaction
- Form Validation
- Navigation
- Responsive Layout
- Accessibility

---

# Workflow

```
Review Architecture

↓

Review Design

↓

Create Components

↓

Build Pages

↓

Implement State

↓

Implement Forms

↓

Responsive Review

↓

Accessibility Review

↓

Testing

↓

Ready for Backend Integration
```

---

# Outputs

Generate:

- Frontend Components
- Pages
- Layouts
- Forms
- Responsive UI
- Test Results

---

# Validation Checklist

Before completion verify:

- Components reusable
- Responsive layouts complete
- Accessibility verified
- No TypeScript errors
- Lint passes
- Tests pass

---

# Failure Conditions

Stop and request clarification if:

- Design is incomplete
- API contract is missing
- Architecture conflicts exist
- Business rules are unclear
- Required assets are unavailable

---

# Rules

- Follow the Design System.
- Prefer composition over duplication.
- Keep components reusable.
- Write readable code.
- Optimize only after correctness.

---

# Success Criteria

This skill succeeds when:

- UI matches approved designs
- components are reusable
- responsive behavior is correct
- accessibility standards are met
- frontend is ready for backend integration

---

# Next Skills

Invoke:

```
backend

↓

api

↓

integration
```

---

# Related Skills

- architecture
- ui-design
- design-system
- prototype
- backend
- api

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |