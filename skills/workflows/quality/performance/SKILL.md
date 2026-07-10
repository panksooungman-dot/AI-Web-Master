---
name: performance
description: Evaluate and optimize application performance to ensure responsiveness, scalability, efficiency, and production readiness under expected workloads.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Performance

## Purpose

This skill evaluates and optimizes application performance across the frontend, backend, database, APIs, and infrastructure.

The objective is to ensure the application remains fast, scalable, and stable under realistic workloads.

Performance optimization should be driven by measurable evidence.

---

# When to Use

Execute after:

- quality/security-review

Execute before:

- accessibility
- bug-triage
- regression-testing
- release/deployment

---

# Objectives

Verify the application is:

- Fast
- Scalable
- Efficient
- Stable
- Resource-conscious

---

# Inputs

Expected inputs:

- Integrated Application
- Architecture Document
- API Documentation
- Database Schema
- Test Results
- Monitoring Metrics

---

# Performance Areas

Evaluate:

- Frontend Rendering
- Backend Processing
- API Latency
- Database Queries
- Memory Usage
- CPU Usage
- Network Performance

---

# Frontend Performance

Measure:

- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Interaction to Next Paint (INP)
- Cumulative Layout Shift (CLS)
- Bundle Size
- Image Optimization

Optimize only after measurement.

---

# Backend Performance

Review:

- Request Latency
- Throughput
- Response Time
- Background Jobs
- Queue Processing
- Resource Utilization

---

# API Performance

Validate:

- Response Time
- Pagination
- Filtering
- Compression
- Caching
- Concurrent Requests

---

# Database Performance

Analyze:

- Query Execution Time
- Index Usage
- Slow Queries
- Connection Pooling
- Transaction Efficiency

---

# Load Testing

Simulate:

- Normal Traffic
- Peak Traffic
- Stress Conditions
- Spike Loads
- Long-running Sessions

Measure system behavior throughout.

---

# Scalability

Verify:

- Horizontal Scaling
- Vertical Scaling
- Caching Strategy
- CDN Usage
- Queue Processing

---

# Monitoring

Review:

- Application Metrics
- Error Rates
- Response Times
- Resource Usage
- Availability

Ensure alerts are configured for critical thresholds.

---

# Optimization Strategy

Prioritize improvements by:

1. High Business Impact
2. High Frequency
3. Low Implementation Cost

Avoid premature optimization.

---

# Workflow

```text
Review Metrics

↓

Benchmark Application

↓

Analyze Bottlenecks

↓

Optimize Performance

↓

Re-test

↓

Compare Results

↓

Document Improvements

↓

Approve Performance
```

---

# Outputs

Generate:

- Performance Report
- Benchmark Results
- Bottleneck Analysis
- Optimization Recommendations
- Scalability Assessment

---

# Validation Checklist

Before completion verify:

- Performance targets met
- No critical bottlenecks
- Slow queries optimized
- Frontend metrics acceptable
- API latency acceptable
- Monitoring configured

---

# Failure Conditions

Stop and request optimization if:

- Response times exceed targets
- Resource usage is excessive
- Critical bottlenecks remain
- Load tests fail
- Scalability risks are unresolved

---

# Rules

- Measure before optimizing.
- Optimize the highest-impact bottlenecks first.
- Keep performance improvements measurable.
- Avoid sacrificing maintainability for minor gains.

---

# Success Criteria

This skill succeeds when:

- performance targets are achieved
- application scales predictably
- bottlenecks are documented or resolved
- system is ready for accessibility validation

---

# Next Skills

```text
accessibility

↓

bug-triage

↓

regression-testing
```

---

# Related Skills

- testing
- security-review
- accessibility
- regression-testing
- deployment

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |