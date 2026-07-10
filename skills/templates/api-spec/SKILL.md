---
name: api-spec
description: Create comprehensive API specifications for REST and GraphQL services, including endpoints, schemas, authentication, error handling, and versioning.
version: 1.0.0
author: AI Business OS
license: MIT
category: template
priority: required
---

# API Specification

## Purpose

This skill creates complete API specifications that provide developers with a clear, consistent, and implementation-ready contract for backend services.

API specifications should be technology-agnostic whenever possible.

---

# When to Use

Execute when:

- Designing new APIs
- Updating existing APIs
- Defining integration contracts
- Preparing backend implementation
- Supporting frontend integration
- Publishing developer documentation

---

# Objectives

Produce API specifications that are:

- Clear
- Consistent
- Secure
- Versioned
- Testable

---

# Inputs

Expected inputs:

- Business Requirements
- User Stories
- Data Models
- Authentication Requirements
- Integration Requirements
- Non-functional Requirements

---

# API Overview

Document:

- API Name
- Purpose
- Version
- Base URL
- Protocol
- Content Types

---

# Endpoints

For each endpoint include:

- HTTP Method
- URL Path
- Description
- Authentication
- Permissions
- Parameters
- Request Body
- Response Body
- Status Codes

---

# Request Specification

Define:

- Headers
- Query Parameters
- Path Parameters
- Body Schema
- Validation Rules
- Required Fields

---

# Response Specification

Document:

- Success Response
- Error Response
- Pagination
- Metadata
- Response Examples

Use consistent response structures.

---

# Authentication

Specify:

- Authentication Method
- Authorization Rules
- Token Format
- Expiration
- Refresh Strategy

---

# Error Handling

Define:

- Error Codes
- HTTP Status Codes
- Error Messages
- Validation Errors
- Retry Behavior

Provide actionable error information.

---

# Versioning

Document:

- Version Strategy
- Breaking Changes
- Deprecation Policy
- Migration Notes

Maintain backward compatibility where practical.

---

# Validation Checklist

Verify:

- Endpoints documented
- Schemas validated
- Authentication defined
- Error responses complete
- Examples provided
- Version identified

---

# Failure Conditions

Stop if:

- Endpoint purpose is unclear
- Data model is incomplete
- Authentication is undefined
- Request schema is missing
- Response schema is inconsistent

---

# Outputs

Generate:

- API Specification
- Endpoint Catalog
- Request Examples
- Response Examples
- Error Reference

---

# Rules

- Follow REST or GraphQL conventions.
- Use consistent naming.
- Document every endpoint.
- Include examples.
- Design for backward compatibility.

---

# Success Criteria

This skill succeeds when:

- developers can implement the API without ambiguity
- consumers understand every endpoint
- integration issues are minimized
- documentation remains consistent

---

# Related Skills

- backend-engineer
- frontend-engineer
- solution-architect
- database-schema
- test-case

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |