---
name: performance
description: Define performance engineering principles, optimization strategies, scalability guidelines, and performance validation practices across all systems.
version: 1.0.0
author: AI Business OS
license: MIT
category: shared
priority: required
---

# Performance

## Purpose

This skill establishes performance engineering standards to ensure applications, APIs, databases, and infrastructure deliver reliable, scalable, and efficient performance.

Performance should be considered throughout the software lifecycle rather than as a post-deployment activity.

---

# When to Use

Execute when:

- Designing system architecture
- Developing new features
- Optimizing applications
- Scaling infrastructure
- Performing load testing
- Investigating performance issues

---

# Objectives

Ensure systems are:

- Fast
- Scalable
- Efficient
- Reliable
- Observable
- Cost-effective

---

# Inputs

Expected inputs:

- Business Requirements
- Performance Targets
- System Architecture
- Usage Patterns
- Capacity Estimates
- Infrastructure Constraints

---

# Performance Goals

Define measurable objectives for:

- Response Time
- Throughput
- Latency
- Availability
- Concurrent Users
- Resource Utilization
- Cost Efficiency

Every target should be measurable and testable.

---

# Optimization Areas

Optimize:

- Application Code
- Database Queries
- API Responses
- Caching
- Network Communication
- File Processing
- Background Jobs

Measure before and after every optimization.

---

# Scalability

Design for:

- Horizontal Scaling
- Vertical Scaling
- Stateless Services
- Load Balancing
- Auto Scaling
- Distributed Processing

Eliminate single points of failure where practical.

---

# Resource Management

Monitor and optimize:

- CPU Usage
- Memory Usage
- Disk I/O
- Network Bandwidth
- Database Connections
- Thread Pools

Prevent resource exhaustion.

---

# Performance Testing

Include:

- Load Testing
- Stress Testing
- Spike Testing
- Soak Testing
- Capacity Testing
- Benchmark Testing

Validate results against predefined targets.

---

# Monitoring

Track:

- Response Times
- Error Rates
- Throughput
- Resource Consumption
- Queue Lengths
- Cache Performance

Integrate with centralized monitoring platforms.

---

# Validation Checklist

Before completion verify:

- Performance targets defined
- Scalability strategy documented
- Performance tests completed
- Bottlenecks identified
- Monitoring configured
- Optimization validated

---

# Failure Conditions

Stop and request clarification if:

- Performance goals are undefined
- Capacity estimates are unavailable
- Testing strategy is missing
- Monitoring is incomplete
- Optimization cannot be measured

---

# Outputs

Generate:

- Performance Strategy
- Optimization Plan
- Performance Test Plan
- Capacity Plan
- Performance Checklist

---

# Rules

- Measure before optimizing.
- Optimize the highest-impact bottlenecks first.
- Define measurable performance targets.
- Design for scalability from the beginning.
- Continuously monitor production performance.

---

# Success Criteria

This skill succeeds when:

- performance targets are achieved
- systems scale predictably
- bottlenecks are identified early
- resource utilization is optimized
- user experience remains responsive

---

# Related Skills

- monitoring
- database
- api-design
- testing
- logging

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |