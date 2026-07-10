---
name: asset-management
description: Organize, optimize, version, and manage all design assets for efficient collaboration between design and development teams.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Asset Management

## Purpose

This skill defines how design assets are created, organized, versioned, optimized, and delivered.

The objective is to ensure every asset is easy to find, reuse, and maintain throughout the project lifecycle.

Assets should always have a single source of truth.

---

# When to Use

Execute after:

- design/prototype

Execute before:

- development/frontend
- development/integration

---

# Objectives

Manage:

- Icons
- Images
- Illustrations
- Logos
- SVGs
- Fonts
- Videos
- Animations
- Lottie Files
- Design Tokens
- Exported Components

---

# Inputs

Expected inputs:

- Figma Workspace
- Design System
- UI Design
- Prototype
- Brand Guidelines

---

# Asset Categories

Organize assets into:

```
Icons

Images

Illustrations

Logos

Typography

Animations

Videos

Design Tokens

Components

Documents
```

---

# Folder Structure

Example

```
assets/

├── icons/
├── images/
├── illustrations/
├── logos/
├── fonts/
├── animations/
├── lottie/
├── videos/
├── exports/
└── tokens/
```

Keep folders simple and predictable.

---

# Naming Convention

Use descriptive names.

Examples:

```
icon-search.svg

logo-primary-dark.svg

hero-home.webp

avatar-default.png

button-primary-hover.svg
```

Avoid names like:

```
image1.png

final-final.png

new-logo.svg
```

---

# Versioning

Track significant changes.

Every asset should include:

- Version
- Author
- Created Date
- Updated Date

Archive obsolete assets instead of deleting immediately.

---

# Optimization

Optimize before delivery.

Verify:

- File Size
- Resolution
- Compression
- Transparency
- Color Profile

Choose appropriate formats:

- SVG for icons
- WebP for images
- PNG when transparency is required
- MP4 for videos
- JSON for Lottie

---

# Export Rules

Prepare exports for:

- Web
- Mobile
- Retina Displays

Ensure consistent scaling.

---

# Design Tokens

Maintain:

- Color Tokens
- Typography Tokens
- Spacing Tokens
- Radius Tokens
- Shadow Tokens

Tokens should remain synchronized with the Design System.

---

# Developer Handoff

Provide:

- Asset Locations
- Export Formats
- Usage Notes
- Licensing Information
- Token Documentation

Developers should not need to request missing assets.

---

# Workflow

```
Review Design Files

↓

Organize Assets

↓

Optimize Files

↓

Export Assets

↓

Version Assets

↓

Document Usage

↓

Validate Delivery

↓

Publish Assets

↓

Pass to Frontend Development
```

---

# Outputs

Generate:

- Organized Asset Library
- Optimized Exports
- Token Package
- Asset Documentation
- Developer Handoff Package

---

# Rules

- Keep one source of truth.
- Never duplicate assets unnecessarily.
- Optimize every exported file.
- Use consistent naming.
- Archive instead of deleting.
- Document licensing where applicable.

---

# Validation Checklist

Before completion verify:

- Assets categorized
- Naming consistent
- Files optimized
- Tokens synchronized
- Documentation completed
- Developer package prepared

---

# Success Criteria

This skill succeeds when:

- all assets are organized
- exports are optimized
- naming is consistent
- developers can immediately use the assets
- design handoff is complete

---

# Next Skills

Invoke:

```
development/architecture

↓

development/frontend
```

---

# Related Skills

- figma
- design-system
- ui-design
- prototype
- frontend
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |