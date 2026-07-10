# AI Business OS Prompt Library

## Overview

The `prompts` directory contains the standardized prompt definitions used by AI Business OS.

Each prompt provides consistent instructions for a specific role or workflow and is designed to work together with the Agent, Memory, and Orchestration layers.

---

# Objectives

- Standardize AI interactions
- Improve response consistency
- Reduce prompt duplication
- Support multi-agent workflows
- Maintain reusable prompt templates

---

# Prompt Architecture

Business Request

↓

System Prompt

↓

Role Prompt

↓

Task Prompt

↓

Execution

↓

Validation

↓

Response

---

# Available Prompts

| Prompt | Purpose |
|---------|---------|
| system.md | Global AI behavior and operating rules |
| planner.md | Business planning and product planning |
| coder.md | Software development and implementation |
| reviewer.md | Architecture and code review |
| tester.md | Quality assurance and testing |
| documenter.md | Documentation generation |

---

# Prompt Categories

## System

Defines the global operating rules for AI Business OS.

## Planning

Supports requirement analysis and product planning.

## Development

Supports implementation and coding activities.

## Review

Supports architecture validation and code review.

## Testing

Supports software quality assurance.

## Documentation

Supports technical writing and knowledge management.

---

# Design Principles

Every prompt should be:

- Clear
- Consistent
- Reusable
- Modular
- Versioned
- Easy to maintain

---

# Integration

The Prompt Library works together with:

```
agents/
```

Defines AI roles.

```
skills/
```

Defines AI capabilities.

```
memory/
```

Defines retained knowledge.

```
orchestration/
```

Defines workflow coordination.

---

# Prompt Lifecycle

Request

↓

Context Collection

↓

Prompt Selection

↓

Execution

↓

Validation

↓

Output

↓

Memory Update

---

# Version

AI Business OS v1.1