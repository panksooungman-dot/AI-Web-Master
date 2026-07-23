# AI Business OS - PROJECT STATUS

> 최종 분석: 2026-07-24 (Claude Code, AI Business OS Rewiring + Phase 3 반영 — 커밋 `726c3eb` 기준)
> 이 커밋도 동기화 훅이 로컬 `claude` CLI 헤드리스 호출 타임아웃(90초)으로 실패해 `--no-verify`로
> 진행하고 이 섹션들을 수동으로 갱신함(사용자 승인 하에 진행, 2026-07-22 사례와 동일한 원인).
> 이 문서는 추측이 아닌 실제 파일/코드 확인 결과만 반영합니다.

## 프로젝트 개요
AI 기반 홈페이지 제작 및 운영 플랫폼. `apps/cnbiz-web`(CNBIZ.KR 브랜드 홈페이지 + Development OS 대시보드)과 Customer Inquiry Pipeline(Inquiry→Client→WebsiteOrder→AiJob, AI Analysis Engine 포함)으로 구성됩니다. **2026-07-24 Rewiring**: 실제 의뢰 접수는 이제 cnbiz.kr 자체 문의 폼(`/contact`)과 `/developer/inquiries/new` 관리자 등록 폼 모두 내부 `POST /api/inquiries`(API Key 불필요, `createInquiry()` 등 기존 함수 재사용)로 들어옵니다 — cnbiz.ai.kr 챗봇 연동(`POST /api/external/inquiries`)은 실사용 증거가 확인되지 않아(`CHATBOT_API_KEY`가 Production에 한 번도 설정된 적 없음) `@deprecated`로 남기고 대체했습니다(`REWIRING_REPORT.md` 참고). 접수된 Inquiry의 AiJob은 관리자가 `/developer/inquiries/[id]`에서 승인해야 AI Generate가 실행되며, 생성 성공 후에는 **Phase 3**(`lib/deployment/pipeline.ts`)가 고객별 독립 GitHub Repository + Vercel Project를 자동 생성·배포합니다(`PHASE3_REPORT.md` 참고, `GITHUB_TOKEN`/`VERCEL_TOKEN` 미설정으로 아직 실 계정 검증 전). 루트 `app/`·`components/`(CNBIZ v1)는 레거시로 동결되어 있습니다.

---

## ✅ 해소됨 — CNBIZ.AI.KR 책임 임시 대행 (2026-07-24 Rewiring으로 대체)

> 아래는 2026-07-21~22에 유효했던 서술이며, 이력 확인용으로 남겨둔다. **현재는 더 이상 사실이
> 아니다** — 새 상태는 이 섹션 하단 참고.

~~목표 아키텍처: `CNBIZ.KR`(브랜드 사이트) → `CNBIZ.AI.KR`(문의폼·설문·파일업로드·고객 로그인·Inquiry/설문/첨부파일 저장·이메일/SMS/Push·관리자 알림) → `AI Business OS`(AI Analysis·Client/Project/AiJob 생성·Admin·Website Builder).~~

**2026-07-24 재검토 결과**: 이 목표 아키텍처가 전제한 "CNBIZ.AI.KR이 실제로 `POST /api/external/inquiries`를 호출하는 챗봇 연동"은 **실사용 증거가 전혀 확인되지 않았다**(`REWIRING_REPORT.md` 조사 근거):
- 이 라우트가 요구하는 `CHATBOT_API_KEY`가 Vercel Production 환경변수에 **한 번도 설정된 적이 없음**(도입 커밋 `0759bd5`, 2026-07-19부터 지금까지) — 설정 없이는 프로덕션에서 무조건 401을 반환하므로, 실제 호출이 있었다면 전부 실패했을 수밖에 없음
- `createInquiry()`를 호출하는 코드 경로가 저장소 전체에서 이 라우트 하나뿐이었음(다른 진입점 없음)
- `docs/EXTERNAL_API.md`/`CURRENT_SYSTEM_ARCHITECTURE.md`가 전제한 "cnbiz.ai.kr 실제 운영 중" 조차 코드로 검증된 적이 없고 사용자의 구두 확인에만 의존했음

**현재 상태**: 실제 운영 구조를 "고객 → cnbiz.kr → AI Business OS"(cnbiz.ai.kr 경유 없음)로 재정의하고 내부 재배선을 완료했다.
- 신규 `POST /api/inquiries`(`app/api/inquiries/route.ts`)가 `createInquiry()` 등 기존 함수를 그대로 재사용하는 내부 진입점 — API Key 불필요, cnbiz.kr의 `/contact` 폼과 `/developer/inquiries/new` 관리자 폼 양쪽이 호출
- `POST /api/external/inquiries`·`lib/auth/apiKey.ts`·`CHATBOT_API_KEY`는 삭제하지 않고 `@deprecated`만 표시(실제 호출자가 있을 가능성에 대비한 하위 호환 유지, 확인되면 별도 커밋으로 제거 예정)
- 관리자 알림(`notifyAdminOfNewInquiry()`)은 이제 새 내부 라우트가 직접 호출 — "CNBIZ.AI.KR 책임 임시 대행"이 아니라 이 시스템 자체의 정식 책임으로 재정의됨
- AI Analysis·Client·WebsiteOrder(Project)·AiJob·Admin·Website Builder 로직 자체는 무변경

---

## 🆕 Phase 3 — 고객별 독립 GitHub Repository + Vercel Project 자동 배포 (2026-07-24)

AI Generate(Website Builder) 성공 직후, 신규 `lib/deployment/pipeline.ts`가 `lib/github/*`·`lib/git/*`·`lib/vercel/*`(전부 신규, REST API + `fetch`, 새 npm 의존성 없음)를 조합해 GitHub Repository 생성 → Commit → Push → Vercel Project 생성 → GitHub 연결 → Production Deploy → 결과를 `WebsiteRecord`에 저장까지 자동 수행한다. 실패 시 이미 생성된 외부 리소스를 역순 롤백하고, 전 단계를 `lib/audit/log.ts`(Audit Log)에 기록한다.

**⚠️ `GITHUB_TOKEN`/`VERCEL_TOKEN`이 이 환경에 설정되어 있지 않아, 파이프라인은 매번 "NotConfigured"로 조용히 스킵된다(오류로 보이지 않음, `/developer/audit-log`에서 확인 가능).** 가짜 URL을 만들지 않는 설계이며, 실제 계정으로는 아직 왕복 검증하지 못했다(`PHASE3_REPORT.md` "확인 필요" 참고).

---

## 전체 진행률
**약 90%**

| 영역 | 진행률 | 근거 |
|---|---|---|
| CNBIZ.KR 브랜드 홈페이지 | 92% | Home/About/Services/Portfolio + **`/contact` 복원**(내부 `POST /api/inquiries` 제출). `/request`만 여전히 cnbiz.ai.kr로 308 redirect(별도 결정 대기). Portfolio 실콘텐츠·회사 연락처 정보만 TODO |
| Development OS 대시보드 | 93% | `/developer/**` 38개 페이지 실동작. AI 의뢰 관리 "새 문의 등록"(`/developer/inquiries/new`)이 TODO 스텁에서 **실제 `POST /api/inquiries` 호출로 연결됨**(이메일 필드 추가). Client/WebsiteOrder/AiJob 전용 목록 화면만 아직 없음(Inquiry 상세에서 연결된 레코드는 확인 가능) |
| AI 홈페이지 생성기(Website Builder v2) | 85% | CLI+대시보드 완결, Design Automation Phase 9 연동만 미검증 |
| **Customer Inquiry Pipeline** | **95%** | 데이터 계층·**내부 진입점(`POST /api/inquiries`, API Key 불필요)**·Worker·Executor·관리자 승인 게이팅·관리자 UI·AI Analysis Engine까지 전부 연결되어 실사용 가능. **신규**: AI Generate 성공 후 고객별 GitHub Repo/Vercel Project 자동 배포(Phase 3) — `GITHUB_TOKEN`/`VERCEL_TOKEN` 미설정으로 실 계정 검증만 남음. 기술 견적서/기능 명세서/프로젝트 타임라인은 의도적으로 다음 Phase로 분리 |
| 인증/권한 | 82% | 세션 인증 + RBAC 4-role + 정확한 (method,path) 단위 예외(`POST /api/inquiries`) 완비. signup 백엔드·역할관리 UI만 없음. `x-api-key`(`CHATBOT_API_KEY`) 인증은 `@deprecated`(아래 참고) |
| 고객(의뢰자) 시스템 | 65% | CNBIZ.KR 자체 접수 폼(`/contact`) **복원 완료** — 더 이상 cnbiz.ai.kr에 전량 위임하지 않음. 고객 본인이 조회하는 포털은 여전히 없음 |
| 배포 자동화(고객별 GitHub/Vercel) | 40% | 파이프라인·롤백·감사 로그 전부 구현·테스트 완료(신규). `GITHUB_TOKEN`/`VERCEL_TOKEN` 미설정으로 실 계정 검증 전(진행률의 대부분은 이 검증 이후 완성) |
| 테스트 인프라 | 100% | `apps/cnbiz-web` 73 files / 564 tests 전부 통과(Rewiring + Phase 3 신규 테스트 다수 포함) |

---

## ✅ 완료된 기능

**기존 시스템**
- CNBIZ.KR 브랜드 홈페이지(Home/About/Services/Portfolio) — 문의·제작 의뢰 폼은 의도적으로 제거(아래 참고)
- Development OS 대시보드 38개 페이지(Terminal/Workspace/GitHub/AI Workspace/Website Builder/Workflow Center/Marketplace/Settings/Logs/Health/Audit Log/Metrics/Backup/Design Automation 9종/AI 의뢰 관리 등)
- **Phase 01·02·09 대시보드**(`/developer/analysis`, `/developer/planning`, `/developer/deployment`, 신규) — 새 분석·기획·배포 엔진을 만들지 않고 기존 문서·기존 API/lib 함수만 연결한 읽기 전용 집계 화면. Analysis는 `lib/inquiries/registry.ts`의 `listInquiries()`로 AI 분석 완성도·업종 분포를 집계하고 `PROJECT_STATUS.md`(본 문서)·`REQUEST.md`류를 fs로 직접 읽어 표시. Planning은 `lib/workflows/registry.ts`·`lib/workflows/engine.ts`의 기존 Workflow 정의·Run 이력을 집계. Deployment는 `lib/health/checks.ts`(`/api/health`와 동일 함수)로 Git 상태·Health 캐시를 보여주고 `.github/workflows/*.yml`을 정적 파싱해 CI 파이프라인 목록을 표시. 3개 페이지와 그 데이터 원본 화면(AI 의뢰 관리·Workflow Center·Health·Design·Website Builder) 사이에 상호 탐색 링크를 추가해 Design Automation이 이미 쓰던 "이전/다음 단계" 내비게이션 관례를 따름
- AI 의뢰 관리 "새 문의 등록"(`/developer/inquiries/new`) — 문의 제목/고객명/회사명/**이메일**(2026-07-24 추가)/문의 내용/첨부파일(드래그앤드롭) 입력 UI. "AI 분석 시작" 버튼이 이제 실제로 `POST /api/inquiries`를 호출한다(2026-07-24 Rewiring, 아래 참고) — Supabase Storage 업로드·OCR만 아직 TODO(첨부파일은 파일명만 감사 목적으로 전달, 실제 URL 없음)
- 인증(이메일/비밀번호 세션) + RBAC 4-role — `lib/auth/{types,password,users,session,auth,middleware,rbac}.ts`, `proxy.ts`
- Website Builder v2(CLI `ai website create` + 대시보드) — `packages/cli/src/website/*`, `lib/websites/registry.ts`, `/developer/websites`
- Database — `lib/db/{collectionStore,fsStore,memoryStore,supabaseStore,index}.ts`(단일 Supabase 테이블 `app_collections`)

**Customer Inquiry Pipeline**
- Inquiry/Client/WebsiteOrder/AiJob 도메인 데이터 계층 — `lib/{inquiries,clients,websiteOrders,aiJobs}/{types,registry}.ts`(FK 체인 전부 연결) — 무변경
- ~~챗봇 서버-투-서버 인증 — `lib/auth/apiKey.ts`(x-api-key)~~ → **`@deprecated`**(2026-07-24, 아래 Rewiring 항목 참고)
- ~~오케스트레이션 엔드포인트 — `POST /api/external/inquiries`~~ → **`@deprecated`**, 내부 `POST /api/inquiries`로 대체(아래 참고)
- 관리자 CRUD API 8개 — `/api/{inquiries,clients,website-orders,ai-jobs}/route.ts`, `[id]/route.ts` — 무변경
- **AI Job Worker + Executor** — `lib/aiJobs/worker.ts`(Queued→Running→Success/Failed 상태 전이) + `lib/aiJobs/executor.ts`(AiJob 조회→Website Builder CLI 실행→`createWebsiteRecord()`→`addWebsiteToOrder()`) — 무변경. **자동 실행 트리거는 제거됨**(2026-07-24) — AiJob은 이제 관리자가 `/developer/inquiries/[id]`에서 승인해야 실행됨(아래 Rewiring 항목)
- **AI 의뢰 관리자 화면**(`/developer/inquiries`, `/developer/inquiries/[id]`) — 목록·상세, Inquiry/Client/WebsiteOrder/AiJob 연결 상태를 한 화면에서 확인, Queued/Failed Job 실행("승인 및 생성"/"재실행", 기존 `POST /api/ai-jobs/[id]/run` 재사용), Inquiry 상태 수동 변경
- Inquiry 스키마 확장(`industry`·`survey`·`uploadedFiles` 옵셔널 필드, `customerName`/`consultation` 별칭 파싱) — 무변경
- **AI Analysis Engine**(`lib/ai-analysis/{types,score,prompts,analysis}.ts`) — Inquiry 생성 직후 자동 실행, `AIAnalysisResult` 산출 — 무변경
- `/developer/inquiries/[id]`에 "AI 분석" 카드 — 무변경

**AI Business OS Rewiring + Phase 3(2026-07-24, 신규 — 상세는 `REWIRING_REPORT.md`/`PHASE3_REPORT.md`)**
- 내부 진입점 **`POST /api/inquiries`**(`app/api/inquiries/route.ts`) — `/api/external/inquiries`와 동일한 `createInquiry()`→AI Analysis→Client→WebsiteOrder→AiJob(Queued로만 생성, 자동 실행 안 함)→관리자 알림 흐름을 그대로 재사용. `lib/auth/rbac.ts`에 (method,path) 단위 예외(`UNGATED_EXACT_ROUTES`) 신설해 `POST /api/inquiries`만 비게이팅, `GET`은 그대로 developer 게이팅
- **cnbiz.kr `/contact` 폼 복원**(`app/contact/page.tsx`, `components/sections/ContactForm.tsx`) — 위 라우트로 직접 제출. `/request`는 여전히 cnbiz.ai.kr로 308 redirect(범위 밖으로 남김)
- `/developer/inquiries/new`의 "AI 분석 시작" TODO 스텁을 위 라우트 호출로 교체(이메일 필드 추가)
- **관리자 승인 게이팅** — AiJob은 `Queued`로만 생성되고, `/developer/inquiries/[id]`의 "승인 및 생성" 버튼(기존 `POST /api/ai-jobs/[id]/run` 그대로 재사용, 새 실행 로직 없음)을 눌러야 Website Builder가 실행됨
- **고객별 GitHub Repository + Vercel Project 자동 배포** — 신규 `lib/github/*`·`lib/git/*`·`lib/vercel/*`·`lib/deployment/pipeline.ts`. AI Generate 성공 직후 GitHub Repo 생성→Commit→Push→Vercel Project 생성→GitHub 연결→Production Deploy→`WebsiteRecord`에 결과 저장까지 자동 수행, 실패 시 역순 롤백, 전 단계 Audit Log 기록(`AuditAction`에 `deployment.*` 8개 추가). `GITHUB_TOKEN`/`VERCEL_TOKEN` 미설정 시 가짜 URL 없이 `NotConfigured`로 명시적 스킵(실 계정 검증 전)
- `app/api/external/inquiries/**`·`lib/auth/apiKey.ts`·`CHATBOT_API_KEY`는 삭제하지 않고 `@deprecated` 표시만(하위 호환, 실사용 미확인 확정 시 별도 커밋으로 제거 예정)
- 신규 테스트 다수(github/git/vercel 클라이언트, deployment pipeline, aiJobs worker) — `npm test` 73 files/564 tests 전부 통과

**CNBIZ.KR 브랜드 피벗 (2026-07-20, 일부는 위 Rewiring으로 수정됨)**
- Header/Footer/CTA 전면 개편 — "문의"·"제작 의뢰" 메뉴 제거, 모든 CTA를 `NEXT_PUBLIC_CNBIZ_AI_URL`(`lib/links.ts`)로 통일 — 무변경(범위 밖으로 유지, 위 Rewiring 항목 참고)
- ~~`/contact`, `/request` 페이지·해당 API 제거, 두 경로 모두 cnbiz.ai.kr로 308 redirect~~ → **`/contact`는 2026-07-24 Rewiring으로 복원됨**(위 참고), `/request`만 여전히 redirect
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
- **고객별 GitHub/Vercel 자동 배포(Phase 3)** — 파이프라인·롤백·감사 로그 전부 구현·테스트 완료, `GITHUB_TOKEN`/`VERCEL_TOKEN` 미설정으로 실 계정 검증만 남음(`PHASE3_REPORT.md` "확인 필요" 참고)

---

## ⏳ 예정된 기능 (미구현)

- **기술 견적서 / 기능 명세서 / 프로젝트 타임라인 자동 생성** — AI Business OS Phase 1·Phase 2 요청 모두에서 명시적으로 다음 Phase로 분리. Phase 2에서 구축한 AI Analysis Engine(`lib/ai-analysis/*`)의 `AIAnalysisResult`(completeness/missingItems/detectedBusinessType/recommendedPages/recommendedFunctions/summary)가 이 3개 문서 생성의 입력값으로 설계되어 있음(`AIAnalysisInput`이 Inquiry와 독립적인 재사용 가능한 타입). 확장 지점: `WebsiteOrderRecord`(신규 문서 id 배열 추가 여지) 또는 `AiJobType`에 `generate_website`/`generate_content`와 나란히 새 타입 추가(예: `generate_estimate`) — `AiJobType`·`AiJobStatus`는 Phase 1·2 모두에서 의도적으로 수정하지 않음
- Customer 포털(고객 본인 의뢰 상태 조회) — `Role` 타입에 `customer` 자체가 없음
- Deploy 자동화(**AI Business OS 플랫폼 자신**, CLI `ai deploy`) — branch check + `git push`만 수행, 실제 빌드/배포 실행 코드 없음(Vercel Git 연동이 그 이후를 담당). ⚠️ **고객 생성 사이트**의 배포 자동화는 별개(Phase 3, `lib/deployment/pipeline.ts`)로 이미 구현됨 — 혼동 주의
- Notification 다채널화 — 이메일(Resend)만 존재, Slack/SMS/webhook/in-app 없음
- Portfolio 실콘텐츠, 회사 연락처 정보 확정(자료 수령 필요)
- GSC(Google Search Console) 연동

---

## 최근 완료 작업

- **AI Business OS Rewiring Phase 3 — 고객별 GitHub Repository + Vercel Project 자동 배포**(2026-07-24) —
  `lib/github/{types,client}.ts`·`lib/git/{types,client}.ts`·`lib/vercel/{types,client}.ts`·
  `lib/deployment/{types,pipeline}.ts` 신규(새 npm 의존성 없음, `fetch`만 사용 —
  `lib/design/figma-generator.ts`의 토큰/`fetchFn` 주입 관례 재사용). AI Generate(Website Builder)
  성공 직후 GitHub Repo 생성→Commit→Push→Vercel Project 생성→GitHub 연결→Production Deploy→
  `WebsiteRecord`에 결과 저장까지 자동 수행, 실패 시 이미 생성된 외부 리소스를 역순 롤백. 토큰이
  `commandEngine.execute()`의 로그(명령 문자열 전체 기록)에 남지 않도록 git push는 별도의 최소
  spawn 실행기로 분리했고, push 대상 URL도 `.git/config`에 영구 기록하지 않음(호출 1회의 인자로만
  존재). `GITHUB_TOKEN`/`VERCEL_TOKEN`이 이 환경에 없어 실제 계정으로 왕복 검증은 못했음 — 미설정
  시 가짜 URL을 만들지 않고 `WebsiteRecord.deploymentStatus="NotConfigured"`로 명시적으로 스킵.
  `lib/aiJobs/worker.ts`는 `executeJob()`/상태 전이 로직 무변경, `processJob()` 끝에 격리된 후속
  호출 1줄만 추가(배포 실패가 이미 성공한 AiJob을 되돌리지 않음). `lib/audit/log.ts`에
  `deployment.*` 8개 액션 추가(`app/developer/{audit-log,errors}/page.tsx` 라벨/톤/필터 맵 갱신).
  신규 테스트 49개(github/vercel 클라이언트 fetch mock, git 클라이언트는 fake runner unit + 실제
  git 서브프로세스 1건, deployment pipeline 성공/실패별 롤백 범위, aiJobs worker 트리거 조건).
  `npx tsc --noEmit`·`npm run build`·`npx eslint .` 전부 통과, `npm test` 73 files/564 tests
  전부 통과(신규 포함, 회귀 없음). 상세는 `PHASE3_REPORT.md`
- **AI Business OS Rewiring Phase 1/2/4 — `/api/external/inquiries` 의존 제거 + 내부 재배선**(2026-07-24) —
  선행 조사(아래 "✅ 해소됨" 섹션)에서 `CHATBOT_API_KEY`가 Production에 한 번도 설정된 적이 없어
  cnbiz.ai.kr 챗봇 연동이 실사용된 증거가 없음을 확인. 신규 `POST /api/inquiries`
  (`app/api/inquiries/route.ts`)가 기존 `createInquiry()`·`generateAnalysis()`·
  `findOrCreateClientByEmail()`·`createWebsiteOrder()`·`createAiJob()`·`notifyAdminOfNewInquiry()`를
  그대로 재사용(새 비즈니스 로직 없음), 단 AiJob은 자동 실행하지 않고 `Queued`로만 생성. `lib/auth/rbac.ts`에
  `UNGATED_EXACT_ROUTES`(method+path 정확히 일치하는 예외) 신설해 `POST /api/inquiries`만 비게이팅,
  `GET /api/inquiries`·`PATCH /api/inquiries/[id]`는 그대로 developer 게이팅 유지. cnbiz.kr
  `/contact` 폼 복원(`app/contact/page.tsx`, `components/sections/ContactForm.tsx`, `next.config.ts`
  리다이렉트 목록에서 제거 — `/request`는 유지). `/developer/inquiries/new`의 "AI 분석 시작" TODO를
  위 라우트 호출로 교체(이메일 필드 추가). `/developer/inquiries/[id]`의 기존 Job 실행 버튼이
  Queued 상태에서 "승인 및 생성"으로 라벨만 변경되어 관리자 승인 게이트 역할을 겸함(새 코드 없음,
  기존 `POST /api/ai-jobs/[id]/run` 그대로). `app/api/external/inquiries/**`·`lib/auth/apiKey.ts`·
  `.env.example`의 `CHATBOT_API_KEY`는 삭제하지 않고 `@deprecated` 주석만 추가(하위 호환).
  `npx tsc --noEmit`·`npm run build`·`npx eslint .` 전부 통과, `npm test` 68 files/510 tests
  전부 통과. 상세는 `REWIRING_REPORT.md`
- **문의 이메일 알림 로깅 보강**(2026-07-22) — `lib/contact/email/index.ts`에 `CONTACT_EMAIL_PROVIDER`가 `resend`가 아니거나 미설정일 때 noop provider로 폴백됨을 알리는 경고 로그 추가, `lib/inquiries/notify.ts`의 관리자 알림 성공/실패 로그에 `inquiry.id`를 포함하도록 개선(문제 추적 용이성 향상, 로직 변경 없음). `packages/cli/README.md`(신규, CLI 개요·설치·주요 명령 안내)·`packages/cli/src/templates/agent/examples.md`(신규, Agent 스캐폴딩 템플릿의 예시 섹션) 작성
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

1. **`GITHUB_TOKEN`/`GITHUB_OWNER`/`VERCEL_TOKEN`/`VERCEL_TEAM_ID` 발급·설정 + 실 계정 1회 왕복 검증**(신규, 최우선) — Phase 3 배포 파이프라인이 지금은 매번 `NotConfigured`로 스킵된다. 토큰 설정 후 샘플 Inquiry 1건을 승인해 GitHub 저장소·Vercel 프로젝트·배포 URL이 실제로 만들어지는지 확인(`PHASE3_REPORT.md` "확인 필요" 참고)
2. **cnbiz.ai.kr이 실제로 이 시스템과 연동해야 하는지 최종 확인** — Rewiring 조사 결과 지금까지 실사용 증거가 없었음이 확인됐으나, cnbiz.ai.kr이 향후 실제로 연동할 계획이라면 `@deprecated`로 남겨둔 `/api/external/inquiries`·`CHATBOT_API_KEY`를 언제 완전히 제거할지 결정 필요. 연동 계획이 없다면 별도 커밋으로 제거
3. **기술 견적서 / 기능 명세서 / 프로젝트 타임라인 생성** — AI Analysis Engine의 `AIAnalysisResult`를 입력으로 사용하는 새 AiJobType(또는 별도 서비스) 설계·구현
4. **실제 AI Provider 연결** — 이 환경엔 `packages/cli`가 지원하는 5개 Provider 중 하나도 설정되어 있지 않음(`.env.local` 2곳·로컬 Ollama 전부 확인). 하나라도 연결되어야 AI Analysis Engine의 진짜 판단 경로(현재는 결정론적 폴백만 동작 확인됨)를 검증할 수 있음
5. **`/request`도 `/contact`처럼 내부 처리로 전환할지 결정** — `/contact`는 복원했지만 `/request`는 아직 cnbiz.ai.kr로 308 redirect 중
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