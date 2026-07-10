---
name: monitoring
description: Continuously observe application health, performance, reliability, and business metrics after deployment to detect issues early and support operational excellence.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Monitoring

## Purpose

This skill defines how production systems are monitored after deployment.

The objective is to detect failures, performance degradation, and abnormal business behavior before users are significantly impacted.

Monitoring should provide actionable insights, not just raw metrics.

---

# When to Use

Execute after:

- release/deployment

Execute before:

- release/rollback
- release/maintenance

---

# Objectives

Monitor systems that are:

- Healthy
- Reliable
- Observable
- Performant
- Secure

---

# Inputs

Expected inputs:

- Production Environment
- Deployment Report
- Infrastructure Configuration
- Application Logs
- Monitoring Configuration
- Alert Policies

---

# Monitoring Areas

Observe:

- Application Health
- API Availability
- Database Health
- Background Jobs
- Authentication
- Payment Processing
- External Services
- Infrastructure

---

# Key Metrics

Collect:

- Response Time
- Request Rate
- Error Rate
- CPU Usage
- Memory Usage
- Disk Usage
- Network Traffic
- Queue Length

Track trends over time.

---

# Application Monitoring

Verify:

- Health Endpoints
- Error Logs
- Exception Rates
- User Sessions
- Active Connections
- Deployment Version

---

# Infrastructure Monitoring

Monitor:

- Servers
- Containers
- Kubernetes
- Load Balancers
- CDN
- Object Storage
- Message Queues

Infrastructure should remain observable.

---

# Business Metrics

Track KPIs such as:

- Active Users
- Sign-ups
- Orders
- Payments
- Conversion Rate
- Revenue
- Failed Transactions

Technical health alone is insufficient.

---

# Alerting

Configure alerts for:

- High Error Rate
- Increased Latency
- Service Unavailable
- Database Failure
- Payment Failure
- Authentication Failure
- Resource Exhaustion

Alerts should include severity and escalation paths.

---

# Logging

Collect:

- Application Logs
- Access Logs
- Audit Logs
- Security Events
- Infrastructure Logs

Centralize logs whenever possible.

---

# Dashboards

Create dashboards for:

- Operations
- Engineering
- Business
- Security

Use clear visualizations and meaningful thresholds.

---

# Incident Detection

Define procedures for:

- Detection
- Classification
- Escalation
- Communication
- Resolution

Document response ownership.

---

# Workflow

```text
Review Deployment

↓

Verify Monitoring Configuration

↓

Collect Metrics

↓

Analyze Health

↓

Detect Incidents

↓

Generate Alerts

↓

Review Dashboards

↓

Document Findings

↓

Escalate if Required
```

---

# Outputs

Generate:

- Monitoring Dashboard
- Alert Configuration
- Health Report
- Incident Summary
- KPI Report

---

# Validation Checklist

Before completion verify:

- Metrics collected
- Alerts configured
- Dashboards available
- Logs centralized
- Health checks operational
- Escalation procedures documented

---

# Failure Conditions

Escalate immediately if:

- Critical services become unavailable
- Error rates exceed thresholds
- Performance degrades significantly
- Security incidents are detected
- Business-critical KPIs drop unexpectedly

---

# Rules

- Monitor continuously.
- Alert on actionable conditions only.
- Keep dashboards simple and meaningful.
- Review monitoring after every deployment.
- Continuously refine alert thresholds.

---

# Success Criteria

This skill succeeds when:

- production health is continuously observable
- incidents are detected quickly
- alerts reach the correct responders
- business and technical metrics are visible
- the system is ready for rollback or ongoing maintenance if needed

---

# Next Skills

```text
rollback

↓

maintenance

↓

changelog
```

---

# Related Skills

- deployment
- rollback
- maintenance
- changelog
- release-note
- performance

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |