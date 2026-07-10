---
name: coding-standards
description: Define coding standards, naming conventions, formatting rules, code quality expectations, and maintainability principles across all software projects.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Coding Standards

## Purpose

This skill establishes consistent coding standards that improve readability, maintainability, quality, and collaboration across all software projects.

These standards are language-agnostic and should be adapted to each project's ecosystem.

---

# When to Use

Execute when:

- Starting a new project
- Writing production code
- Reviewing pull requests
- Refactoring existing code
- Defining engineering guidelines
- Onboarding new developers

---

# Objectives

Ensure code is:

- Readable
- Consistent
- Maintainable
- Testable
- Secure
- Easy to review

---

# Inputs

Expected inputs:

- Project Requirements
- Architecture Guidelines
- Programming Language
- Framework Conventions
- Team Standards

---

# Naming Conventions

Use meaningful names for:

- Variables
- Constants
- Functions
- Methods
- Classes
- Interfaces
- Files
- Directories

Avoid abbreviations unless they are industry standard.

---

# Code Organization

Organize code into:

- Modules
- Packages
- Components
- Services
- Utilities
- Configuration
- Tests

Follow the Single Responsibility Principle.

---

# Formatting Standards

Maintain consistent:

- Indentation
- Line Length
- Blank Lines
- Import Order
- File Structure
- Comment Style

Automate formatting with project-approved tools.

---

# Documentation

Document:

- Public APIs
- Complex Business Logic
- Configuration
- Architectural Decisions
- Usage Examples

Prefer self-documenting code over excessive comments.

---

# Error Handling

Ensure:

- Exceptions are meaningful
- Errors are logged appropriately
- Sensitive information is never exposed
- Failures are handled gracefully

---

# Code Quality

Require:

- Small Functions
- Low Cyclomatic Complexity
- High Cohesion
- Loose Coupling
- Minimal Duplication

Refactor continuously to improve maintainability.

---

# Testing

Code should include:

- Unit Tests
- Integration Tests
- Meaningful Test Names
- Deterministic Test Data

Design code to be testable from the beginning.

---

# Code Review Checklist

Verify:

- Naming conventions followed
- Formatting consistent
- Business logic correct
- Tests included
- Documentation updated
- Security considerations addressed

---

# Validation Checklist

Before completion verify:

- Linter passes
- Formatter applied
- Tests pass
- No duplicated code
- Documentation updated
- Static analysis completed

---

# Failure Conditions

Stop if:

- Standards conflict
- Code is inconsistent
- Tests are missing
- Documentation is incomplete
- Security concerns are unresolved

---

# Outputs

Generate:

- Coding Standards Guide
- Review Checklist
- Naming Convention Guide
- Quality Checklist

---

# Rules

- Prefer readability over cleverness.
- Keep functions focused.
- Eliminate duplicated logic.
- Use automated formatting.
- Treat code reviews as mandatory.

---

# Success Criteria

This skill succeeds when:

- code is easy to understand
- style is consistent across the project
- maintenance costs are reduced
- reviews are efficient
- software quality continuously improves

---

# Related Skills

- documentation
- testing
- validation
- api-design
- error-handling

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |