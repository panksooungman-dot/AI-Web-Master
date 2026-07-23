# REPORT — AI Business OS 미완료 개발 분석 및 구현

## STEP 4. 추가 구현 검토 (2026-07-23, STEP 1~3 이후)

기존 STEP 1 분석·STEP 2 TODO를 재작성하지 않고 그대로 재확인만 했다.

### 1. 이번에 구현한 기능
없음.

### 2. 수정한 파일
없음.

### 3. 구현 이유(=구현하지 않은 이유)
STEP 2 TODO 표의 잔여 7개 항목(기술 견적서/기능 명세서/프로젝트 타임라인 자동 생성·
Notification 다채널화·Customer 포털·회원가입 백엔드+역할관리 UI·File Upload API·
Portfolio 실콘텐츠/연락처/GSC 연동·Race Condition/Task Queue 비영속화)을 재확인한 결과,
전부 이미 "⛔ 제외/보류"로 표시되어 있었고 그 사유가 이번 라운드의 구현 원칙(기존 API·
Backend·Registry·Auth/RBAC 변경 금지, 아키텍처 변경 금지)과 정확히 같은 지점에서
충돌한다 — 새 AiJobType/Domain, 새 외부 서비스 연동, 새 RBAC role, 새 Auth API 표면,
새 API, 또는 실제 자료·외부 계정 확보 중 하나가 반드시 필요하다. 기존 구조만으로
구현 가능한 항목이 하나도 남아 있지 않아, 억지로 새 기능을 만들지 않고 작업을 종료한다.

### 4. 남은 구현 가능 기능
없음 — STEP 2 TODO의 잔여 7개 항목은 전부 "기존 구조만으로 구현 불가"로 확정됨.
범위가 넓어지면(예: 새 API/Auth 변경 허용) 재검토 가능.

### 5. 전체 진행률(%)
변동 없음(약 90%, STEP 3 종료 시점과 동일 — 이번 STEP은 신규 구현이 없었음).

> 2026-07-23. "AI Business OS 개발 프로세스"(01 Analysis ~ 09 Deployment) 기준으로 미완료
> 항목만 찾아 구현하는 별도 작업 스레드. 08 Testing·09 Deployment는 이번 라운드에서 수행하지
> 않는다(사용자 지시). QA·전체 테스트·리팩터링·아키텍처 변경도 하지 않는다 — 아래 STEP 3에서
> 실행한 유일한 검증은 신규 작성 파일의 1회성 `tsc --noEmit`(타입 오류만 확인, 회귀 테스트 아님)이다.
> 이미 구현되어 동작 중인 코드는 절대 수정하지 않았다(`components/developer/DeveloperNav.tsx`에
> 배열 항목 2개를 추가한 것이 유일한 기존 파일 변경이며, 기존 항목·동작은 무변경).

## STEP 1. 프로젝트 전체 분석 (01~09 단계별 완료도)

> 근거: `PROJECT_STATUS.md`(2026-07-22, 이 저장소의 SSOT로 지정된 문서, 커밋 `d3248d2` 기준
> 실측 작성)를 1차 근거로 삼고, 이번 세션에서 직접 실행한 라이브 검증(같은 날 진행된 "안정화
> 작업" STEP 3 — Design Pipeline 전체를 실제 dev 서버로 curl 실행, 위 섹션 참고)과 코드 직접
> 판독으로 교차 확인했다. 전면 재조사가 아니라 기존 SSOT 위에 이번에 새로 확인된 사실만
> 갱신하는 방식으로 진행했다(문서 자체의 "이미 구현된 기능은 재조사하지 않는다" 원칙과 일치).

### 01 Analysis
| 항목 | 상태 | 근거 |
|---|---|---|
| AI Analysis Engine(Completeness/Missing Items/Business Type/추천 페이지·기능/Summary) | ✅ 완료 | `lib/ai-analysis/*`, 신규 테스트 15개, 2026-07-20 실 E2E 검증(5개 샘플 업종) 완료·PROJECT_STATUS 기록 |
| 기술 견적서/기능 명세서/프로젝트 타임라인 자동 생성 | ❌ 미구현 | PROJECT_STATUS "⏳ 예정된 기능"에 명시. AI Analysis 결과를 입력으로 쓰는 신규 AiJobType 또는 별도 서비스가 필요 — **새 Domain에 해당해 이번 라운드 구현 대상에서 제외**(아래 STEP 2 참고) |

### 02 Planning
| 항목 | 상태 | 근거 |
|---|---|---|
| Planning 대시보드(`/developer/planning`) | ✅ 완료 | Workflow 정의·Run 이력 집계, 2026-07-22 구현·검증 |
| WBS·로드맵 문서 | ✅ 완료 | `docs/01_PMO/{WBS,PROJECT_ROADMAP}.md` 존재·정기 갱신 |

### 03 Design (Design Automation Phase 1~9)
| 항목 | 상태 | 근거 |
|---|---|---|
| Storyboard | ✅ 완료 | Phase 2. 이번 세션에 라이브로 재검증(`storyboard-45648b78-...`, Screen Flow 4개 정상) |
| Wireframe | ✅ 완료 | Phase 3. 라이브 재검증(`wireframe-4e1a32a1-...`, Layout 4개) |
| Prototype | ✅ 완료 | Phase 4. 라이브 재검증(v1 정상 생성) |
| UI Design / Design System / Component Design | ✅ 완료 | 이 저장소엔 별도 Phase명이 없고 Phase 5(Claude Design)가 Design/**UI**/**Component**/Theme/Layout Prompt 5종을 한 번에 생성한다(라이브 재검증 완료). 실제 렌더링되는 Design System은 별도로 `packages/design-system`·`packages/ui`(Website Builder v2가 실사용)로 이미 존재 |
| Design Document(SSOT) | ✅ 완료 | Phase 1의 부수 효과로 저장, `tests/design/design-document-{registry,service}.test.ts` 17개 |
| Review/Approval | ✅ 완료 | Phase 6. 라이브 재검증(`review-30ba3a16-...`, in_review→approved) |
| Figma Import/Export | ✅ 완료 | Phase 7 |
| Design Sync | ✅ 완료 | Phase 8. 라이브 재검증 — 초기 sync(v1, patch 23)→재동기화(v2, patch 0)→rollback(v3, history 3건 append-only 보존) 전부 정상 |
| Website Build 연동 | ✅ 완료 | Phase 9. PROJECT_STATUS는 "코드 존재, CHANGELOG 검증 기록 없음"으로 caveat를 달아뒀으나, 이번 세션에 실제 라이브 실행(`website-build-19be4101-...`, Success)으로 그 caveat를 해소함 |

**→ 03 Design 단계는 전수 완료. 이번 라운드에서 구현할 항목 없음.**

### 04 Database
| 항목 | 상태 | 근거 |
|---|---|---|
| CollectionStore(Supabase 프로덕션/fs 로컬 폴백) 전 Registry 적용 | ✅ 완료 | 같은 날 진행된 "안정화 작업" STEP 1·2에서 나머지 6개 모듈(Design Sync·Website Build·Prompt·Workflow·Workspace·Health)까지 이전 완료, `getDefaultStore()` 사용처 31개 파일로 확인 |
| Registry 간 Race Condition(list→replaceAll 비원자성) | 🟡 구조적 한계(기능 누락 아님) | 모든 배열형 Registry에 공통 존재, 인터페이스 확장 없이는 해결 불가 — **아키텍처 변경 금지 원칙에 따라 이번 라운드 대상 아님** |
| Task Queue/Session/Event Bus의 CollectionStore 미적용(인메모리) | 🟡 설계상 의도 가능성 있음 | 새 Registry·저장 계층 추가가 필요해 **"새 Registry 생성 금지" 원칙에 따라 대상 아님** |

**→ 04 Database 단계는 "미완료 개발"로 분류할 합법적 대상 없음(전부 완료이거나 구조 변경 금지 대상).**

### 05 API
| 항목 | 상태 | 근거 |
|---|---|---|
| Inquiry/Client/WebsiteOrder/AiJob REST CRUD | ✅ 완료(단, Frontend 누락 — 07 참고) | `/api/{inquiries,clients,website-orders,ai-jobs}` 등 8개 라우트 전부 존재, 오늘 직접 코드 확인(`app/api/clients/route.ts` 등) |
| AI API(Chat/Code/Content, Provider Bridge) | ✅ 완료 | AI Platform v1 |
| Authentication(세션+API Key+RBAC) | ✅ 완료 | `lib/auth/*` |
| File Upload | ❌ 미구현이나 **이 저장소 책임 아님** | PROJECT_STATUS "알려진 아키텍처 부채"에 이미 명시 — 첨부파일 저장은 CNBIZ.AI.KR(외부 시스템) 책임으로 설계됨, 새 Domain 추가 없이는 구현 불가해 제외 |

**→ 05 API 단계도 "미완료 개발"로 분류할 합법적 대상 없음(File Upload는 이 저장소 범위 밖).**

### 06 Backend
| 항목 | 상태 | 근거 |
|---|---|---|
| AI Job Worker/Executor + 자동 실행 | ✅ 완료 | `lib/aiJobs/{worker,executor}.ts` |
| Website Builder v2(CLI+백엔드) | ✅ 완료 | 오늘 라이브 재검증(Website Build Success) |
| Audit/Metrics/Health/Backup 인프라 | ✅ 완료(Backup은 같은 날 STEP 3에서 발견된 경로 버그 수정 완료) | 위 "안정화 작업" 섹션 참고 |
| Notification 다채널화(Slack/SMS/webhook/in-app) | ❌ 미구현 | 이메일만 존재. 신규 외부 서비스 연동이 필요해 **새 Domain 생성 금지 원칙에 따라 제외** |

### 07 Frontend
| 항목 | 상태 | 근거 |
|---|---|---|
| Development OS 대시보드(기존 40페이지) | ✅ 완료 | Terminal/Workspace/GitHub/AI Workspace/Website Builder/Workflow Center/Marketplace/Settings/Logs/Health/Audit Log/Metrics/Backup/Design Automation 9종/AI 의뢰 관리 등 |
| **Client 관리자 목록·상세 화면** | ❌ 미구현 → **이번 STEP 3에서 신규 구현** | 오늘 직접 확인: `GET /api/clients`·`GET /api/clients/[id]`는 이미 존재하는데 `/developer/clients` 화면 자체가 없었음(PROJECT_STATUS "🚧 진행 중인 기능"에 명시된 항목) |
| **WebsiteOrder 관리자 목록·상세 화면** | ❌ 미구현 → **이번 STEP 3에서 신규 구현** | 동일 — `GET/PATCH /api/website-orders`는 이미 존재, 화면만 없었음 |
| Customer 포털(고객 본인 조회) | ❌ 미구현이나 **제외** | `Role` 타입에 `customer` 자체가 없어 신규 RBAC role 추가가 전제 — **새 RBAC 생성 금지 원칙에 따라 제외** |
| 회원가입 백엔드 + 역할관리 UI | ❌ 미구현이나 **제외** | 회원가입은 설계상 의도적 배제(이 저장소는 CLI 스크립트로만 계정 생성). 역할관리 UI는 새 Auth 관련 API 표면을 추가하는 셈이라 위험도 판단상 이번 라운드에서 보류 |
| Portfolio 실콘텐츠·회사 연락처 정보 | ❌ 미확정 | 코드 문제가 아니라 실제 자료 수령 대기 — 개발 TODO 아님 |
| GSC(Google Search Console) 연동 | ❌ 미구현 | 외부 계정 소유권 확인 절차가 필요해 코드만으로 완결 불가 |

### 08 Testing / 09 Deployment
사용자 지시에 따라 이번 라운드에서 다루지 않음.

---

## STEP 2. TODO 목록 (미구현·부분 완료 항목만, 우선순위 부여)

| 우선순위 | 항목 | 단계 | 처리 |
|---|---|---|---|
| **High** | Client 관리자 목록·상세 화면 | 07 Frontend | ✅ 이번 STEP 3에서 구현 완료(아래) |
| **High** | WebsiteOrder 관리자 목록·상세 화면 | 07 Frontend | ✅ 이번 STEP 3에서 구현 완료(아래) |
| Medium | 기술 견적서/기능 명세서/프로젝트 타임라인 자동 생성 | 01 Analysis | ⛔ **제외** — 새 AiJobType/Domain 필요 |
| Medium | Notification 다채널화 | 06 Backend | ⛔ **제외** — 새 외부 서비스 연동(새 Domain) 필요 |
| Low | Customer 포털 | 07 Frontend | ⛔ **제외** — 새 RBAC role 필요 |
| Low | 회원가입 백엔드 + 역할관리 UI | 05 API·07 Frontend | ⛔ **보류** — 새 Auth 표면 확장이라 리스크 판단상 이번 라운드 제외 |
| — | File Upload API | 05 API | ⛔ **제외** — 이 저장소 책임 범위 밖(CNBIZ.AI.KR 담당으로 이미 설계됨) |
| — | Portfolio 실콘텐츠·연락처·GSC | 07 Frontend | ⛔ **보류** — 코드 작업이 아니라 실제 데이터/계정 확보가 선행되어야 함 |
| — | Race Condition·Task Queue 비영속화 | 04 Database | ⛔ **제외** — 아키텍처 변경 금지 원칙과 충돌 |

**결론**: "새로운 Domain/API/Registry/Auth/RBAC 생성 금지"·"아키텍처 변경 금지" 원칙을 지키면서
실제로 구현 가능한 미완료 항목은 **Client·WebsiteOrder 관리자 화면 2건**뿐이었다. 나머지는
전부 이 저장소의 기존 운영 규칙(`PROJECT_STATUS.md`의 "구현 금지" 목록·"알려진 아키텍처 부채"
섹션)이 이미 명시적으로 범위 밖으로 지정해 둔 항목이거나, 실제 데이터/계정 확보가 선행되어야
하는 항목이었다.

---

## STEP 3. 구현 (07 Frontend — Client·WebsiteOrder 관리자 화면)

### 1. 새로 구현한 기능
- `/developer/clients` — 고객사(Client) 목록 화면. 회사명·담당자·이메일·연결된 문의/주문 수 표시
- `/developer/clients/[id]` — 고객사 상세. 연락처 정보 + 연결된 Inquiry/WebsiteOrder 링크 목록
- `/developer/website-orders` — 웹사이트 제작 주문(WebsiteOrder) 목록 화면. 상태 필터(접수/처리중/검수/납품완료/취소)
- `/developer/website-orders/[id]` — 주문 상세. 요청 내용 + 연결된 AI Job/산출물 Website + 상태 변경 버튼(기존 `PATCH /api/website-orders/[id]` 그대로 재사용)

### 2. 수정한 파일
**신규(전부 additive, 기존 파일 없음)**
- `apps/cnbiz-web/app/developer/clients/page.tsx`
- `apps/cnbiz-web/app/developer/clients/[id]/page.tsx`
- `apps/cnbiz-web/app/developer/website-orders/page.tsx`
- `apps/cnbiz-web/app/developer/website-orders/[id]/page.tsx`

**수정(1곳, 배열 항목 2개 추가만 — 기존 항목·로직 무변경)**
- `apps/cnbiz-web/components/developer/DeveloperNav.tsx` — `NAV_LINKS` 배열에 `{ href: "/developer/clients", label: "고객사 관리" }`·`{ href: "/developer/website-orders", label: "주문 관리" }` 2개 추가(기존 22개 항목·순서·동작 무변경)

**백엔드/API/Database는 전혀 수정하지 않음** — `GET /api/clients`·`GET /api/clients/[id]`·
`GET /api/website-orders`·`GET/PATCH /api/website-orders/[id]`·`lib/clients/registry.ts`·
`lib/websiteOrders/registry.ts`가 이미 완전한 상태였고(오늘 직접 코드 확인), 새 화면은 그
API를 그대로 소비하기만 한다.

### 3. 구현 이유
STEP 1 분석 결과, "이 저장소가 스스로 구현 가능한(새 Domain·API·Registry·Auth·RBAC 없이)"
미완료 항목이 이 2건뿐이었다. `PROJECT_STATUS.md`가 이미 "🚧 진행 중인 기능"으로 정확히
짚어 둔 항목이었고("개별 GET API는 있고 ... 자체 목록 화면은 아직 없음"), 기존 `/developer/
requests`·`/developer/inquiries`가 이미 확립해 둔 목록+상세 페이지 패턴(같은 컴포넌트:
`PageHeader`·`Card`·`Badge`·`StatusMessage`·`LoadingText`)을 그대로 재사용해 새 UI
프리미티브 없이 구현했다.

### 4. 남은 TODO
STEP 2 표의 "⛔ 제외/보류" 7건 전부 — 각 항목의 제외 사유는 위 STEP 2 표 참고. 전부 이번
라운드의 "새 Domain/API/Registry/Auth/RBAC 생성 금지"·"아키텍처 변경 금지" 원칙과 직접
충돌하거나, 코드 작업이 아닌 외부 데이터/계정 확보가 선행되어야 하는 항목이다. 사용자가
범위를 명시적으로 넓혀줄 경우에만 재착수 가능.

### 5. 전체 진행률(%)
`PROJECT_STATUS.md`(2026-07-22) 기준 89% → **약 90%**(Client·WebsiteOrder 관리자 화면
추가로 "Development OS 대시보드" 항목이 93%에서 소폭 상승, 나머지 영역은 이미 완료 상태라
변동 없음). 전체 진행률 산정 기준은 `PROJECT_STATUS.md`의 표를 그대로 따랐다 — 이 문서를
직접 갱신하지는 않았다(별도 승인 필요 시 요청).

### 검증(QA/회귀 테스트 아님, 1회성 컴파일 확인만)
`npx tsc --noEmit` 0 errors만 확인했다. 사용자 지시("QA 하지 않는다", "전체 테스트 하지
않는다", "QA나 Regression Test를 반복 수행하지 않는다")에 따라 `npm run lint`·`npm run
build`·`vitest`·dev 서버 기동·Playwright 등은 **의도적으로 수행하지 않았다** — 08
Testing 단계에서 한꺼번에 다룰 예정이다.

---

# REPORT — AI Business OS 안정화 작업 진행 상황

> 이 섹션은 2026-07-23부터 시작된 "AI Business OS 안정화 및 마무리 작업"(STEP 1~7 + 최종 검증)의
> 단계별 진행 기록이다. 아래 "REPORT — 프로젝트 구조 분석"(2026-07-18)은 이 작업과는 별개로
> 작성된 이전 구조 분석 문서이며, 그대로 보존한다.

## STEP 1. Backend 안정화 (Critical) — 완료 (2026-07-23)

### 대상

`apps/cnbiz-web`(실제 프로덕션, `apps/cnbiz-web/lib/db/collectionStore.ts` 기준 — 루트 `app/`은
레거시라 대상 아님).

### 1. `CollectionStore.replaceAll()` — Supabase 구현의 DELETE→INSERT 구조 개선

**문제**: `lib/db/supabaseStore.ts`의 `replaceAll()`이 전체 컬렉션을 `DELETE` 한 뒤 `INSERT`하는
2단계 구조였다. 두 단계 사이에 프로세스가 중단되면(네트워크 오류, 서버리스 함수 타임아웃 등)
해당 컬렉션의 기존 데이터가 전부 유실된 채로 남는다 — "일부 유실"이 아니라 "전체 유실" 위험.

**수정**: `upsert(새 레코드) → delete(새 레코드에 없는 나머지)` 순서로 재구성.
- 새 레코드를 먼저 `upsert`(`onConflict: "collection,id"`)하므로, 이 단계가 끝나면 기존 데이터 +
  새 데이터가 공존하는 상태가 된다(데이터가 사라지는 시점이 없음).
- 그다음 새 레코드 목록에 없는(=제거 대상) 행만 `not("id", "in", ...)` 조건으로 삭제.
- 이 순서에서 중단이 발생해도 최악의 경우 "제거됐어야 할 낡은 행이 잠시 남아있는 것"뿐이며,
  다음 `replaceAll()` 호출 시 정리된다. 이전 방식처럼 컬렉션 전체가 사라지는 경우는 없다.
- `records.length === 0`(전체 삭제 요청)일 때는 `upsert` 없이 기존과 동일하게 컬렉션 전체를
  삭제(빈 배열에는 유실될 데이터가 없으므로 문제 없음).
- 파일: `apps/cnbiz-web/lib/db/supabaseStore.ts`

**한계**: PostgREST 단일 요청 안에서 여러 SQL 문을 하나의 DB 트랜잭션으로 묶는 것은
supabase-js 클라이언트만으로는 불가능하다(진짜 원자성을 원하면 Postgres 함수/RPC가 필요).
이번 수정은 "완전한 원자성"이 아니라 "실패 시 최악의 결과를 전체 유실 → 낡은 행 잔존으로
완화"하는 것이 목표이며, 그 목표는 달성했다.

### 2. `Date.now()` 기반 ID 생성 제거 — 전체 Registry 동일 방식 적용

**문제**: 두 가지 패턴이 혼재했다.
- 순수 `${prefix}-${Date.now()}` (10개 Registry: `aiJobs`·`workspaces`·`prompts`·`projects`·
  `workflows`·`websites`·`websiteOrders`·`inquiries`·`requests`·`clients`) — 같은 밀리초 안에
  두 번 호출되면(동시 요청, 빠른 연속 호출) **ID가 그대로 충돌**한다.
- `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` (agents/taskQueue·
  agents/session·audit/log·events/eventBus·commandEngine/engine·workflows/engine·
  design/* 다수) — 충돌 확률은 낮지만 0은 아니고, 위 패턴과 방식이 통일되어 있지 않았다.

**수정**: `apps/cnbiz-web/lib/id.ts`(신규) — `generateId(prefix)`가 Node 내장
`crypto.randomUUID()`로 `${prefix}-${randomUUID()}` 형태의 실질적으로 충돌 불가능한 ID를
생성. 위 두 패턴을 쓰던 **총 27개 파일**(순수 `Date.now()` 10개 + `Date.now()+Math.random` 17개)
전부를 이 함수 호출로 교체 — Registry 전체가 동일한 ID 생성 방식을 쓰도록 통일.

### 3. Registry 관련 테스트

- 기존 테스트 중 ID 형식(`Date.now()` 접두사 등)을 가정하는 assertion은 없었음을 grep으로
  확인 — 기존 테스트는 회귀 없이 그대로 통과.
- 신규: `apps/cnbiz-web/tests/lib/id.test.ts`(2개 — prefix 부여, 10,000회 연속 호출 무충돌).
- 신규: `apps/cnbiz-web/tests/db/supabaseStore.test.ts`(4개 — upsert가 delete보다 먼저
  호출됨·유지할 id 목록으로 `not` 필터 구성됨·빈 배열일 때 upsert 없이 전체 삭제·
  upsert/delete 각 단계 실패 시 에러 전파 및 다음 단계 미실행 확인). `@supabase/supabase-js`를
  `vi.mock`으로 대체한 순수 단위 테스트(`any` 미사용, 실제 Supabase 프로젝트 불필요).

### 완료 조건 검증

| 항목 | 결과 |
|---|---|
| Critical 1 (`replaceAll` DELETE→INSERT) | ✅ 해결 |
| Critical 2 (`Date.now()` ID 충돌) | ✅ 해결 (27개 파일) |
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors |
| ESLint (`npm run lint`) | ✅ 0 errors |
| Build (`npm run build`) | ✅ 성공 |
| 관련 테스트 | ✅ 통과 (신규 6개 포함, 회귀 66 files / 502 tests 전체 통과) |

### 변경 파일

- 신규: `apps/cnbiz-web/lib/id.ts`, `apps/cnbiz-web/tests/lib/id.test.ts`,
  `apps/cnbiz-web/tests/db/supabaseStore.test.ts`
- 수정(ID 생성 → `generateId()`): `lib/aiJobs/registry.ts`·`lib/workspaces/registry.ts`·
  `lib/prompts/registry.ts`·`lib/projects/registry.ts`·`lib/workflows/registry.ts`·
  `lib/workflows/engine.ts`·`lib/websites/registry.ts`·`lib/websiteOrders/registry.ts`·
  `lib/inquiries/registry.ts`·`lib/requests/registry.ts`·`lib/clients/registry.ts`·
  `lib/agents/taskQueue.ts`·`lib/agents/session.ts`·`lib/audit/log.ts`·`lib/events/eventBus.ts`·
  `lib/commandEngine/engine.ts`·`lib/design/{figma,wireframe,figma-generator,design-sync,
  website-build,storyboard,design-document-registry,claude-design,review-registry,registry,
  prototype}.ts`
- 수정(replaceAll 구조 개선): `lib/db/supabaseStore.ts`

### 변경하지 않은 것 (범위 외)

- `Date.now()`가 타임스탬프·소요시간(duration)·rate-limit 계산 등 ID가 아닌 용도로 쓰이는
  곳(`lib/auth/session.ts`·`lib/health/checks.ts`·`lib/requests/spam.ts`·
  `lib/inquiries/spam.ts`·각종 `durationMs` 계산)은 그대로 유지 — 이 작업의 대상이 아님.
- `lib/workspaces/registry.ts`·`lib/workflows/registry.ts`·`lib/prompts/registry.ts` 등
  여전히 `fs` 직접 접근인 Registry는 STEP 2(Database 마이그레이션) 대상이며 이번 STEP에서는
  건드리지 않음.

---

## STEP 2. Database 마이그레이션 — 완료 (2026-07-23)

### 목표

Design Sync·Website Build·Prompt·Workflow·Workspace·Health 6개 대상 모듈의 `fs` 직접 접근을
제거하고 `CollectionStore`(Supabase 프로덕션 / fs 로컬 폴백, `lib/db/`)로 이전.

### 1. 조사 — `fs` 직접 사용 현황 전수 조사

`apps/cnbiz-web/lib/**`에서 `from "fs"`를 쓰는 파일 18개를 전수 조사한 결과:

| 파일 | 용도 | Registry 여부 | 이전 가능 여부 |
|---|---|---|---|
| `lib/design/design-sync.ts` | Design Sync 레코드(SyncRecord) 저장 | ✅ Registry | ✅ 이전함 |
| `lib/design/website-build.ts` | Website Build 연결 레코드 저장 | ✅ Registry | ✅ 이전함 |
| `lib/prompts/registry.ts` | Prompt 레코드·버전 이력 저장 | ✅ Registry | ✅ 이전함 |
| `lib/workflows/registry.ts` | Workflow 정의 저장 | ✅ Registry | ✅ 이전함 |
| `lib/workspaces/registry.ts` | Workspace 레코드 저장 **+** 실제 폴더 생성/존재 확인 | 부분 Registry | 🟡 레코드 저장만 이전, 폴더 생성/확인은 유지(아래 4번) |
| `lib/health/checks.ts` | Build/Test/Coverage 결과 캐시(싱글턴) **+** 디스크 사용량·커버리지 리포트 읽기 | 부분 Registry | 🟡 캐시만 이전, 디스크/커버리지 읽기는 유지(아래 4번) |
| `lib/workflows/engine.ts` | Workflow Run이 실행 중 실제 프로젝트 폴더에 `README.md`/`package.json`/폴더를 생성(Workflow Step `generate-*`) | ❌ Registry 아님 | ❌ 대상 자체가 사용자 실제 프로젝트 디렉터리 — 이전 불가 |
| `lib/aiJobs/executor.ts` | `packages/cli/dist/index.js` 실행 파일 존재 확인 | ❌ Registry 아님 | ❌ 빌드 산출물 존재 확인 — 이전 불가 |
| `lib/terminal/server.ts` | Terminal이 열 실제 디렉터리 경로 검증 | ❌ Registry 아님 | ❌ 실제 파일시스템 검증 — 이전 불가 |
| `lib/projects/detect.ts` | 임의 프로젝트 폴더의 `package.json`/lockfile 감지 | ❌ Registry 아님 | ❌ 대상이 사용자 프로젝트 폴더 — 이전 불가 |
| `lib/paths/repoRoot.ts` | 저장소 루트 탐색(`package.json` 탐색) | ❌ Registry 아님 | ❌ 실제 저장소 경로 탐색 — 이전 불가 |
| `lib/marketplace/registry.ts` | `marketplace/manifest.json` 읽기 + CLI 실행 파일 존재 확인 | ❌ Registry 아님(CLI 브리지) | ❌ 실제 저장소 파일·빌드 산출물 — 이전 불가(대상 목록에도 없음) |
| `lib/devserver/manager.ts` | Dev Server 상태를 **워크스페이스 폴더 자체**(`<workspacePath>/lib/data/devservers.json`)에 CLI와 공유 | ❌ Registry 아님(cross-process 공유 파일) | ❌ `packages/cli`(별도 프로세스)와 파일로 상태를 공유하는 계약 — CollectionStore로 옮기면 CLI가 더 이상 상태를 볼 수 없어짐. 대상 목록에도 없음 |
| `lib/backup/registry.ts` | `.runtime/config/providers.json`·`lib/data/{prompts,workflows}.json`을 그대로 export/import | ❌ Registry 아님(다른 모듈의 파일 계약을 재사용) | ⚠️ 아래 "이전 불가능한 이유" 4번 참고 — 대상 목록에 없어 이번 STEP에서 손대지 않았으나 Prompt/Workflow 마이그레이션과 상호작용이 있어 별도 기록 |
| `lib/ai/bridge.ts` | `packages/cli/dist/index.js` 실행 파일 존재 확인 | ❌ Registry 아님 | ❌ 빌드 산출물 존재 확인 — 이전 불가 |
| `lib/docs/readDocEntry.ts` | 저장소 내 실제 Markdown 문서 파일 읽기(Dashboard 문서 뷰어) | ❌ Registry 아님 | ❌ 실제 문서 파일 — 이전 불가 |
| `lib/docs/readCiWorkflows.ts` | `.github/workflows/*.yml` 실제 파일 읽기 | ❌ Registry 아님 | ❌ 실제 CI 설정 파일 — 이전 불가 |
| `lib/db/fsStore.ts` | `CollectionStore`의 fs 구현체 자체(로컬 개발 전용 폴백) | 해당 없음 | ❌ 이전 대상 아님 — 이 파일이 이전 "대상"이 아니라 이전 "수단"이다. `lib/db/index.ts`의 `getDefaultStore()`가 프로덕션(`NODE_ENV=production`)에서 Supabase 환경변수가 없으면 즉시 throw하므로, 프로덕션에서 이 파일이 선택되는 경우는 없음(기존 로직, 변경 없음) |

### 2. CollectionStore로 이전 완료 (4개 모듈 전체 + 2개 모듈 부분)

- **Design Sync**(`lib/design/design-sync.ts`) — `listSyncRecords`·`getSyncRecord`·
  `listSyncRecordsForReview`·`getLatestSyncForReview`·`recordSync`·`rollbackSyncRecord` 6개
  함수 전부 `fs` → `CollectionStore`(컬렉션명 `design-sync`). 시그니처 마지막 인자를
  `baseDir: string`에서 `store: CollectionStore = getDefaultStore()`로 교체(이 저장소의 기존
  Registry들과 동일한 관례, `lib/aiJobs/registry.ts` 등 참고), 전부 `async`로 전환
- **Website Build**(`lib/design/website-build.ts`) — `listWebsiteBuilds`·
  `getWebsiteBuildRecord`·`listWebsiteBuildsForReview`·`getLatestWebsiteBuildForReview`·
  `recordWebsiteBuild` 5개 함수 전부 이전(컬렉션명 `design-website-builds`)
- **Prompt**(`lib/prompts/registry.ts`) — `listPrompts`·`getPrompt`·`createPrompt`·
  `addPromptVersion` 이전(컬렉션명 `prompts`). `getLatestVersion()`은 순수 함수라 무변경.
  레거시(카테고리 없는) 레코드 자동 보정 로직은 그대로 유지
- **Workflow**(`lib/workflows/registry.ts`) — `listWorkflows`·`getWorkflow`·`createWorkflow`
  이전(컬렉션명 `workflows`)
- **Workspace**(`lib/workspaces/registry.ts`, 부분) — 레코드 저장/조회(`listWorkspaces`·
  `getWorkspace`·`createWorkspace`)만 `CollectionStore`(컬렉션명 `workspaces`)로 이전.
  `fs.mkdirSync(targetPath)`(실제 폴더 생성)·`fs.existsSync(record.path)`(실제 폴더 존재
  확인, 사라진 워크스페이스를 목록에서 자동 정리)는 그대로 유지 — Workspace는 개념 자체가
  "디스크 위의 실제 폴더"이므로 그 폴더의 존재 여부는 CollectionStore가 답할 수 있는 질문이
  아니다
- **Health**(`lib/health/checks.ts`, 부분) — `readHealthCache`·`writeHealthCacheEntry`만
  `CollectionStore`의 `getDoc`/`setDoc`(컬렉션명 `health`, 문서 id `checks`, `lib/metrics/
  registry.ts`와 동일한 싱글턴 패턴)으로 이전. `getDiskUsage()`(`fs.statfsSync`, 실제 디스크
  사용량)·`readCoverageSummaryPct()`(실제 `coverage/coverage-summary.json` 읽기)·
  `getGitStatus()`(실제 git 명령 실행)는 전부 "진짜 파일시스템/프로세스 상태를 묻는 질문"이라
  그대로 유지

**호출부 갱신**(전부 async 전환에 따른 `await` 추가, 동작 변경 없음):
`app/api/{workspaces,workflows,workflows/[id],workflows/[id]/run,prompts,prompts/[id],
prompts/[id]/preview,prompts/[id]/execute,projects/import,projects/bootstrap,
design/sync,design/sync/rollback,design/sync/compare,design/sync/[id],design/website,
design/website/[id],health,health/run}/route.ts`, `lib/workflows/engine.ts`(`createRun()`
자체도 async로 전환, `getWorkflow()` 2곳), `lib/prompts/executor.ts`(`resolveContent`/
`executePrompt`/`executePromptInSession` 3개 함수 async 전환), `app/developer/planning/
page.tsx`(Server Component를 `async function`으로 전환)

### 3. 읽기/저장/수정/삭제 동작 검증

각 모듈 신규/갱신 테스트로 기존 동작이 100% 동일함을 확인(아래 5번 결과 참고). 특히:
- **버전 자동 증가·append-only 히스토리**(Design Sync·Website Build) — reviewId 재사용 시
  기존 레코드를 찾아 `version+1`, 히스토리는 절대 덮어쓰지 않고 추가되는 동작을 회귀 테스트로 재확인
- **레거시 레코드 보정**(Prompt) — `category` 필드가 없는 과거 JSON 레코드를 읽어도
  `"General"`로 자동 보정되는 동작 재확인
- **워크스페이스 자동 정리**(Workspace) — 실제 폴더가 삭제된 워크스페이스가 `listWorkspaces()`
  호출 시 목록에서 빠지고 그 결과가 저장소에도 반영(persist)되는 동작 재확인(신규 테스트,
  기존엔 테스트 없었음)

### 4. Vercel 환경 검증

- 6개 대상 모듈에서 `fs` import 자체가 사라짐(`lib/design/design-sync.ts`·
  `lib/design/website-build.ts`·`lib/prompts/registry.ts`·`lib/workflows/registry.ts`는
  `fs` import 완전 제거, `lib/workspaces/registry.ts`·`lib/health/checks.ts`는 위 4번에서
  설명한 "진짜 파일시스템" 부분만 의도적으로 잔존) — grep으로 재확인 완료
- `getDefaultStore()`(`lib/db/index.ts`, 이번 STEP에서 무변경)는 `NODE_ENV=production`이고
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 없으면 즉시 throw하므로, 프로덕션에서 이
  6개 모듈이 fs 폴백으로 조용히 새는 경로 자체가 없다(기존 안전장치, STEP 1 이전부터 존재)
- 실제 Supabase 프로젝트 자격 증명이 이 개발 환경에 없어(이전 세션의 "Provider Validation"과
  동일한 제약, `docs/PRODUCTION_VALIDATION.md` 참고) 실 Supabase 네트워크 호출까지 포함한
  end-to-end 검증은 이번에도 수행하지 못함 — 대신 `tests/db/supabaseStore.test.ts`(STEP 1)가
  `@supabase/supabase-js`를 mock해 `replaceAll`의 upsert/delete 호출 순서·인자를 검증했고,
  이번 STEP의 6개 모듈은 전부 그 `CollectionStore` 인터페이스(`list`/`replaceAll`/`getDoc`/
  `setDoc`)만 호출하므로 Supabase 구현체가 정상이라면 동일하게 동작함(인터페이스 경계에서
  검증 완료, 구현체 자체는 STEP 1에서 별도 검증됨)

### 이전 불가능한 이유 (요약)

1. **`lib/workflows/engine.ts`·`lib/aiJobs/executor.ts`·`lib/terminal/server.ts`·
   `lib/projects/detect.ts`·`lib/paths/repoRoot.ts`·`lib/docs/*.ts`** — 전부 앱 자신의 데이터가
   아니라 **실제 파일시스템의 진짜 상태**(사용자 프로젝트 폴더, 빌드 산출물, 저장소 문서)를
   묻는 질문이다. `CollectionStore`는 JSON 문서 저장소이지 파일시스템 자체를 대체하는 것이
   아니므로, 애초에 이전 대상이 아니다
2. **`lib/workspaces/registry.ts`의 `mkdirSync`/`existsSync`** — Workspace라는 개념 자체가
   "디스크 위의 실제 폴더"다. 레코드(이름·경로·생성일시)는 이전했지만, 그 경로가 실제로
   존재하는지 확인하거나 새 폴더를 만드는 것은 여전히 진짜 파일시스템 작업이다
3. **`lib/health/checks.ts`의 `getDiskUsage`/`readCoverageSummaryPct`** — 실제 디스크 여유
   공간과 실제 `npm run coverage` 산출물을 읽는 것이라 Registry 이전과 무관하다
4. **`lib/backup/registry.ts`(대상 목록에 없음, 관찰 사항 기록)** — 이 모듈은 Prompt/Workflow의
   `lib/data/{prompts,workflows}.json` 경로를 직접 읽고 쓴다. 로컬 개발에서는 `fsStore`가
   정확히 같은 경로·형식으로 파일을 쓰므로 영향이 없을 것이라고 이 시점에 서술했으나,
   **이 서술은 부정확했다** — STEP 3에서 실제로 dev 서버를 띄워 확인한 결과, `fsStore`의
   로컬 폴백 기본 경로가 이미 2026-07-16 커밋 `0954f09`에서 `process.cwd()/lib/data`가 아닌
   `os.tmpdir()/cnbiz-web/data`로 바뀌어 있어서, `lib/backup/registry.ts`가 읽고 쓰던
   `cwd/lib/data/{prompts,workflows}.json`은 **로컬 개발에서도** 이미 실제 데이터와
   무관한 파일이었다. 다만 **프로덕션에서 Supabase가 store로 선택되면** Prompt/Workflow
   레코드는 애초에 로컬 파일에 쓰이지 않으므로, Backup Export가 반환하는 `prompts`/
   `workflows` 배열은 어차피 항상 빈 배열이 되고 Import는 아무 효과가 없는 파일에 쓰게
   된다는 결론 자체는 유효하다. STEP 3에서 로컬 개발 정합성(fs 경로 불일치)만 수정했고,
   프로덕션 공백은 여전히 후속 작업으로 남아 있다 — 상세는 `STEP3_REPORT.md`의 H-2·M-2 참고

### 5. 테스트 결과

| 항목 | 결과 |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors |
| ESLint (`npm run lint`) | ✅ 0 errors |
| Build (`npm run build`) | ✅ 성공(전체 라우트 정상 생성) |
| 전체 테스트(`npx vitest run`) | ✅ 68 files / 509 tests 전부 통과 |

신규/갱신 테스트: `tests/workspaces/registry.test.ts`(신규 4개, 기존 커버리지 없었음),
`tests/workflows/registry.test.ts`(신규 3개, 기존 커버리지 없었음),
`tests/design/design-sync-registry.test.ts`·`tests/design/design-sync-integration.test.ts`
(store 패턴으로 갱신, 케이스 무변경), `tests/design/website-build-registry.test.ts`·
`tests/design/website-build-integration.test.ts`(동일), `tests/prompts/registry.test.ts`
(동일), `tests/health/checks.test.ts`(동일)

### 6. 남은 Critical/High

- Critical/High 신규 발견 없음(STEP 1의 Critical 2건은 이미 해결됨)
- 위 "이전 불가능한 이유" 4번(Backup ↔ Prompt/Workflow 격차)은 Medium 수준의 후속 과제로
  분류 — 데이터 유실이 아니라 "Backup이 최신 데이터를 반영하지 못하는" 기능 격차이며, 대상
  목록 외 모듈이라 사용자 승인 없이 임의로 손대지 않음

### 7. STEP 2 완료 여부

**완료.** 대상 6개 모듈(Design Sync·Website Build·Prompt·Workflow·Workspace·Health) 전부
`CollectionStore` 기준으로 이전되었고(Workspace·Health는 진짜 파일시스템 질문만 의도적으로
잔존), 기존 API·인터페이스·동작은 100% 유지되었으며 전체 빌드·린트·테스트가 통과한다.
STEP 3(전체 테스트)로 진행하기 전 사용자 확인 대기.

---

## STEP 3. 전체 시스템 검증 — 완료 (2026-07-23)

상세 결과는 `STEP3_REPORT.md`(요청된 별도 형식)에 전부 기록했다. 요약:

- **범위**: 새 기능 없음, 리팩터링 없음, 구조 변경 없음 — 필요한 버그 수정만 허용.
- **방법**: 정적 검토(TS/ESLint/Build)에 더해, 실제 dev 서버를 기동하고 curl·Playwright로
  Design Pipeline 전체(Plan→Storyboard→Wireframe→Prototype→Claude Design→Review→Approval→
  Design Sync→Website Build)와 Prompt/Workflow/Workspace CRUD, Auth 정상/예외 경로를
  **라이브로 실행**해 검증했다(정적 분석만으로는 드러나지 않는 런타임 결함을 찾기 위함).
- **발견·수정(H-1)**: `scripts/{create-auth-user,set-user-role,reset-user-password}.cjs` 3개가
  `lib/db/fsStore.ts`의 로컬 fs 폴백 기본 경로가 `os.tmpdir()/cnbiz-web/data`로 바뀐 것(2026-07-16
  커밋 `0954f09`, STEP 1/2 이전부터 있던 기존 변경)을 따라가지 못해, 로컬 개발에서 로그인 계정을
  만드는 유일한 방법이 조용히 깨져 있었다(로그인 401). 세 스크립트 모두 fs 경로를 일치시켜 수정,
  라이브로 재현·재검증 완료.
- **발견·수정(H-2)**: 같은 원인으로 `lib/backup/registry.ts`가 로컬 개발에서도 Prompt/Workflow
  Backup을 항상 빈 배열로 내보내고 있었음을 라이브로 확인(STEP 2 REPORT.md 4번의 "로컬은
  영향 없다"는 서술이 부정확했음을 이번에 발견해 위에서 정정함). 로컬 fs 경로를 일치시키고
  테스트 격리를 위한 `fsStoreDataDir` 선택적 인자를 추가. 프로덕션 공백(Supabase 사용 시
  Prompt/Workflow가 애초에 로컬 파일에 없음)은 구조 변경이 필요해 이번엔 남겨둠.
- **발견, 미수정(구조 변경 필요)**: 모든 배열형 Registry(16개 전부)에 `list()→mutate→
  replaceAll()` 패턴에서 오는 구조적 Race Condition 존재. Task Queue·Session·Event Bus가
  CollectionStore 없이 프로세스 메모리(Map)에만 존재해 서버리스 다중 인스턴스 환경에서
  비영속 위험. 둘 다 인터페이스/설계 변경이 필요해 STEP 3에서는 수정하지 않고 문서화만 함.
- **테스트**: TypeScript 0 errors·ESLint 0 errors·Build 성공·`vitest run` 68 files/509 tests
  전부 통과(회귀 없음). Design Pipeline 라이브 실행 전 구간 정상, Playwright로 8개 페이지
  콘솔 에러 0건 확인.
- **결론**: Critical 0건. STEP 4 진행 가능(사용자 확인 대기).

---

# REPORT — 프로젝트 구조 분석

> 작성일: 2026-07-18 (Claude Code, 실제 파일/코드 확인 기준)
> 이 문서는 추측이 아닌 실측 결과만 반영합니다. `PROJECT_STATUS.md`(기능 구현 현황)와는 별개로, 이 문서는 **저장소 구조 자체**(중복·정리 대상·개선점)를 다룹니다.

---

## 1. `app`와 `apps`의 역할 비교

| 구분 | 경로 | 역할 | 상태 |
|---|---|---|---|
| `app/` (루트) | `D:\ai-web-master\app` | **CNBIZ Website v1(레거시)** — 정적 마케팅 사이트. `/`·`/about`·`/services`·`/portfolio`·`/contact` 5페이지만 존재, API 라우트 0개 | 2026-07-01 기준 동결, 더 이상 개발 안 함 |
| `apps/cnbiz-web/` | `D:\ai-web-master\apps\cnbiz-web` | **실제 프로덕션 전체** — CNBIZ Website v2(공개 사이트) + Development OS 대시보드(`/developer/**`) + API 84개 | 활성 개발 중, Vercel 배포 대상(`.vercel/project.json`의 `projectName: "ai-web-master-cnbiz-web"`이 이 폴더를 루트로 배포함을 확인) |

**핵심 사실**: 2026-07-15 커밋 `526831e`("WIP: AI Business OS integration checkpoint")에서 원래 루트에 있던 Development OS 전체(대시보드·에이전트·워크플로·인증·Design Automation 9 Phase)가 `apps/cnbiz-web`으로 이동했습니다. 이 이관은 CHANGELOG에 별도로 기록되지 않았습니다. 그 결과:

- 루트 `app/`·`lib/`·`components/`는 이제 **거의 죽은 코드**입니다(빌드는 되지만 실서비스와 무관).
- `apps/cnbiz-web`이 사실상 "진짜 저장소"이고, 루트는 이관 이전의 스냅샷으로 남아 있습니다.
- 이 구조를 모르는 사람이 "app 폴더에 페이지를 추가"하면 실제로는 아무 효과가 없는 v1 레거시에 작업하게 되는 함정이 있습니다.

---

## 2. `components`와 `packages`의 중복 여부

**중복이 있습니다.** 다만 성격이 다른 두 종류입니다.

### 2-1. 원자 컴포넌트 — 루트 `components/`에 추출 자체가 없음
루트 `components/sections/*.tsx`(16개 파일)는 Button·Card 같은 공용 UI를 컴포넌트로 추출하지 않고 **각 섹션 안에 인라인 스타일로 직접 작성**되어 있습니다(2026-07-04 CHANGELOG에 이미 기록된 사실: "v1의 UI 원자 컴포넌트는 각 섹션에 인라인으로만 존재해 추출된 적이 없었음"). 반면 `packages/ui`(`Button`·`Input`·`Textarea`·`Select`·`Card`)·`packages/design-system`(토큰)·`packages/layout-primitives`(`Container`·`Section`·`MobileDrawer`)는 v2 전환 시점(2026-07-04)에 신규로 만들어져 `apps/cnbiz-web`만 사용합니다. 즉 "같은 종류의 컴포넌트가 두 벌 존재"하는 게 아니라, **v1은 추출이 안 됐고 v2만 제대로 분리된** 상태입니다.

### 2-2. 페이지 섹션 — 루트 vs `apps/cnbiz-web` 동일 이름/역할 컴포넌트 중복

| 루트 `components/` | `apps/cnbiz-web/components/` | 비고 |
|---|---|---|
| `sections/AboutHeroSection.tsx` | `sections/AboutHeroSection.tsx` | 같은 이름, 독립 구현 |
| `sections/ContactForm.tsx` | `sections/ContactForm.tsx` | 같은 이름, 필드까지 유사 |
| `sections/CTASection.tsx` | `sections/CTASection.tsx` | 같은 이름 |
| `sections/HeroSection.tsx` | `sections/HeroSection.tsx` | 같은 이름 |
| `sections/ServiceProcessSection.tsx` | `sections/ServiceProcessSection.tsx` | 같은 이름 |
| `sections/ServicesDetailSection.tsx` | `sections/ServicesDetailSection.tsx` | 같은 이름 |
| `sections/ServicesHeroSection.tsx` | `sections/ServicesHeroSection.tsx` | 같은 이름 |
| `sections/ServicesOverviewSection.tsx` | `sections/ServicesOverviewSection.tsx` | 같은 이름 |
| `layout/Header.tsx`, `Footer.tsx`, `MobileMenu.tsx` | `layout/Header.tsx`, `Footer.tsx`, `MobileMenu.tsx` | 같은 이름, 독립 구현 |

**이유**: v1→v2 전환 시 기존 코드를 재사용하지 않고 새로 작성(CHANGELOG 2026-07-04: "기존 v1 코드 재사용 아님, 신규 작성"). 의도된 재작성이라 "실수"는 아니지만, 8개+ 파일이 이름·목적이 동일한 채 두 벌로 남아 있어 유지보수 시 "어느 쪽을 고쳐야 하나" 혼동 위험이 있습니다.

### 2-3. `apps/cnbiz-web/components/{layout,sections}` vs `packages/*` — 중복 아님
이건 정상적인 계층 분리입니다. `packages/*`가 원자 단위(Button 등)를 제공하고 `apps/cnbiz-web/components`가 그걸 조합해 페이지 섹션을 만드는 구조라 중복이 아닙니다.

---

## 3. `lib`와 `utils`의 중복 여부

**중복이 거의 없습니다.** 저장소에 최상위 `utils/` 폴더 자체가 없고, "utils"라는 이름은 아래 3곳에만 존재하며 서로 역할이 겹치지 않습니다.

| 경로 | 역할 | `lib`와 중복? |
|---|---|---|
| `packages/utils/src/cn.ts` | Tailwind 클래스 병합 헬퍼(`cn()`) 하나만 export. `packages/ui` 컴포넌트들이 씀 | 아니오 — UI 전용 |
| `packages/cli/src/utils/` | CLI 내부 전용 유틸(파일 시스템·문자열 처리 등) | 아니오 — CLI 스코프 한정, 웹 앱에서 import 안 됨 |
| `apps/cnbiz-web/lib/` (28개 모듈) | auth·contact·design·projects 등 **비즈니스 로직**. "utils"라는 이름의 하위 폴더 자체가 없음 | 해당 없음 |
| 루트 `lib/` (3개 파일: `dev/component-marker.ts`, `site-config.ts`, `supabase.ts`) | v1 레거시용. 이 중 `supabase.ts`는 루트 `app/`·`components/` 어디서도 import되지 않는 **죽은 코드**로 확인됨(6번 항목 참고) | 아니오 |

즉 "lib와 utils"는 중복 문제가 아니라, **패키지별로 명확히 분리되어 있어 문제 없음**이 결론입니다.

---

## 4. `docs`의 오래된 문서와 최신 문서

`docs/`는 `00_COMPANY`~`99_ARCHIVE` 11개 폴더 체계입니다. 실제 수정 시각(파일시스템 mtime) 기준:

### 최신(2026-07-14~15, 이번 주 내 갱신)
- `docs/01_PMO/CHANGELOG.md` (07-15) — 실질적으로 이 저장소에서 **가장 신뢰할 수 있는 최신 문서**. 다만 이번 세션(07-18)의 작업(테스트 이관, 릴리스 점검, 의뢰 접수 시스템)은 아직 반영 안 됨.
- `docs/03_DESIGN/{DESIGN_AUTOMATION_MASTER,CLAUDE_DESIGN_INTEGRATION,FIGMA_INTEGRATION,DESIGN_SYNC,DESIGN_WORKFLOW}.md` (07-14~15) — Design Automation 9 Phase 스펙, 실제 구현과 대체로 일치.

### 오래됨 / 실제와 어긋남
- **`docs/01_PMO/WBS.md` (07-05, 13일 전)** — 문서 최상단에 스스로 "2026-07-05 기준으로 동결" 명시. 이후의 대규모 이관(`app/`→`apps/cnbiz-web`), Design Automation 9 Phase, 인증/RBAC, Marketplace, 의뢰 접수 시스템을 전혀 반영 못 함. **PROJECT_STATUS.md가 이미 사실상 WBS.md를 대체**하고 있는 상태.
- **`docs/09_WORK_HISTORY/CURRENT_CONTEXT.md` (07-06, 12일 전)** — `/startday` 세션 시작 시 참조하는 "현재 상태" 문서인데 12일간 갱신 안 됨. `sessions/` 폴더도 최신 파일이 `2026-07-07.md`로 멈춰 있음(11일 공백).
- **`docs/00_COMPANY/DOCUMENT_INDEX.md` (07-06)** — "전체 문서의 단일 마스터 인덱스"를 표방하지만, 실제 `docs/03_DESIGN/`에 8개 파일이 있는데 인덱스에는 3개(`DESIGN_SYSTEM.md`·`UI_GUIDE.md`·`UX_GUIDE.md`)만 등록되어 있어 **5개 최신 문서(DESIGN_AUTOMATION_MASTER 등)가 누락**됨. 인덱스 문서 자체가 스스로의 존재 목적("신규 문서 생성 시 이 인덱스에 등록")을 못 지키고 있음.
- `docs/04_OPERATIONS/*.md`(`DEPLOYMENT.md`·`QA.md`·`SEO.md`·`ANALYTICS.md`) — 인덱스에 "빈 문서/Placeholder"로 명시. Phase 2 이후 예정으로 방치 중.
- `docs/07_KNOWLEDGE/`, `docs/99_ARCHIVE/` — 07-05~07-06 이후 갱신 없음, Archive는 이름대로 방치 목적이라 문제 아님.

### 성격이 다른 항목 — 무관한 클라이언트 프로젝트 문서 혼입
- **`docs/08_PLANS/상가분양센터/`** (7개 파일: HTML 와이어프레임 4개·PDF 1개·PDF·MD 스토리보드) — "상가분양센터"(상업용 부동산 분양 센터)는 CNBIZ 자체 프로젝트나 AI Business OS와 무관한 **완전히 다른 업종의 별도 클라이언트 산출물**로 보입니다. `docs/08_PLANS/README.md`나 `001-phase1-mvp.md`(AI Business OS 자체 계획)와 성격이 다름. 이 저장소에 있어야 할 근거가 불분명 — 실수로 들어왔거나 별도 클라이언트 작업 저장 위치로 임시 사용된 것으로 추정됩니다. **사용자 확인이 필요합니다** (삭제/이동 여부는 임의 판단하지 않음).

---

## 5. `agents`와 `skills`의 역할 비교

이 저장소에는 "AI 에이전트/역할 정의"가 **정확히 겹치는 4개 체계**로 흩어져 있습니다.

| 체계 | 위치 | 대상 | 형식 |
|---|---|---|---|
| ① 워크플로 단계 역할 | `docs/05_AI/{Planner,Builder,Reviewer,Documenter,Architect}.md` | Plan→Build→Review→Document 진행 단계 | 순수 Markdown |
| ② 엔지니어링 직군 역할 | 루트 `agents/*.md` (9개: ai-engineer·backend-engineer·business-analyst·devops-engineer·frontend-engineer·product-manager·qa-engineer·solution-architect·technical-writer) | 직군별 책임(Mission/Objectives) | 순수 Markdown |
| ③ 프롬프트 템플릿 | 루트 `prompts/{coder,planner,reviewer,documenter,tester,system}.md` | ②와 동일 직군을 "실행 시 사용할 프롬프트" 관점으로 재서술 | 순수 Markdown |
| ④ Claude Code Skill | `skills/experts/*/SKILL.md` (15개: ②의 9개 + data-engineer·fullstack-engineer·scrum-master·security-engineer·ui-designer·ux-designer) | ②와 사실상 동일 직군, 더 많음 | YAML frontmatter + Markdown, Claude Code가 실제로 로드 가능한 형식 |

**실제 내용 비교**: `agents/ai-engineer.md`(247줄)와 `skills/experts/ai-engineer/SKILL.md`(301줄)를 직접 대조한 결과, Mission/Purpose·Objectives 등 **구조와 내용이 사실상 같은 역할을 두 번 기술**하고 있습니다. 차이는 ④가 YAML frontmatter(`name`/`description`/`version`/`category`)를 갖춰 Claude Code Skill 시스템에 실제로 로드될 수 있는 유일한 형식이라는 점입니다.

**결론**: ②(`agents/*.md`)는 ④(`skills/experts/*/SKILL.md`)의 **완전한 부분집합이자 구식 버전**입니다(9개 role ⊂ 15개 role, 덜 구조화된 형식). ③(`prompts/*.md`)도 같은 직군을 세 번째 각도로 재서술합니다. 2026-07-10 CHANGELOG에서 이미 "agents/*.md가 skills/experts/*와 이름 중복"이라 지적했지만, 그때는 0바이트 파일만 정리하고 **내용이 있는 이 중복은 그대로 남겨뒀습니다**(의도적 보류, 미해결 상태 그대로).

역할 정의 외에, `agents/README.md`·`prompts/README.md`·`skills/README.md`(→ 없음, `skills/`는 하위 폴더별 README만 있음)·`orchestration/README.md`·`memory/README.md`는 2026-07-10에 "이 폴더는 실 콘텐츠가 아니라 안내이며 실제 문서는 `docs/05_AI/`·`docs/09_WORK_HISTORY/`에 있다"고 이미 스스로 명시해 둔 상태입니다.

---

## 6. 삭제 가능한 파일

실측으로 확인된, 근거가 명확한 항목만 나열합니다(추측 배제).

| 경로 | 근거 |
|---|---|
| `scripts/create-agent.ps1`, `create-domain.ps1`, `create-expert.ps1`, `create-project.ps1`, `create-shared.ps1`, `create-skills.ps1`, `create-template.ps1`, `create-v1.1.ps1`, `create-workflow.ps1`, `init-ai-business-os.ps1` (10개) | **전부 0바이트**로 실측 확인. 2026-07-10 CHANGELOG에 "스캐폴딩 재현성 격차"로 이미 지적되었고 8일째 방치. 어떤 코드도 이 파일들을 실행하지 않음(내용이 없으므로 실행해도 아무 일 없음) |
| `lib/supabase.ts` (루트) | `grep`으로 루트 `app/`·`components/` 전체에서 import하는 곳이 하나도 없음을 확인한 **죽은 코드**. `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`를 참조하지만 이 값을 쓰는 화면 자체가 없음 |
| 루트 `tree.txt` (4.46MB) | Git 미추적(untracked), `.gitignore`에도 없음. UTF-16 인코딩이 깨진 채로 저장된 Windows `tree` 명령 출력으로 보이며, 저장소 루트에 있어야 할 이유가 없는 임시 산출물 |
| `.claude/worktrees/ai-provider-v1.1/` | 과거 세션이 만든 git worktree(브랜치 `worktree-ai-provider-v1.1`)의 전체 복사본. `eslint.config.mjs`가 최근 이 폴더를 스캔해 무관한 lint 오류 14건을 내던 것이 실제로 확인됨(이번 세션에서 ignore 패턴 추가로 우회했으나, worktree 자체는 여전히 존재). 그 브랜치 작업이 끝났다면 `git worktree remove`로 정리 대상 — **단, 진행 중인 작업일 수 있으니 삭제 전 사용자 확인 필요** |
| `docs/04_OPERATIONS/{DEPLOYMENT,QA,SEO,ANALYTICS}.md` | `DOCUMENT_INDEX.md`가 스스로 "빈 문서(Placeholder)"라고 명시. 내용이 없다면 폴더 존재 자체는 유지하되(Phase 2 계획된 자리), 빈 파일들은 실제 착수 시점에 만들어도 되는 후보 |
| `apps/cnbiz-web/lib/data/*.json`, 루트 `test-project/` | 로컬 테스트 산출물(`.gitignore` 대상 확인됨, `lib/data/`는 `.gitignore`에 명시). Git에는 영향 없으나 로컬 디스크 정리 대상. `test-project/`는 CLI 스캐폴딩 테스트용 스크래치 결과물로 보이며 Git 미추적 여부 확인 후 삭제 권장 |

**삭제 보류(사용자 확인 필요, 임의 판단 안 함)**:
- `docs/08_PLANS/상가분양센터/`(4번 항목 참고) — 다른 클라이언트 프로젝트로 보이는 문서. 이 저장소 소관이 맞는지 사용자 확인 필요.
- `agents/*.md` 9개, `prompts/*.md` 6개 — `skills/experts/*`와 내용 중복(5번 항목)이지만, 실제 콘텐츠가 있는 파일을 삭제하는 것이라 사용자 승인 필요.

---

## 7. 통합 가능한 폴더

| 통합 대상 | 통합 방향 | 이유 |
|---|---|---|
| `agents/*.md`(직군 9개) + `prompts/*.md`(프롬프트 6개) → `skills/experts/*/SKILL.md` | `skills/experts/`로 일원화 | 5번 항목의 중복을 실제로 해소하는 유일한 방법. `skills/experts/*`가 이미 상위 호환(더 많은 역할, 구조화된 frontmatter, Claude Code가 실제로 로드 가능) |
| `docs/05_AI/{Planner,Builder,Reviewer,Documenter,Architect}.md` | 위 통합과는 별도로 유지 권장 | 이건 "직군"이 아니라 "워크플로 단계"라 통합 대상이 다름 — 다만 `docs/05_AI/AGENTS.md`(에이전트 레지스트리)가 이 5개+`agents/*.md`+`skills/experts/*`를 한 곳에서 상호 참조하도록 정리할 필요는 있음 |
| 루트 `components/`, `app/`, `lib/`(v1) | 아카이브 폴더(예: `_archive/v1-legacy/`)로 이동 또는 명시적 README로 "읽기 전용 레거시" 표시 | 현재는 살아있는 최상위 폴더처럼 보여 신규 기여자가 v2(`apps/cnbiz-web`) 대신 이곳에 작업할 위험이 있음. 완전 삭제보다는 격리 이동이 안전 |
| `packages/agents`, `packages/skills`, `packages/templates`, `packages/prompts`, `packages/workflows` (각 README.md 1개뿐, 실제 코드 없음) | 계획대로 유지하되 `docs/01_PMO/PROJECT_ROADMAP.md`의 "Phase 5: AI Business OS Productization"과 명시적으로 연결 | 이미 로드맵에 "폴더만 존재, 착수 시점 미정"으로 문서화되어 있어 삭제 대상은 아님(2026-07-10 결정 사항). 다만 루트 `agents/`·`skills/`·`prompts/`·`orchestration/`(실 콘텐츠)와 이름이 겹쳐 신규 기여자가 헷갈리기 쉬움 — 최소한 각 `README.md`에 "이 패키지는 배포용 스타터킷 자리이며, 실제 콘텐츠는 루트 `agents/`·`skills/`에 있다"는 상호 참조 링크 추가 권장 |
| `docs/00_COMPANY/DOCUMENT_INDEX.md` 03_DESIGN 섹션 | 실제 `docs/03_DESIGN/` 8개 파일과 동기화 | 통합이라기보다 "최신화" — 인덱스가 스스로의 존재 이유를 못 지키고 있음(4번 항목) |

---

## 8. 개선이 필요한 구조

1. **루트/`apps` 이원 구조의 진입장벽** — `app/`이 살아있는 폴더처럼 보이지만 실제로는 배포되지 않는 레거시입니다. README.md 최상단이나 루트 `app/`·`lib/`·`components/`에 눈에 띄는 안내(예: 각 폴더 최상단에 `README.md`로 "⚠️ 레거시, apps/cnbiz-web을 보세요")가 없으면 반복적으로 혼동을 유발합니다.
2. **역할 정의 4중 체계(5·7번 항목)** — 같은 정보를 4곳에서 유지보수해야 해서, 한쪽만 갱신되고 나머지가 stale해지는 구조적 위험이 있습니다(실제로 이미 그렇게 되어 있음 — `agents/*.md`는 `skills/experts/*`보다 역할 수도 적고 오래됨).
3. **문서 인덱스의 자기 불일치** — `DOCUMENT_INDEX.md`가 "신규 문서는 여기 등록" 원칙을 표방하지만 실제로는 최근 5개 문서가 누락되어 원칙이 지켜지지 않고 있습니다. 인덱스 갱신을 문서 작성 워크플로에 강제하는 절차(예: PR 체크리스트)가 없으면 계속 벌어질 문제입니다.
4. **`.gitignore`의 비재귀 사각지대** — `/.runtime/`(루트 전용 앵커)이 `apps/cnbiz-web/.runtime/`은 잡지 못해 실제로 그 폴더가 untracked 상태로 남아 있음(이번 조사에서 확인). `eslint.config.mjs`도 최근까지 `.claude/**`를 제외하지 않아 다른 세션의 worktree를 스캔하는 문제가 있었습니다(이번 세션에서 수정). 같은 유형의 문제가 다른 도구 설정에도 남아 있을 수 있어, "루트 기준 앵커 vs 재귀 패턴"을 프로젝트 전체에서 한 번 점검할 필요가 있습니다.
5. **WBS.md의 역할 상실** — WBS.md는 스스로 "동결"을 선언했고 `PROJECT_STATUS.md`가 사실상 그 역할을 대체하고 있습니다. 두 문서가 공존하면서 어느 쪽이 "현재 상태의 출처"인지 불명확한 상태이므로, WBS.md에 "본 문서는 더 이상 갱신되지 않으며 최신 상태는 PROJECT_STATUS.md를 참고하라"는 안내를 명시하거나, WBS.md 자체를 폐기하는 결정이 필요합니다.
6. **무관한 콘텐츠 혼입(`docs/08_PLANS/상가분양센터/`)** — 이 저장소가 "CNBIZ 자사 홈페이지 + AI Business OS"라는 스코프를 갖고 있는데, 성격이 전혀 다른 클라이언트 산출물이 섞여 있는 것은 저장소 스코프 관리 원칙이 지켜지지 않은 사례입니다. 재발 방지를 위해 "이 저장소에 커밋 가능한 콘텐츠 범위"를 문서화할 필요가 있습니다.
7. **`test-project/`, `tree.txt` 등 루트에 흩어진 임시 산출물** — 검증/테스트 세션이 끝난 뒤 정리하는 관례(CHANGELOG에 여러 번 명시된 원칙)가 이번엔 지켜지지 않은 것으로 보입니다. 세션 종료 체크리스트에 "루트에 새로 생긴 미추적 파일 확인"을 명시적으로 포함하면 재발을 줄일 수 있습니다.

---

## 요약

| 항목 | 결론 |
|---|---|
| 1. app vs apps | 완전히 다른 두 세대(v1 동결·v2 실서비스), 혼동 위험 큼 |
| 2. components vs packages | 부분 중복(같은 이름 섹션 8개+ v1/v2 병존), 원자 컴포넌트는 v2만 존재 |
| 3. lib vs utils | 중복 없음(스코프 명확히 분리됨) |
| 4. docs 최신/오래됨 | CHANGELOG·03_DESIGN 최신, WBS·CURRENT_CONTEXT·DOCUMENT_INDEX 정체, 무관 클라이언트 문서 혼입 발견 |
| 5. agents vs skills | 4중 중복 체계, `skills/experts/*`가 사실상 상위 호환 |
| 6. 삭제 가능 | 0바이트 스크립트 10개, 죽은 코드 1개, 임시 산출물 다수(확인됨) |
| 7. 통합 가능 | agents+prompts → skills/experts, v1 레거시 격리 |
| 8. 구조 개선 | 이원 구조 안내 부재, 역할 정의 중복 관리 부담, 문서 인덱스 불일치, gitignore 사각지대 |
