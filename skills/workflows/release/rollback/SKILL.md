---
name: rollback
description: Plan, validate, and execute safe rollback procedures to restore a stable system state when deployments introduce critical issues.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Rollback

## Purpose

This skill defines how to safely restore a previously stable application version after a failed deployment or critical production incident.

The objective is to minimize downtime, protect user data, and restore normal service as quickly as possible.

Rollback procedures should be prepared before deployment, not during an incident.

---

# When to Use

Execute after:

- release/deployment
- release/monitoring

Execute before:

- release/maintenance

---

# Objectives

Ensure rollback is:

- Safe
- Fast
- Repeatable
- Auditable
- Data-aware

---

# Inputs

Expected inputs:

- Deployment Report
- Monitoring Alerts
- Health Check Results
- Infrastructure Configuration
- Database Migration History
- Previous Stable Release

---

# Rollback Triggers

Initiate rollback when:

- Critical health checks fail
- Error rates exceed thresholds
- Core user journeys are broken
- Security vulnerabilities are introduced
- Data integrity is at risk
- Business-critical KPIs degrade significantly

---

# Rollback Scope

Consider rollback for:

- Application Version
- Infrastructure Changes
- Configuration Changes
- Feature Flags
- Database Migrations
- External Integrations

Document dependencies before execution.

---

# Rollback Strategy

Choose an appropriate strategy:

- Blue-Green Switchback
- Previous Container Image
- Previous Artifact
- Feature Flag Disable
- Database Restore
- Configuration Revert

Prefer the least disruptive option.

---

# Database Rollback

Before rollback verify:

- Migration reversibility
- Backup availability
- Data compatibility
- Transaction safety

Never perform destructive rollback without verified backups.

---

# Validation

After rollback verify:

- Application Health
- API Availability
- Authentication
- Payment
- Database Connectivity
- Background Jobs
- Critical User Flows

---

# Communication

Notify stakeholders:

- Incident declared
- Rollback initiated
- Rollback completed
- Service restored
- Root cause investigation started

Maintain an incident timeline.

---

# Incident Documentation

Record:

- Trigger
- Timeline
- Impact
- Actions Taken
- Recovery Time
- Lessons Learned

---

# Workflow

```text
Detect Incident

↓

Assess Impact

↓

Approve Rollback

↓

Execute Rollback

↓

Validate System

↓

Monitor Recovery

↓

Notify Stakeholders

↓

Document Incident

↓

Begin Root Cause Analysis
```

---

# Outputs

Generate:

- Rollback Report
- Recovery Timeline
- Incident Summary
- Validation Report
- Post-Incident Action Items

---

# Validation Checklist

Before completion verify:

- Stable version restored
- Health checks passed
- Critical services operational
- Data integrity confirmed
- Stakeholders informed
- Incident documented

---

# Failure Conditions

Escalate immediately if:

- Rollback fails
- Database recovery fails
- Data corruption detected
- Critical services remain unavailable
- Recovery objectives cannot be met

---

# Rules

- Prioritize service restoration.
- Validate every rollback step.
- Never skip post-rollback verification.
- Preserve audit trails.
- Investigate root causes after recovery.

---

# Success Criteria

This skill succeeds when:

- a stable version is restored
- critical functionality is operational
- data integrity is preserved
- stakeholders are informed
- the system is ready for ongoing maintenance

---

# Next Skills

```text
maintenance

↓

changelog

↓

release-note
```

---

# Related Skills

- deployment
- monitoring
- maintenance
- changelog
- release-note
- regression-testing

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |