# Supabase MCP Integration

## Overview

The Supabase MCP server enables AI Business OS to securely interact with Supabase services, including Authentication, PostgreSQL, Storage, Edge Functions, and Realtime.

It provides AI Agents with a standardized interface for managing application data while maintaining security, consistency, and auditability.

---

# Purpose

Provide secure and standardized access to Supabase resources for application development, automation, and AI-powered workflows.

---

# Capabilities

The Supabase MCP server supports:

- Authentication
- User Management
- Database Operations
- Storage Management
- Edge Functions
- Realtime Subscriptions
- Row Level Security (RLS)
- SQL Execution

---

# Supported Services

## Authentication

- User Registration
- Email Login
- OAuth Login
- Password Reset
- Session Management
- Role Assignment

---

## Database

- Create Tables
- Read Data
- Insert Records
- Update Records
- Delete Records
- Execute SQL
- Manage Views

---

## Storage

- Upload Files
- Download Files
- Delete Files
- Organize Buckets
- Generate Signed URLs

---

## Edge Functions

- Deploy Functions
- Invoke Functions
- Monitor Execution
- Update Functions

---

## Realtime

- Database Events
- Presence
- Broadcast Messages
- Live Synchronization

---

# AI Agent Responsibilities

| Agent | Supabase Usage |
|--------|----------------|
| Backend Engineer | Database schema and APIs |
| Frontend Engineer | Authentication and client integration |
| AI Engineer | AI session storage and embeddings |
| DevOps Engineer | Environment configuration |
| QA Engineer | Test data validation |
| Technical Writer | Document database structure |

---

# Standard Workflow

```text
User Request

↓

Authenticate

↓

Validate Permissions

↓

Execute Database Operation

↓

Validate Results

↓

Update Memory

↓

Return Response
```

---

# Database Guidelines

Always:

- Normalize data where appropriate.
- Use foreign keys.
- Create indexes for frequent queries.
- Apply Row Level Security (RLS).
- Validate all inputs.

Never:

- Disable RLS in production.
- Store sensitive secrets in tables.
- Expose internal identifiers unnecessarily.
- Skip migration tracking.

---

# Authentication Policy

Supported methods:

- Email & Password
- Magic Link
- Google OAuth
- GitHub OAuth

Always:

- Verify user identity.
- Refresh expired sessions.
- Enforce secure authentication flows.

---

# Storage Policy

Recommended buckets:

```text
storage/

├── avatars/
├── documents/
├── uploads/
├── exports/
└── backups/
```

Rules:

- Organize by purpose.
- Restrict access with policies.
- Remove unused files.
- Generate signed URLs for private content.

---

# Security Guidelines

Always:

- Enable Row Level Security.
- Validate user permissions.
- Encrypt sensitive data.
- Use environment variables.
- Audit important operations.

Never:

- Store API keys in source code.
- Disable authentication.
- Expose service role keys.
- Bypass authorization checks.

---

# Migration Strategy

Use version-controlled migrations.

Recommended process:

```text
Schema Change

↓

Migration File

↓

Review

↓

Apply to Development

↓

Testing

↓

Production Deployment
```

---

# Backup Strategy

Perform:

- Automated database backups
- Storage backups
- Migration backups

Verify backup integrity regularly.

---

# Error Handling

If an operation fails:

1. Validate authentication.
2. Check database connectivity.
3. Verify permissions.
4. Retry transient failures.
5. Log the error.
6. Notify the responsible Agent.

---

# Best Practices

- Keep schemas modular.
- Use typed database clients.
- Minimize direct SQL when abstractions exist.
- Separate development and production environments.
- Keep migrations small and reversible.
- Monitor query performance.

---

# Success Criteria

Supabase integration is successful when:

- Authentication works reliably.
- Database operations are secure.
- Storage access is controlled.
- Edge Functions execute successfully.
- Realtime updates are synchronized.
- All operations are auditable.

---

# Related Documents

- mcp/README.md
- mcp/postgres.md
- memory/coding-memory.md
- orchestration/execution-policy.md
- prompts/coder.md

---

# Version

AI Business OS v1.1