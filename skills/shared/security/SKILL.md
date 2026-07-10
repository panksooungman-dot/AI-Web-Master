---
name: security
description: Define security principles, controls, secure development practices, and risk management standards across all applications, APIs, infrastructure, and data.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Security

## Purpose

This skill establishes comprehensive security standards to protect applications, services, infrastructure, and data throughout the software development lifecycle.

Security should be integrated into every phase of design, development, deployment, and operations.

---

# When to Use

Execute when:

- Designing system architecture
- Developing applications
- Building APIs
- Managing infrastructure
- Processing sensitive data
- Performing security reviews

---

# Objectives

Ensure systems are:

- Confidential
- Integral
- Available
- Resilient
- Auditable
- Compliant

---

# Inputs

Expected inputs:

- Business Requirements
- Security Requirements
- Compliance Requirements
- Threat Model
- System Architecture
- Data Classification

---

# Security Principles

Apply:

- Defense in Depth
- Least Privilege
- Zero Trust
- Secure by Default
- Fail Securely
- Separation of Duties

Security should be proactive rather than reactive.

---

# Identity & Access Management

Implement:

- Strong Authentication
- Multi-Factor Authentication (MFA)
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Privileged Access Management

Review access permissions regularly.

---

# Data Protection

Protect data using:

- Encryption at Rest
- Encryption in Transit
- Key Management
- Data Classification
- Data Masking
- Secure Backups

Sensitive data must never be stored or transmitted unprotected.

---

# Application Security

Include:

- Input Validation
- Output Encoding
- Secure Session Management
- CSRF Protection
- XSS Prevention
- SQL Injection Prevention
- Dependency Scanning

Follow secure coding practices throughout development.

---

# Infrastructure Security

Secure:

- Networks
- Cloud Resources
- Containers
- Virtual Machines
- Kubernetes Clusters
- Secrets Management

Automate security configuration where possible.

---

# Monitoring & Incident Response

Implement:

- Security Logging
- Threat Detection
- Intrusion Monitoring
- Alerting
- Incident Response Procedures
- Forensic Data Collection

Maintain an auditable security trail.

---

# Vulnerability Management

Perform:

- Dependency Updates
- Vulnerability Scanning
- Penetration Testing
- Patch Management
- Security Reviews
- Risk Assessments

Prioritize remediation based on risk.

---

# Validation Checklist

Before completion verify:

- Threat model completed
- Authentication secured
- Authorization enforced
- Data encrypted
- Logging enabled
- Vulnerabilities assessed
- Incident response documented

---

# Failure Conditions

Stop and request clarification if:

- Security requirements are undefined
- Sensitive data is unclassified
- Authentication strategy is missing
- Compliance obligations are unknown
- Threat model is unavailable

---

# Outputs

Generate:

- Security Architecture
- Threat Model
- Security Checklist
- Risk Assessment
- Security Control Matrix

---

# Rules

- Apply least privilege by default.
- Encrypt sensitive data everywhere.
- Validate all external input.
- Keep dependencies up to date.
- Continuously monitor and improve security.

---

# Success Criteria

This skill succeeds when:

- security risks are minimized
- sensitive data is protected
- compliance requirements are satisfied
- systems resist common attack vectors
- security controls are verifiable and auditable

---

# Related Skills

- authentication
- authorization
- logging
- monitoring
- validation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |