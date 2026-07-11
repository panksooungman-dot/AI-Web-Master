# Template Packages

## Overview

The `templates` directory contains reusable project templates for AI Business OS.

Template packages provide standardized project structures, configuration files, and best practices for quickly bootstrapping new applications.

Templates are modular, versioned, documented, and installable through the AI Business OS CLI and Marketplace.

---

# Purpose

Provide reusable project templates that accelerate development while maintaining consistency across projects.

---

# Objectives

- Standardize project initialization
- Accelerate development
- Encourage best practices
- Support Marketplace distribution
- Integrate with CLI
- Simplify project setup

---

# Directory Structure

```text
packages/templates/
│
├── README.md
│
├── nextjs/
├── react/
├── node/
├── express/
├── nestjs/
├── python/
├── fastapi/
├── ai-saas/
├── microservice/
└── fullstack/
```

---

# Standard Template Structure

Every template package should follow this layout.

```text
nextjs/
│
├── README.md
├── package.json
├── manifest.json
├── template.json
├── config.yaml
├── template/
├── examples/
├── tests/
└── CHANGELOG.md
```

---

# Package Components

## README.md

Describes the template.

Includes:

- Purpose
- Features
- Requirements
- Usage
- Examples

---

## package.json

Contains package metadata.

Example:

```json
{
  "name": "@ai-business-os/nextjs-template",
  "version": "1.0.0"
}
```

---

## manifest.json

Marketplace metadata.

Includes:

- Name
- Version
- Description
- Author
- Dependencies
- Supported Platforms

---

## template.json

Defines installation metadata.

Examples:

- Files
- Variables
- Placeholders
- Dependencies

---

## config.yaml

Stores configurable settings.

Examples:

- Runtime
- Package Manager
- Environment
- Features

---

## template/

Contains the actual project template files.

---

## examples/

Contains example generated projects.

---

## tests/

Validates template generation.

---

## CHANGELOG.md

Tracks template changes.

---

# Supported Template Categories

Recommended templates include:

- Next.js
- React
- Node.js
- Express
- NestJS
- Python
- FastAPI
- AI SaaS
- Microservice
- Fullstack

---

# Installation

Install a template using the CLI.

```bash
ai install nextjs-template
```

---

# Create Project

Generate a new project.

```bash
ai init my-app --template nextjs
```

---

# Update

```bash
ai update nextjs-template
```

---

# Remove

```bash
ai remove nextjs-template
```

---

# Search

```bash
ai search template
```

---

# Marketplace Integration

Every template package should:

- Include a manifest
- Follow semantic versioning
- Provide documentation
- Include examples
- Pass validation tests

---

# Validation Checklist

Before publishing a template:

- README completed
- Manifest validated
- Template tested
- Configuration reviewed
- Examples included
- Tests passing
- Changelog updated

---

# Best Practices

Always:

- Keep templates lightweight.
- Follow current framework conventions.
- Include documentation.
- Provide configurable options.
- Maintain compatibility.
- Test generated projects.

Never:

- Hard-code secrets.
- Include unnecessary files.
- Publish untested templates.
- Break compatibility without version updates.

---

# CLI Integration

Supported commands:

```bash
ai init

ai install <template>

ai update <template>

ai remove <template>

ai search template

ai publish
```

---

# Success Criteria

A template package is successful when:

- Projects are generated successfully.
- Templates are reusable.
- Documentation is complete.
- Marketplace integration works.
- CLI installation is reliable.

---

# Related Documents

- packages/README.md
- packages/agents/README.md
- packages/skills/README.md
- packages/prompts/README.md
- packages/workflows/README.md
- marketplace/README.md

---

# Version

AI Business OS v1.1