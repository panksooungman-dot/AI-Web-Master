---
name: accessibility
description: Evaluate and improve application accessibility to ensure people with diverse abilities can effectively use the product while meeting recognized accessibility standards.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Accessibility

## Purpose

This skill ensures the application is accessible to all users, including people with disabilities.

The objective is to identify accessibility barriers, improve usability, and verify compliance with recognized accessibility standards before release.

Accessibility should be integrated throughout the product, not added afterward.

---

# When to Use

Execute after:

- quality/performance

Execute before:

- bug-triage
- regression-testing
- release/deployment

---

# Objectives

Verify the application is:

- Perceivable
- Operable
- Understandable
- Robust
- Inclusive

---

# Inputs

Expected inputs:

- UI Design
- Prototype
- Frontend Application
- Design System
- Test Results

---

# Accessibility Standards

Evaluate against:

- WCAG 2.2 AA
- Semantic HTML
- ARIA Best Practices
- Platform Accessibility Guidelines

Apply project-specific compliance requirements where necessary.

---

# Keyboard Accessibility

Verify:

- Full keyboard navigation
- Logical tab order
- Visible focus indicators
- Keyboard shortcuts (if applicable)
- No keyboard traps

Users should be able to complete all primary tasks without a mouse.

---

# Screen Reader Support

Check:

- Semantic elements
- Accessible names
- Labels
- Headings
- Landmark regions
- Live regions
- Alternative text

Ensure meaningful reading order.

---

# Visual Accessibility

Verify:

- Color contrast
- Font readability
- Text resizing
- Zoom support
- Responsive layouts
- Focus visibility

Never rely on color alone to convey information.

---

# Forms

Ensure forms provide:

- Labels
- Instructions
- Error messages
- Validation feedback
- Required field indicators
- Accessible controls

Errors should clearly explain how to recover.

---

# Multimedia

Review:

- Captions
- Transcripts
- Audio controls
- Video controls
- Alternative descriptions

Provide accessible alternatives whenever possible.

---

# Interaction Review

Validate:

- Buttons
- Links
- Menus
- Dialogs
- Tables
- Carousels
- Drag-and-drop interactions

Interactive elements must be accessible.

---

# Automated & Manual Testing

Use:

- Automated accessibility scanners
- Keyboard-only testing
- Screen reader testing
- Manual inspection

Automated testing does not replace manual review.

---

# Workflow

```text
Review UI

↓

Run Automated Checks

↓

Keyboard Testing

↓

Screen Reader Testing

↓

Manual Review

↓

Document Issues

↓

Verify Fixes

↓

Approve Accessibility
```

---

# Outputs

Generate:

- Accessibility Report
- WCAG Compliance Checklist
- Issue List
- Improvement Recommendations
- Approval Status

---

# Validation Checklist

Before completion verify:

- Keyboard navigation works
- Screen readers supported
- Contrast requirements met
- Forms accessible
- Interactive elements verified
- Critical accessibility issues resolved

---

# Failure Conditions

Stop and require remediation if:

- Users cannot complete key tasks with assistive technologies
- Keyboard navigation fails
- Critical WCAG violations exist
- Important content is inaccessible
- Focus management is broken

---

# Rules

- Design for inclusion from the beginning.
- Use semantic HTML whenever possible.
- Never rely solely on automated tools.
- Prioritize barriers that block task completion.
- Accessibility is a release requirement.

---

# Success Criteria

This skill succeeds when:

- WCAG requirements are satisfied
- critical accessibility barriers are removed
- assistive technologies function correctly
- the application is ready for final quality review

---

# Next Skills

```text
bug-triage

↓

regression-testing
```

---

# Related Skills

- testing
- performance
- security-review
- bug-triage
- regression-testing
- ui-design

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |