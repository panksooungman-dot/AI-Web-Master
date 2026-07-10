---
name: logging
description: Define standardized logging practices for applications, APIs, services, and infrastructure to improve observability, troubleshooting, auditing, and operational reliability.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Logging

## Purpose

This skill establishes consistent logging standards across all systems to support monitoring, troubleshooting, auditing, and security.

Logs should provide actionable operational insights while protecting sensitive information.

---

# When to Use

Execute when:

- Developing applications
- Building APIs
- Implementing background jobs
- Operating infrastructure
- Investigating incidents
- Performing security audits

---

# Objectives

Ensure logging is:

- Consistent
- Structured
- Secure
- Searchable
- Actionable
- Observable

---

# Inputs

Expected inputs:

- Application Architecture
- Logging Requirements
- Security Requirements
- Compliance Requirements
- Monitoring Strategy
- Incident Response Procedures

---

# Log Categories

Classify logs into:

- Application Logs
- Access Logs
- Audit Logs
- Security Logs
- Error Logs
- Performance Logs
- Infrastructure Logs

Use standardized log levels.

---

# Log Levels

Support:

- TRACE
- DEBUG
- INFO
- WARN
- ERROR
- FATAL

Use each level consistently throughout the system.

---

# Log Format

Every log entry should include:

- Timestamp
- Log Level
- Service Name
- Component
- Correlation ID
- Request ID
- User ID (when appropriate)
- Message
- Metadata

Prefer structured formats such as JSON.

---

# Security

Never log:

- Passwords
- API Keys
- Access Tokens
- Secrets
- Personal Sensitive Information
- Encryption Keys

Mask or redact sensitive data before logging.

---

# Correlation

Include:

- Correlation IDs
- Trace IDs
- Request IDs
- Session IDs

Enable end-to-end request tracing across distributed systems.

---

# Log Retention

Define:

- Retention Period
- Archiving Policy
- Deletion Policy
- Compliance Requirements

Review retention policies regularly.

---

# Monitoring Integration

Integrate logs with:

- Monitoring Systems
- Alerting Platforms
- SIEM Solutions
- Dashboards

Generate alerts for critical events.

---

# Validation Checklist

Before completion verify:

- Log levels standardized
- Structured format implemented
- Sensitive data protected
- Correlation IDs included
- Retention policy defined
- Monitoring integrated

---

# Failure Conditions

Stop and request clarification if:

- Logging strategy is undefined
- Sensitive data may be exposed
- Retention policy is missing
- Monitoring integration is unavailable
- Compliance requirements are unclear

---

# Outputs

Generate:

- Logging Standard
- Log Schema
- Retention Policy
- Logging Checklist

---

# Rules

- Log meaningful events only.
- Use structured logging.
- Never expose sensitive information.
- Include correlation identifiers.
- Support centralized log aggregation.

---

# Success Criteria

This skill succeeds when:

- logs are consistent and searchable
- incidents can be investigated efficiently
- security audits are supported
- operational visibility is improved
- sensitive data remains protected

---

# Related Skills

- monitoring
- error-handling
- security
- validation
- runbook

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |