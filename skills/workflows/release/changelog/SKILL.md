---
name: changelog
description: Maintain a structured, accurate, and versioned changelog that records all notable changes made to the project across releases.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Changelog

## Purpose

This skill defines how project changes are documented across releases.

The objective is to provide a clear historical record of features, fixes, improvements, and breaking changes for developers, operators, and stakeholders.

The changelog should be human-readable and consistently maintained.

---

# When to Use

Execute after:

- release/maintenance

Execute before:

- release/release-note

---

# Objectives

Maintain a changelog that is:

- Accurate
- Complete
- Versioned
- Consistent
- Easy to understand

---

# Inputs

Expected inputs:

- Git History
- Pull Requests
- Release Reports
- Bug Fix Reports
- Feature Requests
- Maintenance Reports

---

# Changelog Format

Follow a consistent structure.

```text
## [Version] - YYYY-MM-DD

### Added

### Changed

### Fixed

### Removed

### Deprecated

### Security
```

Follow semantic versioning where applicable.

---

# Change Categories

Record:

- New Features
- Improvements
- Bug Fixes
- Performance Optimizations
- Security Updates
- Dependency Updates
- Breaking Changes
- Documentation Updates

---

# Versioning

Document:

- Version Number
- Release Date
- Release Type
- Compatibility Notes

Example:

```text
v1.2.0

Minor Release

Backward Compatible
```

---

# Breaking Changes

When applicable include:

- Description
- Migration Guide
- Impact
- Required Actions

Never hide breaking changes.

---

# Security Updates

Record:

- Vulnerability Fixes
- Dependency Updates
- Authentication Changes
- Authorization Changes

Avoid exposing sensitive implementation details.

---

# Documentation

Reference:

- Related Pull Requests
- Issues
- Milestones
- Release Notes

Maintain traceability.

---

# Workflow

```text
Collect Changes

↓

Classify Changes

↓

Assign Version

↓

Write Changelog

↓

Review Accuracy

↓

Publish

↓

Link Release Notes
```

---

# Outputs

Generate:

- CHANGELOG.md
- Version History
- Migration Notes
- Compatibility Summary

---

# Validation Checklist

Before completion verify:

- Version assigned
- All notable changes included
- Breaking changes documented
- Security updates listed
- Format consistent

---

# Failure Conditions

Stop publication if:

- Version is undefined
- Breaking changes are undocumented
- Release history is incomplete
- Significant fixes are omitted

---

# Rules

- Record notable changes only.
- Keep entries concise and factual.
- Maintain chronological order.
- Never rewrite published history.
- Ensure traceability to implementation.

---

# Success Criteria

This skill succeeds when:

- every release has an accurate changelog
- users can understand what changed
- migration requirements are documented
- release history remains consistent

---

# Next Skills

```text
release-note
```

---

# Related Skills

- maintenance
- deployment
- release-note
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |