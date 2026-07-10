---
name: architecture
description: Design the software architecture for the project by defining system structure, modules, technologies, data flow, and architectural decisions before implementation begins.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Architecture

## Purpose

This skill defines the overall software architecture for the project.

Its objective is to create a scalable, maintainable, secure, and performant foundation before implementation begins.

Architecture decisions should support both current requirements and future growth.

---

# When to Use

Execute after:

- planning/prd
- planning/feature-planning
- design/prototype

Execute before:

- frontend
- backend
- api
- database

---

# Objectives

Design an architecture that defines:

- System structure
- Technology stack
- Module boundaries
- Data flow
- Communication patterns
- Security model
- Deployment strategy

---

# Inputs

Expected inputs:

- Product Requirements Document
- Feature Planning
- User Flow
- Technical Constraints
- Business Goals
- Prototype

---

# Architecture Principles

Follow these principles:

- Simplicity
- Scalability
- Maintainability
- Reusability
- Security
- Performance
- Observability

Avoid unnecessary complexity.

---

# Technology Stack

Define:

- Frontend Framework
- Backend Framework
- Database
- Authentication
- API Style
- Hosting Platform
- Storage
- Monitoring

Example:

- Frontend: Next.js
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Deployment: Vercel

---

# System Structure

Define major layers.

Example:

```
Presentation Layer

↓

Application Layer

↓

Domain Layer

↓

Infrastructure Layer

↓

Database
```

Keep responsibilities separated.

---

# Module Design

Identify modules such as:

- Authentication
- User Management
- Dashboard
- Products
- Orders
- Payments
- Notifications
- Administration

Each module should have a clear responsibility.

---

# Data Flow

Document:

- Client Requests
- Server Processing
- Database Operations
- API Communication
- External Services

Visualize end-to-end request flow.

---

# API Strategy

Specify:

- REST
- GraphQL
- RPC

Document:

- Versioning
- Error Handling
- Authentication
- Rate Limiting

---

# Database Strategy

Define:

- Entities
- Relationships
- Indexing
- Constraints
- Migration Strategy

Normalize where appropriate.

---

# Security Architecture

Include:

- Authentication
- Authorization
- Input Validation
- Encryption
- Secrets Management
- CSRF Protection
- XSS Prevention

Security is mandatory.

---

# Performance Strategy

Plan for:

- Caching
- Lazy Loading
- Pagination
- Image Optimization
- Code Splitting
- Query Optimization

Measure performance continuously.

---

# Scalability

Consider:

- Horizontal Scaling
- Background Jobs
- CDN
- Queue Systems
- Storage Growth

Design for future expansion.

---

# Error Handling

Define:

- Error Categories
- Logging Strategy
- Retry Policy
- User Feedback
- Monitoring

Never expose sensitive information.

---

# Workflow

```
Review Requirements

↓

Choose Technology Stack

↓

Design System Structure

↓

Define Modules

↓

Design Data Flow

↓

Plan APIs

↓

Plan Database

↓

Review Security

↓

Validate Architecture

↓

Approve
```

---

# Outputs

Generate:

- Architecture Document
- System Diagram
- Module Diagram
- Data Flow Diagram
- Technology Stack
- API Strategy
- Security Plan

---

# Validation Checklist

Before completion verify:

- Architecture supports requirements
- Modules are well defined
- Security is addressed
- Scalability is considered
- Performance strategy exists
- Documentation is complete

---

# Failure Conditions

Stop and request clarification if:

- Requirements are incomplete
- Technology stack is undecided
- Security requirements are unknown
- External integrations are undefined
- Critical business rules are missing

---

# Rules

- Keep architecture simple.
- Prefer existing proven patterns.
- Minimize coupling.
- Maximize cohesion.
- Design for maintainability.
- Document every major decision.

---

# Success Criteria

This skill succeeds when:

- architecture is clearly documented
- module boundaries are defined
- technology stack is approved
- security strategy exists
- implementation can begin confidently

---

# Next Skills

Invoke:

```
frontend

↓

backend

↓

api

↓

database
```

---

# Related Skills

- prd
- feature-planning
- prototype
- frontend
- backend
- api
- database
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |