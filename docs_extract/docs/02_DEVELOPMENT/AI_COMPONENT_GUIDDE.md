# AI_COMPONENT_GUIDE

> AI Business OS - AI Component Development Guide

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | AI_COMPONENT_GUIDE.md |
| Department | Development |
| Version | 1.0 |
| Status | Active |
| Owner | Development Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 사용하는 컴포넌트 설계 및 개발 표준을 정의한다.

목표

- 컴포넌트 재사용성 향상
- 유지보수성 확보
- 일관된 코드 구조 유지
- AI가 예측 가능한 프로젝트 구조 제공
- 중복 코드 최소화

---

# 적용 범위 (Scope)

본 문서는 다음 대상에 적용한다.

- React Component
- Next.js Component
- Layout
- UI Component
- Feature Component
- Custom Hook
- Service Module

---

# 핵심 원칙 (Core Principles)

## 1. Single Responsibility

하나의 컴포넌트는 하나의 책임만 가진다.

---

## 2. Reusability

반복되는 UI는 반드시 컴포넌트로 분리한다.

---

## 3. Readability

누구나 이해할 수 있는 구조를 유지한다.

---

## 4. Maintainability

확장성보다 유지보수를 우선한다.

---

## 5. Testability

컴포넌트는 독립적으로 테스트 가능해야 한다.

---

# 프로젝트 구조

```text
src/
│
├── components/
├── features/
├── hooks/
├── services/
├── lib/
├── utils/
├── types/
└── constants/
```

---

# Components

공통 UI 컴포넌트

```text
components/
├── common/
├── layout/
├── ui/
├── form/
├── table/
├── modal/
├── card/
└── feedback/
```

---

# Features

도메인 중심 구조

```text
features/
└── auth/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    ├── utils/
    └── index.ts
```

---

# 컴포넌트 작성 규칙

## 파일명

PascalCase 사용

```text
UserCard.tsx
LoginForm.tsx
ProductTable.tsx
```

---

## Hook

```text
useAuth.ts
useUser.ts
useProduct.ts
```

반드시 `use`로 시작한다.

---

## Service

```text
authService.ts
userService.ts
```

camelCase 사용

---

## Type

```text
User.ts
Product.ts
ApiResponse.ts
```

---

# Props 규칙

좋은 예

```tsx
<UserCard user={user} />
```

좋지 않은 예

```tsx
<UserCard
  id={id}
  name={name}
  email={email}
  phone={phone}
/>
```

관련 데이터는 객체로 전달한다.

---

# State 관리

우선순위

1. Local State
2. Context API
3. Global State

필요 이상으로 전역 상태를 사용하지 않는다.

---

# Business Logic

Business Logic은 컴포넌트 내부에 작성하지 않는다.

구조

```text
Component
    │
    ▼
Hook
    │
    ▼
Service
    │
    ▼
API
```

---

# API 호출 규칙

컴포넌트에서 직접 API를 호출하지 않는다.

반드시

```
Component
↓

Hook

↓

Service
```

구조를 사용한다.

---

# Import 순서

```text
1. React
2. Next.js
3. External Library
4. Internal Module
5. Components
6. Hooks
7. Types
8. Styles
```

---

# Styling

기본 원칙

- Tailwind CSS 사용
- Inline Style 지양
- 공통 스타일 재사용
- Design System 준수

---

# Component 분리 기준

다음 중 하나에 해당하면 분리한다.

- 100줄 이상
- 재사용 가능
- 독립 테스트 가능
- UI 반복

---

# Error Handling

모든 컴포넌트는

- Loading
- Empty
- Error

상태를 처리해야 한다.

---

# Performance

다음을 적극 활용한다.

- React.memo
- useMemo
- useCallback
- Lazy Loading
- Dynamic Import

필요하지 않은 최적화는 하지 않는다.

---

# 금지 사항

다음을 금지한다.

- Business Logic을 UI에 작성
- 직접 Database 접근
- 하드코딩
- 중복 컴포넌트 생성
- 거대한 컴포넌트 작성

---

# 체크리스트

## 컴포넌트 생성 전

- [ ] 기존 컴포넌트 확인
- [ ] 재사용 가능 여부 확인
- [ ] Design System 확인

## 개발 중

- [ ] Props 최소화
- [ ] Hook 분리
- [ ] Service 분리
- [ ] Type 정의

## 완료 후

- [ ] 테스트 완료
- [ ] 문서 업데이트
- [ ] 코드 리뷰 완료

---

# 관련 문서

- ARCHITECTURE.md
- TECH_STACK.md
- CNBIZ_RULES.md
- DESIGN_SYSTEM.md
- AI_RULES.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |