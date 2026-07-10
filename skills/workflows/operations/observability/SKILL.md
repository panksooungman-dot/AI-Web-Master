---
name: observability
description: Collect, correlate, and analyze logs, metrics, and traces to understand system behavior, diagnose issues, and improve operational reliability.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Observability

## Purpose

This skill defines how production systems are observed using logs, metrics, traces, and events.

The objective is to understand internal system behavior, quickly diagnose failures, and improve operational reliability.

Observability enables engineers to answer unknown questions about system behavior without requiring additional instrumentation.

---

# When to Use

Execute after:

- operations/incident-management

Execute before:

- backup-recovery
- infrastructure

---

# Objectives

Ensure systems are:

- Observable
- Measurable
- Traceable
- Diagnosable
- Reliable

---

# Inputs

Expected inputs:

- Application Logs
- Infrastructure Metrics
- Distributed Traces
- Monitoring Dashboards
- Incident Reports
- Health Checks

---

# Three Pillars

Collect and correlate:

- Logs
- Metrics
- Traces

Use all three together for effective diagnosis.

---

# Logging

Collect:

- Application Logs
- Access Logs
- Error Logs
- Audit Logs
- Security Logs

Logs should include:

- Timestamp
- Severity
- Service
- Request ID
- User ID (when appropriate)
- Correlation ID

---

# Metrics

Track:

- Request Rate
- Error Rate
- Response Time
- CPU Usage
- Memory Usage
- Disk Usage
- Network Throughput
- Queue Length

Monitor trends over time.

---

# Distributed Tracing

Capture:

- Request Flow
- Service Dependencies
- API Calls
- Database Queries
- External Services

Every request should be traceable across services.

---

# Dashboards

Provide dashboards for:

- Operations
- Engineering
- Product
- Business

Dashboards should present actionable information.

---

# Alert Correlation

Correlate:

- Logs
- Metrics
- Traces
- Alerts
- Incidents

Avoid isolated analysis.

---

# Root Cause Analysis

Use observability data to identify:

- Failure Origin
- Performance Bottlenecks
- Resource Constraints
- Dependency Failures

Document findings for future improvements.

---

# Data Retention

Define policies for:

- Log Retention
- Metric Retention
- Trace Retention
- Archive Strategy

Meet organizational and compliance requirements.

---

# Workflow

```text
Collect Telemetry

↓

Aggregate Data

↓

Correlate Signals

↓

Visualize Dashboards

↓

Detect Anomalies

↓

Investigate Issues

↓

Identify Root Cause

↓

Document Findings

↓

Improve Instrumentation
```

---

# Outputs

Generate:

- Observability Dashboard
- Metrics Report
- Trace Analysis
- Log Analysis
- Root Cause Report

---

# Validation Checklist

Before completion verify:

- Logs centralized
- Metrics collected
- Traces available
- Dashboards operational
- Correlation working
- Retention policies configured

---

# Failure Conditions

Escalate if:

- Logs are missing
- Metrics are incomplete
- Traces cannot be correlated
- Critical services are unobservable
- Monitoring gaps prevent diagnosis

---

# Rules

- Instrument systems before incidents occur.
- Use structured logging.
- Correlate telemetry with incidents.
- Minimize noise while maximizing visibility.
- Continuously improve instrumentation.

---

# Success Criteria

This skill succeeds when:

- system behavior is observable
- incidents can be diagnosed efficiently
- telemetry supports root cause analysis
- operational visibility is complete

---

# Next Skills

```text
backup-recovery

↓

infrastructure

↓

cost-optimization
```

---

# Related Skills

- incident-management
- monitoring
- backup-recovery
- infrastructure
- performance

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |