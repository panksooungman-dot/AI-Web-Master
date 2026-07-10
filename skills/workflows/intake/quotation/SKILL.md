---
name: quotation
description: Estimate project scope, schedule, cost, and risks based on validated requirements before project approval.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Quotation

## Purpose

This skill creates a structured project quotation based on validated requirements.

The goal is to produce a realistic estimate of scope, timeline, cost, resources, and project risks before development begins.

A quotation should be evidence-based, transparent, and easy for both the client and project team to understand.

---

# When to Use

Execute after:

- client-inquiry
- requirement-analysis
- reference-analysis

Execute before:

- project-creation

---

# Objectives

Produce a quotation that answers:

- What will be delivered?
- How long will it take?
- How much will it cost?
- What resources are required?
- What assumptions exist?
- What risks may affect the project?

---

# Inputs

Expected inputs:

- Client Inquiry Summary
- Requirement Specification
- Reference Analysis Report
- Feature List
- Technical Constraints
- Business Goals

---

# Scope Estimation

Define:

## Included

- Features
- Pages
- APIs
- Integrations
- Admin Functions
- Deployment

---

## Excluded

Clearly list:

- Future enhancements
- Optional features
- Maintenance
- Third-party costs
- Additional revisions

---

# Work Breakdown

Estimate work by category.

Example:

- Planning
- UI/UX Design
- Frontend Development
- Backend Development
- Database
- API Integration
- Testing
- Deployment
- Documentation

---

# Schedule Estimation

Estimate:

- Project Start
- Milestones
- Development Duration
- QA Duration
- Client Review
- Deployment Date

Always include review and revision time.

---

# Resource Planning

Identify required roles.

Examples:

- Project Manager
- UI/UX Designer
- Frontend Developer
- Backend Developer
- QA Engineer
- DevOps Engineer

---

# Cost Estimation

Estimate:

- Development Cost
- Design Cost
- Infrastructure Cost
- Third-party Services
- Maintenance Cost

Clearly separate one-time and recurring costs.

---

# Risk Assessment

Identify:

- Technical Risks
- Business Risks
- Schedule Risks
- Dependency Risks
- Scope Risks

For each risk include:

- Probability
- Impact
- Mitigation Plan

---

# Assumptions

Document all assumptions.

Examples:

- Client provides content.
- Client provides logo.
- Existing API is available.
- Hosting environment is prepared.

Never hide assumptions.

---

# Deliverables

Generate:

- Quotation Summary
- Scope Definition
- Timeline
- Cost Breakdown
- Resource Plan
- Risk Assessment
- Assumptions
- Project Recommendation

---

# Workflow

```
Review Requirements

↓

Estimate Scope

↓

Estimate Resources

↓

Estimate Schedule

↓

Estimate Cost

↓

Identify Risks

↓

Generate Quotation

↓

Client Review

↓

Approval

↓

Invoke Project Creation
```

---

# Approval Checklist

Before approval confirm:

- Scope is agreed
- Timeline is accepted
- Budget is accepted
- Assumptions are acknowledged
- Risks are communicated

---

# Outputs

Produce:

- Project Quotation
- Budget Summary
- Timeline
- Scope Statement
- Risk Report
- Approval Status

---

# Success Criteria

This skill succeeds when:

- Scope is clearly defined
- Costs are justified
- Timeline is realistic
- Risks are documented
- Client approval can be requested

---

# Next Skill

After approval invoke:

```
project-creation
```

---

# Related Skills

- client-inquiry
- requirement-analysis
- reference-analysis
- project-creation
- ai-business-os-core
- communication
- documentation

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |