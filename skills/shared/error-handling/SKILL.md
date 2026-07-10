---
name: error-handling
description: Define consistent error handling, exception management, recovery strategies, and user-friendly error reporting across all systems.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Error Handling

## Purpose

This skill establishes standards for handling errors consistently across applications, APIs, services, and infrastructure.

The objective is to improve system reliability, simplify troubleshooting, and provide meaningful feedback without exposing sensitive information.

---

# When to Use

Execute when:

- Designing application logic
- Building APIs
- Handling exceptions
- Implementing background jobs
- Processing external integrations
- Reviewing production reliability

---

# Objectives

Ensure error handling is:

- Consistent
- Predictable
- Secure
- Recoverable
- Observable

---

# Inputs

Expected inputs:

- Business Requirements
- System Architecture
- API Specifications
- Security Requirements
- Logging Standards
- Monitoring Requirements

---

# Error Categories

Classify errors into:

- Validation Errors
- Business Rule Errors
- Authentication Errors
- Authorization Errors
- Resource Not Found
- Conflict Errors
- External Service Errors
- Infrastructure Errors
- Internal Server Errors

Assign standardized error codes where applicable.

---

# Exception Management

Implement:

- Centralized Exception Handling
- Domain-specific Exceptions
- Graceful Failure
- Retry Logic
- Fallback Strategies
- Timeout Handling

Avoid unhandled exceptions.

---

# Error Responses

Ensure responses include:

- Error Code
- Human-readable Message
- Technical Details (when appropriate)
- Correlation ID
- Timestamp

Never expose stack traces or sensitive internal details to end users.

---

# Recovery Strategy

Support:

- Retry with Backoff
- Circuit Breaker
- Fallback Responses
- Transaction Rollback
- Compensation Logic

Recover automatically whenever safe and appropriate.

---

# Logging

Record:

- Error Type
- Severity
- Correlation ID
- Context
- Root Cause
- Stack Trace (internal only)

Integrate with centralized logging.

---

# Validation Checklist

Before completion verify:

- Error categories defined
- Exceptions handled centrally
- Responses standardized
- Recovery strategy documented
- Logging integrated
- Sensitive data protected

---

# Failure Conditions

Stop and request clarification if:

- Error strategy is undefined
- Recovery approach is missing
- Logging requirements are unclear
- Sensitive information may be exposed
- Monitoring is unavailable

---

# Outputs

Generate:

- Error Handling Guide
- Exception Strategy
- Error Response Standard
- Recovery Checklist

---

# Rules

- Fail safely and predictably.
- Never expose sensitive implementation details.
- Use consistent error codes.
- Log errors with sufficient context.
- Design for graceful degradation.

---

# Success Criteria

This skill succeeds when:

- errors are handled consistently
- failures are observable
- users receive meaningful feedback
- systems recover whenever possible
- troubleshooting is efficient

---

# Related Skills

- logging
- monitoring
- validation
- security
- api-design

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |