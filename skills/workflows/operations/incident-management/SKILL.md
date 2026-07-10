---
name: incident-management
description: Detect, assess, respond to, resolve, and review production incidents to minimize customer impact and continuously improve operational reliability.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Incident Management

## Purpose

This skill defines how production incidents are managed throughout their lifecycle.

The objective is to restore normal service as quickly as possible while minimizing customer impact and capturing lessons learned for continuous improvement.

Incident response should follow a standardized, repeatable process.

---

# When to Use

Execute after:

- release/monitoring

Execute before:

- operations/observability
- operations/backup-recovery

---

# Objectives

Ensure incidents are:

- Detected
- Assessed
- Contained
- Resolved
- Reviewed
- Documented

---

# Inputs

Expected inputs:

- Monitoring Alerts
- Incident Reports
- System Logs
- Metrics
- Customer Reports
- Health Checks

---

# Incident Classification

Classify incidents by severity.

Levels:

- SEV-1 — Critical outage
- SEV-2 — Major degradation
- SEV-3 — Partial functionality loss
- SEV-4 — Minor issue

Severity determines response urgency.

---

# Detection

Incidents may originate from:

- Monitoring Alerts
- User Reports
- Error Logs
- Automated Health Checks
- Security Alerts
- Internal Teams

Every incident must have a recorded source.

---

# Initial Assessment

Determine:

- Impact
- Scope
- Severity
- Affected Services
- Business Risk
- Customer Impact

Assign an Incident Commander for major incidents.

---

# Response

Perform:

- Acknowledge Incident
- Assemble Response Team
- Stabilize Service
- Contain Impact
- Investigate Root Cause
- Restore Service

Prioritize restoration over permanent fixes.

---

# Communication

Notify:

- Engineering
- Product
- Customer Support
- Leadership
- Customers (if required)

Provide regular status updates.

---

# Escalation

Escalate when:

- SLA is at risk
- Multiple services are affected
- Data integrity is threatened
- Security incidents occur
- Customer impact increases

---

# Resolution

Verify:

- Services restored
- Monitoring stable
- Customer impact resolved
- Temporary mitigations removed

---

# Post-Incident Review

Document:

- Timeline
- Root Cause
- Contributing Factors
- Resolution
- Lessons Learned
- Preventive Actions

Conduct blameless postmortems.

---

# Incident Lifecycle

```text
Detect

↓

Assess

↓

Classify

↓

Respond

↓

Contain

↓

Resolve

↓

Verify

↓

Review

↓

Improve
```

---

# Outputs

Generate:

- Incident Report
- Timeline
- Root Cause Analysis
- Postmortem Report
- Action Items
- Operational Improvements

---

# Validation Checklist

Before completion verify:

- Incident resolved
- Customer impact documented
- Root cause identified
- Preventive actions defined
- Documentation completed
- Stakeholders informed

---

# Failure Conditions

Escalate immediately if:

- Incident severity increases
- Recovery attempts fail
- Customer impact expands
- Data integrity is compromised
- Security risks are identified

---

# Rules

- Restore service before optimizing.
- Follow documented escalation paths.
- Maintain accurate timelines.
- Communicate frequently during incidents.
- Conduct blameless postmortems.

---

# Success Criteria

This skill succeeds when:

- service is restored
- incident is fully documented
- root cause is understood
- preventive actions are assigned
- operational resilience improves

---

# Next Skills

```text
observability

↓

backup-recovery

↓

infrastructure
```

---

# Related Skills

- monitoring
- rollback
- maintenance
- observability
- backup-recovery

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |