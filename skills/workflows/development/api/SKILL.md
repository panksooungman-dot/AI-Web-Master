---
name: api
description: Design, implement, document, and validate secure, consistent, and maintainable APIs that connect frontend, backend, and external services.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# API Development

## Purpose

This skill defines how APIs are designed, implemented, documented, and maintained.

The objective is to provide reliable, secure, and versioned interfaces between clients, backend services, and third-party systems.

APIs should be predictable, consistent, and easy to consume.

---

# When to Use

Execute after:

- development/architecture
- development/backend

Execute before:

- database
- authentication
- integration

---

# Objectives

Build APIs that are:

- Consistent
- Secure
- Versioned
- Well documented
- Performant
- Easy to maintain

---

# Inputs

Expected inputs:

- Architecture Document
- Backend Services
- PRD
- Feature Planning
- Business Rules

---

# API Design Principles

Follow these principles:

- Resource-oriented
- Consistent naming
- Predictable responses
- Stateless communication
- Explicit versioning
- Clear error handling

---

# Endpoint Design

Each endpoint should define:

- Method
- URL
- Description
- Authentication
- Permissions
- Request Schema
- Response Schema
- Error Responses

Example:

```
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/{id}
PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}
```

---

# Request Validation

Validate:

- Body
- Query Parameters
- Path Parameters
- Headers
- File Uploads

Reject invalid requests immediately.

---

# Response Format

Use a consistent response structure.

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Request completed successfully."
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request."
  }
}
```

---

# Authentication

Support:

- JWT
- Session
- OAuth
- API Key

Document authentication requirements for every endpoint.

---

# Authorization

Verify:

- User Roles
- Permissions
- Resource Ownership

Never expose unauthorized data.

---

# Versioning

Version APIs.

Example:

```
/api/v1/
/api/v2/
```

Avoid breaking existing clients.

---

# Error Handling

Provide standardized errors for:

- Validation
- Authentication
- Authorization
- Not Found
- Conflict
- Internal Server Error

Return meaningful messages.

---

# Performance

Optimize:

- Pagination
- Filtering
- Sorting
- Caching
- Compression

Avoid unnecessary payloads.

---

# Documentation

Generate API documentation including:

- Endpoint List
- Schemas
- Authentication
- Examples
- Error Codes
- Rate Limits

Documentation should stay synchronized with implementation.

---

# Testing

Verify:

- Success Responses
- Validation Errors
- Authentication
- Authorization
- Edge Cases
- Performance

---

# Workflow

```text
Review Backend Services

↓

Design Endpoints

↓

Define Schemas

↓

Implement Validation

↓

Implement Authentication

↓

Document API

↓

Testing

↓

Ready for Database Integration
```

---

# Outputs

Generate:

- API Endpoints
- API Documentation
- Request Schemas
- Response Schemas
- Error Specifications
- Test Results

---

# Validation Checklist

Before completion verify:

- Endpoints documented
- Schemas validated
- Authentication implemented
- Error handling standardized
- Documentation updated
- Tests passing

---

# Failure Conditions

Stop and request clarification if:

- Business rules are incomplete
- Request or response schemas are undefined
- Authentication strategy is unknown
- API versioning is undecided
- External API specifications are missing

---

# Rules

- Keep APIs consistent.
- Never expose sensitive data.
- Use proper HTTP status codes.
- Maintain backward compatibility.
- Document every endpoint.

---

# Success Criteria

This skill succeeds when:

- API contracts are complete
- documentation is synchronized
- authentication is enforced
- validation is comprehensive
- frontend integration can begin safely

---

# Next Skills

Invoke:

```text
database

↓

authentication

↓

integration
```

---

# Related Skills

- architecture
- backend
- database
- authentication
- integration
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |