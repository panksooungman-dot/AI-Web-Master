---
name: changelog
description: Create structured and versioned changelogs that clearly document additions, changes, fixes, deprecations, removals, and security updates for every release.
version: 1.0.0
author: AI Business OS
license: MIT
category: template
priority: required
---

# Changelog

## Purpose

This skill creates standardized changelogs that document software evolution across releases.

The changelog provides developers, operators, and users with a complete history of product changes while supporting release management and traceability.

---

# When to Use

Execute when:

- Publishing a new release
- Completing a sprint
- Deploying a hotfix
- Shipping a major version
- Preparing release documentation
- Tracking project history

---

# Objectives

Produce changelogs that are:

- Accurate
- Versioned
- Traceable
- Consistent
- Easy to read

---

# Inputs

Expected inputs:

- Release Version
- Git Commits
- Pull Requests
- User Stories
- Bug Reports
- Release Notes

---

# Changelog Structure

Generate the following sections:

- Version
- Release Date
- Summary
- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security
- Migration Notes
- References

Follow the Keep a Changelog format whenever practical.

---

# Added

Document:

- New Features
- New APIs
- New Integrations
- New Documentation

Describe customer-facing value.

---

# Changed

Include:

- Updated Features
- Performance Improvements
- UI Enhancements
- Configuration Changes

Explain significant behavior changes.

---

# Deprecated

List:

- Features scheduled for removal
- APIs being replaced
- Configuration changes

Provide migration guidance.

---

# Removed

Document:

- Deleted Features
- Removed APIs
- Unsupported Platforms
- Obsolete Components

Clearly identify breaking changes.

---

# Fixed

Include:

- Bug Fixes
- Stability Improvements
- Reliability Fixes
- Compatibility Issues

Reference related issue IDs when available.

---

# Security

Describe:

- Security Fixes
- Dependency Updates
- Vulnerability Mitigations
- Compliance Improvements

Highlight high-impact changes.

---

# Validation Checklist

Verify:

- Version number correct
- Release date recorded
- Categories complete
- Breaking changes identified
- Migration notes included
- References verified

---

# Failure Conditions

Stop if:

- Version is undefined
- Changes are incomplete
- Release scope is unclear
- Breaking changes are undocumented
- Security updates are omitted

---

# Outputs

Generate:

- Changelog
- Version Summary
- Migration Notes
- Change History

---

# Rules

- Record changes for every release.
- Use consistent categories.
- Describe changes from the user's perspective.
- Keep entries concise.
- Never omit breaking changes.

---

# Success Criteria

This skill succeeds when:

- release history is complete
- changes are easy to understand
- migration risks are minimized
- teams can trace product evolution

---

# Related Skills

- release-note
- technical-writer
- project-plan
- test-plan
- runbook

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |