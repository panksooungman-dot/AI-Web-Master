# ARCHITECTURE

> AI Business OS - System Architecture Standard

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | ARCHITECTURE.md |
| Department | 02_DEVELOPMENT |
| Version | 1.0 |
| Status | Active |
| Owner | Development Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS의 시스템 아키텍처 표준을 정의한다.

모든 프로젝트는 본 문서를 기반으로 설계하며, 일관성·확장성·유지보수성을 최우선으로 한다.

---

# 아키텍처 원칙

- 단순한 구조를 우선한다.
- 기능보다 유지보수를 우선한다.
- 재사용 가능한 컴포넌트를 설계한다.
- 모듈 간 의존성을 최소화한다.
- 문서와 코드의 구조를 일치시킨다.

---

# 전체 구조

```text
Client
    │
    ▼
Next.js Application
    │
    ├── UI Layer
    ├── Business Logic
    ├── API Layer
    └── Data Access Layer
            │
            ▼
Supabase
```

---

# 프로젝트 구조

```text
apps/
packages/
docs/
public/
```

### apps

서비스 애플리케이션

### packages

공통 모듈 및 라이브러리

### docs

운영 문서 및 SOP

### public

정적 리소스

---

# Layer Architecture

## Presentation Layer

- UI
- Layout
- Page
- Component

---

## Business Layer

- Service
- Business Logic
- Validation

---

## API Layer

- Route Handler
- API Endpoint
- Authentication

---

## Data Layer

- Database
- Storage
- External API

---

# Component Architecture

컴포넌트는 다음 원칙을 따른다.

- Single Responsibility
- Reusable
- Independent
- Testable

---

# Folder Rules

예시

```text
components/
features/
hooks/
lib/
services/
types/
utils/
```

각 폴더는 하나의 책임만 가진다.

---

# Data Flow

```text
User
 ↓

UI

 ↓

Business Logic

 ↓

API

 ↓

Database

 ↓

Response
```

---

# Dependency Rules

허용

```
UI
 ↓

Service
 ↓

Repository
 ↓

Database
```

금지

```
UI
 ↓

Database
```

직접 접근 금지

---

# Error Handling

모든 오류는 다음 절차를 따른다.

1. 감지
2. 기록
3. 사용자 메시지 제공
4. 복구 시도
5. 보고

---

# Security

기본 원칙

- 환경 변수 사용
- API Key 노출 금지
- 인증 필수
- 권한 검증
- 입력값 검증

---

# Performance

목표

- 불필요한 렌더링 방지
- 코드 분할(Code Splitting)
- 이미지 최적화
- 캐시 활용
- Lazy Loading 적용

---

# Logging

기록 대상

- Error
- Warning
- API 호출
- 배포 이력

운영 환경에서는 Debug 로그를 제거한다.

---

# Architecture Review

다음 항목은 반드시 검토한다.

- 확장성
- 유지보수성
- 성능
- 보안
- 재사용성

---

# 승인 대상

다음 변경은 CEO 승인 후 진행한다.

- 프로젝트 구조 변경
- 핵심 아키텍처 변경
- 데이터베이스 구조 변경
- 인증 구조 변경
- 외부 시스템 연동

---

# 체크리스트

개발 시작 전

- [ ] PROJECT_VISION 확인
- [ ] TECH_STACK 확인
- [ ] CNBIZ_RULES 확인
- [ ] AI_COMPONENT_GUIDE 확인

개발 완료 후

- [ ] Architecture 유지 여부 확인
- [ ] 문서 업데이트
- [ ] 테스트 완료

---

# 관련 문서

- TECH_STACK.md
- AI_COMPONENT_GUIDE.md
- CNBIZ_RULES.md
- AI_RULES.md
- COMPANY_POLICY.md
- DOCUMENT_INDEX.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |