# Marketplace Prompts

## Overview

The `prompts` marketplace contains reusable Prompt packages for AI Business OS.

Each Prompt package provides standardized instructions that guide AI behavior for specific tasks such as planning, coding, reviewing, testing, documenting, and analysis.

Prompt packages are versioned, reusable, and designed to be shared across projects.

---

# Purpose

Provide a centralized repository of reusable Prompt templates that improve consistency, quality, and productivity.

---

# Prompt Categories

## Planning

- Business Planning
- Product Planning
- Project Planning
- Roadmap Planning

---

## Development

- Code Generation
- Refactoring
- Debugging
- Optimization

---

## Review

- Code Review
- Architecture Review
- Security Review
- Documentation Review

---

## Testing

- Unit Testing
- Integration Testing
- E2E Testing
- QA Validation

---

## Documentation

- Technical Writing
- API Documentation
- User Guides
- Release Notes

---

# Package Structure

Every Prompt package should follow this structure.

```text
prompt-name/
│
├── README.md
├── prompt.md
├── manifest.json
├── config.yaml
├── examples/
├── changelog.md
└── LICENSE
```

---

# Package Metadata

Each Prompt package should define:

- Name
- Description
- Version
- Category
- Author
- Supported Models
- Tags
- License
- Dependencies

Example:

```json
{
  "name": "coder",
  "version": "1.0.0",
  "category": "development",
  "author": "AI Business OS",
  "license": "MIT"
}
```

---

# Prompt Components

Every Prompt should include:

- Objective
- Instructions
- Input Format
- Output Format
- Constraints
- Best Practices
- Examples

---

# Installation Workflow

```text
Browse Marketplace

↓

Select Prompt

↓

Validate Compatibility

↓

Install Package

↓

Register Prompt

↓

Ready for Use
```

---

# Versioning

Use Semantic Versioning.

```text
MAJOR.MINOR.PATCH
```

Example:

```text
1.0.0
1.2.0
2.0.0
```

---

# Compatibility

Each Prompt package should specify:

- AI Business OS version
- Compatible Agents
- Required Skills
- Optional MCP integrations
- Supported AI models

---

# Quality Requirements

Every Prompt package should:

- Be reusable
- Be clearly documented
- Produce deterministic outputs
- Include usage examples
- Follow repository standards
- Be independently testable

---

# Best Practices

Always:

- Write clear instructions.
- Keep prompts focused.
- Define expected outputs.
- Minimize ambiguity.
- Include practical examples.
- Maintain version history.

Never:

- Mix unrelated objectives.
- Depend on project-specific assumptions.
- Omit constraints.
- Leave outputs undefined.

---

# Publishing Checklist

Before publishing:

- Documentation completed
- Prompt validated
- Examples tested
- Metadata updated
- Version incremented
- Changelog updated
- Manifest verified

---

# Success Criteria

A Prompt package is successful when:

- It is reusable across projects.
- Outputs are consistent.
- Documentation is complete.
- Examples are reproducible.
- Version compatibility is clear.
- It integrates seamlessly with AI Business OS.

---

# Related Documents

- marketplace/README.md
- marketplace/agents/README.md
- marketplace/skills/README.md
- prompts/README.md
- release.md

---

# Version

AI Business OS v1.1