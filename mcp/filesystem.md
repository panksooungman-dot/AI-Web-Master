# Filesystem MCP Integration

## Overview

The Filesystem MCP server enables AI Business OS to securely access and manage local project files and directories.

It provides standardized capabilities for reading, writing, creating, organizing, and maintaining project resources while preserving security, consistency, and traceability.

---

# Purpose

Provide controlled filesystem access for AI Agents to support software development, documentation, automation, and project maintenance.

---

# Capabilities

The Filesystem MCP server supports:

- Read files
- Create files
- Update files
- Delete files
- Rename files
- Move files
- Search files
- Create directories
- Delete directories
- List directory contents

---

# Supported Operations

## File Management

- Read file
- Create file
- Update file
- Delete file
- Rename file
- Copy file
- Move file

---

## Directory Management

- Create directory
- Remove directory
- Rename directory
- Browse directory
- Search directory

---

## Search

- Find by filename
- Find by extension
- Full-text search
- Recursive search

---

## Metadata

- File size
- Last modified
- Permissions
- File type

---

# AI Agent Responsibilities

| Agent | Filesystem Usage |
|--------|------------------|
| Business Analyst | Create requirement documents |
| Product Manager | Maintain planning documents |
| Solution Architect | Organize architecture artifacts |
| Backend Engineer | Create backend source files |
| Frontend Engineer | Create UI components |
| AI Engineer | Maintain AI configuration and prompts |
| DevOps Engineer | Manage deployment files |
| QA Engineer | Store test cases and reports |
| Technical Writer | Create and update documentation |

---

# Standard Workflow

```text
User Request

↓

Locate Target Directory

↓

Validate Permissions

↓

Read Existing Files

↓

Create / Modify Files

↓

Validate Changes

↓

Save Changes

↓

Update Memory
```

---

# Recommended Directory Structure

```text
project/
│
├── agents/
├── prompts/
├── memory/
├── orchestration/
├── skills/
├── docs/
├── app/
├── components/
├── lib/
├── tests/
└── public/
```

---

# File Naming Conventions

## Documentation

```text
kebab-case.md
```

Example:

```text
project-memory.md
execution-policy.md
```

---

## Source Code

```text
PascalCase.tsx
camelCase.ts
```

Examples:

```text
UserCard.tsx
createUser.ts
```

---

## Configuration

```text
lowercase.ext
```

Examples:

```text
package.json
tsconfig.json
docker-compose.yml
```

---

# File Operation Policy

Before modifying a file:

1. Verify file exists.
2. Check permissions.
3. Read current contents.
4. Preserve formatting.
5. Apply minimal changes.
6. Validate syntax.
7. Save updates.

---

# Directory Policy

Always:

- Keep folders modular.
- Follow repository structure.
- Group related files.
- Remove obsolete artifacts.
- Maintain clean organization.

Never:

- Create duplicate directories.
- Mix unrelated resources.
- Store temporary files permanently.
- Break repository conventions.

---

# Security Guidelines

Always:

- Validate file paths.
- Restrict access to project scope.
- Protect sensitive files.
- Verify write permissions.
- Log significant operations.

Never:

- Modify system files.
- Access unauthorized locations.
- Store secrets in plain text.
- Delete critical project files without approval.

---

# Error Handling

If a filesystem operation fails:

1. Validate the target path.
2. Check permissions.
3. Verify file existence.
4. Retry when appropriate.
5. Record the failure.
6. Notify the responsible Agent.

---

# Best Practices

- Make incremental changes.
- Keep directory structures organized.
- Avoid unnecessary file creation.
- Reuse existing resources.
- Validate files before saving.
- Keep documentation synchronized.

---

# Audit Policy

Record:

- Operation type
- File path
- Timestamp
- Responsible Agent
- Result
- Errors encountered

All audit records should be traceable.

---

# Related Documents

- mcp/README.md
- mcp/github.md
- memory/project-memory.md
- orchestration/execution-policy.md
- prompts/documenter.md

---

# Version

AI Business OS v1.1