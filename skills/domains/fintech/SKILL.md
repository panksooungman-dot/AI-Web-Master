---
name: fintech
description: Design, build, and operate secure, compliant, and scalable financial technology applications supporting payments, banking, lending, investments, and financial services.
version: 1.0.0
author: AI Business OS
license: MIT
category: domain
priority: required
---

# FinTech Domain

## Purpose

This skill defines best practices for designing and implementing financial technology (FinTech) platforms.

The objective is to build secure, compliant, and reliable financial systems that manage transactions, financial data, digital payments, and customer accounts while meeting regulatory requirements.

Financial systems must prioritize security, accuracy, and auditability.

---

# When to Use

Execute when:

- Building payment platforms
- Developing digital banking applications
- Creating lending or investment systems
- Managing financial transactions
- Supporting financial service providers

---

# Objectives

Build FinTech systems that are:

- Secure
- Compliant
- Reliable
- Scalable
- Auditable

---

# Inputs

Expected inputs:

- Business Requirements
- Financial Products
- Regulatory Requirements
- Risk Policies
- Security Requirements
- Payment Requirements

---

# Core Capabilities

Support:

- Customer Accounts
- Payments
- Wallets
- Transfers
- Lending
- Investments
- Transaction History
- Financial Reporting

---

# Account Management

Manage:

- Customer Profiles
- Identity Verification
- Account Status
- Linked Accounts
- Beneficiaries
- Account Limits

Maintain accurate customer financial records.

---

# Payment Processing

Support:

- Card Payments
- Bank Transfers
- Digital Wallets
- QR Payments
- Refunds
- Recurring Payments

All financial transactions must be verified server-side.

---

# Transaction Management

Track:

- Authorization
- Settlement
- Reconciliation
- Refunds
- Chargebacks
- Failed Transactions

Maintain immutable transaction history.

---

# Compliance

Support applicable regulations such as:

- PCI DSS
- AML
- KYC
- GDPR (where applicable)
- Local Financial Regulations

Compliance requirements should be integrated into workflows.

---

# Security

Implement:

- Multi-factor Authentication
- Encryption
- Role-Based Access Control
- Fraud Detection
- Audit Logging
- Secure Key Management

Protect financial assets and customer data.

---

# Risk Management

Support:

- Fraud Monitoring
- Transaction Limits
- Risk Scoring
- Suspicious Activity Detection
- Manual Review Workflows

Reduce operational and financial risk.

---

# Reporting

Generate:

- Transaction Reports
- Financial Statements
- Audit Reports
- Compliance Reports
- Risk Dashboards

Ensure traceability for all financial operations.

---

# Workflow

```text
Register Customer

↓

Verify Identity

↓

Open Account

↓

Initiate Transaction

↓

Authorize Payment

↓

Settle Transaction

↓

Monitor Risk

↓

Generate Reports
```

---

# Outputs

Generate:

- Financial Data Model
- Payment Workflow
- Compliance Checklist
- Security Strategy
- Risk Management Plan
- Financial KPI Dashboard

---

# Validation Checklist

Before completion verify:

- Compliance requirements satisfied
- Transactions validated
- Security controls enabled
- Audit logging configured
- Risk monitoring operational
- Reporting verified

---

# Failure Conditions

Stop and request clarification if:

- Regulatory requirements are undefined
- Payment flows are incomplete
- Security controls are insufficient
- Risk policies are missing
- Financial reconciliation is undefined

---

# Rules

- Never compromise financial integrity.
- Validate every transaction.
- Protect customer financial data.
- Maintain complete audit trails.
- Continuously monitor fraud risks.

---

# Success Criteria

This skill succeeds when:

- financial transactions are secure
- compliance requirements are met
- risks are effectively managed
- customer funds are protected
- financial operations remain reliable

---

# Related Skills

- payment
- authentication
- security-review
- monitoring
- backup-recovery
- sla-slo

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |