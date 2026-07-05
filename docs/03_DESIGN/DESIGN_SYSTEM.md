# DESIGN_SYSTEM

> AI Business OS - Design System Standard

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | DESIGN_SYSTEM.md |
| Department | 03_DESIGN |
| Version | 1.0 |
| Status | Active |
| Owner | Design Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 사용하는 디자인 시스템의 표준을 정의한다.

목표

- 일관된 사용자 경험 제공
- UI 품질 향상
- 컴포넌트 재사용성 확보
- 개발과 디자인의 협업 표준화
- 유지보수 비용 절감

---

# 적용 범위 (Scope)

본 문서는 다음에 적용한다.

- Web Application
- Admin Dashboard
- Mobile Web
- 공통 UI Component

---

# 핵심 원칙 (Core Principles)

## Consistency

모든 화면은 동일한 디자인 규칙을 따른다.

---

## Reusability

반복되는 UI는 공통 컴포넌트로 관리한다.

---

## Accessibility

접근성을 기본 원칙으로 한다.

---

## Simplicity

불필요한 장식보다 명확한 사용성을 우선한다.

---

## Scalability

프로젝트가 커져도 확장 가능한 구조를 유지한다.

---

# 디자인 토큰

## Color

```text
Primary
Secondary
Success
Warning
Danger
Info
Neutral
```

---

## Typography

```text
Heading 1
Heading 2
Heading 3

Body Large
Body
Body Small

Caption
Label
```

---

## Spacing

기본 단위

```text
4px
8px
12px
16px
24px
32px
40px
48px
64px
```

8px Grid System을 기본으로 사용한다.

---

## Border Radius

```text
Small
Medium
Large
Full
```

---

## Shadow

```text
Small
Medium
Large
```

필요한 경우에만 사용한다.

---

# 컴포넌트 표준

공통 컴포넌트

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio
- Card
- Modal
- Table
- Badge
- Alert
- Tabs
- Tooltip

새 컴포넌트는 재사용 가능하도록 설계한다.

---

# 버튼 규칙

Primary

- 주요 작업

Secondary

- 보조 작업

Danger

- 삭제
- 위험 작업

Disabled

- 실행 불가 상태

---

# Form 규칙

모든 입력 요소는 다음을 포함한다.

- Label
- Placeholder
- Validation
- Error Message
- Helper Text

---

# 아이콘 규칙

기본 아이콘 라이브러리

- Lucide React

하나의 프로젝트에서 여러 아이콘 라이브러리를 혼용하지 않는다.

---

# 반응형 기준

```text
Mobile
Tablet
Desktop
Large Desktop
```

Mobile First 전략을 적용한다.

---

# 접근성

다음을 준수한다.

- 충분한 색상 대비
- Keyboard Navigation
- Focus 표시
- Alt Text 제공
- Semantic HTML 사용

---

# 금지 사항

다음을 금지한다.

- 하드코딩된 색상
- 임의의 간격 사용
- 디자인 시스템을 벗어난 UI
- 동일한 컴포넌트 중복 생성

---

# 체크리스트

디자인 시작 전

- [ ] 기존 컴포넌트 확인
- [ ] 디자인 시스템 확인

개발 중

- [ ] 공통 컴포넌트 사용
- [ ] 색상 토큰 사용
- [ ] 간격 규칙 준수

완료 후

- [ ] 반응형 확인
- [ ] 접근성 확인
- [ ] UI 일관성 확인

---

# 관련 문서

- UI_GUIDE.md
- UX_GUIDE.md
- AI_COMPONENT_GUIDE.md
- ARCHITECTURE.md
- COMPANY_POLICY.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |