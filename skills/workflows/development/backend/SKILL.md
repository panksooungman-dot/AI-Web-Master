---
name: backend
description: Implement secure, scalable, and maintainable backend services that manage business logic, data processing, authentication, and integrations.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Backend Development

## Purpose

This skill defines how backend services are designed and implemented.

The objective is to build reliable, secure, and scalable business logic that supports the frontend and external integrations.

The backend is responsible for enforcing business rules, validating data, and coordinating system operations.

---

# When to Use

Execute after:

- development/architecture
- development/frontend

Execute before:

- api
- database
- authentication
- integration

---

# Objectives

Build backend services that are:

- Secure
- Scalable
- Maintainable
- Testable
- Observable
- Performant

---

# Inputs

Expected inputs:

- Architecture Document
- PRD
- Feature Planning
- Database Design
- API Requirements
- Business Rules

---

# Responsibilities

The backend should handle:

- Business Logic
- Authentication
- Authorization
- Data Validation
- File Processing
- Notifications
- Background Jobs
- External Service Integration

Business rules must never rely solely on frontend validation.

---

# Project Structure

Example:

```text
src/
├── modules/
├── services/
├── repositories/
├── middleware/
├── lib/
├── utils/
├── jobs/
└── config/
```

Each module should have a single responsibility.

---

# Service Layer

Organize logic into services.

Example:

- UserService
- ProductService
- OrderService
- PaymentService
- NotificationService

Avoid placing business logic directly in controllers.

---

# Validation

Validate:

- Request Payloads
- Query Parameters
- Headers
- Uploaded Files

Reject invalid input immediately.

---

# Error Handling

Implement:

- Standard Error Responses
- Logging
- Retry Strategy
- Graceful Failures

Never expose internal implementation details.

---

# Security

Apply:

- Authentication
- Authorization
- Input Sanitization
- Rate Limiting
- CSRF Protection
- Secure Headers
- Secrets Management

Security checks are mandatory.

---

# Performance

Optimize:

- Database Queries
- Caching
- Background Processing
- Pagination
- Batch Operations

Measure before optimizing.

---

# Logging & Monitoring

Log:

- Requests
- Errors
- Warnings
- Critical Events
- Audit Events

Logs should support troubleshooting and auditing.

---

# Testing

Verify:

- Unit Tests
- Integration Tests
- Business Rules
- Error Handling
- Security Checks

Critical logic must be tested.

---

# Workflow

```text
Review Architecture

↓

Implement Services

↓

Implement Validation

↓

Implement Business Logic

↓

Implement Error Handling

↓

Security Review

↓

Performance Review

↓

Testing

↓

Ready for API Integration
```

---

# Outputs

Generate:

- Backend Services
- Business Logic
- Validation Rules
- Logging Configuration
- Test Results

---

# Validation Checklist

Before completion verify:

- Business rules implemented
- Validation complete
- Security reviewed
- Performance acceptable
- Tests passing
- Documentation updated

---

# Failure Conditions

Stop and request clarification if:

- Business rules conflict
- Database schema is incomplete
- API contracts are undefined
- Authentication requirements are missing
- External service specifications are unavailable

---

# Rules

- Keep business logic out of controllers.
- Prefer reusable services.
- Fail securely.
- Log meaningful events.
- Keep modules loosely coupled.

---

# Success Criteria

This skill succeeds when:

- business logic is complete
- services are modular
- security standards are met
- validation is comprehensive
- backend is ready for API implementation

---

# Next Skills

Invoke:

```text
api

↓

database

↓

authentication
```

---

# Related Skills

- architecture
- frontend
- api
- database
- authentication
- integration

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |