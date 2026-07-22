# Design JSON Specification

Version: 1.1.0

## 목적

Design JSON은 AI Business OS의 모든 디자인 데이터를 표현하는 공통 포맷이다.

다음 시스템은 모두 동일한 DesignDocument를 사용한다.

- Planning Generator
- Storyboard Generator
- Wireframe Generator
- Prototype Generator
- Claude Design
- Figma Import
- Figma Export
- Website Builder
- React Generator

---

# 최상위 구조

```json
{
  "version": "1.0.0",
  "metadata": {},
  "theme": {},
  "pages": []
}
```

---

# metadata

프로젝트 정보

```json
{
  "projectName": "",
  "clientName": "",
  "createdAt": "",
  "updatedAt": ""
}
```

---

# theme

디자인 토큰

```json
{
  "colors": {},
  "typography": {},
  "spacing": {},
  "radius": {},
  "shadow": {}
}
```

---

# pages

웹페이지 목록

```json
[
  {
    "id": "home",
    "title": "Home",
    "path": "/",
    "sections": []
  }
]
```

---

# sections

페이지 구성

```json
{
  "id": "",
  "type": "",
  "components": []
}
```

---

# components

UI 컴포넌트

```json
{
  "id": "",
  "type": "",
  "props": {}
}
```

---

# Rendering Contract (Phase 7.5)

## 배경

Phase 1~7까지 DesignDocument는 "무엇이 있는지"를 표현하는 **Content Model**이었다 —
페이지·섹션·컴포넌트가 존재한다는 사실과 최소한의 식별 정보(`id`/`type`/`path`/`title`)만
담았고, `pages[].sections`는 대부분 빈 배열이었다. 이 상태로는 React Generator가 실제 UI를
렌더링할 수 없다 — "이 화면에 Button이 있다"는 알아도 "그 Button을 어떻게 그려야 하는지"는
전혀 알 수 없기 때문이다.

Phase 7.5는 DesignDocument를 **Rendering Contract**로 확장한다 — React Generator(또는 다른
어떤 렌더러든)가 이 문서만으로 실제 컴포넌트 트리를 그릴 수 있도록 필요한 정보(Props 형태,
자식 구조, 레이아웃, 반응형 분기, 스타일, 인터랙션)를 정의한다.

**호환성 원칙**: 아래 모든 필드는 **Optional**이다. Phase 1~7이 만들어 온 문서(예:
`{id, title, path, sections: []}`만 있는 Page)는 Phase 7.5 이후에도 여전히 유효한
DesignDocument다 — 단지 아직 Rendering Contract 필드를 쓰지 않고 있을 뿐이다. 기존 필드의
타입·의미는 하나도 바뀌지 않았다(`Component.props`는 여전히 `Record<string, unknown>`이다).

## Children — Component Tree

```json
{
  "id": "",
  "type": "",
  "props": {},
  "children": [
    { "id": "", "type": "", "props": {} }
  ]
}
```

`Component.children`은 같은 `Component` 형태를 재귀적으로 담는 배열이다(선택적). 자식은 부모와
다른 `type`을 가질 수 있다 — 예: `container` 컴포넌트가 `heading`·`text`·`button` 자식을 담는
구조.

## Layout — Page / Section / Component

```json
{
  "direction": "row",
  "columns": 12,
  "rows": 1,
  "gap": "16px",
  "align": "center",
  "justify": "space-between",
  "width": "100%",
  "maxWidth": "1280px"
}
```

`Page`·`Section`·`Component` 모두 선택적 `layout` 필드로 이 구조를 가질 수 있다 — "이 노드가
자신의 자식들을 어떻게 배치하는지"를 의미한다(부모가 이 노드 자신을 어떻게 배치하는지가
아니다). `direction`은 `"row" | "column"`, `align`은
`"start" | "center" | "end" | "stretch" | "baseline"`, `justify`는
`"start" | "center" | "end" | "space-between" | "space-around" | "space-evenly"`로 제한된다.

## Style — Section / Component

```json
{
  "margin": "0",
  "padding": "24px",
  "radius": "12px",
  "shadow": "0 4px 6px rgba(0,0,0,0.1)",
  "background": "#FFFFFF",
  "border": "1px solid #E5E7EB",
  "opacity": 1
}
```

`Section`·`Component`가 선택적 `style` 필드로 가질 수 있는 구조 — CSS 속성과 1:1 대응하는
문자열/숫자 값이다. 실제 값의 단위·형식은 자유(px/rem/hex 등)이며 스키마는 강제하지 않는다.

## Responsive — Breakpoint 구조

```json
{
  "desktop": { "layout": {}, "style": {} },
  "tablet": { "layout": {}, "style": {} },
  "mobile": { "layout": {}, "style": {} }
}
```

`Page`·`Section`·`Component`가 선택적 `responsive` 필드로 가질 수 있는 구조. 세 브레이크포인트
이름(`desktop`/`tablet`/`mobile`)은 Wireframe Generator(`lib/design/wireframe.ts`의
`Breakpoint`)가 이미 쓰던 것과 동일한 개념을 DesignDocument 레벨로 옮긴 것이다. 각 브레이크포인트는
기본 `layout`/`style`을 부분적으로(`Partial`) 덮어쓴다 — 지정하지 않은 값은 기본값을 그대로
따른다.

## Events — Interaction Contract

```json
{
  "onClick": "navigate:/contact",
  "hover": "highlight",
  "focus": "outline",
  "animation": { "name": "fade-in", "durationMs": 300, "easing": "ease-out" },
  "transition": { "property": "transform", "durationMs": 200, "easing": "ease-in-out" }
}
```

`Component`가 선택적 `events` 필드로 가질 수 있는 구조. `onClick`/`hover`/`focus`는 **실행 가능한
코드가 아니라 액션 식별자 문자열**이다(예: `"navigate:/contact"`, `"openModal:signup"`) —
DesignDocument는 JSON Schema로 검증되는 순수 JSON 문서이므로 함수 값을 담을 수 없다. 실제 동작
연결(이 문자열을 실제 핸들러로 매핑하는 일)은 React Generator(또는 다른 렌더러)의 책임이다.

## Component Type — 확장

```
navbar (신규, Phase 7.5)
```

기존 17종(heading/text/button/image/icon/card/form/input/textarea/checkbox/radio/select/
video/map/divider/container/grid)에 `navbar`를 추가했다(총 18종). 이미 정의된 값의 의미는
바뀌지 않았다 — 유니온 타입에 값을 추가하는 것은 하위 호환 변경이다.

## Props — 컴포넌트 타입별 권장 구조

`Component.props`의 실제 타입은 여전히 `Record<string, unknown>`이다(강제하지 않음). 아래는
React Generator가 참고할 수 있는 **권장** 구조다 — `packages/design-system/types/design.ts`에
`ButtonProps`/`ImageProps`/`FormProps`/`NavbarProps`로 정의되어 있으며, `Component<ButtonProps>`
처럼 선택적으로 더 엄격한 타입을 적용할 수 있다.

**Button**
```json
{ "text": "", "variant": "primary", "size": "md", "icon": "", "href": "", "disabled": false }
```

**Image**
```json
{ "src": "", "alt": "", "width": 0, "height": 0, "objectFit": "cover" }
```

**Form**
```json
{
  "fields": [{ "name": "", "label": "", "type": "text", "required": true, "placeholder": "" }],
  "submitAction": "",
  "validation": {}
}
```

**Navbar**
```json
{ "items": [{ "label": "", "href": "" }], "logo": "", "sticky": true }
```

## 아직 남은 한계 (정직하게 문서화)

Rendering Contract가 추가되었다고 해서 React Generator가 즉시 구현 가능해지는 것은 아니다.
아래는 Phase 7.5 이후에도 남아있는, 이 문서 구조 자체의 한계다.

- 이 스키마는 **구조**만 정의한다 — 실제로 어떤 Generator가 `pages[].sections[].components`를
  이 풍부한 형태로 채워 넣는지는 별개 문제다. Phase 1~7의 Adapter(Planning~Website Builder)는
  여전히 `sections: []`(빈 배열)나 최소 1개의 평평한 Section만 만든다 — Rendering Contract를
  실제로 채우는 Generator 리팩터링은 이번 Phase의 범위가 아니다(이번 Phase는 "가능하게 만드는"
  것이지 "실제로 채우는" 것이 아니다).
- `props`는 여전히 `Record<string, unknown>`이라, 스키마 레벨에서 "이 `type`이 `button`이면
  `props`가 반드시 `ButtonProps` 형태여야 한다"는 강제(discriminated union)가 없다 — TypeScript
  쪽의 `ButtonProps` 등은 어디까지나 "권장"이며 강제되지 않는다.
- `layout`/`style`은 CSS 값을 문자열로만 표현한다(예: `"16px"`) — 단위 검증이나 디자인 토큰
  참조(`theme.spacing.md` 같은 간접 참조)는 지원하지 않는다.

---

# Version Policy

현재 버전

```
1.1.0
```

향후 구조 변경 시 Minor 또는 Major Version을 증가시킨다.

## 변경 이력

| Version | Phase | Description |
|---------|-------|-------------|
| 1.0.0 | Phase 1(Design JSON Standardization) | 최초 릴리스 — Content Model(metadata/theme/pages/sections/components) |
| 1.1.0 | Phase 7.5(Design JSON Standardization) | Rendering Contract 추가(children/layout/style/responsive/events), ComponentType에 `navbar` 추가, 컴포넌트 타입별 권장 Props(`ButtonProps`/`ImageProps`/`FormProps`/`NavbarProps`) 추가 — 전부 Optional/하위 호환 |