---
name: database
description: Define database design, modeling, integrity, performance, security, and operational best practices for relational and NoSQL systems.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Database

## Purpose

This skill establishes database design and operational standards to ensure data integrity, scalability, security, and maintainability across all applications.

The guidelines apply to relational and NoSQL databases unless otherwise specified.

---

# When to Use

Execute when:

- Designing a new database
- Modifying an existing schema
- Creating data models
- Optimizing database performance
- Planning migrations
- Reviewing database architecture

---

# Objectives

Ensure databases are:

- Reliable
- Secure
- Scalable
- Performant
- Maintainable
- Consistent

---

# Inputs

Expected inputs:

- Business Requirements
- Data Models
- Application Architecture
- Performance Requirements
- Compliance Requirements
- Security Requirements

---

# Data Modeling

Design using:

- Clear Entity Definitions
- Normalization where appropriate
- Well-defined Relationships
- Consistent Naming Conventions
- Business-driven Data Models

Avoid unnecessary complexity.

---

# Schema Design

Define:

- Tables or Collections
- Columns or Fields
- Data Types
- Primary Keys
- Foreign Keys
- Constraints
- Default Values

Use meaningful and consistent names.

---

# Data Integrity

Implement:

- Primary Keys
- Foreign Keys
- Unique Constraints
- Check Constraints
- Referential Integrity
- Validation Rules

Maintain consistency throughout the data lifecycle.

---

# Performance

Optimize using:

- Appropriate Indexes
- Query Optimization
- Partitioning when necessary
- Connection Pooling
- Efficient Transactions
- Caching Strategies

Continuously monitor performance metrics.

---

# Security

Protect data through:

- Encryption at Rest
- Encryption in Transit
- Role-Based Access Control
- Least Privilege
- Audit Logging
- Secure Backup Storage

Never expose sensitive information unnecessarily.

---

# Backup & Recovery

Define:

- Backup Schedule
- Retention Policy
- Recovery Procedures
- Restore Validation
- Disaster Recovery Plan

Test recovery procedures regularly.

---

# Migration Strategy

Support:

- Version-controlled Migrations
- Rollback Procedures
- Data Transformation
- Compatibility Validation
- Zero-downtime Deployment where possible

---

# Monitoring

Track:

- Query Performance
- Storage Growth
- Connection Usage
- Replication Health
- Backup Status
- Error Rates

Configure alerts for critical thresholds.

---

# Validation Checklist

Before completion verify:

- Schema reviewed
- Constraints implemented
- Indexes optimized
- Security controls applied
- Backup strategy defined
- Monitoring configured

---

# Failure Conditions

Stop and request clarification if:

- Data model is incomplete
- Relationships are ambiguous
- Security requirements are missing
- Backup strategy is undefined
- Migration plan is unavailable

---

# Outputs

Generate:

- Database Design Guide
- Schema Specification
- Migration Plan
- Backup Strategy
- Performance Checklist

---

# Rules

- Preserve data integrity at all times.
- Optimize only after measuring performance.
- Version every schema change.
- Secure sensitive data by default.
- Validate backups and recovery regularly.

---

# Success Criteria

This skill succeeds when:

- data integrity is maintained
- performance meets requirements
- security controls are enforced
- migrations are reliable
- operational procedures are documented

---

# Related Skills

- api-design
- authentication
- authorization
- performance
- security

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |