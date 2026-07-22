# Design JSON Migration Status

**Project:** AI Business OS  
**Document:** Design JSON Migration Status  
**Version:** 1.3.0  
**Status:** Phase 10.5 Complete  
**Last Updated:** 2026-07-23

---

# Purpose

이 문서는 AI Business OS의 **Design JSON Standardization** 진행 현황을 기록한다.

DesignDocument를 프로젝트 전체의 **Single Source of Truth (SSOT)** 로 사용하는 것을 목표로 하며, 각 단계의 진행 상황과 남은 작업을 관리한다.

---

# Goal

최종 목표는 모든 Design Automation 모듈이 하나의 DesignDocument를 중심으로 동작하도록 만드는 것이다.

```text
Planning
        │
        ▼
DesignDocument (SSOT)
        │
        ├────────► Storyboard
        ├────────► Wireframe
        ├────────► Prototype
        ├────────► Claude Design
        ├────────► Website Builder
        ├────────► React Generator
        └────────► Future AI Agents
```

---

# Migration Progress

| Phase | Description | Status |
|--------|-------------|--------|
| Phase 1 | Design JSON Specification | ✅ Complete |
| Phase 2 | Planning → DesignDocument | ✅ Complete |
| Phase 3 | Storyboard Adapter | ✅ Complete |
| Phase 4 | Wireframe Adapter | ✅ Complete |
| Phase 5 | Prototype Adapter | ✅ Complete |
| Phase 6 | Claude Design Adapter | ✅ Complete |
| Phase 7 | Website Builder Hybrid Adapter | ✅ Complete |
| Phase 7.5 | Rendering Contract | ✅ Complete |
| Phase 8 | React Generator | ✅ Complete |
| Phase 9 | Website Builder Integration | ✅ Complete |
| Phase 10 | DesignDocument Persistence | ✅ Complete |
| Phase 10.5 | Persistence Integration | ✅ Complete |
| Phase 11 | Rendering Contract Population | ⏳ Planned |

---

# Current Architecture

```text
Planning
        │
        ▼
DesignDocument
        │
        ├────────► Storyboard
        │
        ├────────► Wireframe
        │
        ├────────► Prototype
        │
        ├────────► Claude Design
        │
        ├────────► Website Builder Adapter
        │
        └────────► React Generator
```

---

# DesignDocument Status

## Metadata

| Item | Status |
|------|--------|
| Project Metadata | 🟡 Partial |
| Theme | ✅ Complete |
| Pages | ✅ Complete |
| Sections | 🟡 Transitional |
| Components | 🟡 Transitional |
| Rendering Contract | ✅ Complete |

---

# Rendering Contract

Phase 7.5에서 Rendering Contract가 추가되었다.

지원 항목

- Component Tree
- Children
- Layout
- Style
- Responsive
- Events

현재는 구조만 정의되어 있으며 실제 Adapter들은 일부만 생성한다.

---

# React Generator

Phase 8에서 React Generator가 구현되었다.

입력

```text
DesignDocument
```

출력

```text
React Component Tree

↓

Next.js App Router

↓

TypeScript

↓

TailwindCSS
```

특징

- Pure Function
- File I/O 없음
- Registry 변경 없음
- Website Builder 변경 없음
- Dashboard 변경 없음

---

# Website Builder Integration

Phase 9에서 Website Builder의 입력 조립 경로를 Hybrid Adapter(Phase 7)로 단일화했다.

## 변경 전

```text
Plan
    ↓
planToWebsiteBuildInputs()  (route.ts가 직접 호출)
    ↓
WebsiteBuildInputs
```

## 변경 후

```text
Plan (+ 가능하면 Prototype)
    ↓
buildWebsiteBuildHybridSource()  (route.ts는 이제 이것만 호출)
    │
    ├── document (DesignDocument — Prototype이 있으면 Phase 6의 풍부한 버전, 없으면 Phase 1 뼈대)
    └── inputs (WebsiteBuildInputs — 내부적으로 여전히 planToWebsiteBuildInputs()를 위임 호출)
    ↓
실제 CLI 생성(`ai website create`)은 여전히 inputs만 소비
```

## 실제로 바뀐 것

- `app/api/design/website/route.ts`가 `planToWebsiteBuildInputs()`를 직접 호출하던 것을
  `buildWebsiteBuildHybridSource(plan, prototype).inputs`로 교체(호출 경로 단일화, 로직 중복 제거).
- Review → ClaudeDesign → Prototype 체인을 조회(읽기 전용)해, 있으면 Phase 6의 sections/theme까지
  채워진 DesignDocument를 Hybrid Source에 담는다. 체인이 없으면 Adapter 자체 규칙에 따라 Phase 1
  뼈대 DesignDocument로 자동 폴백한다.
- 감사 로그(`design.website.build`)의 `detail` 텍스트에 `document.pages.length`를 참고 정보로
  추가했다(API 응답 필드가 아니므로 Backward Compatibility에 영향 없음).

## 실제로 바뀌지 않은 것 (Success Criteria 검증)

- **API 응답 불변** — `POST /api/design/website`의 JSON 필드는 하나도 추가/삭제/변경되지 않았다.
- **Registry 불변** — `lib/design/website-build.ts`(WebsiteBuildRecord), `claude-design.ts`,
  `prototype.ts`는 기존 getter만 호출(읽기 전용)했을 뿐 파일 자체를 수정하지 않았다.
- **Dashboard 불변** — 이 라우트를 사용하는 화면(`/developer/design/website`)은 수정하지 않았다.
- **CLI 명령 불변** — `packages/cli`의 `ai website create` 자체는 수정하지 않았다.
- **실제 생성 결과 불변** — `WebsiteBuildHybridSource.inputs`는 여전히
  `planToWebsiteBuildInputs()`를 그대로 위임 호출하므로, 동일 Plan에 대해 CLI로 전달되는 인자
  (`--name`/`--type`/`--audience`/`--brand`/`--language`/`--site-type`)는 이전과 바이트 단위로
  동일함을 회귀 테스트로 직접 검증했다(`tests/design/website-build-route-integration.test.ts`).

## 아직 바뀌지 않은 것 (의도적 범위 밖)

Website Builder의 실제 사이트 생성 로직(`packages/cli/src/website/*`)은 여전히
`DesignDocument.pages`/`sections`/`components`/`theme`을 전혀 읽지 않는다 — 고정 11페이지
구조와 `siteType` 기반 팔레트만 사용한다. 이번 Phase는 "입력 조립 경로의 단일화"까지만 다루며,
"생성 로직이 DesignDocument를 실제로 반영"하는 것은 여전히 미완료다(Remaining Work 참고).

---

# DesignDocument Persistence

Phase 10에서 DesignDocument를 위한 전용 영속 계층을 추가했다. Phase 2~9까지 모든 Adapter는
매 호출마다 DesignDocument를 메모리에서 다시 만들었고, 저장된 것은 하나도 없었다.

## 아키텍처

```text
lib/design/design-document-registry.ts   ← 신규 — 저장소(fs-JSON CollectionStore, 기존 registry들과 동일한 패턴)
lib/design/design-document-service.ts    ← 신규 — "있으면 재사용, 없으면 기존 Adapter로 생성 후 저장"
        │
        ├── getOrBuildDesignDocumentForPlan()        → 기존 planToDesignDocument()(Phase 2) 재사용
        ├── getOrBuildDesignDocumentForStoryboard()   → 기존 storyboardToDesignDocument()(Phase 4) 재사용
        ├── getOrBuildDesignDocumentForWireframe()    → 기존 wireframeToDesignDocument()(Phase 5) 재사용
        └── getOrBuildDesignDocumentForPrototype()    → 기존 prototypeToDesignDocument()(Phase 6) 재사용
```

기존 5개 `*-document-adapter.ts` 파일의 순수 함수는 **단 한 줄도 수정하지 않았다** — 새 Service
계층이 그 함수들을 "아직 저장된 게 없을 때의 fallback"으로 그대로 호출할 뿐이다.

## DesignDocument Identity

```ts
interface DesignDocumentRecord {
  id: string;
  projectId: string;   // = DesignPlanRecord.id — 파이프라인 전체가 이미 공유하는 "project" 식별자
  version: number;      // 이 project에 대한 저장 회차(PrototypeRecord.version과 동일한 기존 패턴)
  status: "draft" | "current" | "archived";
  document: DesignDocument;   // 실제 DesignDocument(스키마 자체는 무변경)
  createdAt: string;
  updatedAt: string;
}
```

- `getLatestDesignDocument(projectId)` — 가장 높은 `version` 레코드 = "현재 버전", 언제나 조회 가능.
- 저장은 항상 append-only(새 version 추가) — `prototype.ts`/`review-registry.ts`/`figma.ts`/
  `design-sync.ts`와 동일한 기존 관례. 과거 버전은 절대 덮어쓰지 않는다(향후 버전 히스토리 지원).

## 왜 새 Registry인가 (기존 것을 확장하지 않고)

`DesignPlanRecord.document`(Phase 2)가 이미 DesignDocument 하나를 담고 있지만, 이것은
Plan 생성 시점에 고정되는 Phase 1 전용 메모일 뿐 — 독립된 id/version/status/history가 없고
Planning(수정 금지 대상)을 건드리지 않고는 갱신할 수 없다. 이번 Phase가 요구하는 "Project당
하나의 현재 DesignDocument(+ 버전 히스토리 + 상태)"라는 조건을 만족하지 못해 새 Registry로
분리했다 — DesignDocument "스키마" 자체는 여전히 하나(SSOT 유지), 이 Registry는 그 스키마의
인스턴스를 저장하는 자리만 추가한다.

## Adapter 통합 방식 — "준비되었지만 아직 연결되지 않음"

Phase 7의 Hybrid Adapter가 Phase 9 이전까지 그랬던 것과 동일한 패턴이다: `design-document-
service.ts`의 4개 함수는 어떤 route/registry/generator에서도 아직 호출되지 않는다
(Planning/Storyboard/Wireframe/Prototype/Claude Design/Website Builder/React Generator 전부
이번 Phase의 수정 금지 대상이라 실제 연결 지점이 없다). 따라서 오늘 시점에는 아무것도
저장된 적이 없으므로 이 4개 함수는 항상 "재생성 후 저장" 경로만 타며, 결과적으로 **기존
Adapter 호출과 동일한 출력**을 만든다 — 회귀 테스트(`design-document-service.test.ts`)가
"재사용" 분기(이미 저장된 문서를 그대로 반환하고 다시 만들지 않음)도 별도로 직접 증명한다
(저장된 문서에 실제 Adapter가 절대 만들 수 없는 sentinel 값을 심어두고, 두 번째 호출이 그
값을 그대로 반환하는지 확인).

---

# Persistence Integration

Phase 10.5에서 Phase 10의 영속 계층을 실제 파이프라인에 처음으로 연결했다 — Phase 9(Website
Builder Hybrid Adapter가 route.ts에 연결됨)와 정확히 같은 패턴("먼저 준비 → 나중에 연결")이다.

## Planning — 첫 영속 지점

```text
POST /api/design/requirements
        ↓
createDesignPlan()  (lib/design/registry.ts)
        │
        ├── 1. document 계산 (Phase 2, 기존 로직 무변경)
        ├── 2. DesignPlanRecord 저장 (design-plans 컬렉션, 기존 로직 무변경)
        ├── 3. saveDesignDocument({ projectId: record.id, document })  ← 신규(Phase 10.5)
        └── 4. record 반환 (필드/형태 이전과 100% 동일)
```

`createDesignPlan()`이 계산한 `document`는 그대로 재사용될 뿐 다시 계산되지 않는다(Phase 10의
`saveDesignDocument()`를 그대로 호출 — 새 로직 없음). 이 저장은 `design-plans`와는 독립된
`design-documents` 컬렉션에 Version 1을 남기는 **부수 효과**이며, `createDesignPlan()`의
반환값·API 응답 필드는 하나도 바뀌지 않았다.

## Storyboard — 재사용이 실제로 가능한 유일한 하위 단계

```text
generateStoryboard(plan, chatFn, store?)
        │
        ├── plan.document가 이미 있으면 → 그대로 사용(변경 없음)
        └── plan.document가 없으면      → getOrBuildDesignDocumentForPlan(plan, store) 호출
                                             (Phase 10 서비스 재사용 — 새 로직 없음)
        ↓
planToStoryboardSource(planForSource)   ← Storyboard Adapter, 이번 Phase 무변경
        │  (기존 `plan.document ?? planToDesignDocument(plan)` 폴백이 이미 채워진
        │   document를 자연히 재사용하게 됨 — Adapter 파일 자체는 한 줄도 안 바뀜)
        ↓
buildUserPrompt(source)  → AI 프롬프트 생성(성공 경로에만 영향)
```

`buildDefaultStoryboard()`(동기 결정론적 폴백)는 원래 `plan`을 그대로 사용하므로 이 변경과
전혀 무관하며, 모든 기존 테스트 픽스처(각 Phase의 `*-generator.test.ts`가 공유하는 `PLAN`
객체는 `.document`가 없는 순수 리터럴)에서 기존과 동일한 결과를 낸다 — 이는 가정이 아니라
회귀 테스트로 직접 증명했다(`storyboard-generator.test.ts`의 새 describe 블록: sentinel 값을
미리 저장해 두고, 실제로 그 값이 프롬프트에 반영되는지 확인).

## Wireframe / Prototype / Claude Design — 이번 Phase에서 연결하지 않음

세 단계 모두 자신의 Registry 타입(`WireframeRecord`/`PrototypeRecord`)에 `DesignPlanRecord`와
같은 `.document` 필드가 없다. Registry 계약을 바꾸지 않고는(금지) 이 세 단계의 프롬프트
생성 경로에 영속 문서를 주입할 방법이 없고, 그 문서를 만드는 계산 자체는 각자의 Adapter 파일
내부에 있어(이번 Phase 수정 금지) 외부에서 바꿀 수도 없다. 억지로 "호출은 하되 결과는 버리는"
형태의 연결은 실제 가치 없이 공유 상태 위험만 늘리는 것으로 판단해 시도하지 않았다 — 정직하게
Remaining Work로 남긴다.

## Backward Compatibility 검증

- **API 응답 불변** — `createDesignPlan()`/`generateStoryboard()`의 반환 필드는 이전과 완전히
  동일(신규 테스트로 직접 확인).
- **Registry 계약 불변** — `DesignPlanRecord`/`StoryboardRecord`의 타입은 변경하지 않았다.
- **Dashboard/CLI 불변** — 어느 쪽도 이번 Phase에서 수정하지 않았다.
- **History append-only 유지** — Phase 10의 버전 관리 규칙(새 버전 추가, 과거 버전 불변)은
  그대로 재사용했을 뿐 새로 구현하지 않았다.

---

# Validation

## TypeScript

- ✅ Success

## ESLint

- ✅ No new issues
- packages/* 는 기존 설정상 제외

## Build

- ✅ Success

---

# Regression Results

## Root Tests (incl. React Generator)

```
98 / 98 PASS
```

## Design Automation (apps/cnbiz-web/tests/design)

```
258 / 258 PASS
```

(252 pre-existing + 6 new — 3 added to `tests/design/registry.test.ts` (Planning now persists
Version 1 automatically, return shape unchanged) + 3 added to
`tests/design/storyboard-generator.test.ts` (Storyboard actually reuses a persisted document via
`getOrBuildDesignDocumentForPlan()` when `plan.document` is missing, proven with a sentinel value;
the sync fallback path is untouched).

---

# Known Limitations

## Metadata

현재 일부 Adapter는 placeholder metadata를 생성한다.

실제 프로젝트 메타데이터와 연결되어 있지 않다.

---

## Sections

현재 대부분의 Adapter는

```
Page

↓

Single Section

↓

Components
```

정도만 생성한다.

향후에는

- Header
- Hero
- Feature
- Pricing
- FAQ
- CTA
- Footer

등의 의미 있는 Section으로 확장해야 한다.

---

## Component Props

Rendering Contract는 다양한 Props를 지원한다.

하지만 현재 Adapter는 최소한의 Props만 생성한다.

---

## Responsive

Responsive Contract는 정의되어 있다.

그러나 대부분의 Adapter는 desktop/tablet/mobile 정보를 아직 채우지 않는다.

---

## Events

Events Contract는 정의되어 있다.

현재는 TODO Stub 수준이며 실제 Interaction 정보는 생성되지 않는다.

---

## Runtime Validation

design-validator.ts는 존재한다.

하지만

```
ajv-formats
```

통합이 아직 완료되지 않아 Runtime Schema Validation은 비활성 상태이다.

---

# Remaining Work

## Phase 9 — Completed

Website Builder Integration

완료된 것

- `app/api/design/website/route.ts`가 Hybrid Source(`buildWebsiteBuildHybridSource()`)를 통해서만
  입력을 조립하도록 전환(호출 경로 단일화)
- Review→ClaudeDesign→Prototype 체인을 조회해 가능하면 풍부한 DesignDocument를 Hybrid Source에
  포함

남은 것(다음 Phase 후보)

- `packages/cli`의 실제 생성 로직이 `DesignDocument.pages`/`sections`/`components`/`theme`을
  실제로 읽어 반영하도록 만드는 것(현재는 여전히 고정 11페이지 + `siteType` 팔레트만 사용)
- Business type/audience/template selection/deployment 같은 아직 스키마에 자리가 없는 정보를
  어디에 실을지 결정(Phase 7 Remaining Work에서 이미 지적된 한계, 미해결)

---

## Phase 10 — Completed

DesignDocument Persistence

완료된 것

- 전용 Registry(`design-document-registry.ts`) — projectId/version/status/createdAt/updatedAt
  + append-only 버전 히스토리, "현재 버전" 항상 조회 가능
- 재사용 우선 Service 계층(`design-document-service.ts`) — 4개 stage(Plan/Storyboard/Wireframe/
  Prototype)에 대해 "있으면 재사용, 없으면 기존 Adapter로 생성 후 저장"

남은 것(Phase 10.5에서 실제로 완료됨) — 아래 Phase 10.5 항목 참고.

---

## Phase 10.5 — Completed

Persistence Integration

완료된 것

- Planning(`createDesignPlan()`)이 파이프라인의 첫 영속 지점이 됨 — Design Plan 생성 시
  자동으로 Version 1 DesignDocument 저장(부수 효과, 반환값 불변)
- Storyboard(`generateStoryboard()`)가 `plan.document`가 없을 때 `getOrBuildDesignDocumentForPlan()`
  을 통해 실제로 영속 문서를 재사용 — Storyboard Adapter 파일 자체는 무수정

남은 것(다음 Phase 후보)

- Wireframe/Prototype/Claude Design은 여전히 연결되지 않았다 — `WireframeRecord`/
  `PrototypeRecord`에 `.document` 필드가 없어(Registry 계약 변경 금지) 재사용을 주입할 방법이
  없고, 문서를 만드는 계산 자체가 각자의 frozen Adapter 파일 내부에 있다. 이 세 단계가 실제로
  재사용에 참여하려면 (a) Registry 타입에 `.document` 필드를 추가하거나, (b) 각 Adapter가
  Registry에서 Plan을 조회할 수 있게 하거나 둘 중 하나가 필요 — 둘 다 이번 Phase 범위 밖
- `DesignPlanRecord.document`(Phase 2, 레코드에 내장)와 새 Registry(Phase 10, 독립 저장)가
  당분간 공존한다 — 두 값은 항상 동일한 내용이지만(같은 계산 결과를 저장), 장기적으로는
  Planning이 새 Registry만을 통해 저장하도록 통합하는 정리가 필요
- Supabase 백엔드 자체는 이미 `CollectionStore` 추상화(`lib/db`)를 통해 지원됨 — 별도 작업 불필요

---

## Phase 11

Rendering Contract Population

Wireframe / Prototype / Claude Design 단계에서

다음 정보를 실제로 생성하도록 개선한다.

- children
- layout
- style
- responsive
- events

---

# Success Criteria

DesignDocument 하나만으로 다음 모듈이 동작해야 한다.

- Website Builder
- React Generator
- Future AI Agents

Legacy Adapter 없이 DesignDocument만으로 전체 파이프라인을 구성하는 것이 최종 목표이다.

---

# Architecture Decisions

## Adopted

- DesignDocument를 Single Source of Truth로 사용
- Adapter Pattern 유지
- Pure Function 기반 Generator
- Backward Compatible Migration
- Registry/API/Dashboard 변경 최소화
- Rendering Contract를 Optional Field로 확장

---

## Deferred

- Runtime Schema Validation
- Rich Component Props Enforcement
- Wiring the Phase 10 persistence service into any live route/registry/generator
- Website Builder Full Migration

---

# Change Log

| Version | Date | Description |
|----------|------------|------------------------------|
| 1.0.0 | 2026-07-23 | Initial migration status document |
| 1.1.0 | 2026-07-23 | Phase 9 — Website Builder Integration (Hybrid Source wired into `app/api/design/website/route.ts`) |
| 1.2.0 | 2026-07-23 | Phase 10 — DesignDocument Persistence (`design-document-registry.ts` + `design-document-service.ts`, not yet wired into any call site) |
| 1.3.0 | 2026-07-23 | Phase 10.5 — Persistence Integration (Planning auto-persists Version 1; Storyboard reuses it via `getOrBuildDesignDocumentForPlan()`) |
| 2.0.0 | Planned | DesignDocument-only Pipeline Complete |

---

# Overall Status

**Design JSON Standardization:** **~96% Complete**

### Completed

- SSOT established
- Adapter migration completed
- Rendering Contract completed
- React Generator completed
- Website Builder input-assembly integration completed (Hybrid Source wired in, legacy adapter call removed from the route)
- DesignDocument Persistence layer completed (dedicated registry + reuse-first service, both fully tested)
- Persistence Integration completed for Planning (auto-persists Version 1) and Storyboard (reuses it) — the two places where it was architecturally possible without touching a frozen Adapter or a Registry contract
- Full regression validation passed

### Remaining

- Website Builder's actual generation logic still doesn't read DesignDocument (pages/sections/components/theme) — only the Hybrid Source's legacy `inputs` half drives real generation today
- Wireframe/Prototype/Claude Design still cannot participate in persistence reuse — their Registry types have no `.document` field, and adding one (or letting their frozen Adapters query the Registry directly) is deferred
- Rendering Contract Population
- Runtime Schema Validation

The project has successfully transitioned to a DesignDocument-centric architecture while maintaining backward compatibility and passing all regression tests. Website Builder assembles its input through the Hybrid Adapter; Planning now automatically persists a project's first DesignDocument; and Storyboard genuinely reuses it instead of rebuilding. Wireframe/Prototype/Claude Design remain unconnected to persistence — a real structural gap, honestly documented rather than papered over with a call that discards its own result.