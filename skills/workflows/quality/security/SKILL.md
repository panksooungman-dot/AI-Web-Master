---
name: security-review
description: Evaluate the application for security risks, vulnerabilities, and compliance requirements to ensure it is safe for production deployment.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Security Review

## Purpose

This skill validates the application's security posture before release.

The objective is to identify vulnerabilities, verify security controls, and ensure compliance with organizational and industry security standards.

Security must be treated as a continuous process throughout the SDLC.

---

# When to Use

Execute after:

- quality/testing
- quality/code-review

Execute before:

- performance
- accessibility
- release/deployment

---

# Objectives

Verify the application is:

- Secure
- Resilient
- Compliant
- Auditable
- Ready for production

---

# Inputs

Expected inputs:

- Source Code
- Architecture Document
- API Documentation
- Authentication Strategy
- Database Schema
- Test Results

---

# Review Areas

Evaluate:

- Authentication
- Authorization
- Session Management
- Secrets Management
- Input Validation
- Output Encoding
- Logging
- Encryption
- Infrastructure Security

---

# Authentication & Authorization

Verify:

- Authentication is enforced
- Least privilege is applied
- Role-based access control works
- Session expiration is configured
- MFA requirements are satisfied (if applicable)

---

# Input Validation

Check:

- SQL Injection
- XSS
- CSRF
- Command Injection
- Path Traversal
- SSRF
- File Upload Validation

Never trust user input.

---

# Secrets Management

Ensure:

- No secrets in source code
- Environment variables are used
- API keys are rotated
- Credentials are encrypted
- Access is restricted

---

# Data Protection

Verify:

- Sensitive data encrypted at rest
- TLS enforced in transit
- Passwords hashed
- Personal data minimized
- Secure backups configured

---

# API Security

Validate:

- Authentication
- Authorization
- Rate Limiting
- Request Validation
- Response Filtering
- Error Handling

---

# Dependency Security

Review:

- Third-party packages
- Known vulnerabilities
- License compliance
- Update status

Remove unnecessary dependencies.

---

# Logging & Monitoring

Verify:

- Security events logged
- Audit trails preserved
- Alerts configured
- Sensitive data excluded from logs

---

# Compliance

Review compliance requirements such as:

- GDPR
- SOC 2
- ISO 27001
- OWASP ASVS

Apply only those relevant to the project.

---

# Security Workflow

```text
Review Architecture

↓

Review Authentication

↓

Review Authorization

↓

Review Input Validation

↓

Review Dependencies

↓

Review Infrastructure

↓

Perform Vulnerability Assessment

↓

Document Findings

↓

Approve or Request Remediation
```

---

# Outputs

Generate:

- Security Review Report
- Vulnerability Report
- Risk Assessment
- Remediation Recommendations
- Compliance Checklist

---

# Validation Checklist

Before completion verify:

- Critical vulnerabilities resolved
- Secrets protected
- Authentication verified
- Authorization verified
- Dependency scan completed
- Compliance reviewed

---

# Failure Conditions

Stop and require remediation if:

- Critical vulnerabilities exist
- Secrets are exposed
- Authentication can be bypassed
- Sensitive data is unprotected
- Compliance blockers remain unresolved

---

# Rules

- Prioritize high-risk vulnerabilities.
- Never expose sensitive information in reports.
- Validate every external dependency.
- Prefer secure defaults.
- Re-test after remediation.

---

# Success Criteria

This skill succeeds when:

- no critical security issues remain
- security controls are verified
- compliance requirements are satisfied
- the application is approved for performance validation

---

# Next Skills

```text
performance

↓

accessibility

↓

bug-triage
```

---

# Related Skills

- testing
- code-review
- performance
- accessibility
- bug-triage
- regression-testing

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |