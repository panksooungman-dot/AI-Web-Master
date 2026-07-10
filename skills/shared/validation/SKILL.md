---
name: validation
description: Define validation principles, input verification, business rule enforcement, and data integrity standards across all applications and services.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Validation

## Purpose

This skill establishes validation standards to ensure all data, inputs, and business operations are accurate, consistent, secure, and compliant before processing.

Validation prevents invalid data from entering the system and enforces business rules consistently.

---

# When to Use

Execute when:

- Designing APIs
- Building user interfaces
- Processing user input
- Implementing business logic
- Importing external data
- Integrating third-party services

---

# Objectives

Ensure validation is:

- Accurate
- Consistent
- Predictable
- Secure
- Reusable
- Maintainable

---

# Inputs

Expected inputs:

- Business Requirements
- API Specifications
- Data Models
- Business Rules
- Compliance Requirements
- Security Requirements

---

# Validation Scope

Validate:

- User Input
- API Requests
- Configuration Files
- Uploaded Files
- Database Operations
- External Integrations
- Business Rules

Never trust external input.

---

# Validation Types

Implement:

- Required Field Validation
- Type Validation
- Format Validation
- Range Validation
- Length Validation
- Pattern Validation
- Cross-field Validation
- Business Rule Validation

Choose the appropriate validation strategy for each use case.

---

# Business Rule Validation

Ensure:

- Domain Rules
- Workflow Constraints
- State Transitions
- Permission Checks
- Duplicate Detection
- Referential Integrity

Business rules should remain centralized and reusable.

---

# Error Reporting

Validation failures should include:

- Error Code
- Field Name
- Human-readable Message
- Validation Rule
- Suggested Resolution

Provide actionable feedback without exposing sensitive information.

---

# Security

Protect against:

- SQL Injection
- Cross-site Scripting (XSS)
- Command Injection
- Path Traversal
- Malicious File Uploads
- Invalid Authentication Data

Perform validation on both client and server sides.

---

# Validation Checklist

Before completion verify:

- All required fields validated
- Business rules enforced
- Error messages standardized
- Invalid input rejected
- Security validation implemented
- Tests completed

---

# Failure Conditions

Stop and request clarification if:

- Validation rules are undefined
- Business rules conflict
- Data model is incomplete
- Security requirements are missing
- Error handling is unspecified

---

# Outputs

Generate:

- Validation Rules
- Validation Checklist
- Business Rule Matrix
- Error Catalog

---

# Rules

- Validate all external input.
- Perform server-side validation for every request.
- Keep validation logic centralized.
- Return consistent validation errors.
- Reject invalid data immediately.

---

# Success Criteria

This skill succeeds when:

- invalid data is consistently rejected
- business rules are enforced
- data integrity is preserved
- security risks are reduced
- validation behavior is predictable

---

# Related Skills

- testing
- security
- error-handling
- api-design
- database

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |