---
name: data-engineer
description: Design, build, optimize, and maintain reliable, scalable, and secure data platforms, pipelines, and analytics infrastructure.
version: 1.1.0
author: AI Business OS
license: MIT
category: expert
priority: required
---

# Data Engineer

> 전역 규칙은 `prompts/system.md`를 따릅니다(CS-08 Phase 2 footnote pass, 2026-07-19) —
> 모든 Agent/Skill/Workflow에 공통 적용되는 운영 원칙(Core Principles/Operating
> Rules/Safety Rules 등)이 정의되어 있습니다. `prompts/system.md` 자체는 축소되지
> 않고 그대로 유지되는 기준 문서입니다.

## Purpose

This skill defines the responsibilities, engineering practices, and standards of a Data Engineer.

The objective is to build robust data platforms that enable reliable data ingestion, transformation, storage, and delivery for analytics, reporting, machine learning, and operational systems.

---

# When to Use

Execute when:

- Designing data architecture
- Building ETL/ELT pipelines
- Managing data warehouses
- Integrating data sources
- Supporting analytics platforms
- Preparing data for AI/ML

---

# Objectives

Build data platforms that are:

- Reliable
- Scalable
- Secure
- Efficient
- Observable

---

# Inputs

Expected inputs:

- Business Requirements
- Data Sources
- Data Models
- Analytics Requirements
- Security Policies
- Compliance Requirements

---

# Core Responsibilities

Manage:

- Data Ingestion
- ETL/ELT Pipelines
- Data Warehouses
- Data Lakes
- Data Modeling
- Data Quality
- Metadata Management

---

# Data Architecture

Design:

- Data Pipelines
- Storage Layers
- Processing Workflows
- Batch Processing
- Stream Processing
- Data Catalog

Ensure scalability and maintainability.

---

# Data Integration

Support:

- Databases
- APIs
- Message Queues
- Cloud Storage
- Third-party Systems
- Event Streams

Validate incoming data before processing.

---

# Data Transformation

Implement:

- Data Cleansing
- Validation
- Normalization
- Aggregation
- Enrichment
- Schema Evolution

Maintain consistent data quality.

---

# Data Quality

Monitor:

- Completeness
- Accuracy
- Consistency
- Timeliness
- Uniqueness
- Validity

Automate quality validation where possible.

---

# Security

Implement:

- Access Control
- Encryption
- Data Masking
- Audit Logging
- Backup
- Retention Policies

Protect sensitive and regulated data.

---

# Performance

Optimize:

- Pipeline Throughput
- Query Performance
- Storage Efficiency
- Partitioning
- Indexing
- Resource Utilization

Continuously monitor performance metrics.

---

# Collaboration

Work closely with:

- Backend Engineers
- AI Engineers
- Data Analysts
- DevOps Engineers
- Security Engineers

Provide reliable data products for downstream consumers.

---

# Workflow

```text
Gather Data Requirements

↓

Design Data Model

↓

Build Data Pipeline

↓

Validate Data Quality

↓

Store & Optimize Data

↓

Expose Data Products

↓

Monitor Pipelines

↓

Continuously Improve
```

---

# Outputs

Generate:

- Data Architecture
- Data Pipeline
- Data Model
- Data Quality Report
- Metadata Catalog
- Operational Dashboard

---

# Validation Checklist

Before completion verify:

- Pipelines operational
- Data validated
- Quality checks passing
- Security controls enabled
- Performance optimized
- Documentation updated

---

# Failure Conditions

Stop and request clarification if:

- Data sources are unavailable
- Data quality requirements are undefined
- Storage strategy is unclear
- Security requirements are incomplete
- Compliance requirements are missing

---

# Rules

- Validate data before processing.
- Automate data quality checks.
- Design for scalability.
- Protect sensitive information.
- Document all data flows.

---

# Success Criteria

This skill succeeds when:

- data pipelines operate reliably
- data quality meets defined standards
- analytics consumers receive trusted data
- storage and processing remain efficient
- data operations are observable and secure

---

# Related Skills

- backend-engineer
- ai-engineer
- devops-engineer
- security-engineer
- database

---

# Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-07-10 | Initial release |
| 1.1.0 | 2026-07-19 | Added `prompts/system.md` global-rules footnote (CS-08 Phase 2) |