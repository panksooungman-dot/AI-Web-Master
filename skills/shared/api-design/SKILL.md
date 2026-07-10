---
name: api-design
description: Define standards and best practices for designing secure, consistent, scalable, and maintainable APIs across all services.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# API Design

## Purpose

This skill defines API design standards that ensure consistency, usability, security, scalability, and maintainability across all services.

The goal is to create APIs that are intuitive for developers, resilient in production, and easy to evolve over time.

---

# When to Use

Execute when:

- Designing new REST APIs
- Designing GraphQL APIs
- Creating internal service APIs
- Creating public APIs
- Reviewing API contracts
- Versioning existing APIs

---

# Objectives

Design APIs that are:

- Consistent
- Predictable
- Secure
- Versioned
- Scalable
- Easy to consume

---

# Inputs

Expected inputs:

- Business Requirements
- Product Requirements
- User Stories
- Data Models
- Security Requirements
- Integration Requirements

---

# API Design Principles

Follow these principles:

- Resource-oriented design
- Consistent naming
- Stateless communication
- Idempotent operations where applicable
- Backward compatibility
- Explicit versioning

---

# Resource Design

Define:

- Resources
- Collections
- Relationships
- Nested Resources
- Resource Identifiers

Use nouns instead of verbs for resource names.

Examples:

- /users
- /orders
- /products/{id}

---

# HTTP Methods

Use methods appropriately:

- GET — Retrieve resources
- POST — Create resources
- PUT — Replace resources
- PATCH — Partial updates
- DELETE — Remove resources

Avoid using GET for state-changing operations.

---

# Request Design

Document:

- Headers
- Query Parameters
- Path Parameters
- Request Body
- Validation Rules
- Required Fields

Ensure all inputs are validated.

---

# Response Design

Responses should include:

- HTTP Status Code
- Response Body
- Metadata
- Pagination
- Error Details

Maintain a consistent response structure across all APIs.

---

# Error Handling

Standardize:

- Error Codes
- Error Messages
- Validation Errors
- Authentication Errors
- Authorization Errors
- Server Errors

Error messages should be actionable and never expose sensitive information.

---

# Authentication & Security

Support:

- OAuth 2.0
- OpenID Connect
- JWT Bearer Tokens
- API Keys
- Mutual TLS (where required)

Apply authorization checks to every protected endpoint.

---

# Versioning

Support:

- URI Versioning
- Header Versioning
- Semantic Versioning

Document deprecation and migration strategies.

---

# Pagination & Filtering

For collections support:

- Pagination
- Sorting
- Filtering
- Search

Avoid returning unbounded result sets.

---

# Validation Checklist

Before completion verify:

- Resources consistently named
- HTTP methods correctly applied
- Request schema defined
- Response schema defined
- Error responses standardized
- Security requirements implemented
- Versioning strategy documented

---

# Failure Conditions

Stop and request clarification if:

- Resources are undefined
- API purpose is unclear
- Security requirements are missing
- Response format is inconsistent
- Versioning strategy is absent

---

# Outputs

Generate:

- API Design Specification
- Endpoint Catalog
- Request/Response Standards
- Error Catalog
- Versioning Strategy

---

# Rules

- Prefer consistency over creativity.
- Design APIs around resources.
- Keep endpoints predictable.
- Never expose internal implementation details.
- Design for backward compatibility whenever possible.

---

# Success Criteria

This skill succeeds when:

- APIs are easy to understand
- integrations are reliable
- security is consistently applied
- breaking changes are minimized
- documentation matches implementation

---

# Related Skills

- authentication
- authorization
- security
- database
- validation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |