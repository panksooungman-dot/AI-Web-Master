# Marketplace Agents

## Overview

The `agents` marketplace contains reusable AI Agent packages for AI Business OS.

Each Agent package encapsulates a specific professional role, including its responsibilities, prompts, skills, configuration, and examples.

Agents are designed to be portable, versioned, and reusable across multiple projects.

---

# Purpose

Provide standardized AI Agent packages that can be installed, configured, and shared between AI Business OS projects.

---

# Agent Categories

## Business

- Business Analyst
- Product Manager
- Project Manager

---

## Architecture

- Solution Architect
- System Architect

---

## Engineering

- Backend Engineer
- Frontend Engineer
- Full Stack Engineer
- AI Engineer
- DevOps Engineer

---

## Quality

- QA Engineer
- Security Engineer

---

## Documentation

- Technical Writer

---

# Package Structure

Every Agent package should follow this structure.

```text
agent-name/
│
├── README.md
├── agent.md
├── manifest.json
├── config.yaml
├── prompts/
├── skills/
├── examples/
├── changelog.md
└── LICENSE
```

---

# Package Metadata

Each Agent package should include:

- Name
- Description
- Version
- Author
- Category
- Supported Models
- Dependencies
- Tags
- License

Example:

```json
{
  "name": "backend-engineer",
  "version": "1.0.0",
  "category": "engineering",
  "author": "AI Business OS",
  "license": "MIT"
}
```

---

# Agent Responsibilities

Every Agent should define:

- Role
- Goals
- Responsibilities
- Inputs
- Outputs
- Constraints
- Best Practices

---

# Required Components

Each package should contain:

- Agent definition
- Prompt templates
- Required skills
- Configuration
- Usage examples
- Documentation

---

# Installation Workflow

```text
Browse Marketplace

↓

Select Agent

↓

Validate Compatibility

↓

Install Package

↓

Configure Settings

↓

Register Agent

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
1.1.0
2.0.0
```

---

# Compatibility

Every package should specify:

- AI Business OS version
- Required Skills
- Required Prompts
- Required MCP integrations
- Optional dependencies

---

# Quality Requirements

Every Agent package should:

- Follow repository conventions
- Include complete documentation
- Be independently reusable
- Pass validation
- Include examples
- Maintain backward compatibility when possible

---

# Best Practices

Always:

- Keep responsibilities focused.
- Minimize dependencies.
- Document configuration options.
- Include real-world examples.
- Update changelog after releases.
- Maintain consistent versioning.

---

# Publishing Checklist

Before publishing:

- Documentation completed
- Configuration validated
- Examples tested
- Dependencies verified
- Version updated
- Changelog updated
- Manifest validated

---

# Success Criteria

An Agent package is successful when:

- It can be installed independently.
- Configuration is straightforward.
- Documentation is complete.
- Examples are reproducible.
- Version compatibility is clear.
- It integrates cleanly with AI Business OS.

---

# Related Documents

- marketplace/README.md
- marketplace/prompts/README.md
- marketplace/skills/README.md
- agents/README.md
- release.md

---

# Version

AI Business OS v1.1