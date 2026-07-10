---
name: disaster-recovery
description: Plan, validate, and execute disaster recovery procedures to restore critical systems and business operations after catastrophic failures.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Disaster Recovery

## Purpose

This skill defines how catastrophic failures are managed to restore critical services, protect data, and maintain business continuity.

The objective is to minimize downtime, reduce data loss, and ensure recovery through documented, tested, and repeatable disaster recovery procedures.

Disaster recovery planning must be completed before disasters occur.

---

# When to Use

Execute after:

- operations/sla-slo

Execute before:

- Continuous Operations
- Operational Review

---

# Objectives

Ensure disaster recovery is:

- Reliable
- Repeatable
- Tested
- Secure
- Business-aligned

---

# Inputs

Expected inputs:

- Business Continuity Plan
- Infrastructure Documentation
- Backup & Recovery Strategy
- Monitoring Reports
- Incident Reports
- Recovery Objectives (RTO/RPO)

---

# Disaster Scenarios

Prepare for:

- Data Center Failure
- Cloud Region Outage
- Database Corruption
- Network Failure
- Ransomware Attack
- Security Breach
- Infrastructure Misconfiguration
- Natural Disasters

Document assumptions for each scenario.

---

# Recovery Objectives

Define:

- Recovery Time Objective (RTO)
- Recovery Point Objective (RPO)

Recovery targets should align with business priorities.

---

# Critical Services

Identify:

- Business-critical Applications
- Databases
- Authentication Services
- Payment Systems
- DNS
- Networking
- Third-party Dependencies

Prioritize recovery by business impact.

---

# Recovery Strategy

Plan:

- Failover Procedures
- Data Restoration
- Infrastructure Rebuild
- Service Verification
- Traffic Redirection
- Customer Communication

Automate recovery steps whenever practical.

---

# Disaster Recovery Testing

Perform regular:

- Tabletop Exercises
- Backup Restoration Tests
- Failover Tests
- Full Disaster Simulations

Review and improve after every exercise.

---

# Communication

Define communication for:

- Internal Teams
- Leadership
- Customers
- Partners
- Vendors

Provide timely and accurate updates.

---

# Post-Recovery Review

Document:

- Recovery Timeline
- Impact Assessment
- Root Cause
- Lessons Learned
- Improvement Actions

Update the disaster recovery plan based on findings.

---

# Workflow

```text
Detect Disaster

↓

Assess Impact

↓

Declare Disaster

↓

Activate Recovery Plan

↓

Restore Critical Services

↓

Validate Recovery

↓

Resume Operations

↓

Conduct Postmortem

↓

Improve Recovery Plan
```

---

# Outputs

Generate:

- Disaster Recovery Plan
- Recovery Test Report
- Recovery Timeline
- Impact Assessment
- Postmortem Report
- Improvement Roadmap

---

# Validation Checklist

Before completion verify:

- Recovery procedures documented
- RTO/RPO validated
- Recovery testing completed
- Critical services prioritized
- Communication plan established
- Documentation updated

---

# Failure Conditions

Escalate immediately if:

- Recovery objectives cannot be met
- Critical data is permanently lost
- Recovery procedures fail
- Communication breaks down
- Business continuity is compromised

---

# Rules

- Test recovery regularly.
- Automate recovery where feasible.
- Prioritize critical business services.
- Keep recovery documentation current.
- Learn from every recovery exercise.

---

# Success Criteria

This skill succeeds when:

- disaster recovery procedures are validated
- critical services can be restored within target objectives
- business continuity is maintained
- recovery plans are continuously improved
- operational resilience is strengthened

---

# Next Skills

```text
Continuous Improvement

↓

Next Release Cycle

↓

Strategic Planning
```

---

# Related Skills

- backup-recovery
- incident-management
- observability
- infrastructure
- sla-slo

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |