---
name: payment
description: Design and implement secure payment processing, billing, subscriptions, refunds, and financial transaction workflows using trusted payment providers.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Payment

## Purpose

This skill defines how payment systems are designed, implemented, and maintained.

The objective is to provide secure, reliable, and auditable payment processing while protecting customer financial information and ensuring transaction integrity.

---

# When to Use

Execute after:

- development/authentication
- development/database
- development/api

Execute before:

- development/integration

---

# Objectives

Implement payment systems that are:

- Secure
- Reliable
- Auditable
- Compliant
- Scalable

---

# Inputs

Expected inputs:

- Architecture Document
- Database Schema
- API Specification
- Authentication Strategy
- Business Rules
- Pricing Model

---

# Payment Features

Support as required:

- One-time Payments
- Subscriptions
- Free Trials
- Coupons
- Discounts
- Refunds
- Invoice Generation
- Payment History

---

# Payment Providers

Support integrations such as:

- Stripe
- Toss Payments
- PayPal
- PortOne
- Other approved providers

Abstract provider-specific logic behind a common service layer.

---

# Checkout Flow

Typical flow:

```text
Select Product

↓

Review Order

↓

Apply Coupon

↓

Choose Payment Method

↓

Confirm Payment

↓

Provider Processing

↓

Success / Failure

↓

Receipt & Confirmation
```

---

# Transaction States

Every payment should have a clear status:

- Pending
- Processing
- Succeeded
- Failed
- Cancelled
- Refunded
- Disputed

Never assume payment success without provider confirmation.

---

# Subscription Management

When subscriptions are used, support:

- Create Subscription
- Upgrade
- Downgrade
- Pause
- Resume
- Cancel
- Renewal
- Expiration

---

# Webhooks

Implement secure webhook handling.

Validate:

- Signature
- Timestamp
- Event Type
- Duplicate Events

Process webhooks idempotently.

---

# Security

Protect:

- API Keys
- Webhook Secrets
- Customer Information
- Payment Metadata

Never store raw card information unless explicitly certified to do so.

---

# Error Handling

Handle:

- Payment Failure
- Timeout
- Duplicate Request
- Provider Outage
- Refund Failure

Provide clear recovery guidance.

---

# Audit Logging

Record:

- Payment Created
- Payment Completed
- Refund Issued
- Subscription Updated
- Webhook Received
- Payment Failure

---

# Testing

Verify:

- Successful Payment
- Failed Payment
- Refund
- Subscription Renewal
- Webhook Processing
- Duplicate Request Handling

---

# Workflow

```text
Review Pricing Model

↓

Configure Provider

↓

Implement Checkout

↓

Implement Webhooks

↓

Handle Transaction States

↓

Security Review

↓

Testing

↓

Ready for Integration
```

---

# Outputs

Generate:

- Payment Flow
- Checkout Process
- Billing Logic
- Webhook Handlers
- Audit Logs
- Payment Documentation

---

# Validation Checklist

Before completion verify:

- Provider configured
- Checkout tested
- Webhooks validated
- Refund flow verified
- Audit logs enabled
- Security review completed

---

# Failure Conditions

Stop and request clarification if:

- Pricing model is undefined
- Payment provider is undecided
- Currency requirements are unclear
- Tax requirements are unknown
- Refund policy is missing

---

# Rules

- Never trust client-side payment status.
- Verify every transaction server-side.
- Store sensitive secrets securely.
- Make payment processing idempotent.
- Keep complete audit records.

---

# Success Criteria

This skill succeeds when:

- payments are processed securely
- transaction states are reliable
- refunds are supported
- subscriptions work correctly
- financial events are fully auditable

---

# Next Skills

Invoke:

```text
integration
```

---

# Related Skills

- authentication
- api
- database
- integration
- backend

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |