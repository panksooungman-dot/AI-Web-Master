# CNBIZ Design System

기업 홈페이지 UI/UX 디자인 기준입니다.

---

## Color

### Primary
- #005BAC

### Secondary
- #1F2937

### Background
- #FFFFFF

### Text
- #111827

---

## Font

- Pretendard

---

## Layout

- Max Width: 1280px
- Section Padding: 80px

---

## Button

### Primary

- Background: Primary
- Text: White
- Border Radius: 8px

### Secondary

- Background: White
- Border: Gray
- Text: Primary

---

## Card

- Border Radius: 12px
- Shadow: shadow-md
- Padding: 24px

---

## Responsive

- Mobile: 768px 이하
- Tablet: 768px ~ 1024px
- Desktop: 1024px 이상

---

## Design Rules

- 모든 UI는 기업 홈페이지 스타일을 유지한다.
- 버튼, 카드, 간격은 재사용 가능한 컴포넌트로 구현한다.
- TailwindCSS 유틸리티 클래스를 우선 사용한다.
- 반응형 디자인을 기본으로 구현한다.
- 색상은 본 문서의 Color 기준을 따른다.
--

## Component Rules

- Header, Footer, Button, Card는 공통 컴포넌트로 관리한다.
- 페이지별 중복 UI는 재사용 가능한 컴포넌트로 분리한다.
- 새로운 컴포넌트는 components 폴더에 생성한다.
- 컴포넌트는 단일 책임 원칙(SRP)을 따른다.