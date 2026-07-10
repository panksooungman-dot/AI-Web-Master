---
name: authorization
description: Define authorization policies, access control models, permissions, and least-privilege principles across applications and services.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Authorization

## Purpose

This skill defines authorization standards that determine what authenticated users, services, and systems are allowed to access and perform.

Authorization ensures access is granted according to business rules, security policies, and the principle of least privilege.

---

# When to Use

Execute when:

- Designing access control
- Implementing user permissions
- Defining roles
- Protecting APIs
- Securing administrative functions
- Reviewing security architecture

---

# Objectives

Provide authorization that is:

- Secure
- Consistent
- Auditable
- Scalable
- Maintainable

---

# Inputs

Expected inputs:

- Business Requirements
- User Roles
- Security Requirements
- Compliance Requirements
- Resource Definitions
- API Specifications

---

# Authorization Models

Support:

- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Policy-Based Access Control (PBAC)
- Resource Ownership
- Fine-grained Permissions

Select the simplest model that satisfies business requirements.

---

# Roles & Permissions

Define:

- System Roles
- Administrative Roles
- User Roles
- Service Accounts
- Permission Matrix

Assign permissions based on business responsibilities.

---

# Access Policies

Document:

- Allowed Actions
- Restricted Resources
- Approval Requirements
- Time-based Access
- Conditional Access

Keep policies centralized and version controlled.

---

# API Authorization

Implement:

- Scope Validation
- Resource Authorization
- Token Claims Verification
- Permission Checks
- Tenant Isolation

Authorize every protected API request.

---

# Least Privilege

Ensure:

- Minimum Required Access
- Temporary Privilege Elevation
- Permission Reviews
- Automatic Revocation
- Separation of Duties

Reduce unnecessary access wherever possible.

---

# Audit & Monitoring

Record:

- Access Decisions
- Permission Changes
- Administrative Actions
- Policy Updates
- Authorization Failures

Maintain complete auditability.

---

# Validation Checklist

Before completion verify:

- Roles defined
- Permissions documented
- Policies implemented
- Least privilege applied
- Audit logging enabled
- Authorization tested

---

# Failure Conditions

Stop and request clarification if:

- Roles are undefined
- Permission model is unclear
- Resources are unidentified
- Policies conflict
- Compliance requirements are missing

---

# Outputs

Generate:

- Authorization Model
- Role Matrix
- Permission Matrix
- Access Policy
- Authorization Checklist

---

# Rules

- Apply the principle of least privilege.
- Separate authentication from authorization.
- Deny access by default.
- Review permissions regularly.
- Log authorization decisions when appropriate.

---

# Success Criteria

This skill succeeds when:

- users only access permitted resources
- permissions are consistently enforced
- authorization policies remain auditable
- privilege escalation risks are minimized
- access management scales with the system

---

# Related Skills

- authentication
- security
- api-design
- validation
- logging

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |