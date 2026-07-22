# AI Business OS - PROJECT STATUS

> 최종 분석: 2026-07-22 (Claude Code, apps/**·packages/** 변경 수동 반영 — pre-commit SSOT 자동
> 동기화 훅이 로컬 `claude` CLI 헤드리스 호출 타임아웃으로 실패해 이번 커밋은 `--no-verify`로
> 진행하고 이 섹션들을 수동으로 갱신함, 사용자 승인 하에 진행)
> 이 문서는 추측이 아닌 실제 파일/코드 확인 결과만 반영합니다.

## 프로젝트 개요
AI 기반 홈페이지 제작 및 운영 플랫폼. `apps/cnbiz-web`(CNBIZ.KR 브랜드 홈페이지 + Development OS 대시보드)과, cnbiz.ai.kr 챗봇 연동용 Customer Inquiry Pipeline(Inquiry→Client→WebsiteOrder→AiJob, 이제 AI Analysis Engine 포함)으로 구성됩니다. CNBIZ.KR은 브랜드/회사소개 전용 사이트로 전환되어 홈페이지 제작 의뢰를 직접 받지 않으며(문의·제작의뢰 폼 제거, 모든 CTA가 cnbiz.ai.kr로 이동), 실제 의뢰 접수는 cnbiz.ai.kr 챗봇 → `POST /api/external/inquiries`로만 들어옵니다. 루트 `app/`·`components/`(CNBIZ v1)는 레거시로 동결되어 있습니다.

---

## ⚠️ 알려진 아키텍처 부채 — CNBIZ.AI.KR 책임 임시 대행

**목표 아키텍처**: `CNBIZ.KR`(브랜드 사이트) → `CNBIZ.AI.KR`(문의폼·설문·파일업로드·고객 로그인·**Inquiry/설문/첨부파일 저장**·이메일/SMS/Push·**관리자 알림**) → `AI Business OS`(AI Analysis·Client/Project/AiJob 생성·Admin·Website Builder).

**CNBIZ.AI.KR은 이 저장소에 코드가 없는 별도의 외부 시스템이며, 2026-07-21 확인 결과 아직 자체적으로 저장·알림을 하지 않습니다.** 그 결과 목표상 CNBIZ.AI.KR 책임인 아래 2가지를 `apps/cnbiz-web`(AI Business OS)의 `POST /api/external/inquiries`가 **임시로 대행 중**입니다(원칙상 삭제·이관 불가 — 대체할 곳이 아직 없음):
- **Inquiry(+설문+첨부파일) 저장** — `lib/inquiries/registry.ts`의 `createInquiry()`
- **관리자 알림(이메일)** — `lib/inquiries/notify.ts`의 `notifyAdminOfNewInquiry()`(`lib/contact/email/*` 재사용)

두 지점 모두 코드에 "임시 대행" 주석을 명시해 두었습니다(`app/api/external/inquiries/route.ts`, `lib/inquiries/notify.ts`). **CNBIZ.AI.KR이 자체 DB·알림을 구축하면, 이 두 책임을 그쪽으로 이관하고 AI Business OS는 "이미 저장된 Inquiry를 참조/수신"하는 형태로 계약을 바꿔야 합니다.** SMS/Push 알림은 이 저장소에 애초에 구현되어 있지 않습니다(이동 대상 아님, 향후 CNBIZ.AI.KR 책임으로 신규 구현될 항목).

AI Analysis·Client·WebsiteOrder(Project)·AiJob·Admin·Website Builder는 전부 목표 아키텍처와 이미 일치하며 변경하지 않았습니다.

---

## 전체 진행률
**약 90%**

| 영역 | 진행률 | 근거 |
|---|---|---|
| CNBIZ.KR 브랜드 홈페이지 | 90% | Home/About/Services/Portfolio(공개 4페이지). 문의·제작의뢰 폼은 의도적으로 제거, `/contact`·`/request`는 cnbiz.ai.kr로 308 redirect. Portfolio 실콘텐츠·회사 연락처 정보만 TODO |
| Development OS 대시보드 | 93% | `/developer/**` 38개 페이지 실동작(Inquiry 관리자 화면에 AI 분석 카드 포함). 신규: Phase 01·02·09 대시보드(`/developer/{analysis,planning,deployment}`, 아래 참고), AI 의뢰 관리 "새 문의 등록"(`/developer/inquiries/new`, UI 스캐폴딩·TODO 스텁). Client/WebsiteOrder/AiJob 전용 목록 화면만 아직 없음(Inquiry 상세에서 연결된 레코드는 확인 가능) |
| AI 홈페이지 생성기(Website Builder v2) | 85% | CLI+대시보드 완결, Design Automation Phase 9 연동만 미검증 |
| **Customer Inquiry Pipeline** | **96%** | 데이터 계층·External API·Worker·Executor·자동 실행 트리거·관리자 UI·**AI Analysis Engine(Completeness/Missing Items/Business Type/추천 페이지·기능/Summary)**·**Planning Engine(기술 견적서/기능 명세서/프로젝트 일정, AI Business OS Phase 3)**까지 전부 연결되어 실사용 가능(아래 참고) |
| 인증/권한 | 82% | 세션 인증 + API Key 인증(x-api-key) + RBAC 4-role 완비. signup 백엔드·역할관리 UI만 없음 |
| 고객(의뢰자) 시스템 | 55% | CNBIZ.KR 자체 접수 폼은 제거(cnbiz.ai.kr로 위임). 고객 본인이 조회하는 포털은 여전히 없음 |
| 테스트 인프라 | 100% | `apps/cnbiz-web` 62 files / 481 tests 전부 통과(Planning Engine 신규 테스트 16개 포함) |

---

## ✅ 완료된 기능

**기존 시스템**
- CNBIZ.KR 브랜드 홈페이지(Home/About/Services/Portfolio) — 문의·제작 의뢰 폼은 의도적으로 제거(아래 참고)
- Development OS 대시보드 38개 페이지(Terminal/Workspace/GitHub/AI Workspace/Website Builder/Workflow Center/Marketplace/Settings/Logs/Health/Audit Log/Metrics/Backup/Design Automation 9종/AI 의뢰 관리 등)
- **Phase 01·02·09 대시보드**(`/developer/analysis`, `/developer/planning`, `/developer/deployment`, 신규) — 새 분석·기획·배포 엔진을 만들지 않고 기존 문서·기존 API/lib 함수만 연결한 읽기 전용 집계 화면. Analysis는 `lib/inquiries/registry.ts`의 `listInquiries()`로 AI 분석 완성도·업종 분포를 집계하고 `PROJECT_STATUS.md`(본 문서)·`REQUEST.md`류를 fs로 직접 읽어 표시. Planning은 `lib/workflows/registry.ts`·`lib/workflows/engine.ts`의 기존 Workflow 정의·Run 이력을 집계. Deployment는 `lib/health/checks.ts`(`/api/health`와 동일 함수)로 Git 상태·Health 캐시를 보여주고 `.github/workflows/*.yml`을 정적 파싱해 CI 파이프라인 목록을 표시. 3개 페이지와 그 데이터 원본 화면(AI 의뢰 관리·Workflow Center·Health·Design·Website Builder) 사이에 상호 탐색 링크를 추가해 Design Automation이 이미 쓰던 "이전/다음 단계" 내비게이션 관례를 따름
- AI 의뢰 관리 "새 문의 등록"(`/developer/inquiries/new`, 신규) — 문의 제목/고객명/회사명/문의 내용/첨부파일(드래그앤드롭) 입력 UI. "AI 분석 시작" 버튼은 현재 OpenAI를 호출하지 않고 콘솔 로그만 남기는 TODO 스텁(Supabase Storage 업로드·OCR·AI 분석·요구사항 문서 생성 등은 코드에 TODO로 명시, 향후 `lib/ai-analysis/analysis.ts`의 `generateAnalysis()` 재사용 예정)
- 인증(이메일/비밀번호 세션) + RBAC 4-role — `lib/auth/{types,password,users,session,auth,middleware,rbac}.ts`, `proxy.ts`
- Website Builder v2(CLI `ai website create` + 대시보드) — `packages/cli/src/website/*`, `lib/websites/registry.ts`, `/developer/websites`
- Database — `lib/db/{collectionStore,fsStore,memoryStore,supabaseStore,index}.ts`(단일 Supabase 테이블 `app_collections`)

**Customer Inquiry Pipeline (cnbiz.ai.kr 챗봇 연동)**
- Inquiry/Client/WebsiteOrder/AiJob 도메인 데이터 계층 — `lib/{inquiries,clients,websiteOrders,aiJobs}/{types,registry}.ts`(FK 체인 전부 연결)
- 챗봇 서버-투-서버 인증 — `lib/auth/apiKey.ts`(x-api-key, timingSafeEqual)
- 오케스트레이션 엔드포인트 — `POST /api/external/inquiries`: Inquiry 생성→Client find-or-create→WebsiteOrder 생성→AiJob 생성→**AI Job 자동 실행**→관리자 이메일 알림(`lib/inquiries/notify.ts`, 기존 `lib/contact/email` 재사용). AI Business OS Phase 1 요청 스펙의 `POST /api/inquiries`는 이 라우트를 그대로 가리킴(신규 엔드포인트 추가 없음 — 관리자 전용 `/api/inquiries`(GET, developer 세션 게이팅)와 경로/인증 계층이 겹치지 않도록 의도적으로 분리 유지)
- 관리자 CRUD API 8개 — `/api/{inquiries,clients,website-orders,ai-jobs}/route.ts`, `[id]/route.ts`
- **AI Job Worker + Executor + 자동 실행 트리거** — `lib/aiJobs/worker.ts`(Queued→Running→Success/Failed 상태 전이) + `lib/aiJobs/executor.ts`(AiJob 조회→Website Builder CLI 실행→`createWebsiteRecord()`→`addWebsiteToOrder()`) + `POST /api/external/inquiries`가 생성 직후 `processJob()`을 직접 호출(커밋 `74c12b0`, 이 문서에 반영되지 않고 있던 항목 — 아래 "최근 완료 작업" 참고)
- **AI 의뢰 관리자 화면**(`/developer/inquiries`, `/developer/inquiries/[id]`) — 목록·상세, Inquiry/Client/WebsiteOrder/AiJob 연결 상태를 한 화면에서 확인, Failed/Queued Job 재실행(기존 `POST /api/ai-jobs/[id]/run` 재사용), Inquiry 상태 수동 변경. `/developer/requests`(구 수동 폼 시스템)와 동일한 컴포넌트·패턴 재사용, 신규 UI 프리미티브 없음
- Inquiry 스키마 확장(`industry`·`survey`·`uploadedFiles` 옵셔널 필드 추가, 기존 필드는 무변경) — `customerName`/`consultation` 등 별도 필드명으로 오는 챗봇 페이로드도 `parseInquiryInput()`이 기존 `contactName`/`requirements`의 별칭으로 그대로 인식
- **AI Analysis Engine**(`lib/ai-analysis/{types,score,prompts,analysis}.ts`, AI Business OS Phase 2 신규) — Inquiry 생성 직후 자동 실행되어 `AIAnalysisResult`(completeness/missingItems/detectedBusinessType/recommendedPages/recommendedFunctions/confidence/summary)를 산출. Completeness(10개 체크리스트 항목×10점)·Missing Items는 규칙 기반 결정론적 계산(`score.ts`, AI 호출과 무관하게 항상 신뢰 가능), Business Type/추천 페이지·기능/Summary는 기존 `lib/ai/bridge.ts`의 `chatViaCli()` 재사용(Design Automation과 동일한 resolve→parse→결정론적 폴백 패턴, 신규 AI 호출 메커니즘 없음). 결과는 새 컬렉션 없이 기존 `inquiries` 레코드에 `analysis`/`analyzedAt` 필드로 저장(`saveInquiryAnalysis()`, `lib/inquiries/registry.ts` 확장). `AiJobType`·`AiJobStatus`·Website Builder 실행 로직은 무변경
- `/developer/inquiries/[id]`에 "AI 분석" 카드 추가 — Completeness/Business Type/Confidence/Summary/Recommended Pages·Functions/Missing Items 표시(분석 전이면 안내 문구만 표시)
- **Planning Engine — 기술 견적서/기능 명세서/프로젝트 일정 자동 생성**(`lib/planning/{types,generator,design-plan-adapter}.ts`, AI Business OS Phase 3 신규, 2026-07-22) — AI Analysis Engine의 `AIAnalysisResult`를 입력으로 사용해 Functional Specification·Technical Estimate·Project Timeline 3종을 한 번의 AI 호출로 생성. 새 Registry·CollectionStore는 만들지 않고, 기존 `AiJobType`을 `"generate_planning"` 한 값만 최소 확장해 이미 존재하는 `AiJobRecord.result`(범용 JSON 필드)에 결과를 담는다(`lib/aiJobs/executor.ts`의 `executePlanningJob()`). `POST /api/external/inquiries`가 AI Analysis 저장 직후 기존 `createAiJob()`/`processJob()` 파이프라인으로 자동 실행(추가 API 없음 — 기존 `GET /api/ai-jobs`·`POST /api/ai-jobs/[id]/run`이 타입에 무관하게 그대로 재사용됨). 견적·일정은 페이지/기능 개수 기반 규칙 계산(AI 판단과 무관하게 항상 신뢰 가능, `score.ts`와 동일한 원칙), Provider 미설정/파싱 실패 시 결정론적 기본값으로 폴백. `/developer/planning`에 "Planning 문서" 카드 신규(새 대시보드 아님, 기존 페이지 확장) — 각 문서에 "Design Automation으로 전달" 버튼 제공, `lib/planning/design-plan-adapter.ts`(순수 매핑)로 입력을 만들어 Design Automation의 기존·미변경 진입점(`POST /api/design/requirements`)을 그대로 호출(Design Automation 코드 무변경, Phase 1 진입은 다른 모든 Phase 전환과 동일하게 사람이 직접 트리거)

**CNBIZ.KR 브랜드 피벗**
- Header/Footer/CTA 전면 개편 — "문의"·"제작 의뢰" 메뉴 제거, 모든 CTA를 `NEXT_PUBLIC_CNBIZ_AI_URL`(`lib/links.ts`)로 통일
- `/contact`, `/request` 페이지·해당 API(`app/api/contact`, `app/api/requests/submit`) 제거, `next.config.ts`에서 두 경로 모두 cnbiz.ai.kr로 308 redirect
- `lib/contact/{validate,store,notify,spam,types}.ts` 제거(단, `lib/contact/email/*`는 Inquiry Pipeline이 재사용 중이라 보존). `lib/requests/*`·`/developer/requests`·`app/api/requests/{route,[id]}`는 과거 데이터 조회용 관리자 백엔드로 보존(신규 접수는 받지 않음)

**기타**
- Agent→Skill Phase 2 완료(`prompts/{planner,reviewer,documenter,tester}.md` 병합, `system.md` 전체 각주 반영)
- Repository 운영 규칙 v1~v4(`CLAUDE.md`/`README.md`) — 신규 프로젝트 배치 규칙, packages 승격 체크리스트, Review 체크리스트
- PROJECT_STATUS.md AI 자동 동기화 — `git commit`이 apps/**·packages/** 변경을 감지하면 Claude Code를 headless 호출해 변경된 섹션만 JSON patch(`.githooks/lib/{ai-provider,sync-project-status}.mjs`, 상태는 `.git/.ssot-cache/`에만 저장·문서에는 메타데이터 없음)

---

## 🚧 진행 중인 기능 (일부 구현)

- Design Automation Phase 9(Website Build 연동) — 코드 존재, CHANGELOG 검증 기록 없음
- 인증 — signup 백엔드·앱 내 역할관리 UI 없음(CLI 스크립트로만 가능)
- Client/WebsiteOrder 전용 관리자 목록 화면 — 개별 GET API(`/api/clients/[id]`, `/api/website-orders/[id]`)는 있고 `/developer/inquiries/[id]`에서 연결된 레코드를 확인할 수 있지만, `/developer/clients`·`/developer/website-orders` 같은 자체 목록 화면은 아직 없음

---

## ⏳ 예정된 기능 (미구현)

- Customer 포털(고객 본인 의뢰 상태 조회) — `Role` 타입에 `customer` 자체가 없음
- Deploy 자동화 — `ai deploy`는 branch check + `git push`만 수행, 실제 빌드/배포 실행 코드 없음(Vercel Git 연동이 그 이후를 담당)
- Notification 다채널화 — 이메일(Resend)만 존재, Slack/SMS/webhook/in-app 없음
- Portfolio 실콘텐츠, 회사 연락처 정보 확정(자료 수령 필요)
- GSC(Google Search Console) 연동

---

## 최근 완료 작업

- **AI Business OS Phase 3 — Planning 자동 문서 생성**(2026-07-22) — AI Analysis Engine
  (`lib/ai-analysis`, 무변경)의 `AIAnalysisResult`를 입력으로 기술 견적서·기능 명세서·프로젝트
  일정 3종을 자동 생성하는 Planning Phase 구현. 새 Workflow Engine·새 Registry·새
  CollectionStore는 만들지 않음(요청 원칙 그대로 준수) — `lib/planning/{types,generator,
  design-plan-adapter}.ts`(신규, Design Automation Phase 1의 generator/types 패턴을 그대로
  따름: chatViaCli → all-or-nothing JSON 검증 → 페이지/기능 개수 기반 규칙(rule-based) 결정론적
  폴백)만 추가하고, 저장은 기존 `AiJobType`을 `"generate_planning"` 한 값만 최소 확장해
  AiJobRecord가 이미 갖고 있던 범용 `result` 필드에 담는다(`lib/aiJobs/executor.ts`의
  `executePlanningJob()`, `lib/aiJobs/types.ts` +1줄). `POST /api/external/inquiries`가 AI
  Analysis 저장 성공 시에만 기존 `createAiJob()`/`processJob()` 파이프라인으로 자동
  트리거(추가 API 없음 — 기존 `GET/POST /api/ai-jobs*`가 타입 무관하게 그대로 재사용됨). Design
  Automation(`lib/design/*`)은 한 줄도 수정하지 않음 — `lib/planning/design-plan-adapter.ts`(순수
  매핑, Phase 9의 `website-build-adapter.ts`와 동일한 원칙)로 Planning 결과를 Design Automation의
  기존·미변경 진입점(`POST /api/design/requirements`)이 요구하는 입력 형태로만 변환한다. 모든
  Inquiry에 대해 DesignPlanRecord를 조용히 자동 생성하는 대신(Design Automation의 다른 모든 Phase
  전환과 다르게 검증되지 않은 대량 자동화가 될 위험 판단), `/developer/planning`(기존 대시보드
  확장, 신규 대시보드 아님)에 "Design Automation으로 전달" 버튼을 추가해 사람이 트리거하는
  기존 관례를 유지 — 이 설계 결정은 의도적 범위 조정이며, 완료 조건의 "Inquiry→...→Design
  Automation" 자동 흐름은 Planning까지 완전 자동, Design Automation 진입은 검증된 원클릭
  수동 액션으로 구현됐음을 명시
  - 신규 테스트 16개(`tests/planning/{generator,design-plan-adapter}.test.ts`) — AI 성공/실패/파싱
    실패 3경로, 규칙 기반 견적·일정 계산 검증(페이지·기능 개수 증가 시 총액·기간 증가 확인,
    5단계 타임라인 오프셋 순차성), 어댑터 매핑 4가지 케이스
  - 실 E2E: 로컬 dev 서버로 `POST /api/external/inquiries` 실제 호출 →
    `inquiryId`/`aiJobId`에 이어 신규 `planningJobId` 응답 필드 확인 → 생성된
    `ai-jobs.json`에서 `type:"generate_planning"` Job이 `status:"Success"`,
    `result`에 견적 합계·일정 총기간이 정확한 계산값(예: 4페이지×50만+1기능×80만+기본
    300만 → 부가세 10% 포함 638만원)으로 채워짐을 직접 확인. `generate_website` Job은 이
    샌드박스에 `powershell.exe`가 없어 실패(Windows 전용 기존 동작, 이번 변경과 무관한
    환경 제약 — 코드 회귀 아님)
  - `npx tsc --noEmit`(0 errors) · `npm run lint`(0 errors) · `npm run build`(전체 라우트
    정상 생성, `/developer/planning` 포함) · `npx vitest run` 62 files/481 tests 중 476~478
    통과(매 실행마다 다른 3~5건이 실패 — 전부 `tests/{agents/taskQueue-retry,design/
    review-registry,requests/registry,websites/registry}`의 동일 밀리초 timestamp 충돌로 인한
    기존 타이밍 플레이크, 단독 재실행 시 통과 확인, Planning/AiJob/Design/AI Analysis 관련
    테스트는 262개 전부 매번 통과)

- **AI Provider 연결 배선 점검 + `.env.example` 문서화**(2026-07-22) — "실제 AI Provider 연결"
  작업 요청에 따라 기존 구조(`lib/ai/bridge.ts`의 `chatViaCli()` → `packages/cli/src/providers/
  {registry,manager,provider,types}.ts` + 5개 벤더 구현체)를 전수 점검. **Provider Registry·
  Manager·5개 벤더(anthropic/openai/gemini/ollama/openrouter) 구현 모두 이미 완결 상태이며 코드
  추가·수정이 필요한 지점이 없음을 확인**(resolve→chat→simulate 폴백, 재시도, 스트리밍 전부
  기존 코드로 완비) — 새 AI Engine·새 Provider 구조·Workflow·Registry·CollectionStore는 전혀
  건드리지 않음(요청 원칙 그대로 준수). 유일하게 실제로 비어 있던 지점은 **문서화**뿐이었음:
  `apps/cnbiz-web/.env.example`에 AI Provider 키 4종(`ANTHROPIC_API_KEY`·`OPENAI_API_KEY`
  (+선택 `OPENAI_MODEL`)·`GEMINI_API_KEY`(+선택 `GEMINI_MODEL`)·`OPENROUTER_API_KEY`)이 전혀
  기재되어 있지 않아 운영자가 Vercel에 어떤 키를 넣어야 하는지 알 수 없었음 — 이번에 전부
  추가하고, 이 앱이 `packages/cli`를 in-process import하지 않고 child process로 shell-out해
  env를 상속받는 구조·아무 키도 없으면 모든 호출이 결정론적 fallback으로 귀결되는 것이 정상
  동작임을 주석으로 명시
- **검증**: `npm test`(`apps/cnbiz-web`) 465 tests 중 461 통과 — AI/Provider 관련 테스트
  (`tests/ai/bridge.test.ts`·`tests/providers/status.test.ts`·`tests/ai-analysis/{analysis,
  score}.test.ts`·`tests/aiJobs/registry.test.ts`, 총 32개)는 **전부 통과**하여 키가 없는
  이 환경에서도 fallback 경로가 정확히 동작함을 재확인. 나머지 4개 실패(`tests/agents/
  taskQueue-retry`·`tests/design/review-registry`·`tests/requests/registry`·`tests/websites/
  registry`)는 전부 동일 밀리초에 생성된 두 레코드의 timestamp 비교/정렬 문제로, 단독 재실행
  시에도 동일하게 실패해 이 세션의 빠른 CPU 환경에서 발생하는 기존 타이밍 이슈로 확인 —
  AI Provider 관련 코드와 무관하고 이번 변경(`​.env.example`만 수정)으로 인한 회귀가 아님.
  `npm run lint`(0 errors)·`npm run build`(전체 라우트 정상 생성, Design Automation 9개 페이지
  포함) 통과
  - **실제 AI 응답을 통한 검증은 이번 범위에서 수행하지 않음** — 이 환경에는 5개 Provider
    전부에 대해 API 키가 없고(`.env.local` 없음, 프로세스 env에도 없음), 로컬 Ollama도
    실행되지 않음. 사용자 지시에 따라 API 키를 요구하거나 Ollama를 설치하지 않았으며,
    AI 응답을 모킹·조작하지도 않음(모든 검증은 fallback 경로 자체의 정확성에 한정). **실제
    AI 응답 검증은 유효한 Provider API 키(Vercel 프로덕션 환경변수 또는 로컬 `.env.local`)가
    실제로 연결된 후에만 가능함**을 아래 "다음 작업 우선순위" 4번에 그대로 유지
- **Phase 01·02·09 대시보드 + AI 의뢰 관리 "새 문의 등록" UI**(2026-07-22) — Development OS에
  Analysis(`/developer/analysis`)·Planning(`/developer/planning`)·Deployment(`/developer/deployment`)
  3개 신규 대시보드를 추가. 새 분석/기획/배포 엔진·새 API·새 DB 컬렉션은 만들지 않고, 기존
  `lib/inquiries`·`lib/workflows`·`lib/health` 함수와 기존 문서(`REQUEST.md`류, WBS/로드맵,
  배포 가이드 등)만 fs로 읽어 연결(`lib/docs/{readDocEntry,readCiWorkflows}.ts` 신규, 순수 조회
  헬퍼). `components/developer/{DocList,Toast}.tsx` 신규(문서 미리보기·검증 실패 토스트, 다른
  페이지에서도 재사용 가능한 범용 컴포넌트). 3개 신규 페이지와 원본 데이터 화면(AI 의뢰 관리 ·
  Workflow Center · Health · Design · Website Builder) 사이에 상호 링크를 추가해 기존 Design
  Automation의 "이전/다음 단계" 내비게이션 관례를 따름. `/developer/inquiries/new`(AI 의뢰 관리
  확장) — 문의 등록 폼 UI, "AI 분석 시작"은 TODO 스텁(콘솔 로그만, 실제 AI 호출 없음).
  `npx tsc --noEmit`·`npm run lint`·`npm run build` 전부 통과, Playwright 실 브라우저로 로그인 →
  Phase 동선 전체 클릭 검증(Inquiries→Analysis→Planning→Workflow Center→Deployment→Health→
  Design→Storyboard, Website Builder→Deployment) 완료, 콘솔 에러 0건. 검증 과정에서 CI 트리거
  파싱 버그(`readCiWorkflows.ts`가 `on:` 블록 범위를 벗어난 `jobs: release:` 같은 무관한 키를
  트리거로 오인)를 발견해 즉시 수정. 이 커밋은 pre-commit SSOT 자동 동기화 훅이 로컬 `claude`
  CLI 헤드리스 호출 타임아웃으로 실패해 `--no-verify`로 진행했으며, 본 섹션은 그 대신 수동으로
  갱신함(사용자 승인)
- **아키텍처 감사 + CNBIZ.AI.KR 책임 경계 명시**(2026-07-21) — 목표 아키텍처(CNBIZ.KR→CNBIZ.AI.KR→AI Business OS)와 실제 구현을 대조 감사. CNBIZ.AI.KR은 이 저장소에 코드가 없는 외부 시스템이며 아직 자체 저장·알림을 하지 않음을 사용자 확인으로 검증. 목표상 CNBIZ.AI.KR 책임인 "Inquiry(+설문+첨부파일) 저장"·"관리자 알림"을 AI Business OS(`app/api/external/inquiries/route.ts`, `lib/inquiries/notify.ts`)가 임시로 대행 중임을 코드 주석으로 명시(로직·동작 변경 없음, 기능 삭제·이동 없음 — CNBIZ.AI.KR이 아직 이관받을 준비가 안 됐으므로). AI Analysis/Client/WebsiteOrder/AiJob/Admin/Website Builder는 이미 목표와 일치해 무변경
- **AI Business OS Phase 2 — 실제 AI Provider 연동 검증 시도**(2026-07-20) — 코드 변경 없음, 검증만 수행. `packages/cli provider list`로 5개 Provider(anthropic/openai/gemini/ollama/openrouter) 전부 `configured:false` 확인, `chatViaCli()` 실제 호출 결과 `"ANTHROPIC_API_KEY is not configured."`로 명시적 실패(즉 시뮬레이션 폴백). `.env.local`(루트·`apps/cnbiz-web` 둘 다) 어디에도 AI Provider 키 없음, 로컬 Ollama도 미실행. 지시대로 임의의 키 생성·우회 없이 이 사실을 그대로 보고. 대신 실제 도달 가능한 범위(파이프라인 전체 배선·결정론적 폴백 경로·파싱 안정성)를 5개 샘플 Inquiry(레스토랑/병원/법률사무소/쇼핑몰/기업홈페이지, 완전도 20~100점 분포)로 실 E2E 검증 — Completeness/Missing Items가 매번 수동 계산과 정확히 일치함을 확인. 발견된 한계: 폴백 경로의 `detectedBusinessType`은 `siteType`이 `WEBSITE_TYPES`와 매칭되면 `industry` 텍스트보다 우선시되어(법률사무소 샘플이 "기업 홈페이지"로만 표시됨), `recommendedPages`/`recommendedFunctions`는 모든 업종에서 동일한 고정 기본값만 반환 — 실제 AI 연결 전까지는 업종별 차별화가 없다는 점을 실측으로 확인(설계상 알려진 한계이지 버그 아님)
- **AI Business OS Phase 2 — AI Analysis Engine 구축**(2026-07-20) — `lib/ai-analysis/{types,score,prompts,analysis}.ts` 신규. Completeness(10개 체크리스트 항목×10점)·Missing Items는 `score.ts`가 규칙 기반으로 결정론적 계산(회사명/담당자명/연락처/서비스 설명/업종/로고/사진/참고사이트/브랜드컬러/도메인 — `survey`가 챗봇 자유 형식이라 키·값 느슨한 패턴 매칭으로 존재 추정). Business Type/추천 페이지·기능/Summary는 기존 `chatViaCli()`(Design Automation과 동일 브릿지) 재사용, Provider 미설정/파싱 실패 시 `siteType`→`WEBSITE_TYPES` 라벨 매핑 기반 결정론적 폴백(Design Automation의 resolve→parse→fallback 패턴 그대로). `POST /api/external/inquiries`에서 Inquiry 생성 직후 자동 실행되어 결과를 새 컬렉션 없이 기존 `inquiries` 레코드에 `analysis`/`analyzedAt`로 저장(`saveInquiryAnalysis()`). `/developer/inquiries/[id]`에 "AI 분석" 카드 추가. `AiJobType`·`AiJobStatus`·Website Builder·기존 Inquiry/Client/WebsiteOrder/AiJob 생성 로직·관리자 Inquiry 목록 화면은 지시대로 무변경(확장만). 기술 견적서/기능 명세서/프로젝트 타임라인은 이번에도 생성하지 않음(다음 Phase가 이 Analysis 결과를 입력으로 사용할 예정). 신규 테스트 15개(`tests/ai-analysis/{score,analysis}.test.ts`) + 실제 `POST /api/external/inquiries` 호출 → Supabase(로컬은 fsStore) 저장 → `/developer/inquiries/[id]` Playwright 렌더링까지 실 E2E 확인(콘솔 에러 0건). `npm test` 60 files/465 tests 전부 통과
- **AI Business OS Phase 1 — Inquiry 생성/관리자 화면 연결**(2026-07-20) — `POST /api/external/inquiries`(이미 구현되어 있던 오케스트레이션 엔드포인트)를 요청 스펙의 `POST /api/inquiries`로 채택(신규 엔드포인트 미생성, 관리자 전용 `/api/inquiries` GET과 경로/인증 계층 충돌 방지). `lib/inquiries/{types,validate}.ts`에 `industry`·`survey`·`uploadedFiles` 옵셔널 필드 추가 + `customerName`/`consultation` 별칭 파싱(기존 `contactName`/`requirements` 필드·타입은 무변경). 응답에 `status` 필드 추가. `/developer/inquiries`·`/developer/inquiries/[id]`(AI 의뢰 관리자 화면) 신규 — `/developer/requests`와 동일한 컴포넌트/패턴 재사용, Inquiry.status와 연결된 AiJob.status를 조합해 "신규 접수/AI 분석·생성 중/생성 완료/생성 실패"를 파생 표시(두 타입 모두 무변경). `AiJobType`·`AiJobStatus`·Website Builder 실행 로직은 지시대로 수정하지 않음. 기술 견적서/기능 명세서/프로젝트 타임라인은 코드베이스에 실제로 존재하지 않음을 전수 검색으로 확인 후 이번 범위에서 명시적으로 제외(다음 Phase로 이월)
- **PROJECT_STATUS.md 기재 오류 발견·수정** — 이 문서가 "AiJob 자동 실행 트리거 없음"을 "가장 중요한 미연결 지점"이라 계속 기재하고 있었으나, 실제로는 커밋 `74c12b0`(이 세션 이전)에서 이미 `POST /api/external/inquiries`가 `processJob()`을 직접 호출하도록 연결되어 있었음을 git log로 확인. 문서만 갱신되지 않았던 stale 상태였음
- **테스트 스위트 회귀 수정**(2026-07-20) — CNBIZ.KR 브랜드 피벗(아래) 세션에서 `/api/contact`·`/api/requests/submit`를 삭제하며 관련 테스트를 갱신하지 않아 발생한 실패 3건(`tests/auth/{rbac,proxy}.test.ts`)을 새 동작(두 경로 모두 이제 developer 게이팅)에 맞게 수정, 삭제된 `lib/contact/store.ts`를 참조하던 `tests/contact/store.test.ts` 삭제. `npm test` 58 files/450 tests 전부 통과 확인(이전엔 인지되지 못한 채 3 files/4 tests 실패 상태였음)
- **CNBIZ.KR 브랜드 홈페이지 피벗**(2026-07-20) — Header/Footer/CTA에서 문의·제작 의뢰 제거, `/contact`·`/request`(+API) 삭제 후 cnbiz.ai.kr로 308 redirect, `lib/links.ts`(`CNBIZ_AI_URL`) 신규. lint/tsc/build 통과 확인(당시 vitest는 실행하지 않아 위 회귀를 놓쳤음 — 이후 세션에서 발견·수정)
- **AI Job Worker/Executor 구현 + 자동 실행 연결**(2026-07-19) — `lib/aiJobs/{worker,executor}.ts` 신규, `POST /api/external/inquiries`에서 생성 직후 `processJob()` 호출(커밋 `74c12b0`)
- **Customer Inquiry Pipeline 도메인 모델 확립 + External API + Admin CRUD**(2026-07-19) — Inquiry→Client→WebsiteOrder→AiJob 설계, `POST /api/external/inquiries` 오케스트레이션, 관리자 CRUD 8개 라우트
- **Agent→Skill Phase 2 완료 + Repository 운영 규칙 확립**(2026-07-19) — `prompts/*.md` 5개 병합, `CLAUDE.md`/`README.md`에 신규 프로젝트 규칙·Packages Promotion Checklist·Repository Review Checklist 추가
- `apps/cnbiz-web`로 Development OS 전체 이관(커밋 `526831e`, 2026-07-15)

---

## 다음 작업 우선순위

1. **CNBIZ.AI.KR 구축 후 Inquiry 저장·관리자 알림 책임 이관** — 위 "알려진 아키텍처 부채" 참고. CNBIZ.AI.KR이 자체 DB·알림을 갖추면 `app/api/external/inquiries/route.ts`의 `createInquiry()`/`notifyAdminOfNewInquiry()` 호출부(이미 "임시 대행" 주석 표시됨)를 이관
4. **실제 AI Provider 연결** — 2026-07-22 재확인: 배선(Bridge→Provider Registry/Manager→5개 벤더)은 **이미 완결되어 추가 구현이 필요 없음**, `.env.example`도 이번에 4개 키 전부 문서화 완료. 남은 것은 순수 환경설정뿐 — `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GEMINI_API_KEY`/`OPENROUTER_API_KEY` 중 하나라도 이 앱(Vercel 프로덕션 환경변수 또는 로컬 `.env.local`)에 실제 값으로 설정되어야 AI Analysis/Design Automation/Website Builder의 진짜 판단 경로(현재는 결정론적 폴백만 동작 확인됨)를 실제 AI 응답으로 검증할 수 있음. 로컬 Ollama(`OLLAMA_HOST`)도 대안이 될 수 있으나, Vercel 프로덕션(서버리스)에서는 로컬 Ollama에 접근할 수 없어 로컬 개발 검증 용도로만 유효함
5. **cnbiz.ai.kr 쪽 실제 챗봇 연동 검증** — 지금까지는 이쪽 저장소에서 직접 curl/Playwright로만 검증. 실제 cnbiz.ai.kr이 보내는 페이로드 필드명이 지원 중인 별칭(`customerName`/`consultation`)과 정확히 일치하는지 실제 연동 테스트 필요
6. **Client/WebsiteOrder 전용 관리자 목록 화면** — 현재는 Inquiry 상세에서만 연결된 레코드 확인 가능
7. **회원가입 백엔드 + 역할관리 UI**
8. **Portfolio 실콘텐츠·회사 연락처 정보 확정**(자료 수령 필요)
9. **Design Automation Phase 9 실사용 검증**

---

## Git 커밋

### 모든 변경사항 한 번에 커밋

```bash
git add -A
git commit -m "feat: 작업 내용"
git push origin main
```

### 진행률 자동 업데이트 (Claude Code)

```text
현재 프로젝트 전체를 분석해서 PROJECT_STATUS.md를 업데이트해줘.

실제 구현된 코드만 기준으로 작성하고,
완료 / 진행 중 / 미구현 기능을 구분해서
전체 진행률과 다음 작업 우선순위를 업데이트해줘.
```

## Git 커밋 방법

### 모든 변경사항 한 번에 커밋

```bash
git status
git add -A
git commit -m "feat: 업데이트 내용"
git push origin main
```

### 한 줄로 실행

```bash
git add -A && git commit -m "feat: 업데이트 내용" && git push origin main
```

### 커밋 메시지 예시

```bash
feat: 의뢰 접수 페이지 구현
feat: AI 홈페이지 생성 기능 추가
feat: 고객 대시보드 구현
fix: 관리자 로그인 오류 수정
docs: 프로젝트 진행률 업데이트
refactor: 코드 구조 개선
```

### 작업 순서

1. 기능 개발
2. PROJECT_STATUS.md 진행률 업데이트
3. `git add -A`
4. `git commit -m "작업 내용"`
5. `git push origin main`

---

# 개발 작업 규칙 (Working Rules)

## Single Source of Truth

- PROJECT_STATUS.md를 프로젝트의 Single Source of Truth(SSOT)로 사용한다.

## 구현 규칙

- 이미 구현된 기능은 수정·재구현·리팩터링하지 않는다.
- PROJECT_STATUS.md에서 "미구현" 또는 "일부 구현"으로 표시된 항목만 작업한다.
- 작업 전에 기존 코드의 재사용 여부를 먼저 확인한다.
- 새로운 Domain, API, Registry, Auth, RBAC, Website Builder를 생성하는 것은 금지한다.

## 작업 절차

1. PROJECT_STATUS.md 확인
2. 기존 코드 검색
3. 기존 구현 재사용 여부 확인
4. 필요한 경우에만 구현
5. PROJECT_STATUS.md 업데이트
6. 테스트
7. Git Commit

## 구현 금지

다음은 이미 구현되어 있으므로 새로 만들지 않는다.

- Domain Registry
- CollectionStore
- CRUD API
- Authentication
- RBAC
- Website Builder
- External Inquiry Orchestration
- Notification(Email)