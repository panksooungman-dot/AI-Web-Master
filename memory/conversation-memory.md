# Conversation Memory

## Overview

Conversation Memory stores the evolving context of interactions between users and AI Business OS.

It preserves task history, active discussions, unresolved questions, assumptions, and contextual information required for consistent multi-turn collaboration.

This memory is continuously updated throughout the project lifecycle.

---

# Purpose

Maintain conversation continuity and prevent loss of context between interactions.

---

# Memory Scope

Conversation Memory captures:

- Active discussions
- User requests
- Task history
- Completed work
- Pending work
- Context references
- Follow-up actions
- Clarifications

---

# Memory Structure

## Active Context

Current objective being discussed.

---

## Recent Tasks

Record recently completed tasks.

Example:

- Repository structure completed
- Skills completed
- Agents completed
- Prompts completed

---

## Current Task

Describe the task currently in progress.

Example:

Memory System Documentation

---

## Pending Tasks

List work that has not yet been completed.

Example:

- decision-memory.md
- coding-memory.md
- knowledge-memory.md
- orchestration/

---

## User Intent

Summarize the user's current objective.

---

## Important Context

Store information required for future responses.

Examples:

- Preferred architecture
- Naming conventions
- Documentation standards
- Workflow preferences

---

## Assumptions

Record validated assumptions only.

Each assumption should include:

- Description
- Validation status
- Source

---

## Questions Requiring Follow-up

List unresolved questions.

Example:

| Question | Status |
|----------|--------|
| Example | Pending |

---

## References

Important documents referenced during the conversation.

Examples:

- agents/
- prompts/
- memory/
- orchestration/

---

# Memory Update Rules

Update this memory when:

- A task is completed.
- A new task begins.
- Requirements change.
- Important context is discovered.
- User priorities change.
- Project direction changes.

---

# Retrieval Rules

When retrieving conversation memory:

1. Prefer the most recent validated context.
2. Preserve chronological order.
3. Ignore obsolete information.
4. Highlight unresolved items.
5. Maintain consistency with project memory.

---

# Retention Policy

Retain:

- Current objectives
- Active work
- Important discussions
- Decisions
- Action items

Archive:

- Completed conversations
- Resolved issues
- Obsolete context

---

# Quality Guidelines

Conversation memory should be:

- Accurate
- Current
- Concise
- Actionable
- Consistent
- Chronological

---

# Constraints

Never:

- Store unverified assumptions.
- Duplicate project memory.
- Preserve outdated context.
- Modify historical records without explanation.

---

# Related Documents

- memory/README.md
- memory/project-memory.md
- memory/decision-memory.md
- prompts/system.md
- agents/README.md

---

# Version

AI Business OS v1.1