---
name: database
description: Design, implement, and maintain a secure, scalable, and efficient database architecture that supports business requirements and application performance.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Database

## Purpose

This skill defines how application data is modeled, stored, validated, and maintained.

The objective is to create a reliable database architecture that ensures data integrity, scalability, security, and performance.

The database should accurately represent the business domain while remaining easy to evolve.

---

# When to Use

Execute after:

- development/architecture
- development/backend
- development/api

Execute before:

- authentication
- payment
- integration

---

# Objectives

Design a database that is:

- Reliable
- Secure
- Normalized
- Performant
- Scalable
- Maintainable

---

# Inputs

Expected inputs:

- Architecture Document
- PRD
- Feature Planning
- Business Rules
- API Specification

---

# Database Technology

Document:

- Database Engine
- ORM
- Migration Tool
- Backup Strategy
- Replication Strategy

Example:

- PostgreSQL
- Prisma ORM
- Prisma Migrate

---

# Data Modeling

Define:

- Entities
- Attributes
- Relationships
- Constraints
- Keys

Every entity should represent a business concept.

---

# Relationship Design

Support:

- One-to-One
- One-to-Many
- Many-to-Many

Document cascade behaviors and referential integrity.

---

# Naming Convention

Use consistent naming.

Examples:

```text
users
products
orders
order_items
payments
```

Columns:

```text
id
created_at
updated_at
deleted_at
```

Avoid ambiguous names.

---

# Constraints

Apply:

- Primary Keys
- Foreign Keys
- Unique Constraints
- Check Constraints
- Not Null Constraints

Protect data integrity at the database level.

---

# Indexing

Create indexes for:

- Frequently searched columns
- Foreign keys
- Unique fields
- Composite queries

Avoid unnecessary indexes.

---

# Migration Strategy

Every schema change should:

- Be version controlled
- Be reversible
- Be tested
- Preserve existing data

Never modify production data manually.

---

# Performance

Optimize:

- Query execution
- Index usage
- Pagination
- Batch operations
- Connection pooling

Measure query performance regularly.

---

# Security

Protect data through:

- Encryption
- Access Control
- Least Privilege
- Secure Credentials
- Audit Logging

Sensitive data should never be stored in plain text.

---

# Backup & Recovery

Define:

- Backup frequency
- Retention period
- Recovery procedure
- Disaster recovery plan

Regularly test restoration.

---

# Documentation

Maintain:

- ER Diagram
- Schema Documentation
- Migration History
- Naming Standards
- Data Dictionary

---

# Workflow

```text
Review Requirements

↓

Design Data Model

↓

Define Relationships

↓

Apply Constraints

↓

Create Migrations

↓

Optimize Performance

↓

Security Review

↓

Testing

↓

Ready for Authentication
```

---

# Outputs

Generate:

- Database Schema
- ER Diagram
- Migration Files
- Data Dictionary
- Performance Notes
- Backup Strategy

---

# Validation Checklist

Before completion verify:

- Schema matches business rules
- Relationships validated
- Constraints applied
- Indexes optimized
- Migrations tested
- Documentation updated

---

# Failure Conditions

Stop and request clarification if:

- Business entities are undefined
- Relationships are ambiguous
- Data ownership is unclear
- Migration risks are unresolved
- Backup strategy is missing

---

# Rules

- Normalize by default.
- Denormalize only with justification.
- Keep naming consistent.
- Never store secrets in plain text.
- Every schema change must be version controlled.

---

# Success Criteria

This skill succeeds when:

- schema accurately models the business
- data integrity is protected
- performance targets are met
- migrations are reliable
- backend services can safely use the database

---

# Next Skills

Invoke:

```text
authentication

↓

payment

↓

integration
```

---

# Related Skills

- architecture
- backend
- api
- authentication
- integration
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |