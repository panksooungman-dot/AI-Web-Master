---
name: saas
description: Build, scale, and operate Software-as-a-Service (SaaS) products with multi-tenancy, subscriptions, security, and continuous delivery best practices.
version: 1.0.0
author: AI Business OS
license: MIT
category: domain
priority: required
---

# SaaS Domain

## Purpose

This skill defines best practices for designing, building, and operating Software-as-a-Service (SaaS) products.

The objective is to provide a reusable domain framework covering multi-tenancy, subscriptions, billing, security, scalability, and customer lifecycle management.

---

# When to Use

Execute when:

- Building a SaaS platform
- Creating subscription-based products
- Supporting multiple organizations or tenants
- Designing cloud-native business software

---

# Objectives

Build SaaS products that are:

- Scalable
- Secure
- Multi-tenant
- Subscription-ready
- Observable
- Maintainable

---

# Inputs

Expected inputs:

- Business Requirements
- Product Vision
- Pricing Strategy
- Customer Segments
- Technical Architecture
- Compliance Requirements

---

# Core Characteristics

Support:

- Multi-tenancy
- Subscription Billing
- Role-based Access Control
- Self-service Onboarding
- Usage Tracking
- Tenant Isolation
- API-first Architecture

---

# Tenant Management

Define:

- Tenant Creation
- Tenant Configuration
- Tenant Isolation
- Tenant Lifecycle
- Tenant Administration

Every customer belongs to a logical tenant.

---

# User Management

Support:

- Registration
- Authentication
- Authorization
- Invitations
- Team Management
- Organization Ownership

---

# Subscription Model

Support:

- Free Tier
- Trial
- Monthly Plans
- Annual Plans
- Enterprise Plans

Include upgrade, downgrade, renewal, and cancellation flows.

---

# Billing

Implement:

- Payment Processing
- Invoice Generation
- Refunds
- Taxes
- Coupons
- Usage-based Billing

---

# Security

Apply:

- MFA
- RBAC
- Audit Logging
- Encryption
- Secret Management
- Secure APIs

---

# Scalability

Design for:

- Horizontal Scaling
- Auto Scaling
- Caching
- CDN
- Queue Processing
- Database Optimization

---

# Customer Lifecycle

Manage:

- Acquisition
- Onboarding
- Activation
- Retention
- Expansion
- Renewal
- Churn

Measure each lifecycle stage.

---

# SaaS Metrics

Track:

- MRR
- ARR
- Churn Rate
- LTV
- CAC
- DAU
- MAU
- NRR

Use metrics to guide product decisions.

---

# Workflow

```text
Define Business Model

↓

Design Multi-tenancy

↓

Design Subscription Model

↓

Implement Authentication

↓

Implement Billing

↓

Enable Monitoring

↓

Measure SaaS Metrics

↓

Optimize Growth
```

---

# Outputs

Generate:

- SaaS Architecture
- Tenant Model
- Subscription Model
- Billing Strategy
- Security Plan
- KPI Dashboard

---

# Validation Checklist

Before completion verify:

- Multi-tenancy implemented
- Subscription model validated
- Billing configured
- Security reviewed
- Tenant isolation verified
- SaaS metrics defined

---

# Failure Conditions

Stop and request clarification if:

- Pricing model is undefined
- Tenant model is unclear
- Billing requirements are incomplete
- Compliance requirements are unknown
- Customer lifecycle is undefined

---

# Rules

- Isolate tenant data.
- Design API-first.
- Automate onboarding.
- Measure product health continuously.
- Optimize for long-term customer retention.

---

# Success Criteria

This skill succeeds when:

- the SaaS platform supports multiple tenants
- subscriptions function correctly
- billing is reliable
- security standards are met
- business metrics are measurable

---

# Related Skills

- planning
- architecture
- authentication
- payment
- monitoring
- sla-slo

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |