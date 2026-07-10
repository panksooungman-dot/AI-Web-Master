---
name: database-schema
description: Create comprehensive database schema specifications including entities, relationships, constraints, indexes, normalization, and migration strategies.
version: 1.0.0
author: AI Business OS
license: MIT
category: template
priority: required
---

# Database Schema

## Purpose

This skill creates complete database schema specifications that define the structure, relationships, integrity rules, and evolution strategy for application data.

The schema should support scalability, maintainability, and data consistency.

---

# When to Use

Execute when:

- Designing a new database
- Adding new entities
- Modifying existing schemas
- Planning database migrations
- Optimizing data models
- Supporting application development

---

# Objectives

Produce database schemas that are:

- Consistent
- Normalized
- Scalable
- Secure
- Performant

---

# Inputs

Expected inputs:

- Business Requirements
- Data Requirements
- User Stories
- Domain Models
- Performance Targets
- Compliance Requirements

---

# Schema Structure

Generate the following sections:

- Overview
- Database Type
- Entity List
- Entity Definitions
- Relationships
- Constraints
- Indexes
- Views
- Migration Strategy
- Backup Strategy
- Security Considerations

---

# Entity Definition

For each entity include:

- Table Name
- Description
- Columns
- Data Types
- Primary Key
- Foreign Keys
- Nullable Rules
- Default Values

---

# Relationships

Document:

- One-to-One
- One-to-Many
- Many-to-Many
- Cascade Rules
- Referential Integrity

Clearly identify relationship cardinality.

---

# Constraints

Specify:

- Primary Keys
- Foreign Keys
- Unique Constraints
- Check Constraints
- Default Constraints

Ensure data integrity at all times.

---

# Index Strategy

Define:

- Primary Indexes
- Secondary Indexes
- Composite Indexes
- Full-text Indexes

Balance query performance with storage costs.

---

# Migration Strategy

Include:

- Schema Version
- Migration Steps
- Rollback Plan
- Data Conversion
- Compatibility Notes

Support safe deployments.

---

# Validation Checklist

Verify:

- Entities defined
- Relationships documented
- Constraints validated
- Indexes optimized
- Migration reviewed
- Security considered

---

# Failure Conditions

Stop if:

- Business entities are unclear
- Relationships are incomplete
- Data types are undefined
- Migration strategy is missing
- Performance requirements are unavailable

---

# Outputs

Generate:

- Database Schema
- ER Diagram Description
- Migration Plan
- Index Specification
- Constraint Catalog

---

# Rules

- Normalize appropriately.
- Maintain referential integrity.
- Use meaningful names.
- Optimize based on query patterns.
- Document every schema change.

---

# Success Criteria

This skill succeeds when:

- data integrity is preserved
- schema supports business requirements
- migrations are safe and repeatable
- database performance meets expectations

---

# Related Skills

- backend-engineer
- data-engineer
- solution-architect
- api-spec
- architecture-decision-record

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |