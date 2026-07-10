# PostgreSQL MCP Integration

## Overview

The PostgreSQL MCP server enables AI Business OS to securely interact with PostgreSQL databases for schema management, SQL execution, performance optimization, and operational monitoring.

It provides AI Agents with direct, structured access to relational data while ensuring consistency, security, and auditability.

---

# Purpose

Provide standardized database operations for AI-driven development, maintenance, analytics, and automation.

---

# Capabilities

The PostgreSQL MCP server supports:

- Database Connection
- SQL Execution
- Schema Management
- Migration Support
- Index Management
- Query Optimization
- Transaction Management
- Backup Assistance
- Performance Monitoring

---

# Supported Operations

## Database

- Connect
- Disconnect
- List Databases
- Create Database
- Drop Database

---

## Schema

- Create Schema
- Update Schema
- Drop Schema
- Inspect Schema

---

## Tables

- Create Table
- Alter Table
- Drop Table
- Rename Table
- Inspect Table

---

## Data

- SELECT
- INSERT
- UPDATE
- DELETE
- UPSERT
- BULK INSERT

---

## Query Analysis

- Explain Query
- Analyze Performance
- Detect Slow Queries
- Recommend Indexes

---

## Transactions

- Begin
- Commit
- Rollback
- Savepoint

---

# AI Agent Responsibilities

| Agent | PostgreSQL Usage |
|--------|------------------|
| Solution Architect | Database architecture |
| Backend Engineer | Schema and queries |
| AI Engineer | Embeddings and AI data |
| DevOps Engineer | Database operations |
| QA Engineer | Data validation |
| Technical Writer | Schema documentation |

---

# Standard Workflow

```text
User Request

↓

Validate Connection

↓

Validate Permissions

↓

Inspect Schema

↓

Execute SQL

↓

Validate Results

↓

Commit Transaction

↓

Update Memory
```

---

# Schema Design Guidelines

Always:

- Use primary keys.
- Define foreign keys.
- Normalize where practical.
- Add appropriate indexes.
- Use meaningful table names.
- Store timestamps.

Recommended columns:

```text
id
created_at
updated_at
```

---

# Query Guidelines

Prefer:

- Parameterized queries
- Explicit column selection
- LIMIT when appropriate
- Indexed filtering
- Transactions for updates

Avoid:

- SELECT *
- Nested queries without review
- Long-running transactions
- Cartesian joins
- Duplicate data retrieval

---

# Performance Optimization

Monitor:

- Query execution time
- Index usage
- Table size
- Connection count
- Lock contention

Optimize by:

- Adding indexes
- Removing unused indexes
- Refactoring queries
- Partitioning large tables
- Using materialized views where appropriate

---

# Migration Strategy

Recommended workflow:

```text
Schema Change

↓

Migration Script

↓

Code Review

↓

Development

↓

Testing

↓

Production
```

Every migration should be:

- Version controlled
- Reversible
- Documented

---

# Transaction Policy

Use transactions when:

- Updating multiple tables
- Financial operations
- Critical business logic
- Batch processing

Rollback immediately if validation fails.

---

# Backup Policy

Maintain:

- Daily backups
- Point-in-time recovery
- Schema backups
- Migration history

Regularly test restoration procedures.

---

# Security Guidelines

Always:

- Use least-privilege accounts.
- Encrypt database connections.
- Validate SQL inputs.
- Audit administrative actions.
- Rotate credentials regularly.

Never:

- Execute unreviewed destructive SQL.
- Expose credentials.
- Disable security controls.
- Store secrets in database tables.

---

# Error Handling

If a database operation fails:

1. Capture the error.
2. Roll back active transactions.
3. Validate permissions.
4. Verify schema state.
5. Retry transient failures.
6. Record execution history.

---

# Best Practices

- Keep schemas modular.
- Write readable SQL.
- Use migrations instead of manual changes.
- Monitor database performance.
- Document schema changes.
- Review indexes regularly.

---

# Success Criteria

PostgreSQL integration is successful when:

- Queries execute correctly.
- Transactions remain consistent.
- Performance meets expectations.
- Backups are reliable.
- Schema changes are traceable.
- Security policies are enforced.

---

# Related Documents

- mcp/README.md
- mcp/supabase.md
- memory/coding-memory.md
- orchestration/execution-policy.md
- prompts/coder.md

---

# Version

AI Business OS v1.1