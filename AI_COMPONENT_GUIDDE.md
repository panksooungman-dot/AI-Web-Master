# AI Component Guide

AI와 정확하고 효율적으로 협업하기 위한 컴포넌트 식별 표준입니다.

---

# 목적

AI와 사람이 동일한 UI를 추측 없이 정확하게 식별하여
빠르고 안전하게 수정할 수 있도록 합니다.

## 기대 효과

- 작업 속도 향상
- 토큰 사용량 감소
- 잘못된 수정 방지
- 유지보수 향상
- Playwright 테스트 향상
- AI 협업 정확도 향상

---

# Component Naming Rule

모든 컴포넌트는 아래 규칙을 따른다.

```
section-component-element
```

예시

```
hero-title
hero-subtitle

hero-btn-primary
hero-btn-secondary

hero-btn-primary-icon

about-card-01
about-card-02

service-card-01
service-card-02

portfolio-card-01

contact-submit-btn

footer-company
```

---

# Component ID

모든 주요 UI는 반드시 고유한 Component ID를 가진다.

React 예시

```tsx
<button data-testid="hero-btn-primary">
```

Card 예시

```tsx
<div data-testid="service-card-01">
```

---

# Component ID 규칙

- Component ID는 프로젝트 전체에서 중복될 수 없다.
- Component ID는 한 번 생성하면 변경하지 않는다.
- 삭제된 Component ID는 재사용하지 않는다.
- 새로운 UI 생성 시 반드시 Component ID를 함께 생성한다.

---

# AI 작업 규칙

Claude, Cursor, Copilot 등 AI는

항상 Component ID를 기준으로 작업한다.

예시

```
hero-btn-primary 색상을 변경해줘.

service-card-02 아이콘을 변경해줘.

contact-submit-btn을 크게 만들어줘.
```

AI는

"왼쪽 버튼"

"첫 번째 카드"

같은 추측 기반 작업을 하지 않는다.

---

# Playwright 규칙

Playwright 테스트도 Component ID를 사용한다.

예시

```ts
await page.getByTestId("hero-btn-primary").click();
```

---

# AI Inspector

개발 모드에서만 활성화한다.

마우스를 올리면

```
Section

Hero

Component

Primary Button

Component ID

hero-btn-primary

File

components/home/Hero.tsx
```

를 표시한다.

---

# Copy 기능

Inspector에는 두 개의 복사 기능을 제공한다.

## Copy ID

복사 결과

```
hero-btn-primary
```

## Copy Prompt

복사 결과

```
hero-btn-primary 버튼 아이콘을 변경해줘.
```

---

# 디자인 수정 원칙

디자인 수정 요청은
반드시 Component ID를 기준으로 한다.

예시

❌

```
왼쪽 버튼 바꿔줘.
```

⭕

```
hero-btn-primary 아이콘 변경
```

---

# 개발 원칙

모든 새로운 UI는

- Component ID 생성
- data-testid 추가
- Playwright 테스트 가능

상태를 유지해야 한다.

---

# AI 협업 원칙

AI는

- Component ID를 우선 사용한다.
- 추측하지 않는다.
- 동일한 Component ID만 수정한다.
- 다른 컴포넌트를 변경하지 않는다.

---

# 적용 대상

- Claude Code
- Cursor
- GitHub Copilot
- Playwright
- QA 테스트
- 유지보수
- 디자인 수정

---

# 향후 개발 예정

AI Inspector

- Hover Inspector
- Component Highlight
- Copy ID
- Copy Prompt
- File Open
- VSCode Jump
- Figma Link
- Component Tree
- Responsive Preview

---

# 최종 목표

누구나 화면에서 원하는 컴포넌트를 선택하고

Component ID를 복사하여

AI에게 전달하면

추측 없이 정확하게 원하는 UI만 수정할 수 있는 개발 환경을 구축한다.

# 프로젝트 표준

이 문서의 규칙은 프로젝트 전체에 적용된다.

새로운 컴포넌트를 생성하거나 기존 컴포넌트를 수정할 경우 반드시 다음을 수행한다.

- Component ID 생성 및 유지
- data-testid 추가
- AI Inspector 대상 등록

예외가 필요한 경우에는 사유를 코드 리뷰 또는 문서에 기록한다.

Claude Code는 UI 컴포넌트를 생성하거나 수정할 때
본 문서의 규칙을 기본 표준으로 적용한다.

# 적용 규칙

이 문서의 규칙은 프로젝트 전체에 적용된다.

새로운 컴포넌트를 생성할 때는 반드시

- Component ID 생성
- data-testid 추가
- AI Inspector 대상 등록

을 함께 수행한다.

---

# Component Registry

현재 프로젝트에서 사용하는 Component ID 목록입니다.
새로운 컴포넌트를 만들면 반드시 이 목록에도 추가합니다.

# Component Registry

## Layout
- APP_LAYOUT
- HEADER_NAV
- FOOTER

## Home
- HERO_SECTION
- SERVICE_GRID
- SERVICE_CARD
- CTA_SECTION
- CONTACT_FORM

## Common
- PRIMARY_BUTTON
- SECONDARY_BUTTON
- MODAL
- LOADING_SPINNER