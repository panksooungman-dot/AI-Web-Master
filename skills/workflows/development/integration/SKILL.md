---
name: integration
description: Integrate frontend, backend, database, authentication, payment systems, and third-party services into a cohesive, secure, and production-ready application.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Integration

## Purpose

This skill integrates all application components into a unified, production-ready system.

Its objective is to verify that frontend, backend, APIs, databases, authentication, payment, and external services work together reliably.

Integration ensures the entire application behaves as a complete product.

---

# When to Use

Execute after:

- development/frontend
- development/backend
- development/api
- development/database
- development/authentication
- development/payment

Execute before:

- quality/testing
- quality/security-review
- release/deployment

---

# Objectives

Integrate systems that are:

- Reliable
- Secure
- Observable
- Performant
- Maintainable

---

# Inputs

Expected inputs:

- Architecture Document
- Frontend Application
- Backend Services
- API Contracts
- Database Schema
- Authentication System
- Payment System

---

# Integration Scope

Verify integration between:

- Frontend ↔ Backend
- Backend ↔ Database
- Backend ↔ Authentication
- Backend ↔ Payment
- Backend ↔ External APIs
- Internal Services

---

# API Integration

Validate:

- Request formats
- Response formats
- Authentication
- Authorization
- Error handling
- Version compatibility

API contracts must remain consistent.

---

# Database Integration

Verify:

- CRUD operations
- Transactions
- Constraints
- Data consistency
- Migration compatibility

---

# External Services

Validate integrations such as:

- Email
- SMS
- Object Storage
- Payment Gateway
- Maps
- Analytics
- Push Notifications
- AI Services

Each integration should define:

- Timeout
- Retry Policy
- Error Handling
- Monitoring

---

# Event Flow

Document major business events.

Example:

```text
User Registration

↓

Authentication

↓

Database

↓

Email Verification

↓

Welcome Notification
```

---

# Error Recovery

Define recovery strategies for:

- Network Failure
- Timeout
- External Service Failure
- Database Failure
- Authentication Failure

Graceful degradation should be preferred whenever possible.

---

# Monitoring

Verify:

- Application Logs
- Metrics
- Tracing
- Alerts
- Health Checks

Critical integrations must be observable.

---

# Performance

Validate:

- API latency
- Database performance
- External service latency
- Concurrent requests
- Resource utilization

---

# Security

Verify:

- Secure communication (HTTPS)
- Secret management
- Access control
- Input validation
- Audit logging

No sensitive information should be exposed.

---

# Testing

Perform:

- End-to-End Tests
- Integration Tests
- Smoke Tests
- Regression Tests
- Failure Scenario Tests

All critical business flows should be verified.

---

# Workflow

```text
Review Architecture

↓

Connect Systems

↓

Validate APIs

↓

Validate Database

↓

Validate External Services

↓

Security Review

↓

Performance Testing

↓

End-to-End Testing

↓

Approve Integration
```

---

# Outputs

Generate:

- Integration Report
- End-to-End Test Results
- Service Dependency Map
- Monitoring Configuration
- Deployment Readiness Report

---

# Validation Checklist

Before completion verify:

- All services connected
- API contracts validated
- Database verified
- Authentication verified
- Payment verified
- Monitoring configured
- End-to-end tests passed

---

# Failure Conditions

Stop and request clarification if:

- API contracts conflict
- Required services are unavailable
- Environment variables are missing
- Security validation fails
- Critical integrations remain untested

---

# Rules

- Integrate incrementally.
- Validate every interface.
- Prefer fail-safe behavior.
- Monitor every critical dependency.
- Never deploy without end-to-end validation.

---

# Success Criteria

This skill succeeds when:

- all application components communicate correctly
- business workflows complete successfully
- monitoring is operational
- performance targets are met
- the application is ready for Quality Assurance

---

# Next Skills

Invoke:

```text
quality/testing

↓

quality/security-review

↓

release/deployment
```

---

# Related Skills

- architecture
- frontend
- backend
- api
- database
- authentication
- payment
- quality/testing

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |