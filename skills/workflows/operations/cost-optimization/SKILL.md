---
name: cost-optimization
description: Continuously analyze, control, and optimize infrastructure and operational costs while maintaining required performance, reliability, and business value.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Cost Optimization

## Purpose

This skill defines how operational and infrastructure costs are monitored, analyzed, and optimized throughout the application lifecycle.

The objective is to maximize business value while minimizing unnecessary spending without sacrificing reliability, security, or user experience.

Cost optimization is an ongoing operational practice.

---

# When to Use

Execute after:

- operations/infrastructure

Execute before:

- sla-slo
- disaster-recovery

---

# Objectives

Ensure operations are:

- Cost-efficient
- Sustainable
- Scalable
- Measurable
- Business-aligned

---

# Inputs

Expected inputs:

- Cloud Billing Reports
- Infrastructure Inventory
- Usage Metrics
- Capacity Reports
- Monitoring Data
- Business Forecasts

---

# Cost Categories

Analyze:

- Compute
- Storage
- Networking
- Databases
- CDN
- Third-party Services
- Licensing
- Operational Labor

---

# Resource Utilization

Review:

- CPU Usage
- Memory Usage
- Disk Utilization
- Network Traffic
- Idle Resources
- Over-provisioned Services

Identify unused or oversized resources.

---

# Optimization Strategies

Apply:

- Right-sizing
- Auto Scaling
- Reserved Capacity
- Spot/Preemptible Instances
- Storage Tiering
- Resource Scheduling
- Service Consolidation

Optimize based on measured usage.

---

# Cost Monitoring

Track:

- Daily Spend
- Monthly Spend
- Cost Trends
- Budget Utilization
- Cost per User
- Cost per Transaction

Review deviations regularly.

---

# Budget Management

Define:

- Budgets
- Spending Limits
- Forecasts
- Alerts
- Approval Thresholds

Notify stakeholders before budget overruns occur.

---

# FinOps Practices

Promote:

- Cost Visibility
- Shared Ownership
- Continuous Optimization
- Business Value Measurement
- Cost Accountability

Integrate financial awareness into engineering decisions.

---

# Reporting

Generate reports for:

- Engineering
- Finance
- Product
- Leadership

Reports should include actionable recommendations.

---

# Workflow

```text
Collect Cost Data

↓

Analyze Resource Usage

↓

Identify Waste

↓

Evaluate Optimization Opportunities

↓

Implement Improvements

↓

Measure Savings

↓

Review Budget

↓

Document Results

↓

Repeat Continuously
```

---

# Outputs

Generate:

- Cost Analysis Report
- Optimization Plan
- Budget Report
- Savings Summary
- Resource Utilization Report

---

# Validation Checklist

Before completion verify:

- Costs analyzed
- Waste identified
- Optimization actions documented
- Budgets reviewed
- Alerts configured
- Savings measured

---

# Failure Conditions

Escalate if:

- Budget thresholds exceeded
- Resource waste is significant
- Unexpected spending occurs
- Cost visibility is unavailable
- Optimization negatively impacts reliability

---

# Rules

- Optimize based on real usage data.
- Never reduce reliability solely to save cost.
- Review costs continuously.
- Automate cost monitoring where possible.
- Balance cost with business value.

---

# Success Criteria

This skill succeeds when:

- infrastructure costs are optimized
- spending remains within budget
- resource utilization improves
- operational efficiency increases
- financial objectives are achieved

---

# Next Skills

```text
sla-slo

↓

disaster-recovery
```

---

# Related Skills

- infrastructure
- observability
- backup-recovery
- disaster-recovery
- monitoring

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |