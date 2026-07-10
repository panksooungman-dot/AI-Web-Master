---
name: maintenance
description: Maintain, improve, and support production systems after release through continuous monitoring, issue resolution, updates, and operational excellence.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Maintenance

## Purpose

This skill defines how production systems are maintained after deployment.

The objective is to ensure long-term reliability, security, performance, and business continuity through proactive maintenance and continuous improvement.

Maintenance is an ongoing operational responsibility.

---

# When to Use

Execute after:

- release/deployment
- release/monitoring
- release/rollback

Execute before:

- changelog
- release-note

---

# Objectives

Maintain systems that are:

- Reliable
- Secure
- Available
- Performant
- Continuously Improving

---

# Inputs

Expected inputs:

- Monitoring Reports
- Incident Reports
- User Feedback
- Performance Metrics
- Security Advisories
- Product Roadmap

---

# Maintenance Activities

Perform:

- Bug Fixes
- Security Updates
- Dependency Updates
- Performance Improvements
- Infrastructure Maintenance
- Database Maintenance
- Documentation Updates

---

# Preventive Maintenance

Schedule regular:

- Dependency Audits
- Certificate Renewal
- Backup Verification
- Database Optimization
- Log Cleanup
- Capacity Planning

Prevent issues before they impact users.

---

# Corrective Maintenance

Address:

- Production Bugs
- Security Vulnerabilities
- Service Failures
- Performance Bottlenecks
- Configuration Issues

Prioritize customer impact.

---

# Adaptive Maintenance

Update systems to support:

- New Platforms
- Browser Changes
- Operating System Updates
- API Changes
- Third-party Service Changes

Ensure continued compatibility.

---

# Perfective Maintenance

Improve:

- Performance
- Maintainability
- Code Quality
- User Experience
- Operational Efficiency

Focus on long-term value.

---

# Incident Management

For every incident:

- Identify
- Classify
- Resolve
- Verify
- Document
- Review

Conduct post-incident reviews for major events.

---

# Operational Metrics

Track:

- Uptime
- MTTR (Mean Time to Recovery)
- MTBF (Mean Time Between Failures)
- Incident Frequency
- Customer Impact
- SLA Compliance

Review trends regularly.

---

# Documentation

Maintain:

- Runbooks
- Architecture Documents
- Operational Procedures
- Incident Reports
- Maintenance Logs

Documentation should remain current.

---

# Workflow

```text
Monitor Production

↓

Identify Issue

↓

Assess Impact

↓

Plan Maintenance

↓

Implement Changes

↓

Validate Results

↓

Update Documentation

↓

Review Metrics

↓

Plan Improvements
```

---

# Outputs

Generate:

- Maintenance Report
- Incident Summary
- Improvement Plan
- Updated Documentation
- Operational Metrics Report

---

# Validation Checklist

Before completion verify:

- Issues resolved
- Monitoring reviewed
- Documentation updated
- Metrics analyzed
- Maintenance logged
- Improvement actions identified

---

# Failure Conditions

Escalate if:

- Recurring incidents increase
- SLA targets are missed
- Critical vulnerabilities remain
- System stability degrades
- Operational procedures are outdated

---

# Rules

- Prioritize production stability.
- Automate repetitive maintenance tasks.
- Document every operational change.
- Learn from every incident.
- Continuously improve operational processes.

---

# Success Criteria

This skill succeeds when:

- production systems remain stable
- operational metrics meet targets
- incidents are resolved efficiently
- documentation is current
- the system is prepared for future releases

---

# Next Skills

```text
changelog

↓

release-note
```

---

# Related Skills

- deployment
- monitoring
- rollback
- changelog
- release-note
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |