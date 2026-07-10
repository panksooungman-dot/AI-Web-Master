---
name: infrastructure
description: Design, provision, manage, and maintain reliable, scalable, secure, and automated infrastructure that supports production applications.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Infrastructure

## Purpose

This skill defines how infrastructure is planned, provisioned, operated, and maintained throughout the application lifecycle.

The objective is to provide a secure, scalable, reliable, and maintainable foundation for all production workloads.

Infrastructure should be automated and reproducible whenever possible.

---

# When to Use

Execute after:

- operations/backup-recovery

Execute before:

- cost-optimization
- sla-slo
- disaster-recovery

---

# Objectives

Ensure infrastructure is:

- Reliable
- Scalable
- Secure
- Automated
- Observable

---

# Inputs

Expected inputs:

- Architecture Document
- Infrastructure Requirements
- Capacity Plan
- Security Policies
- Network Configuration
- Disaster Recovery Plan

---

# Infrastructure Components

Manage:

- Compute Resources
- Containers
- Kubernetes Clusters
- Virtual Machines
- Networking
- Storage
- Load Balancers
- DNS

---

# Infrastructure as Code

Use Infrastructure as Code (IaC) for:

- Provisioning
- Configuration
- Version Control
- Review
- Automation

Avoid manual infrastructure changes whenever possible.

---

# Networking

Verify:

- Network Segmentation
- Firewalls
- DNS Configuration
- TLS Certificates
- VPN Access
- Load Balancing

---

# Security

Ensure:

- Least Privilege Access
- IAM Policies
- Secret Management
- Network Security
- Patch Management
- Compliance Requirements

---

# Scalability

Support:

- Horizontal Scaling
- Vertical Scaling
- Auto Scaling
- Load Distribution
- Capacity Planning

---

# High Availability

Provide:

- Redundant Services
- Multi-zone Deployment
- Health Checks
- Automatic Failover
- Resilient Networking

---

# Maintenance

Regularly perform:

- OS Updates
- Security Patching
- Capacity Reviews
- Infrastructure Audits
- Resource Cleanup

---

# Documentation

Maintain:

- Infrastructure Diagrams
- Network Topology
- Runbooks
- Deployment Procedures
- Configuration Inventory

---

# Workflow

```text
Review Requirements

↓

Provision Infrastructure

↓

Configure Networking

↓

Apply Security Policies

↓

Deploy Services

↓

Validate Health

↓

Monitor Infrastructure

↓

Document Configuration

↓

Review and Improve
```

---

# Outputs

Generate:

- Infrastructure Documentation
- Network Diagram
- Configuration Inventory
- Capacity Report
- Operational Runbooks

---

# Validation Checklist

Before completion verify:

- Infrastructure provisioned
- IaC validated
- Security controls applied
- High availability configured
- Monitoring enabled
- Documentation updated

---

# Failure Conditions

Escalate if:

- Infrastructure provisioning fails
- Security policies are violated
- Capacity limits are exceeded
- High availability is unavailable
- Critical services cannot be deployed

---

# Rules

- Automate infrastructure provisioning.
- Use Infrastructure as Code for all environments.
- Minimize manual configuration.
- Continuously review capacity and security.
- Document every infrastructure change.

---

# Success Criteria

This skill succeeds when:

- infrastructure is stable
- environments are reproducible
- security requirements are satisfied
- scalability goals are met
- operational readiness is achieved

---

# Next Skills

```text
cost-optimization

↓

sla-slo

↓

disaster-recovery
```

---

# Related Skills

- backup-recovery
- observability
- incident-management
- disaster-recovery
- deployment

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |