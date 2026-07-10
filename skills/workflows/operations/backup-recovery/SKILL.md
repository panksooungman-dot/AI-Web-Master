---
name: backup-recovery
description: Define backup and recovery strategies to protect data, ensure business continuity, and restore services after failures or disasters.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Backup & Recovery

## Purpose

This skill defines how application data, infrastructure, and critical assets are backed up and restored.

The objective is to minimize data loss, reduce recovery time, and ensure business continuity during operational failures.

Backups should be automated, tested, and monitored regularly.

---

# When to Use

Execute after:

- operations/observability

Execute before:

- infrastructure
- disaster-recovery

---

# Objectives

Ensure backups are:

- Reliable
- Secure
- Recoverable
- Verified
- Compliant

---

# Inputs

Expected inputs:

- Production Databases
- File Storage
- Infrastructure Configuration
- Secrets Management
- Backup Policies
- Recovery Objectives

---

# Backup Scope

Include:

- Databases
- File Storage
- Object Storage
- Configuration Files
- Infrastructure as Code
- Secrets (where appropriate)
- Application Artifacts

Identify all critical assets before configuring backups.

---

# Backup Strategy

Define:

- Full Backups
- Incremental Backups
- Differential Backups
- Snapshot Backups

Choose the strategy based on recovery requirements.

---

# Backup Schedule

Establish schedules for:

- Daily Backups
- Weekly Full Backups
- Monthly Archives

Adjust frequency according to business requirements.

---

# Recovery Objectives

Define:

- Recovery Time Objective (RTO)
- Recovery Point Objective (RPO)

Ensure objectives align with business expectations.

---

# Backup Security

Verify:

- Encryption at Rest
- Encryption in Transit
- Access Controls
- Integrity Checks
- Secure Storage

Protect backups with the same rigor as production data.

---

# Recovery Validation

Regularly test:

- Database Restoration
- File Recovery
- Infrastructure Recovery
- Configuration Restoration
- Application Startup

A backup is only valid if recovery succeeds.

---

# Monitoring

Track:

- Backup Success Rate
- Backup Duration
- Storage Usage
- Failed Jobs
- Recovery Test Results

Configure alerts for failed backups.

---

# Workflow

```text
Identify Critical Assets

↓

Configure Backup Strategy

↓

Schedule Backups

↓

Execute Backup

↓

Verify Backup Integrity

↓

Test Recovery

↓

Review Results

↓

Document Procedures

↓

Continuously Improve
```

---

# Outputs

Generate:

- Backup Report
- Recovery Test Report
- Backup Schedule
- Recovery Procedures
- Compliance Summary

---

# Validation Checklist

Before completion verify:

- Backup schedule configured
- Critical assets protected
- Encryption enabled
- Recovery tests passed
- Documentation updated
- Alerts configured

---

# Failure Conditions

Escalate if:

- Backup jobs fail
- Recovery tests fail
- Data integrity cannot be verified
- RTO/RPO targets are not met
- Critical assets are excluded

---

# Rules

- Automate backups whenever possible.
- Test recovery on a regular schedule.
- Monitor every backup job.
- Store backups separately from production.
- Periodically review backup policies.

---

# Success Criteria

This skill succeeds when:

- all critical assets are protected
- backups complete successfully
- recovery procedures are validated
- recovery objectives are achievable
- business continuity is supported

---

# Next Skills

```text
infrastructure

↓

cost-optimization

↓

sla-slo
```

---

# Related Skills

- observability
- incident-management
- disaster-recovery
- infrastructure
- maintenance

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |