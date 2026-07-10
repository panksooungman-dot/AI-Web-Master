---
name: release-note
description: Create clear, concise, and stakeholder-friendly release notes that communicate new features, improvements, fixes, breaking changes, and operational guidance for each release.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Release Note

## Purpose

This skill defines how release notes are prepared and published for each software release.

The objective is to communicate changes clearly to customers, stakeholders, support teams, and internal engineering teams.

Release notes should explain the value of the release rather than simply listing commits.

---

# When to Use

Execute after:

- release/changelog

Execute before:

- Project Completion
- Production Announcement

---

# Objectives

Create release notes that are:

- Clear
- Accurate
- Concise
- User-focused
- Actionable

---

# Inputs

Expected inputs:

- CHANGELOG.md
- Release Report
- Deployment Report
- Product Roadmap
- Git History
- Issue Tracker

---

# Audience

Identify the intended audience:

- Customers
- Internal Teams
- Product Managers
- Developers
- Support Teams
- Executives

Tailor language appropriately.

---

# Release Note Structure

Use the following structure:

```text
Release Version

Release Date

Overview

New Features

Improvements

Bug Fixes

Performance Improvements

Security Updates

Breaking Changes

Migration Notes

Known Issues

Acknowledgements

Support Information
```

---

# Overview

Provide a concise summary including:

- Purpose of the release
- Primary business value
- Major highlights

Keep the overview brief and understandable.

---

# New Features

Describe:

- New capabilities
- Business value
- User benefits

Focus on outcomes rather than implementation details.

---

# Improvements

Summarize:

- UX enhancements
- Performance improvements
- Workflow optimizations
- Operational enhancements

---

# Bug Fixes

Highlight important fixes.

Include:

- User impact
- Affected areas
- Resolution summary

Avoid listing insignificant internal fixes.

---

# Performance

Summarize improvements such as:

- Faster loading
- Lower latency
- Reduced resource usage
- Better scalability

Use measurable improvements when available.

---

# Security Updates

Describe:

- Security enhancements
- Dependency updates
- Authentication improvements
- Compliance improvements

Do not disclose sensitive implementation details.

---

# Breaking Changes

When applicable include:

- Description
- Impact
- Required actions
- Migration guidance

Provide clear upgrade instructions.

---

# Known Issues

List:

- Remaining limitations
- Temporary workarounds
- Planned fixes

Be transparent about unresolved issues.

---

# Support

Provide:

- Documentation references
- Support contacts
- Issue reporting process

Help users know where to get assistance.

---

# Workflow

```text
Review Changelog

↓

Identify Key Changes

↓

Group by Category

↓

Write Overview

↓

Draft Release Notes

↓

Review Accuracy

↓

Publish

↓

Notify Stakeholders
```

---

# Outputs

Generate:

- Release Notes
- Customer Announcement
- Internal Announcement
- Upgrade Guidance
- Support Summary

---

# Validation Checklist

Before publication verify:

- Version number correct
- Dates verified
- Major features included
- Breaking changes documented
- Known issues listed
- Language reviewed

---

# Failure Conditions

Delay publication if:

- Release version is incorrect
- Critical changes are omitted
- Breaking changes are undocumented
- Release status is unapproved
- Stakeholder review is incomplete

---

# Rules

- Write for users, not commit history.
- Focus on business value.
- Keep technical details concise.
- Be transparent about limitations.
- Maintain a consistent format across releases.

---

# Success Criteria

This skill succeeds when:

- stakeholders understand the release
- users know what changed
- upgrade requirements are clear
- support teams have the necessary information
- the release is fully documented

---

# Next Skills

```text
Project Complete

↓

Continuous Improvement

↓

Next Planning Cycle
```

---

# Related Skills

- changelog
- deployment
- monitoring
- maintenance
- documentation
- communication

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |