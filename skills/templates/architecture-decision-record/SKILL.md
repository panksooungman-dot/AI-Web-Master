---
name: architecture-decision-record
description: Document architecture decisions, rationale, alternatives, trade-offs, and consequences throughout the software lifecycle.
version: 1.0.0
author: AI Business OS
license: MIT
category: template
priority: required
---

# Architecture Decision Record (ADR)

## Purpose

This skill creates Architecture Decision Records (ADRs) that document significant technical decisions, their context, alternatives considered, and long-term consequences.

ADRs preserve architectural knowledge and support future decision-making.

---

# When to Use

Execute when:

- Selecting technologies
- Defining architecture
- Making infrastructure decisions
- Choosing design patterns
- Introducing major dependencies
- Changing architectural direction

---

# Objectives

Produce ADRs that are:

- Traceable
- Well-reasoned
- Reviewable
- Versioned
- Maintainable

---

# Inputs

Expected inputs:

- Business Requirements
- Technical Constraints
- Quality Attributes
- Existing Architecture
- Stakeholder Feedback
- Risk Assessment

---

# ADR Structure

Generate the following sections:

- ADR ID
- Title
- Status
- Date
- Authors
- Context
- Problem Statement
- Decision
- Alternatives Considered
- Decision Drivers
- Consequences
- Risks
- Follow-up Actions
- References

---

# Context

Describe:

- Business Background
- Technical Environment
- Constraints
- Assumptions
- Existing Architecture

Provide enough information to understand why the decision was necessary.

---

# Decision

Document:

- Selected Solution
- Scope
- Implementation Guidance
- Expected Benefits

Keep the decision concise and explicit.

---

# Alternatives

For each alternative include:

- Description
- Advantages
- Disadvantages
- Reason for Rejection

Evaluate objectively.

---

# Consequences

Identify:

- Positive Outcomes
- Negative Impacts
- Technical Debt
- Operational Changes
- Maintenance Considerations

Consider both short-term and long-term effects.

---

# Decision Drivers

Evaluate factors such as:

- Scalability
- Security
- Performance
- Cost
- Maintainability
- Team Expertise
- Business Value

---

# Validation Checklist

Verify:

- Context documented
- Decision justified
- Alternatives evaluated
- Risks identified
- Consequences explained
- References included

---

# Failure Conditions

Stop if:

- Context is incomplete
- Decision lacks justification
- Alternatives are missing
- Risks are not assessed
- Scope is unclear

---

# Outputs

Generate:

- Architecture Decision Record
- Decision Summary
- Alternative Comparison
- Risk Assessment

---

# Rules

- Record significant decisions only.
- Explain the rationale clearly.
- Document rejected alternatives.
- Keep ADRs immutable after acceptance.
- Link related ADRs when applicable.

---

# Success Criteria

This skill succeeds when:

- architectural decisions are understandable
- rationale is preserved
- future teams can trace decisions
- technical governance is improved

---

# Related Skills

- solution-architect
- backend-engineer
- api-spec
- database-schema
- project-plan

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |