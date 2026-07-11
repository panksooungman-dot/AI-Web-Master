# Agent Packages

## Overview

The `agents` directory contains reusable AI agent packages for AI Business OS.

Each agent package represents a specialized AI role with its own prompts, skills, configuration, examples, and tests.

Agent packages are designed to be modular, versioned, and installable through the AI Business OS CLI and Marketplace.

---

# Purpose

Provide reusable AI agents that can be installed, configured, and shared across projects.

---

# Objectives

- Modular AI agents
- Independent versioning
- Easy installation
- Marketplace compatibility
- CLI integration
- Reusable configurations

---

# Directory Structure

```text
packages/agents/
│
├── README.md
│
├── backend-engineer/
├── frontend-engineer/
├── fullstack-engineer/
├── ai-engineer/
├── qa-engineer/
├── devops-engineer/
├── security-engineer/
├── data-engineer/
├── product-manager/
└── uiux-designer/
```

---

# Standard Agent Structure

Every agent package should follow this layout:

```text
backend-engineer/
│
├── README.md
├── package.json
├── manifest.json
├── agent.md
├── prompt.md
├── config.yaml
├── examples/
├── tests/
└── CHANGELOG.md
```

---

# Package Components

## README.md

Describes the agent's purpose, capabilities, and usage.

---

## package.json

Contains package metadata.

Example:

```json
{
  "name": "@ai-business-os/backend-engineer",
  "version": "1.0.0"
}
```

---

## manifest.json

Defines package information for the Marketplace.

Includes:

- Name
- Version
- Author
- Dependencies
- Supported Platforms

---

## agent.md

Defines the AI agent's behavior.

Examples:

- Role
- Responsibilities
- Goals
- Constraints

---

## prompt.md

Contains the system prompt used by the agent.

---

## config.yaml

Defines configurable options.

Examples:

- Temperature
- Model
- Tools
- Permissions

---

## examples/

Contains example conversations and workflows.

---

## tests/

Contains validation tests.

---

## CHANGELOG.md

Tracks package changes.

---

# Supported Agent Types

Recommended agents include:

- Backend Engineer
- Frontend Engineer
- Fullstack Engineer
- AI Engineer
- QA Engineer
- DevOps Engineer
- Security Engineer
- Data Engineer
- Product Manager
- UI/UX Designer

---

# Installation

Install an agent using the CLI.

```bash
ai install backend-engineer
```

---

# Update

```bash
ai update backend-engineer
```

---

# Remove

```bash
ai remove backend-engineer
```

---

# Search

```bash
ai search backend
```

---

# Marketplace Integration

Every agent package should:

- Include a manifest
- Follow semantic versioning
- Provide documentation
- Include examples
- Pass automated tests

---

# Validation Checklist

Before publishing an agent:

- README completed
- Manifest validated
- Prompt reviewed
- Configuration tested
- Examples included
- Tests passing
- Changelog updated

---

# Best Practices

Always:

- Keep agents focused on one responsibility.
- Document capabilities clearly.
- Include practical examples.
- Maintain backward compatibility.
- Follow semantic versioning.

Never:

- Bundle unrelated functionality.
- Include secrets or credentials.
- Skip testing.
- Publish incomplete packages.

---

# Related Documents

- packages/README.md
- packages/skills/README.md
- packages/prompts/README.md
- marketplace/README.md

---

# Version

AI Business OS v1.1