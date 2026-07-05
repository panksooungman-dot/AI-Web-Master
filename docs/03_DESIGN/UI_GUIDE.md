# UI_GUIDE

> AI Business OS - User Interface Guide

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | UI_GUIDE.md |
| Department | 03_DESIGN |
| Version | 1.0 |
| Status | Active |
| Owner | Design Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 일관된 사용자 인터페이스(UI)를 구현하기 위한 표준 가이드를 정의한다.

목표

- 일관된 UI 제공
- 사용자 친화적인 인터페이스 구축
- 컴포넌트 재사용성 향상
- 개발 생산성 향상

---

# UI 설계 원칙

## 1. Consistency

모든 화면은 동일한 디자인 패턴을 따른다.

---

## 2. Simplicity

복잡한 화면보다 직관적인 화면을 우선한다.

---

## 3. Accessibility

모든 사용자가 쉽게 사용할 수 있도록 설계한다.

---

## 4. Responsiveness

모든 화면은 Mobile First 방식으로 구현한다.

---

# Layout

기본 구조

```text
Header
│
├── Navigation
│
├── Main Content
│
└── Footer
```

---

# Grid System

- 8px Grid 사용
- 최대 콘텐츠 폭: 1280px
- 좌우 여백 유지
- 균형 있는 정렬

---

# Typography

## Heading

- H1
- H2
- H3

## Body

- Large
- Medium
- Small

본문은 가독성을 최우선으로 한다.

---

# Color

기본 색상

- Primary
- Secondary
- Success
- Warning
- Danger
- Neutral

색상은 DESIGN_SYSTEM.md의 토큰만 사용한다.

---

# Button

버튼 종류

- Primary
- Secondary
- Outline
- Ghost
- Danger

규칙

- 한 화면에 Primary 버튼은 하나를 권장한다.
- Disabled 상태를 항상 제공한다.

---

# Form

모든 입력 요소는 다음을 포함한다.

- Label
- Placeholder
- Validation
- Error Message
- Helper Text

---

# Card

Card는 다음 요소를 가진다.

- Header
- Content
- Footer (선택)

---

# Table

기본 규칙

- Header 고정
- 정렬 가능
- 검색 기능 지원
- 페이지네이션 지원

---

# Modal

모달 사용 기준

- 중요한 작업 확인
- 생성 및 수정
- 삭제 확인

닫기 버튼과 ESC 키를 지원한다.

---

# Navigation

- 현재 위치 표시
- Breadcrumb 제공
- 메뉴 구조 일관성 유지

---

# Empty State

데이터가 없을 경우

- 아이콘
- 안내 문구
- 행동 버튼

을 제공한다.

---

# Loading

로딩 상태에서는

- Skeleton UI
- Spinner

중 하나를 사용한다.

---

# Error UI

오류 발생 시

- 명확한 메시지
- 재시도 버튼
- 문의 안내

를 제공한다.

---

# Responsive Breakpoints

| Device | Width |
|---------|-------|
| Mobile | < 768px |
| Tablet | 768px ~ 1023px |
| Desktop | ≥ 1024px |

---

# 체크리스트

UI 개발 전

- [ ] DESIGN_SYSTEM 확인
- [ ] 공통 컴포넌트 확인

UI 개발 후

- [ ] 반응형 확인
- [ ] 접근성 확인
- [ ] 디자인 일관성 확인
- [ ] 다크 모드 대응 여부 확인

---

# 관련 문서

- DESIGN_SYSTEM.md
- UX_GUIDE.md
- AI_COMPONENT_GUIDE.md
- ARCHITECTURE.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |