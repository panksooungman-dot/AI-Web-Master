# Coding Memory

## Overview

Coding Memory stores persistent software engineering knowledge used throughout AI Business OS.

It preserves coding standards, architectural patterns, technology stack, reusable implementation strategies, and development best practices to ensure consistent software quality across all projects.

---

# Purpose

Maintain long-term engineering knowledge that enables AI Agents to generate consistent, maintainable, secure, and scalable software.

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

---

## Backend

- Node.js
- Next.js API Routes
- PostgreSQL
- Supabase

---

## AI

- Claude
- OpenAI
- MCP
- RAG
- Vector Database

---

## Infrastructure

- GitHub
- GitHub Actions
- Docker
- Vercel
- Kubernetes (Optional)

---

# Coding Standards

Always:

- Write readable code.
- Keep functions focused.
- Use descriptive naming.
- Prefer composition over duplication.
- Write reusable components.
- Validate inputs.
- Handle errors consistently.
- Document complex logic.

Never:

- Hard-code secrets.
- Ignore linting errors.
- Commit temporary debugging code.
- Duplicate business logic.
- Introduce unnecessary complexity.

---

# Architecture Principles

- Modular Architecture
- Separation of Concerns
- Single Responsibility Principle
- Dependency Injection where appropriate
- API-first Design
- Stateless Services when possible
- Reusable Components
- Consistent Folder Structure

---

# Naming Conventions

## Files

- kebab-case

Example:

```
user-service.ts
project-memory.md
```

---

## Components

- PascalCase

Example:

```
ProjectCard.tsx
UserProfile.tsx
```

---

## Variables

- camelCase

Example:

```ts
projectStatus
userProfile
```

---

## Constants

- UPPER_SNAKE_CASE

Example:

```ts
MAX_RETRY_COUNT
DEFAULT_TIMEOUT
```

---

# Code Quality Rules

Every implementation should be:

- Readable
- Testable
- Maintainable
- Reusable
- Secure
- Well documented

---

# Security Guidelines

Always:

- Validate input
- Sanitize user data
- Protect secrets
- Use authentication
- Use authorization
- Encrypt sensitive information
- Follow least privilege

Never:

- Expose credentials
- Log sensitive information
- Trust client input
- Disable security checks

---

# Performance Guidelines

Prefer:

- Efficient algorithms
- Lazy loading
- Pagination
- Caching
- Memoization
- Optimized database queries
- Asynchronous processing

Avoid:

- Unnecessary rendering
- Blocking operations
- Duplicate API calls
- N+1 queries
- Excessive memory usage

---

# Testing Standards

Every feature should include:

- Unit Tests
- Integration Tests
- Error Case Testing
- Edge Case Testing

When applicable:

- Performance Testing
- Security Testing
- End-to-End Testing

---

# Documentation Rules

Document:

- Public APIs
- Complex business logic
- Architectural decisions
- Configuration
- Environment variables

Keep documentation synchronized with implementation.

---

# Memory Update Rules

Update Coding Memory when:

- Technology stack changes
- Coding standards evolve
- New architectural patterns are adopted
- Security requirements change
- Performance guidelines are updated
- Development conventions change

---

# Retrieval Rules

When retrieving coding memory:

1. Prefer the latest approved standards.
2. Follow project conventions.
3. Reuse existing patterns before creating new ones.
4. Maintain architectural consistency.
5. Reference related documentation when necessary.

---

# Related Documents

- memory/README.md
- memory/decision-memory.md
- memory/knowledge-memory.md
- agents/backend-engineer.md
- agents/frontend-engineer.md
- agents/ai-engineer.md
- prompts/coder.md

---

# Version

AI Business OS v1.1