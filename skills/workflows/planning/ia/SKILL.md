---
name: ia
description: Design the Information Architecture (IA) for the project by organizing pages, navigation, content hierarchy, and relationships based on the approved PRD and User Stories.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Information Architecture (IA)

## Purpose

This skill transforms business requirements and user stories into a structured Information Architecture.

The goal is to define how information, pages, and navigation are organized before UI design begins.

IA focuses on structure, not visual design.

---

# When to Use

Execute after:

- planning/prd
- planning/user-story

Execute before:

- planning/user-flow
- planning/feature-planning
- design/figma

---

# Objectives

Create a logical information structure that:

- organizes all pages
- defines navigation
- groups related content
- reduces user complexity
- supports future scalability

---

# Inputs

Expected inputs:

- Product Requirements Document
- User Stories
- Requirement Specification
- Reference Analysis
- Business Goals

---

# IA Deliverables

Generate:

- Sitemap
- Navigation Structure
- Page Hierarchy
- Feature Mapping
- Content Hierarchy
- Module Relationships

---

# Sitemap

Identify every page.

Example:

Home

Products

Product Detail

Cart

Checkout

Order History

Profile

Admin Dashboard

Settings

---

# Navigation

Define:

- Primary Navigation
- Secondary Navigation
- Footer Navigation
- Breadcrumb Structure

Navigation should minimize user effort.

---

# Page Hierarchy

Organize pages into levels.

Example

```
Home
├── Products
│   ├── Category
│   └── Product Detail
├── Cart
├── Checkout
└── Account
    ├── Orders
    └── Profile
```

---

# Content Hierarchy

For each page identify:

- Primary Content
- Secondary Content
- Supporting Information
- User Actions

---

# Feature Mapping

Map features to pages.

Example:

Search

→ Products

Cart

→ Cart

Checkout

→ Checkout

Order Management

→ Account

---

# User Roles

Identify page access.

Examples:

- Guest
- Customer
- Administrator
- Manager

Document permissions for each role.

---

# Relationships

Identify relationships between:

- Pages
- Features
- Data
- User Roles

---

# IA Workflow

```
Review PRD

↓

Review User Stories

↓

Identify Pages

↓

Organize Hierarchy

↓

Define Navigation

↓

Map Features

↓

Review Structure

↓

Approve

↓

Pass to User Flow
```

---

# Outputs

Generate:

- Sitemap
- IA Diagram
- Navigation Map
- Page List
- Content Structure
- Feature Mapping

---

# Rules

- Focus on information organization.
- Keep navigation intuitive.
- Minimize page depth.
- Avoid duplicate content.
- Use consistent naming.
- Design for scalability.

---

# Success Criteria

This skill succeeds when:

- every feature has a page
- navigation is clear
- page hierarchy is logical
- user roles are considered
- user flow can be designed without restructuring

---

# Next Skills

Invoke:

```
user-flow

↓

feature-planning
```

---

# Related Skills

- prd
- user-story
- requirement-analysis
- reference-analysis
- ai-business-os-core

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |