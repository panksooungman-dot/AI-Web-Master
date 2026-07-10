---
name: monitoring
description: Define monitoring, observability, alerting, and health-check standards to ensure system reliability, availability, and operational visibility.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Monitoring

## Purpose

This skill establishes monitoring and observability standards that enable proactive detection, diagnosis, and resolution of operational issues.

Monitoring should provide actionable insights into application health, infrastructure, and business services.

---

# When to Use

Execute when:

- Deploying applications
- Operating production systems
- Designing cloud infrastructure
- Implementing observability
- Managing on-call operations
- Improving system reliability

---

# Objectives

Ensure monitoring is:

- Comprehensive
- Reliable
- Actionable
- Scalable
- Automated
- Observable

---

# Inputs

Expected inputs:

- System Architecture
- Service Inventory
- Performance Requirements
- Logging Strategy
- Business SLAs
- Incident Response Procedures

---

# Monitoring Scope

Monitor:

- Applications
- APIs
- Databases
- Infrastructure
- Networks
- Cloud Services
- Background Jobs
- Third-party Integrations

Cover every production-critical component.

---

# Metrics

Collect:

- CPU Usage
- Memory Usage
- Disk Utilization
- Network Traffic
- Request Rate
- Response Time
- Error Rate
- Availability
- Queue Length
- Database Performance

Use standardized metric naming.

---

# Health Checks

Implement:

- Liveness Checks
- Readiness Checks
- Dependency Checks
- Startup Checks
- Synthetic Monitoring

Health endpoints should be lightweight and reliable.

---

# Alerting

Configure alerts for:

- High Error Rates
- Service Downtime
- Resource Exhaustion
- Performance Degradation
- Security Events
- Backup Failures

Reduce alert fatigue through proper thresholds.

---

# Dashboards

Create dashboards for:

- System Health
- Service Availability
- Performance Trends
- Error Analysis
- Capacity Planning
- Business Metrics

Provide role-specific views where appropriate.

---

# Observability

Integrate:

- Metrics
- Logs
- Distributed Traces
- Events

Correlate telemetry using trace and correlation IDs.

---

# Validation Checklist

Before completion verify:

- Critical systems monitored
- Health checks implemented
- Alerts configured
- Dashboards created
- Observability integrated
- Runbooks linked

---

# Failure Conditions

Stop and request clarification if:

- Monitoring scope is incomplete
- Alert thresholds are undefined
- Health checks are missing
- Dashboards are unavailable
- Incident response integration is absent

---

# Outputs

Generate:

- Monitoring Strategy
- Alert Configuration
- Dashboard Specification
- Health Check Guide
- Observability Checklist

---

# Rules

- Monitor business-critical services first.
- Alert only on actionable events.
- Correlate metrics, logs, and traces.
- Review alert thresholds regularly.
- Continuously improve observability.

---

# Success Criteria

This skill succeeds when:

- incidents are detected quickly
- false alerts are minimized
- system health is visible
- operational teams can diagnose issues efficiently
- service reliability improves

---

# Related Skills

- logging
- error-handling
- performance
- runbook
- incident-report

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |