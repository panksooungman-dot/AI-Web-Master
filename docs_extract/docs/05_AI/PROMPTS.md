# PROMPTS

> AI Business OS - Prompt Engineering Standard

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | PROMPTS.md |
| Department | 05_AI |
| Version | 1.0 |
| Status | Active |
| Owner | AI Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 사용하는 모든 프롬프트의 작성 기준과 표준 템플릿을 정의한다.

목표는 다음과 같다.

- 프롬프트 품질 표준화
- AI 응답 일관성 확보
- 재사용 가능한 템플릿 구축
- 토큰 사용 최적화
- AI 협업 효율 향상

---

# 적용 범위 (Scope)

다음 AI에 적용한다.

- PM AI
- Development AI
- Design AI
- Operations AI
- Documentation AI
- QA AI

---

# 프롬프트 작성 원칙

## 1. 목적을 먼저 작성한다.

AI가 무엇을 해야 하는지 명확하게 작성한다.

---

## 2. 역할(Role)을 정의한다.

예시

- PM
- Frontend Developer
- Backend Developer
- UX Designer
- QA Engineer

---

## 3. 컨텍스트(Context)를 제공한다.

필요한 프로젝트 정보만 포함한다.

관련 없는 내용은 제외한다.

---

## 4. 작업(Task)을 명확히 작성한다.

작업은 번호로 구분한다.

예시

1. 분석
2. 설계
3. 구현
4. 검토

---

## 5. 출력 형식(Output)을 지정한다.

예시

- Markdown
- JSON
- Table
- Checklist
- Source Code

---

# 표준 프롬프트 구조

```text
Role

Context

Task

Requirements

Output Format

Validation
```

---

# 공통 규칙

모든 프롬프트는 다음을 포함한다.

- 역할
- 목적
- 작업
- 제한 사항
- 출력 형식

---

# Development Prompt

```text
Role
Development AI

Task
기능 구현

Requirements

- AI_RULES 준수
- CODING_RULES 준수
- ARCHITECTURE 준수

Output

Markdown
```

---

# Design Prompt

```text
Role
Design AI

Task

UI/UX 설계

Requirements

- DESIGN_SYSTEM 준수
- UI_GUIDE 준수
- UX_GUIDE 준수

Output

Markdown
```

---

# PM Prompt

```text
Role

PM AI

Task

요구사항 분석

Requirements

- REQUEST 확인
- WBS 작성
- 일정 작성

Output

Markdown
```

---

# Documentation Prompt

```text
Role

Documentation AI

Task

문서 작성

Requirements

- DOCUMENT_INDEX 확인
- 중복 금지
- SOP 형식 유지

Output

Markdown
```

---

# QA Prompt

```text
Role

QA AI

Task

테스트 수행

Requirements

- QA 문서 준수
- 체크리스트 작성

Output

Markdown
```

---

# 좋은 프롬프트 기준

- 목적이 명확하다.
- 역할이 명확하다.
- 출력 형식이 정의되어 있다.
- 불필요한 설명이 없다.
- 하나의 작업만 수행한다.

---

# 피해야 할 프롬프트

- 여러 작업을 한 번에 요청
- 역할 미정의
- 출력 형식 미지정
- 불명확한 요구사항
- 과도하게 긴 컨텍스트

---

# 체크리스트

프롬프트 작성 전

- [ ] 목적 정의
- [ ] 역할 정의
- [ ] 컨텍스트 확인
- [ ] 출력 형식 지정

프롬프트 검토

- [ ] 중복 제거
- [ ] 불필요한 설명 제거
- [ ] 토큰 최적화 확인

---

# 관련 문서

- AI_RULES.md
- AGENTS.md
- WORKFLOW.md
- TOKEN_POLICY.md
- COMPANY_POLICY.md
- DOCUMENT_INDEX.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |