---
name: authentication
description: Define authentication standards, identity verification methods, and secure login practices across all applications and services.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Authentication

## Purpose

This skill defines authentication standards used across all applications, services, APIs, and infrastructure.

Authentication verifies the identity of users, systems, and services before granting access to protected resources.

---

# When to Use

Execute when:

- Designing authentication flows
- Building login systems
- Integrating identity providers
- Implementing Single Sign-On (SSO)
- Supporting API authentication
- Reviewing authentication security

---

# Objectives

Provide authentication that is:

- Secure
- Reliable
- Scalable
- User-friendly
- Auditable

---

# Inputs

Expected inputs:

- Business Requirements
- Security Requirements
- Compliance Requirements
- User Roles
- Identity Provider Information
- Application Architecture

---

# Authentication Methods

Support:

- Username and Password
- Multi-Factor Authentication (MFA)
- Single Sign-On (SSO)
- OAuth 2.0
- OpenID Connect (OIDC)
- Passkeys
- Certificate-based Authentication
- API Keys (Service Accounts)

Choose the least privileged authentication mechanism appropriate for the use case.

---

# Identity Management

Define:

- User Registration
- Account Verification
- Identity Proofing
- Password Policies
- Credential Storage
- Account Recovery

Never store plaintext credentials.

---

# Session Management

Implement:

- Secure Session Tokens
- Session Expiration
- Session Renewal
- Logout Handling
- Device Management
- Session Revocation

Invalidate sessions after logout or credential changes.

---

# Credential Security

Ensure:

- Strong Password Policies
- Password Hashing
- Salted Hashes
- Secret Rotation
- Credential Expiration
- Secure Secret Storage

Protect credentials throughout their lifecycle.

---

# API Authentication

Support:

- Bearer Tokens
- OAuth Access Tokens
- Service Accounts
- Mutual TLS (mTLS)
- Signed Requests

Authenticate every protected API request.

---

# Security Best Practices

Implement:

- Rate Limiting
- Brute-force Protection
- Account Lockout
- MFA Enforcement
- Login Monitoring
- Audit Logging

Detect and respond to suspicious authentication activity.

---

# Validation Checklist

Before completion verify:

- Authentication method selected
- MFA considered
- Password policy defined
- Session management implemented
- Secrets protected
- Audit logging enabled

---

# Failure Conditions

Stop and request clarification if:

- Authentication requirements are unclear
- Identity provider is undefined
- Compliance requirements are missing
- Session strategy is unspecified
- Security controls are incomplete

---

# Outputs

Generate:

- Authentication Design
- Login Flow
- Session Policy
- Credential Policy
- Authentication Checklist

---

# Rules

- Never store plaintext passwords.
- Require MFA for privileged access.
- Protect credentials using industry-standard hashing.
- Minimize authentication attack surface.
- Log authentication events for auditing.

---

# Success Criteria

This skill succeeds when:

- users are authenticated securely
- authentication is reliable and scalable
- credentials are protected
- unauthorized access is prevented
- authentication events are fully auditable

---

# Related Skills

- authorization
- security
- api-design
- validation
- logging

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |