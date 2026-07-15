# Design Automation — Master Index

> Version: v1.0
> Status: Phase 1-6 Implemented
> Priority: High
> Owner: AI Business OS
> Last Updated: 2026-07-15

---

# 1. 목적

"고객 요구사항 → 기획 → 디자인 → 승인 → 코드 생성"까지 이어지는 Design Automation 전체
시스템의 진입점 문서. 4개 세부 스펙 문서와 실제 구현 상태를 연결한다.

| 문서 | 다루는 범위 |
|------|-------------|
| `CLAUDE_DESIGN_INTEGRATION.md` | Claude Code ↔ Claude Design 연동, Requirement Analysis, Storyboard/Wireframe/Prototype, Customer Review, API |
| `FIGMA_INTEGRATION.md` | Figma Import/Export (문서 작성 진행 트래커 — 세부 스펙은 이후 작성 예정) |
| `DESIGN_SYNC.md` | Design ↔ Code 양방향 동기화 엔진 |
| `DESIGN_WORKFLOW.md` | Customer Request부터 Deploy까지 전체 14-Phase Workflow |

---

# 2. 이 저장소의 Phase 구분 (실제 구현 기준)

위 4개 문서는 각자 독립적인 Phase 번호를 갖는다(예: `DESIGN_SYNC.md`의 Phase 1은 "Sync
Engine"). 실제 구현 순서를 혼동 없이 추적하기 위해, 이 저장소에서 "Design Automation
Phase N"이라고 말할 때는 **`DESIGN_WORKFLOW.md`의 전체 Workflow(14 Phase) 중 최초 두 단계
(Phase 2 요구사항 분석 + Phase 3 기획)를 하나로 묶은 것**을 가리킨다:

| Design Automation Phase | 산출물 | 근거 |
|---|---|---|
| **Phase 1(이 저장소 구현 완료)** | Requirement Analysis, Feature List, Site Map, User Flow, Screen List | `DESIGN_WORKFLOW.md` Phase 2("요구사항 분석")+Phase 3("기획") 통합, `CLAUDE_DESIGN_INTEGRATION.md` 7번("Requirement Analysis")·5번("Claude Code 역할") |
| **Phase 2(이 저장소 구현 완료)** | Storyboard(Screen Flow, User Journey, Navigation Flow, Page Sequence, Screen Description) | `DESIGN_WORKFLOW.md` Phase 4, `CLAUDE_DESIGN_INTEGRATION.md` 8번 |
| **Phase 3(이 저장소 구현 완료)** | Wireframe(Desktop/Tablet/Mobile Layout, Component Layout, Responsive Layout, Screen Sections) | `DESIGN_WORKFLOW.md` Phase 5 |
| **Phase 4(이 저장소 구현 완료)** | Prototype(Click Flow, Navigation Flow, Screen Transition, Interaction Map, Component Actions, User Journey, Animation Preview, Prototype Preview) | `DESIGN_WORKFLOW.md` Phase 6 |
| **Phase 5(이 저장소 구현 완료)** | Claude Design 연동(Design/UI/Component/Theme/Layout Prompt) + Dashboard Preview | `DESIGN_WORKFLOW.md` Phase 7, `CLAUDE_DESIGN_INTEGRATION.md` 6번("Claude Design 역할") |
| **Phase 6(이 저장소 구현 완료)** | 고객 검토/승인 Workflow(Review Engine + Approval Engine) | `DESIGN_WORKFLOW.md` Phase 8("고객 검토") |
| Phase 7(미구현) | Figma Import/Export | `DESIGN_WORKFLOW.md` Phase 9 |
| Phase 8(미구현) | Design Sync(양방향) | `DESIGN_WORKFLOW.md` Phase 10, `DESIGN_SYNC.md` 전체 |
| Phase 9+(미구현) | Website Builder 연동, Build/Test/Deploy | `DESIGN_WORKFLOW.md` Phase 11~14 (Website Builder v2·Dashboard·CI는 이미 별도로 구현되어 있음, `docs/REPOSITORY_INDEX.md` 참고 — 이 Phase가 하는 일은 "연결"뿐) |

---

# 3. Phase 1 구현 요약 (2026-07-14)

**Status: ✅ Implemented**

- Description: Requirement Analysis·Feature List·Site Map·User Flow·Screen List 5종을 하나의
  "Design Plan"으로 자동 생성. `lib/ai/bridge.ts`의 기존 `chatViaCli()`(Website Builder Content
  Engine·AI Studio와 동일한 CLI shell-out 브릿지)를 그대로 재사용해 AI에게 JSON 생성을 요청하고,
  Provider 미설정이거나 응답 파싱에 실패하면 결정론적 기본값으로 폴백한다(Website Builder
  Content Engine의 `buildDefaultContent()`/`generateSiteContent()`와 동일한 원칙).
- 문서와의 차이점(명세에 없던 구현 세부사항):
  - 명세(`CLAUDE_DESIGN_INTEGRATION.md` 14번)는 `POST /api/design/requirements` 하나만
    정의하고 Feature List/Site Map/User Flow/Screen List용 별도 API는 명시하지 않는다 —
    같은 문서의 11번("Dashboard Integration")도 이 5종을 "Requirements" 메뉴 하나로 묶어
    보여주므로, 5개 API로 쪼개지 않고 하나의 엔드포인트가 5종을 한 번에 생성·반환하도록
    구현했다.
  - `projectId`(기존 `lib/projects/registry.ts`의 Project와 선택적 연결)는 명세에 없던 필드다
    — Phase 5(Dashboard Integration을 실제 승인 Workflow와 엮는 단계)에서 필요해질 것으로
    예상해 스키마에는 포함해 두었으나, 강제하지는 않는다(Website Builder도 기존 Project 등록
    없이 독립적으로 실행 가능한 것과 동일한 원칙).
  - Audit Log(`design.generate`)·Metrics(`aiTaskCount`) 연동은 명세에 없다 — Operations &
    Observability v1.1에서 이미 구축된 인프라를 그대로 재사용(추가 저장소 없음)한 것으로,
    이 저장소의 다른 모든 AI 실행 경로(AI Studio·Website Builder)와 동일한 일관성을 위해
    추가했다.
- Evidence: `lib/design/{types,generator,registry}.ts`, `app/api/design/requirements/route.ts`,
  `app/developer/design/page.tsx`, `components/developer/dashboard/DesignPlansWidget.tsx`
- 테스트: `tests/design/{generator,registry,integration}.test.ts`(21개) — 상세는
  `docs/REPOSITORY_INDEX.md`의 `## Design Automation Phase 1` 참고.
- 미구현(Phase 2 이후로 명시적으로 남겨둔 것): Storyboard, Wireframe, Prototype, Claude
  Design 연동, Figma Import/Export, Design Sync, 고객 승인 Workflow.

---

# 4. Phase 2 구현 요약 — Storyboard Generator (2026-07-15)

**Status: ✅ Implemented**

- Description: Phase 1이 만든 Design Plan(Site Map·Screen List)을 입력으로 Screen Flow·User
  Journey·Navigation Flow·Page Sequence·Screen Description 5종을 생성하는 "Storyboard
  Generator". Phase 1과 완전히 동일한 원칙 재사용 — `lib/ai/bridge.ts`의 `chatViaCli()`로
  AI에게 JSON 생성을 요청하고, Provider 미설정이거나 응답 파싱에 실패하면 결정론적 기본값
  (`buildDefaultStoryboard()`, Phase 1 Screen List의 순서를 그대로 화면 흐름으로 변환)으로
  전부-아니면-전무 폴백. Audit Log·Metrics도 새 저장소 없이 기존 인프라만 재사용.
- 문서와의 차이점(명세에 없던 구현 세부사항):
  - 요구사항이 예시로 든 API 응답 `{ storyboardId, projectId, screens, flow }`는 그대로
    포함하되(`screens`=`screenDescriptions`, `flow`=`screenFlow`, `projectId`=이 Storyboard가
    생성된 Phase 1 Design Plan의 `id`), Dashboard가 필요로 하는 나머지 3종
    (userJourneys/navigationFlow/pageSequence)은 `storyboard` 필드 아래 전체 레코드로 추가
    포함했다 — 스펙을 축소하지 않고 확장한 것이라 호환성에 영향 없음.
  - "Developer → Design → Storyboard"라는 계층 요구를 새로운 중첩 네비게이션 메뉴로
    만들지 않고, 기존 `/developer/design`(Requirements) 페이지와 신규
    `/developer/design/storyboard` 페이지 사이의 상호 링크(각 페이지 헤더의 "Storyboard →"
    / "← Requirements")로 구현했다 — `DeveloperNav`는 여전히 평평한(flat) 목록이라(Marketplace의
    Installed/Updates 하위 페이지들도 같은 방식) 이 관례를 그대로 따랐고, 새 항목 추가 없이
    기존 "Design" 링크 하나만 재사용해 breaking change 없이 확장했다.
  - Metrics는 기존 `aiTaskCount`를 재사용하는 대신, `MetricsCounters`에 `storyboardGenerationCount`
    필드를 추가(같은 `lib/data/metrics.json` 파일, 같은 `readMetrics()`/`incrementMetric()` 함수
    — 새 저장소가 아니라 기존 레지스트리에 필드 하나를 additive하게 얹은 것)했다. Phase 1의
    `design.generate`가 이미 `aiTaskCount`를 쓰고 있어, 여기에 Storyboard까지 합치면 "몇 번의
    AI 호출이 있었는지"와 "Storyboard가 몇 번 만들어졌는지"를 구분할 수 없어지는 문제를
    피하기 위한 선택 — 요구사항의 "Increment storyboard generation count"(카운트 이름을 못박음)
    문구와도 더 정확히 일치한다.
- Evidence: `lib/design/{storyboard,storyboard-generator}.ts`,
  `app/api/design/storyboard/{route.ts,[id]/route.ts}`, `app/developer/design/storyboard/page.tsx`,
  `lib/audit/log.ts`(`design.storyboard.generate` 추가), `lib/metrics/registry.ts`
  (`storyboardGenerationCount` 추가)
- 테스트: `tests/design/storyboard-{generator,registry,integration}.test.ts`(24개) — 상세는
  `docs/REPOSITORY_INDEX.md`의 `## Design Automation Phase 2` 참고.
- 미구현(Phase 3 이후로 명시적으로 남겨둔 것): Wireframe, Prototype, Claude Design 연동,
  Figma Import/Export, Design Sync, 고객 승인 Workflow.

---

# 5. Phase 3 구현 요약 — Wireframe Generator (2026-07-15)

**Status: ✅ Implemented**

- Description: Phase 2가 만든 Storyboard(Screen Description의 `keyElements`)를 입력으로
  Desktop/Tablet/Mobile Layout·Component Layout·Responsive Layout·Screen Sections을 생성하는
  "Wireframe Generator". Phase 1·2와 완전히 동일한 원칙 재사용 — `lib/ai/bridge.ts`의
  `chatViaCli()`로 AI에게 JSON 생성을 요청하고, Provider 미설정이거나 응답 파싱에 실패하면
  결정론적 기본값(`buildDefaultWireframe()`, Screen Description의 `keyElements`를 13종 고정
  컴포넌트 팔레트(Header/Navigation/Sidebar/Hero/Card/Form/Table/Dashboard/Footer/Modal/
  Button/Search/Pagination)로 정규화해 화면별 Header/Hero/Main Content/Footer 섹션으로 변환)로
  전부-아니면-전무 폴백. Audit Log·Metrics도 새 저장소 없이 기존 인프라만 재사용.
- 문서와의 차이점(명세에 없던 구현 세부사항):
  - 요구사항이 예시로 든 API 응답 `{ wireframeId, projectId, layouts, components, responsive }`는
    그대로 포함하되(`layouts`=화면별 Desktop/Tablet/Mobile `BreakpointLayout` 3종을 묶은 배열,
    `components`=전체 화면에서 실제로 쓰인 컴포넌트 종류의 인벤토리(usedIn 화면 목록 포함),
    `responsive`=desktop/tablet/mobile 3개 breakpoint의 min-width·column 수·설명을 담은 객체),
    Dashboard가 필요로 하는 전체 레코드는 `wireframe` 필드 아래에 추가로 포함했다 — Phase 2의
    `storyboard` 필드와 동일한 확장 방식으로 스펙을 축소하지 않고 확장한 것이라 호환성에 영향
    없음.
  - "Screen Sections"는 명세에 `layouts`/`components`/`responsive`와 나란히 나열된 별도
    생성 대상이었으나, 별도 최상위 필드로 만들지 않고 각 `BreakpointLayout.sections`(화면×
    breakpoint별 섹션 목록)로 구현했다 — Desktop/Tablet/Mobile Layout 자체가 이미 "그 breakpoint
    에서의 화면 구성 섹션"이라는 의미를 담고 있어, 별도 필드로 중복 표현하지 않았다.
  - 결정론적 폴백에서는 같은 화면의 desktop/tablet/mobile 섹션 구성(components)을 동일하게
    유지하고 `columns`(12/8/4)만 breakpoint별로 다르게 부여했다 — 반응형 시 실제로 달라지는
    동작(Sidebar가 접히거나 Navigation이 햄버거 메뉴로 축약되는 것 등)은 `responsive` 필드의
    `notes`로 서술하고, 섹션 구조 자체를 breakpoint마다 다르게 지어내지는 않았다(AI 경로는
    프롬프트에서 breakpoint별로 다른 섹션 구성을 자유롭게 생성할 수 있도록 허용함). 컬럼 수는
    CNBIZ_RULES.md 4.3(브레이크포인트)과 동일한 사고를 따른 12/8/4 그리드다.
  - "Developer → Design → Wireframe"이라는 계층 요구는 Phase 2와 동일하게 새로운 중첩 네비게이션
    메뉴를 만들지 않고, `/developer/design/storyboard`(Storyboard, "Wireframe →" 링크 추가)와
    신규 `/developer/design/wireframe` 페이지 사이의 상호 링크("Wireframe →" / "← Storyboard")로
    구현했다 — `DeveloperNav`는 무변경.
  - Metrics는 `MetricsCounters`에 `wireframeGenerationCount` 필드를 추가(같은
    `lib/data/metrics.json` 파일, 같은 `readMetrics()`/`incrementMetric()` 함수)했다 — Phase 2와
    동일하게, "몇 번의 AI 호출이 있었는지(`aiTaskCount`)"·"Storyboard가 몇 번 만들어졌는지
    (`storyboardGenerationCount`)"·"Wireframe이 몇 번 만들어졌는지(`wireframeGenerationCount`)"를
    서로 구분 가능하게 유지했다.
- Evidence: `lib/design/{wireframe,wireframe-generator}.ts`,
  `app/api/design/wireframe/{route.ts,[id]/route.ts}`, `app/developer/design/wireframe/page.tsx`,
  `lib/audit/log.ts`(`design.wireframe.generate` 추가), `lib/metrics/registry.ts`
  (`wireframeGenerationCount` 추가)
- 테스트: `tests/design/wireframe-{generator,registry,integration}.test.ts`(25개) + 기존
  `tests/metrics/registry.test.ts`에 `wireframeGenerationCount` 케이스 1개 추가.
- 미구현(Phase 4 이후로 명시적으로 남겨둔 것): Prototype, Claude Design 연동, Figma
  Import/Export, Design Sync, 고객 승인 Workflow.

---

# 6. Phase 4 구현 요약 — Prototype Generator (2026-07-15)

**Status: ✅ Implemented**

- Description: Phase 3이 만든 Wireframe(화면별 Desktop Layout의 컴포넌트 구성)을 입력으로
  Click Flow·Navigation Flow·Screen Transition·Interaction Map·Component Actions·User Journey·
  Animation Preview·Prototype Preview를 생성하는 "Prototype Generator". Phase 1~3과 완전히
  동일한 원칙 재사용 — `lib/ai/bridge.ts`의 `chatViaCli()`로 AI에게 JSON 생성을 요청하고,
  Provider 미설정이거나 응답 파싱에 실패하면 결정론적 기본값(`buildDefaultPrototype()`, 13종
  고정 컴포넌트 팔레트별 인터랙션·애니메이션 정의(`COMPONENT_BEHAVIOR`)를 화면 구성에 매핑)로
  전부-아니면-전무 폴백. Audit Log·Metrics도 새 저장소 없이 기존 인프라만 재사용.
- 문서와의 차이점(명세에 없던 구현 세부사항):
  - 요구사항이 예시로 든 API 응답
    `{ prototypeId, projectId, screens, interactions, transitions, journey, preview }`는 그대로
    포함하되(`screens`=화면 참조 배열, `interactions`=화면별 인터랙션 맵(`interactionMap`),
    `transitions`=화면 전환 목록(`screenTransitions`), `journey`=User Journey 배열
    (`userJourneys`), `preview`=Prototype Preview 요약 객체), Dashboard가 필요로 하는 나머지
    상세(`clickFlows`/`navigationFlow`/`componentActions`/`animationPreviews`)는 `prototype`
    필드 아래 전체 레코드로 추가 포함했다 — Phase 2·3의 `storyboard`/`wireframe` 필드와 동일한
    확장 방식으로 스펙을 축소하지 않고 확장한 것이라 호환성에 영향 없음.
  - Registry 요구사항의 "Version" 지원: `PrototypeRecord`에 `version` 필드를 추가하고,
    동일 `wireframeId`에 대해 다시 생성해도 기존 레코드를 덮어쓰지 않고 새 레코드를
    추가하며 버전을 1씩 증가시킨다(`createPrototype()`이 해당 `wireframeId`의 기존 레코드 수
    + 1로 자동 계산). 명세에 별도 버전 API가 없어 신규 API는 추가하지 않고, 기존
    `POST /api/design/prototype`을 같은 `wireframeId`로 다시 호출하는 것 자체가 새 버전을
    만드는 방식으로 구현했다(Dashboard History 목록에 `v1`/`v2`/`v3`처럼 그대로 표시됨).
  - 결정론적 폴백의 Click Flow는 각 화면에서 "대표 컴포넌트" 하나(Button > Form > Search >
    Pagination > Card > Hero > Navigation > Header 우선순위)를 골라 화면 순서대로 이어지는
    단일 `"Primary Flow"`를 생성한다 — AI 경로는 여러 개의 분기 Click Flow를 자유롭게 생성할
    수 있도록 프롬프트에서 제한하지 않았다.
  - "Developer → Design → Prototype" 계층 요구는 Phase 2·3과 동일하게 새로운 중첩 네비게이션
    메뉴를 만들지 않고, `/developer/design/wireframe`("Prototype →" 링크 추가)와 신규
    `/developer/design/prototype` 페이지 사이의 상호 링크("Prototype →" / "← Wireframe")로
    구현했다 — `DeveloperNav`는 무변경. Dashboard 표시 순서(Project → Storyboard → Wireframe →
    Prototype Preview → Interaction Flow → Screen Transition → Journey → Export)는 요구사항이
    명시한 순서를 그대로 따랐다(Storyboard/Wireframe 카드는 Phase 1·2·3 레코드를 체인으로
    조회해 요약만 표시, 재구현이 아닌 참조).
  - Metrics는 `MetricsCounters`에 `prototypeGenerationCount` 필드를 추가(같은
    `lib/data/metrics.json` 파일, 같은 `readMetrics()`/`incrementMetric()` 함수)했다 — Phase
    2·3과 동일하게, `aiTaskCount`·`storyboardGenerationCount`·`wireframeGenerationCount`·
    `prototypeGenerationCount`가 각각 독립적으로 집계되도록 유지했다.
- Evidence: `lib/design/{prototype,prototype-generator}.ts`,
  `app/api/design/prototype/{route.ts,[id]/route.ts}`, `app/developer/design/prototype/page.tsx`,
  `lib/audit/log.ts`(`design.prototype.generate` 추가), `lib/metrics/registry.ts`
  (`prototypeGenerationCount` 추가), `app/developer/design/wireframe/page.tsx`("Prototype →"
  링크 추가)
- 테스트: `tests/design/prototype-{generator,registry,integration}.test.ts`(32개) + 기존
  `tests/metrics/registry.test.ts`에 `prototypeGenerationCount` 케이스 1개 추가.
- 미구현(Phase 5 이후로 명시적으로 남겨둔 것): Claude Design 연동 + Dashboard Preview, Figma
  Import/Export, Design Sync, 고객 승인 Workflow.

---

# 7. Phase 5 구현 요약 — Claude Design Integration (2026-07-15)

**Status: ✅ Implemented**

- Description: Phase 4가 만든 Prototype(Screens/Interaction Map/Component Actions/Animation
  Previews/User Journeys)을 입력으로 실제 Claude Design(또는 다른 디자인/이미지 생성 툴)에
  그대로 넘길 수 있는 5종 프롬프트 — Design Prompt·UI Prompt·Component Prompt·Theme Prompt·
  Layout Prompt — 를 생성하는 "Claude Design Prompt Generator". Phase 1~4와 완전히 동일한
  원칙 재사용 — `lib/ai/bridge.ts`의 `chatViaCli()`로 AI에게 JSON 생성을 요청하고, Provider
  미설정이거나 응답 파싱에 실패하면 결정론적 기본값(`buildDefaultClaudeDesign()`, Prototype의
  화면·인터랙션·컴포넌트 액션·애니메이션·User Journey를 문장으로 직접 엮어 5종 프롬프트를
  구성)으로 전부-아니면-전무 폴백. Audit Log·Metrics도 새 저장소 없이 기존 인프라만 재사용.
- 문서와의 차이점(명세에 없던 구현 세부사항):
  - `CLAUDE_DESIGN_INTEGRATION.md`는 Claude Design의 산출물을 "Storyboard/Wireframe/
    Prototype"(6번)이라고 서술하지만, 이 3종은 이미 Phase 2~4에서 `chatViaCli()`를 직접
    호출해 구현되어 있다(별도의 "Claude Design 연동 계층"이 필요하지 않았음). 이번 요청이
    명시한 "Design/UI/Component/Theme/Layout Prompt 생성"은 그 대신 Phase 4 산출물을 실제
    외부 디자인 툴(Claude Design 등)에 바로 넘길 수 있는 **프롬프트 산출물**을 만드는 새
    계층으로 해석해 구현했다 — Phase 1~4가 만든 구조화 데이터(JSON)를 대체하지 않고, 그
    위에 얹는 확장이다.
  - Registry는 Phase 1~3과 동일한 방식(버전 없이 매번 새 레코드 추가)을 따른다 — Phase 4의
    "Version" 요구사항(동일 wireframeId 재생성 시 버전 증가)은 이 Phase에는 없으므로,
    동일 `prototypeId`로 다시 생성해도 매번 새 레코드가 추가될 뿐 버전 필드는 두지 않았다
    (히스토리 자체는 Dashboard의 History 목록으로 그대로 보존됨).
  - 요청한 API(`POST /api/design/claude`, `GET /api/design/claude/:id`)는 명세
    (`CLAUDE_DESIGN_INTEGRATION.md` 14번)에 없던 신규 엔드포인트다 — 응답은 Dashboard가
    바로 쓸 수 있도록 5종 프롬프트를 최상위에 노출하고, 전체 레코드는 `claudeDesign` 필드로
    확장했다(Phase 2~4의 `storyboard`/`wireframe`/`prototype` 필드와 동일한 확장 방식).
    `GET /api/design/claude`(목록)도 함께 추가했다.
  - "Developer → Design → Claude Design" 계층 요구는 Phase 2~4와 동일하게 새로운 중첩
    네비게이션 메뉴를 만들지 않고, `/developer/design/prototype`("Claude Design →" 링크
    추가)와 신규 `/developer/design/claude` 페이지 사이의 상호 링크("Claude Design →" /
    "← Prototype")로 구현했다 — `DeveloperNav`는 무변경.
  - Metrics는 `MetricsCounters`에 `claudeDesignGenerationCount` 필드를 추가(같은
    `lib/data/metrics.json` 파일, 같은 `readMetrics()`/`incrementMetric()` 함수)했다 — Phase
    2~4와 동일하게, `aiTaskCount`·`storyboardGenerationCount`·`wireframeGenerationCount`·
    `prototypeGenerationCount`·`claudeDesignGenerationCount`가 각각 독립적으로 집계되도록
    유지했다.
- Evidence: `lib/design/{claude-design,claude-design-generator}.ts`,
  `app/api/design/claude/{route.ts,[id]/route.ts}`, `app/developer/design/claude/page.tsx`,
  `lib/audit/log.ts`(`design.claude.generate` 추가), `lib/metrics/registry.ts`
  (`claudeDesignGenerationCount` 추가), `app/developer/design/prototype/page.tsx`("Claude
  Design →" 링크 추가)
- 테스트: `tests/design/claude-design-{generator,registry,integration}.test.ts` + 기존
  `tests/metrics/registry.test.ts`에 `claudeDesignGenerationCount` 케이스 1개 추가.
- 미구현(Phase 6 이후로 명시적으로 남겨둔 것): 고객 검토/승인 Workflow, Figma Import/Export,
  Design Sync, Website Builder 연동.

---

# 8. Phase 6 구현 요약 — Customer Review & Approval (2026-07-15)

**Status: ✅ Implemented**

- Description: Phase 5가 만든 Claude Design 산출물(Design/UI/Component/Theme/Layout Prompt)을
  대상으로 고객 검토 사이클(댓글·승인·반려·수정요청)을 제공하는 "Review Engine" +
  "Approval Engine". Phase 1~5와 달리 AI Provider 호출이 전혀 없는 순수 상태 기계(state
  machine)다 — Draft/In Review/Revision Requested/Approved/Rejected/Archived 6개 상태와,
  Approve/Reject/Request Revision/Cancel Approval 4개 검증된 전이 액션으로 구성된다.
- **역할 분리**: `lib/design/review.ts`(순수 타입 + 상태 전이 규칙표 `APPROVAL_TRANSITIONS`,
  fs 의존성 없음) · `lib/design/review-registry.ts`(fs-JSON 영속화 — `createReview`·
  `getReview`·`listReviews`·`listReviewsForClaudeDesign`·`addReviewComment`·
  `transitionReviewStatus`·`archiveReview`, `lib/data/design-reviews.json`) ·
  `lib/design/approval.ts`(승인 액션의 유효성 검증 후 `review-registry.ts`의
  `transitionReviewStatus()`를 호출 — 별도 저장소를 만들지 않고 Review Registry를 그대로
  재사용, 요구사항의 "Do not create another storage"를 그대로 따름).
- **상태 전이 해석**(명세에 없던 구현 세부사항):
  - `DESIGN_WORKFLOW.md` 10번은 Draft→Review→Revision→Approved→Development(5단계)를
    말하지만, 이번 요구사항 1번은 Draft/In Review/Revision Requested/Approved/Rejected/
    Archived(6개)를 명시적으로 요구했다 — 6개 상태 모델을 그대로 채택했다.
  - `createReview()`는 생성 즉시 `"in_review"` 상태로 시작한다 — "Draft"는 리뷰 레코드가
    아직 만들어지기 전의 개념적 상태(Claude Design 산출물은 있지만 검토가 시작되지 않은
    상태)를 가리키는 것으로 해석했다. 리뷰를 생성하는 행위 자체가 "검토를 시작"하는
    것이므로 별도의 "Draft → In Review 전환" API를 추가로 요구하지 않았다.
  - `APPROVAL_TRANSITIONS`(4개 액션)는 `approve`/`reject`를 `in_review`·
    `revision_requested` 양쪽에서 허용하고(수정요청 후에도 바로 승인/반려할 수 있어야
    실무 흐름에 맞음), `revision`은 `in_review`에서만, `cancel`은 `approved`·`rejected`
    에서 `in_review`로 되돌리는 것으로 정의했다. "Archived"는 이 4개 액션으로는 도달할 수
    없어 `review-registry.ts`의 `archiveReview()`(어느 상태에서든 가능)로 별도 지원 —
    Dashboard(요구사항 4번)의 액션 목록에도 "Archive"가 없어 API 라우트는 만들지 않았다.
  - `version`은 Phase 4 Prototype과 동일한 패턴 — 동일 `claudeDesignId`에 대해 리뷰를
    다시 시작(재검토 사이클)하면 새 레코드가 추가되며 1씩 증가한다(기존 레코드는 덮어쓰지
    않고 히스토리 그대로 보존).
- **API**(`app/api/design/review/{route.ts,[id]/route.ts,[id]/comment/route.ts}`,
  `app/api/design/approval/{route.ts,[id]/route.ts}`, 신규) — 요구사항이 명시한
  `POST /api/design/review`·`GET /api/design/review/:id`·`POST /api/design/approval`·
  `GET /api/design/approval/:id` 그대로. 응답은 요구사항 예시의
  `{reviewId, projectId, status, comments, history, version}`를 그대로 포함하고, 전체
  레코드는 `review` 필드로 확장(Phase 2~5와 동일한 확장 방식). `GET /api/design/review`
  (목록)·`POST /api/design/review/:id/comment`(댓글 작성)은 명세에 없던 additive
  엔드포인트 — 댓글 작성 전용 API가 문서에 없어 REST 관례에 맞춰 추가했다.
  `GET /api/design/approval/:id`는 승인 전용 저장소가 없으므로(요구사항
  "Do not create another storage") `GET /api/design/review/:id`와 동일한 ReviewRecord를
  반환한다("이 리뷰의 현재 승인 상태 조회"라는 의미로 재해석).
- **Dashboard**(`/developer/design/review`, 신규) — Claude Design 선택 → Start Review →
  요구사항이 명시한 순서(Project → Requirement → Storyboard → Wireframe → Prototype →
  Claude Design → Review → Comments → Approval Status → History) 그대로 표시(Project~
  Claude Design 카드는 Phase 1~5 레코드를 체인으로 조회해 요약만 표시, 재구현 아님),
  Comment/Approve/Reject/Request Revision 버튼 + Export JSON/Export Markdown 버튼.
  `/developer/design/claude`와 상호 링크("Review →" / "← Claude Design")로 연결 —
  `DeveloperNav`는 변경하지 않음(Phase 2~5와 동일한 관례). "Cancel Approval"은 Dashboard
  액션 목록(요구사항 4번)에 없어 버튼을 추가하지 않았다(API/엔진 레벨에서는 지원).
- **Auto Save**(요구사항 5번) — 별도의 "저장" 버튼·debounce 로직 없이, 댓글 작성·상태
  전이가 일어날 때마다 `review-registry.ts`의 각 함수가 그 즉시 `fs.writeFileSync()`로
  전체 레지스트리를 재저장한다(Phase 1~5의 fs-JSON registry와 동일한 즉시 쓰기 패턴) —
  "Save on every status change"·"Save comments"·"Save approval"·"Save history" 요구사항이
  모두 동일한 단일 쓰기 경로로 자연스럽게 충족된다.
- **Audit Log**(additive) — `lib/audit/log.ts`의 `AuditAction`에 요구사항이 명시한 5개
  그대로 추가: `"design.review.create"`·`"design.review.comment"`·`"design.review.approve"`·
  `"design.review.reject"`·`"design.review.revision"`(기존 13개 값 무변경). `cancel`
  액션은 요구사항 목록에 없어 감사 로그를 남기지 않는다(상태 전이 자체는 그대로 지원).
  `app/developer/{audit-log,errors}/page.tsx`의 라벨/톤/필터 맵도 함께 갱신.
- **Metrics**(additive) — `lib/metrics/registry.ts`의 `MetricsCounters`에 요구사항이 명시한
  3개 그대로 추가: `reviewCount`(리뷰 생성 시)·`approvalCount`(승인 시)·`revisionCount`
  (수정요청 시). 반려(`reject`)·취소(`cancel`)는 요구사항에 카운터가 명시되지 않아
  집계하지 않는다. 같은 `lib/data/metrics.json` 파일에 필드만 추가(새 저장소 아님).
  `app/developer/metrics/page.tsx`·`components/developer/dashboard/MetricsWidget.tsx`에도
  표시 추가.
- **알려진 제약**(Phase 1~5와 동일): 실제 HTTP 라우트 핸들러를 vitest에서 직접 호출하는
  통합 테스트는 `getCurrentActorEmail()`의 `next/headers` `cookies()`가 요청 컨텍스트
  밖에서 예외를 던져 불가능 — 통합 테스트는 라우트 바로 아래 계층(review-registry+
  approval 실 연동)까지 다루고, 라우트 자체는 수동 curl/Playwright E2E로 검증.
- Evidence: `lib/design/{review,review-registry,approval}.ts`,
  `app/api/design/review/{route.ts,[id]/route.ts,[id]/comment/route.ts}`,
  `app/api/design/approval/{route.ts,[id]/route.ts}`, `app/developer/design/review/page.tsx`,
  `lib/audit/log.ts`(5개 action 추가), `lib/metrics/registry.ts`(3개 counter 추가),
  `app/developer/design/claude/page.tsx`("Review →" 링크 추가)
- 테스트(신규 29개): `tests/design/review-registry.test.ts`(13개 — 생성/버전 자동증가/조회/
  댓글/상태전이/보관/히스토리 순서 검증), `tests/design/approval.test.ts`(11개 — 4개
  액션의 정상 전이·잘못된 전이 거부·not_found·레코드 불변 보장), `tests/design/
  review-integration.test.ts`(4개 — review-registry+approval 실 fs 연동, ClaudeDesign
  체인 위에서의 전체 라이프사이클(댓글→수정요청→승인→취소→반려→보관) 1개 포함) + 기존
  `tests/metrics/registry.test.ts`에 3개 counter(reviewCount/approvalCount/
  revisionCount) 케이스 1개 추가.
