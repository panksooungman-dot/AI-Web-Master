---
name: {{name}}
description: {{description}}
version: {{version}}
author: {{author}}
category: agent
status: draft
createdAt: {{createdAt}}
---

# {{className}}

## Purpose

Describe the responsibility of the `{{name}}` agent.

---

# When to Use

Execute when:

- TODO

---

# Capabilities

- TODO

---

# Inputs

Expected inputs:

- TODO

---

# Outputs

Generates:

- TODO

---

# Rules

- TODO

---

# Success Criteria

This agent succeeds when:

- TODO

---

# Prompt Files

- `system.md` — the system prompt (required, rendered by the Prompt Engine)
- `user.md` — per-run user turn template (optional)
- `examples.md` — few-shot examples (optional, omitted from the prompt if empty)
- `prompt.json` — prompt version/author metadata

# Tools

Declare tools this agent may use in `agent.json`'s `"tools"` array, e.g.
`["filesystem", "terminal", "git"]`. Run `ai tools list` to see all available tools.
