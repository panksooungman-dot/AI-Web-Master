---
name: sla-slo
description: Define, measure, and manage Service Level Agreements (SLAs), Service Level Objectives (SLOs), and Service Level Indicators (SLIs) to ensure reliable and measurable service quality.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# SLA & SLO Management

## Purpose

This skill defines how service reliability is measured, monitored, and managed using SLAs, SLOs, and SLIs.

The objective is to establish measurable reliability targets, monitor operational performance, and continuously improve service quality.

Reliability targets should align with business expectations.

---

# When to Use

Execute after:

- operations/cost-optimization

Execute before:

- disaster-recovery

---

# Objectives

Ensure services are:

- Reliable
- Measurable
- Transparent
- Accountable
- Continuously Improving

---

# Inputs

Expected inputs:

- Business Requirements
- Customer Commitments
- Monitoring Metrics
- Incident Reports
- Availability Reports
- Performance Reports

---

# Service Definitions

Define:

- Service Name
- Service Owner
- Criticality
- Dependencies
- Customer Impact

Every production service must have a documented owner.

---

# Service Level Indicators (SLIs)

Measure indicators such as:

- Availability
- Latency
- Error Rate
- Throughput
- Success Rate
- Recovery Time

SLIs should be measurable through monitoring systems.

---

# Service Level Objectives (SLOs)

Define objectives for each SLI.

Examples:

- Availability ≥ 99.9%
- API Response Time < 300ms
- Error Rate < 0.1%
- Authentication Success Rate ≥ 99.95%

Objectives should be realistic and evidence-based.

---

# Service Level Agreements (SLAs)

Document:

- Availability Commitments
- Support Hours
- Response Times
- Resolution Times
- Escalation Procedures
- Customer Compensation Policies (if applicable)

SLAs represent commitments to customers.

---

# Error Budget

Define:

- Allowed Downtime
- Error Budget Consumption
- Burn Rate
- Freeze Policies

Use error budgets to balance innovation and reliability.

---

# Monitoring

Continuously monitor:

- SLI Performance
- SLO Compliance
- SLA Compliance
- Error Budget Usage
- Incident Trends

Alerts should trigger before commitments are violated.

---

# Reporting

Generate reports for:

- Engineering
- Product
- Customer Success
- Leadership

Reports should include trends, violations, and improvement actions.

---

# Continuous Improvement

Review:

- Repeated Incidents
- Missed Objectives
- Capacity Constraints
- Customer Feedback

Update targets as the service evolves.

---

# Workflow

```text
Define Services

↓

Define SLIs

↓

Set SLO Targets

↓

Establish SLAs

↓

Configure Monitoring

↓

Track Compliance

↓

Review Reports

↓

Improve Reliability
```

---

# Outputs

Generate:

- SLA Documentation
- SLO Definitions
- SLI Dashboard
- Error Budget Report
- Reliability Review

---

# Validation Checklist

Before completion verify:

- SLIs measurable
- SLOs documented
- SLAs approved
- Monitoring configured
- Error budgets tracked
- Owners assigned

---

# Failure Conditions

Escalate if:

- SLA violations occur
- SLO targets are repeatedly missed
- SLIs cannot be measured
- Error budget is exhausted
- Service ownership is unclear

---

# Rules

- Measure before committing.
- Keep objectives realistic.
- Review reliability regularly.
- Use data to guide improvements.
- Communicate SLA impacts clearly.

---

# Success Criteria

This skill succeeds when:

- service reliability is measurable
- SLOs are consistently monitored
- SLA commitments are met
- error budgets are managed effectively
- operational reliability improves over time

---

# Next Skills

```text
disaster-recovery
```

---

# Related Skills

- monitoring
- observability
- incident-management
- disaster-recovery
- performance

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |