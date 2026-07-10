---
name: deployment
description: Plan, validate, and execute application deployments safely and consistently across environments while minimizing downtime and deployment risk.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Deployment

## Purpose

This skill defines how applications are deployed from development to production.

The objective is to ensure deployments are predictable, repeatable, secure, and recoverable with minimal service disruption.

Deployment should be fully automated whenever practical.

---

# When to Use

Execute after:

- quality/regression-testing

Execute before:

- release/monitoring
- release/rollback

---

# Objectives

Deploy applications that are:

- Reliable
- Repeatable
- Secure
- Observable
- Recoverable

---

# Inputs

Expected inputs:

- Release Candidate
- Test Reports
- Regression Test Results
- Deployment Configuration
- Infrastructure Configuration
- Environment Variables

---

# Deployment Strategy

Choose an appropriate deployment strategy:

- Rolling Deployment
- Blue-Green Deployment
- Canary Deployment
- Recreate Deployment

Document why the selected strategy is appropriate.

---

# Environments

Define deployment targets:

- Development
- Testing
- Staging
- Production

Every environment should closely match production whenever possible.

---

# Pre-Deployment Checklist

Verify:

- All tests passed
- Regression testing completed
- Release approved
- Secrets configured
- Database migrations reviewed
- Backups completed
- Rollback plan prepared

Deployment must not proceed if critical blockers exist.

---

# Configuration Management

Manage:

- Environment Variables
- Feature Flags
- Secrets
- Service Configuration
- Infrastructure Configuration

Configuration should remain external to application code.

---

# Database Deployment

Validate:

- Migration order
- Data compatibility
- Rollback strategy
- Backup availability

Schema changes should be backward compatible whenever possible.

---

# Deployment Automation

Automate:

- Build
- Testing
- Packaging
- Deployment
- Health Checks
- Notifications

Prefer CI/CD pipelines over manual deployments.

---

# Health Verification

After deployment verify:

- Application starts
- APIs respond
- Database connectivity
- Authentication
- Payment systems
- Background jobs
- External integrations

---

# Post-Deployment Validation

Confirm:

- Critical user journeys
- Error rates
- Performance metrics
- Monitoring alerts
- Business KPIs

Resolve issues before announcing release completion.

---

# Security

Verify:

- HTTPS enabled
- Secrets loaded securely
- Access permissions correct
- Production debug features disabled
- Security headers configured

---

# Workflow

```text
Review Release Candidate

↓

Verify Deployment Checklist

↓

Build Application

↓

Deploy to Target Environment

↓

Run Database Migrations

↓

Perform Health Checks

↓

Execute Smoke Tests

↓

Validate Monitoring

↓

Approve Deployment
```

---

# Outputs

Generate:

- Deployment Report
- Deployment Logs
- Environment Summary
- Health Check Results
- Release Confirmation

---

# Validation Checklist

Before completion verify:

- Build successful
- Deployment completed
- Health checks passed
- Smoke tests passed
- Monitoring active
- Rollback ready

---

# Failure Conditions

Stop deployment if:

- Build fails
- Critical tests fail
- Database migration fails
- Health checks fail
- Required configuration is missing
- Rollback strategy is unavailable

---

# Rules

- Automate deployments whenever possible.
- Never deploy without a verified rollback plan.
- Validate production immediately after deployment.
- Record every deployment event.
- Minimize downtime.

---

# Success Criteria

This skill succeeds when:

- deployment completes successfully
- application is healthy
- critical workflows operate normally
- monitoring confirms system stability
- the release is ready for production observation

---

# Next Skills

```text
monitoring

↓

rollback

↓

maintenance
```

---

# Related Skills

- regression-testing
- monitoring
- rollback
- maintenance
- changelog
- release-note

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |