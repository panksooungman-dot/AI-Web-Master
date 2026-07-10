---
name: authentication
description: Design and implement secure authentication and authorization mechanisms, including identity management, access control, session management, and security best practices.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Authentication

## Purpose

This skill defines how users authenticate, authorize, and securely access the application.

Its objective is to establish a secure identity and access management system that protects users, business data, and application resources.

Authentication verifies identity.

Authorization determines permissions.

---

# When to Use

Execute after:

- development/database
- development/api

Execute before:

- payment
- integration

---

# Objectives

Implement authentication that is:

- Secure
- Reliable
- Scalable
- Auditable
- Standards-based

---

# Inputs

Expected inputs:

- Architecture Document
- Database Schema
- API Specification
- Business Rules
- User Roles

---

# Authentication Strategy

Support one or more:

- Email & Password
- Magic Link
- OAuth
- SSO
- Multi-Factor Authentication (MFA)

Choose the simplest solution that satisfies business requirements.

---

# Authorization Model

Define:

- Roles
- Permissions
- Resource Ownership
- Access Policies

Example:

```text
Guest

↓

User

↓

Manager

↓

Administrator
```

Every protected resource must define access rules.

---

# Session Management

Support:

- Secure Sessions
- JWT
- Refresh Tokens
- Session Expiration
- Logout
- Token Revocation

Never expose tokens unnecessarily.

---

# Password Security

Requirements:

- Strong password policy
- Password hashing
- Password reset
- Password history (if required)
- Brute-force protection

Passwords must never be stored in plain text.

---

# Multi-Factor Authentication

When required:

- TOTP
- Email Verification
- SMS Verification
- Authenticator Apps

Support recovery methods.

---

# Account Lifecycle

Define processes for:

- Registration
- Email Verification
- Login
- Logout
- Password Reset
- Account Lock
- Account Recovery
- Account Deletion

---

# Security Controls

Implement:

- Rate Limiting
- CSRF Protection
- XSS Prevention
- Secure Cookies
- HTTPS Only
- Input Validation
- Audit Logging

---

# Audit Logging

Record security events:

- Login
- Logout
- Failed Login
- Password Change
- Role Change
- MFA Enrollment
- Permission Changes

Logs should support security investigations.

---

# Workflow

```text
Review User Roles

↓

Design Authentication

↓

Design Authorization

↓

Implement Sessions

↓

Implement Security Controls

↓

Audit Logging

↓

Security Testing

↓

Ready for Payment & Integration
```

---

# Outputs

Generate:

- Authentication Flow
- Authorization Rules
- Session Strategy
- Access Control Matrix
- Security Documentation
- Audit Log Specification

---

# Validation Checklist

Before completion verify:

- Authentication implemented
- Authorization validated
- Passwords secured
- Sessions protected
- MFA configured (if required)
- Audit logging enabled

---

# Failure Conditions

Stop and request clarification if:

- User roles are undefined
- Permission model is incomplete
- Compliance requirements are unknown
- Identity provider is undecided
- Security policies conflict

---

# Rules

- Never store plain-text passwords.
- Follow the principle of least privilege.
- Enforce secure session management.
- Log security events.
- Deny access by default.

---

# Success Criteria

This skill succeeds when:

- user identity is securely verified
- authorization is consistently enforced
- sessions are protected
- security events are auditable
- the application is ready for secure production use

---

# Next Skills

Invoke:

```text
payment

↓

integration
```

---

# Related Skills

- architecture
- backend
- api
- database
- payment
- integration

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |