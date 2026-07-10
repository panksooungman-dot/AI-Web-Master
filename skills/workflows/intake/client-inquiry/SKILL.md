---
name: client-inquiry
description: Receive, organize, and validate client inquiries before creating a project. Collect all required business information, requirements, references, and constraints.
version: 1.0.0
author: AI Business OS
license: MIT
category: workflow
priority: required
---

# Client Inquiry

## Purpose

This skill manages the first stage of every project.

Its goal is to collect complete and accurate information before planning or development begins.

A project should never start with incomplete requirements.

---

# When to Use

Use this skill whenever:

- A new client contacts you
- A new project is requested
- Additional project requirements are received
- Existing requirements are updated

This is the first workflow skill executed for every project.

---

# Objectives

Collect enough information to answer:

- What does the client want?
- Why is the project needed?
- Who are the users?
- What references exist?
- What constraints exist?
- Is the request complete enough to begin planning?

---

# Required Information

## Client Information

Collect:

- Client Name
- Company
- Contact Information
- Preferred Communication Method

---

## Project Information

Collect:

- Project Name
- Project Type
- Business Goal
- Target Users
- Expected Launch Date
- Budget (if available)

---

## Requirements

Identify:

- Core Features
- Nice-to-have Features
- Excluded Features
- Success Criteria
- Constraints

Separate facts from assumptions.

---

## References

Collect every available reference.

Examples:

- Website URLs
- Figma
- PDF
- PowerPoint
- Images
- Competitor Services
- Existing Products

Never ignore reference material.

---

## Technical Constraints

Determine whether the client has requirements for:

- Framework
- Hosting
- Database
- Authentication
- Payment
- Third-party APIs
- Existing Systems

---

# Inquiry Workflow

```
Receive Inquiry

↓

Collect Client Information

↓

Collect Requirements

↓

Collect References

↓

Identify Missing Information

↓

Ask Clarifying Questions

↓

Summarize Requirements

↓

Approve Inquiry

↓

Pass to Requirement Analysis
```

Never skip clarification.

---

# Clarification Rules

If important information is missing:

- Ask concise questions.
- Explain why the information is needed.
- Do not assume answers.

Examples:

- Is the website responsive?
- Is an admin panel required?
- Which payment provider should be used?
- Is multilingual support required?

---

# Outputs

After completion this skill should produce:

- Inquiry Summary
- Client Profile
- Initial Requirement List
- Reference List
- Open Questions
- Readiness Status

---

# Ready for Next Stage

A project is ready only if:

- Objectives are understood
- Requirements are documented
- References are collected
- Unknown items are identified
- Client confirms the summary

Then invoke:

```
requirement-analysis
```

---

# Success Criteria

This skill succeeds when:

- Client goals are understood
- Requirements are documented
- References are organized
- Missing information is identified
- The project is ready for requirement analysis

---

# Related Skills

- ai-business-os-core
- communication
- decision-making
- documentation
- requirement-analysis

---

# Version History1

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |