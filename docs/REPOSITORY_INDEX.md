# AI Business OS Repository Index

> 생성일: 2026-07-14 (최종 갱신: 2026-07-15 — Design Automation Phase 2 반영)
> 이 문서는 저장소의 **현재 소스 코드**만을 근거로 작성되었다.
> **v1.0.0 릴리스 준비 클린업(2026-07-14)**: 아래에서 "제거 대상"으로 반복 언급되던 `AI-Web-Master/`(broken gitlink)·`docs.zip`·`docs_extract/`·`tree.txt`/`structure.txt`/`apps-tree.txt`/`packages-tree.txt`/`typescript-files.txt`·`test-project/`·`backup.bat`/`start-wor.bat`·구 감사 문서 14종(`docs/*_AUDIT.md`, `PROJECT_STATUS*.md`, `TODO_CURRENT.md` 등)을 실제로 `git rm`했다. 이 문서 본문 중 이 파일들의 존재를 전제로 한 서술은 **이력(과거 상태 설명)으로만** 남겨두고, 실제 처리 결과는 각 섹션과 `docs/RELEASE_CHECKLIST.md`에 반영했다. `docs/08_PLANS/상가분양센터/`(별도 고객사 자료로 추정)는 소유권 미확인으로 이번에도 삭제하지 않았다. 상세 내용은 `Documentation`·`Remaining TODO` 섹션과 `docs/RELEASE_CHECKLIST.md`·`docs/RELEASE_NOTES_v1.0.md` 참고.

---

## Release Status — v1.0.0

**전체 판정: ✅ Release Candidate 준비 완료**

| 검증 | 결과 |
|------|------|
| `npx tsc --noEmit` | ✅ 통과 |
| `npm run build`(루트) | ✅ 통과 |
| `npm run build`(`apps/cnbiz-web`) | ✅ 통과 |
| `npm run lint` | ✅ 통과(0 errors, 0 warnings) |
| `npm test`(Vitest) | ✅ 47 files / 333 tests 전부 통과 (AI Provider Integration v1.1 17개 + Production Validation Timeout 2개 + Operations & Observability v1.1 20개 + Design Automation Phase 1 21개 + Phase 2 25개 + Phase 3 25개 + Phase 4 신규 32개 포함) |

세부 근거는 `docs/RELEASE_CHECKLIST.md`(클린업·자동 검증)와 `docs/RELEASE_NOTES_v1.0.md`(신규 기능·Known Issues)를 참고. 아래 모듈별 섹션의 `Status` 표기는 이 릴리스 시점 기준으로 유지되며, 위 검증 수치는 AI Provider Integration v1.1·Production Validation·Operations & Observability v1.1·Design Automation Phase 1·Phase 2·Phase 3·Phase 4(`## Design Automation Phase 4` 참고) 반영 이후 재실행한 결과다.

---

## Core Platform

**Status: ✅ Implemented**

"Development OS" — 루트 Next.js 16 앱(`app/`, `lib/`, `components/`). 로컬 개발 워크플로(Terminal·Workspace·GitHub·AI·Logs·Settings 관리)를 제공하는 자체 애플리케이션.

- Description: Terminal 명령 실행, Workspace(실제 폴더) 생성/전환, Git 상태 조회/커밋, AI 도구(Claude Code/Cursor) 상태 확인, 이벤트 로그 조회, 설정(Theme/Git/AI/Workspace) 관리를 제공하는 Server+Client Component 혼합 Next.js 앱.
- Evidence:
  - `app/layout.tsx`, `app/page.tsx`, `app/developer/layout.tsx`
  - `lib/terminal/server.ts`(`executeShellCommand`), `lib/terminal/client.ts`
  - `lib/workspaces/registry.ts`
  - `lib/devserver/manager.ts`, `lib/commandEngine/engine.ts`
  - `lib/settings/store.ts`
  - `components/developer/*`(`PageHeader.tsx`, `Card.tsx`, `Badge.tsx`, `StatusMessage.tsx`, `DevServerManagerCard.tsx`, `DeveloperNav.tsx`, `UiMapExplorer.tsx`)
  - 별도 하위 프로젝트: `apps/cnbiz-web`(CNBIZ 고객사 홈페이지 실 배포물, `cnbiz.kr`) — `apps/cnbiz-web/app/{page,about,services,portfolio,contact}/page.tsx`, `apps/cnbiz-web/app/api/contact/route.ts`, `apps/cnbiz-web/app/sitemap.ts`, `apps/cnbiz-web/app/robots.ts`

---

## CLI Commands

**Status: ✅ Implemented**

`@ai-business-os/cli`(`packages/cli`, bin명 `ai`, package version 1.1.0) — Commander 기반 CLI. `bin/ai.js`가 `dist/index.js`(빌드 결과, `src/index.ts` 컴파일)를 실행.

- Description: 아래 명령이 `packages/cli/src/index.ts`에 전부 등록되어 있음(인자 없이 `ai` 실행 시 대화형 메뉴로 진입).
  - `ai menu` — 대화형 메뉴(State 기반 SessionManager)
  - `ai project` — 최근 프로젝트 런처
  - `ai devmode` — VS Code + dev 서버 + Visual Editor 연결
  - `ai deploy` — 브랜치 확인 후 push
  - `ai register` — 프로젝트 레지스트리 등록
  - `ai create` — Agent/Workflow/Skill 스캐폴딩
  - `ai run <agent>` — Agent Runtime 실행
  - `ai workflow`, `ai memory`, `ai orchestrator`, `ai provider`(확장), `ai tools`, `ai website`, `ai marketplace`, `ai prompt`(신규), `ai task`(신규) — 서브커맨드 그룹
  - `ai init`, `ai add`, `ai install`, `ai doctor`, `ai search`, `ai remove`, `ai update`, `ai publish`, `ai chat`(신규), `ai models`(신규)
  - AI Platform v1(`ai chat`/`ai prompt`/`ai provider set-key`·`usage`/`ai models`/`ai task`) 상세는 `## AI Platform v1` 참고
- Evidence:
  - `packages/cli/src/index.ts`(전체 명령 등록부)
  - `packages/cli/bin/ai.js`
  - `packages/cli/src/commands/*.ts`, `packages/cli/src/commands/menu/*.js`, `packages/cli/src/session/*.js`(SessionManager, State 기반 메뉴)
  - `packages/cli/package.json`(`bin.ai`, version 1.1.0)
  - `packages/cli/install.ps1`, `scripts/setup.ps1`(전역 설치 스크립트)

---

## Agent Runtime

**Status: ✅ Implemented (two parallel implementations)**

두 개의 독립된 Agent Runtime이 존재한다 — 서로 다른 애플리케이션(Development OS vs CLI)에 속함.

- Description 1 — Development OS Agent Service(`lib/agents/`): Shell·Claude Code·Cursor 3종 Agent, Task Queue(Queued/Running/Success/Failed/Cancelled, `AbortController` 기반 실제 취소), Event Bus 연동.
  - Evidence: `lib/agents/registry.ts`, `lib/agents/taskQueue.ts`, `lib/agents/session.ts`, `lib/agents/implementations/{shellAgent,claudeCodeAgent,cursorAgent}.ts`, `app/api/agents/*`
- Description 2 — CLI Agent Runtime(`packages/cli/src/runtime/`): Provider(Anthropic/OpenAI/Gemini/Ollama) 연동 실행기. Provider 미설정 시 결정론적 시뮬레이션으로 폴백.
  - Evidence: `packages/cli/src/runtime/{executor,runtime,loader,context,types}.ts`, `packages/cli/src/providers/{manager,registry,anthropic,openai,gemini,ollama}.ts`, `packages/cli/src/commands/run.ts`

---

## Workflow Engine

**Status: ✅ Implemented (two parallel implementations)**

- Description 1 — Development OS Workflow Engine(`lib/workflows/`): 6종 Step(Create Workspace·Run Terminal·Initialize Git·Execute AI Prompt·Commit·Push)을 조합한 Run 실행, Pause/Resume/Cancel, Retry.
  - Evidence: `lib/workflows/engine.ts`, `lib/workflows/registry.ts`, `lib/workflows/types.ts`, `app/api/workflows/*`, `app/api/projects/bootstrap/route.ts`
- Description 2 — CLI Workflow Engine(`packages/cli/src/workflow/`): Agent 체이닝 기반 다단계 파이프라인 실행기(Website Builder의 8단계 Planning 파이프라인이 이 엔진 위에서 동작).
  - Evidence: `packages/cli/src/workflow/{executor,runtime,loader,validator,types}.ts`, `packages/cli/src/commands/{workflow,workflow-create,workflow-run}.ts`, `packages/cli/src/website/workflow.ts`

---

## Orchestrator

**Status: ✅ Implemented**

CLI 전용 기능(`packages/cli/src/orchestrator/`). Workflow Run의 상태(status.json)·이력(history.json)·워크플로별 잠금(lock/stop 파일)을 `.runtime/orchestrator/`에 파일 기반으로 관리.

- Description: `ai orchestrator` 서브커맨드로 실행 상태 조회·이력 확인·중지 플래그 제어. Development OS에는 대응 기능 없음(루트 `lib/`에는 orchestrator 모듈 없음).
- Evidence: `packages/cli/src/orchestrator/{manager,executor,planner,runtime,scheduler,types}.ts`, `packages/cli/src/commands/orchestrator.ts`

---

## Website Builder v1

**Status: ❌ Not Implemented (superseded, no separate code path remains)**

- Description: `docs/01_PMO/CHANGELOG.md`(2026-07-12 항목)에 따르면 최초 `ai website create`는 "홈페이지 1개(정적 Hero 섹션)"만 생성하는 초기 버전이었다고 기록되어 있으나, 현재 저장소에는 이 구버전에 해당하는 별도 코드가 존재하지 않는다 — 동일한 명령(`ai website create`)이 v2 구현으로 완전히 대체되었다.
- Evidence: 별도 v1 파일/디렉터리 없음(코드 기준 확인). 버전 구분은 변경 이력 문서(`docs/01_PMO/CHANGELOG.md` 2026-07-12)에만 남아 있음.

---

## Website Builder v2

**Status: ✅ Implemented — re-verified end-to-end (Phase 2 audit) — 2026-07-14**

`packages/cli/src/website/` + `packages/cli/src/templates/website/` — `ai website create` 명령. Business Analyst→Site Planner→...→Project Generator 8단계 Agent 파이프라인(Workflow Engine 재사용) + Content Engine으로 11페이지 Next.js 프로젝트를 생성.

- Evidence(진입점): `packages/cli/src/commands/website.ts`, `packages/cli/src/website/builder.ts`(`buildWebsite()`), `packages/cli/src/website/agents.ts`(8-Agent 파이프라인 spec), `packages/cli/src/website/scaffold.ts`(`scaffoldWebsiteProject()`)
- Dashboard v1(2026-07-14)에서 `/developer/websites`가 이 CLI 명령을 `child_process`로 직접 실행하는 UI를 추가함(`## Dashboard` 참고) — 파이프라인 자체는 무변경, 실행 방식만 대시보드에서 트리거 가능해짐. 실제 실행 시 `agents/`·`workflows/website-builder/`·`.runtime/`에 8개 Planning Agent·Workflow 정의가 최초 1회 생성됨(CLI의 기존 동작, Dashboard가 새로 만든 것 아님).
- **"Website Builder v2 Phase 2" 요청(2026-07-14) 처리 내역**: 요청된 7개 카테고리(Multi-page·Design System·Component Generator·SEO·Content Generator·Asset Generator·Deployment) 전부가 이미 아래 하위 섹션대로 구현·문서화되어 있음을 재확인 — 새로 구현한 것은 없음(재구현 시 "기존 아키텍처 재사용" 요구사항과 정면으로 충돌했을 것). 대신 저장소 외부 스크래치 디렉터리에서 `ai website create`를 실제로 실행해 산출물 전체를 감사하고, 그동안 테스트가 없었던 Content Generator(`content.ts`)에 대해서만 신규 테스트를 추가함(아래 `Content Generator` 하위 섹션 참고).
  - 실 검증: 생성된 프로젝트에서 `npm install`→`npm run build`(18개 라우트 전부 정상 생성)→`npm run lint`(경고 0건) 전부 실제 실행해 통과 확인. `{{var}}` 미치환 잔존 없음(JSX 이중 중괄호만 존재, 이전 세션 확인과 동일) 재확인. 이번 회차의 Marketplace v1 작업으로 `packages/cli/src/index.ts`가 크게 바뀌었음에도 Website Builder 파이프라인에는 회귀가 없음을 확인.
  - 검증에 사용한 스크래치 프로젝트는 삭제 완료.

### Website Types

**Status: ✅ Implemented**

- Description: 11개 사이트 타입(`website, landing, portfolio, corporate, agency, dental, hospital, restaurant, shopping, blog, education`)마다 고유 색상 팔레트(Primary/Secondary/Accent)와 카피 어휘(feature/service 제목 등)를 정의. `--site-type`이 목록에 없으면 "website"로 폴백.
- Evidence: `packages/cli/src/website/types.ts`(`WEBSITE_TYPES`, `PALETTES`, `SITE_TYPE_COPY`, `resolveSiteType()`)

### Multi Page

**Status: ✅ Implemented**

- Description: 사이트 타입과 무관하게 항상 Home·About·Services·Products·Pricing·FAQ·Blog·Contact·Privacy·Terms·404 11개 페이지를 고정 생성.
- Evidence: `packages/cli/src/templates/website/app/{page.tsx,about,services,products,pricing,faq,blog,contact,privacy,terms,not-found.tsx}`

### Design System

**Status: ✅ Implemented**

- Description: 원시 토큰(`styles/tokens.ts`)·시맨틱 테마(`styles/theme.ts`)·Tailwind 4 `@theme` 매핑(`styles/theme.css`) 3단 구조. 타입별 팔레트가 `{{colorPrimary}}` 등 템플릿 변수로 주입됨.
- Evidence: `packages/cli/src/templates/website/styles/{tokens.ts,theme.ts,theme.css}`, `packages/cli/src/website/scaffold.ts`(팔레트→변수 매핑)

### Component Generator

**Status: ✅ Implemented**

- Description: Header·Navbar·Footer·Hero·Features·CTA·Testimonials·Pricing·FAQ·ContactForm·Newsletter·JsonLd(+공용 Container) 12종 재사용 컴포넌트를 `generateFromTemplate()`(Generator 엔진)로 스캐폴딩.
- Evidence: `packages/cli/src/templates/website/components/*.tsx`, `packages/cli/src/generators/website.ts`(`generateWebsiteProject()`), `packages/cli/src/generators/template.ts`(`generateFromTemplate()`, `.svg` 포함 변수 치환 확장자 목록)

### SEO

**Status: ✅ Implemented**

- Description: `robots.ts`·`sitemap.ts`(11개 라우트)·`opengraph-image.tsx`(next/og 동적 소셜 이미지)·`icon.svg`·`manifest.json`·페이지별 Metadata·Organization JSON-LD(`JsonLd.tsx`).
- Evidence: `packages/cli/src/templates/website/app/{robots.ts,sitemap.ts,opengraph-image.tsx,icon.svg}`, `packages/cli/src/templates/website/public/manifest.json`, `packages/cli/src/templates/website/components/JsonLd.tsx`

### Content Generator

**Status: ✅ Implemented**

- Description: Provider Layer(`ProviderManager.complete()`)를 재사용해 페이지별 카피(헤드라인·기능·후기·플랜·FAQ·블로그 요약 등)를 생성. Provider 미설정/실패 시에도 예외 없이 결정론적 기본 콘텐츠로 폴백 — "템플릿 우선, 향후 LLM 연동 준비된 아키텍처"(`generateSiteContent()`가 이미 `ProviderManager.complete()`를 호출하고 실패 시에만 `buildDefaultContent()`로 폴백하는 구조이므로 추가 배선 없이 Provider만 설정하면 활성화됨).
- Evidence: `packages/cli/src/website/content.ts`(`buildDefaultContent()`, `generateSiteContent()`), `packages/cli/src/providers/manager.ts`(`ProviderManager.complete()`), `packages/cli/src/prompt/renderer.ts`
- 테스트(신규, 2026-07-14): `tests/website/content.test.ts` — `buildDefaultContent()`가 11개 사이트 타입 전부에서 `SiteContent`의 모든 섹션(features 3·testimonials 2·values 3·services 4·products 3·plans 3·faq 5·blog 3)을 유효하게 채우는지, `generateSiteContent()`가 Provider 미설정 시 `simulated:true` + `buildDefaultContent()`와 동일한 결과로 폴백하는지 검증(15개 테스트). 이전에는 `content.ts`에 테스트가 전혀 없었음.

### Asset Generator

**Status: ✅ Implemented**

- Description: 브랜드 이니셜·팔레트 색상이 반영된 로고(`logo.svg`)·파비콘(`icon.svg`)·플레이스홀더 이미지(wide/square/portrait) 3종을 템플릿 변수 치환으로 생성.
- Evidence: `packages/cli/src/templates/website/public/{logo.svg,images/placeholder-wide.svg,images/placeholder-square.svg,images/placeholder-portrait.svg}`, `packages/cli/src/templates/website/app/icon.svg`

### Deployment

**Status: ✅ Implemented (config files only, no automated deploy execution)**

- Description: `.env.example`(`NEXT_PUBLIC_SITE_URL` 등)·`vercel.json`·확장된 `README.md`를 생성. 실제 배포(Vercel CLI 호출 등)를 CLI가 수행하지는 않음 — 산출물을 수동/CI로 배포하는 방식.
- Evidence: `packages/cli/src/templates/website/.env.example`, `packages/cli/src/templates/website/vercel.json`, `packages/cli/src/templates/website/README.md`

---

## Dashboard

**Status: ✅ Implemented — Dashboard v1 (Development OS scope) — 2026-07-14**

- Description: `/developer`가 실제 운영 현황을 보여주는 Dashboard Home(위젯 6종)으로 개편되었고, `/developer` 하위 10개 모듈 전체가 인증 보호 하에 동작한다. 기존 Workspace·Terminal·GitHub·Settings·Logs·UI Map Explorer는 그대로 재사용하고, AI Manager는 실데이터 기반으로 재작성했으며, Workflow Center·Website Builder·Marketplace·Health 4개 모듈을 신규 구현했다. `/projects`에는 Delete Project를 추가해 CRUD를 완성했다.
- 모듈별 상태:
  - **Dashboard Home**(`/developer`) — Projects·Running AI Tasks·Active Workflows·Marketplace Packages·Provider Status·Token Usage·Metrics·Recent Activity·System Health 9개 위젯(Metrics는 Operations & Observability v1.1 신규, `## Operations & Observability v1.1` 참고). 전부 기존/신규 API를 그대로 소비(`components/developer/dashboard/*Widget.tsx`).
  - **Project Manager**(`/projects`) — 기존 List/Recent/Open/Create/Details에 Delete 추가(`lib/projects/registry.ts`의 `deleteProject()`, `DELETE /api/projects/[id]`).
  - **AI Workspace**(`/developer/ai`) — 기존에는 Ollama/ChatGPT 카드가 하드코딩된 가짜 상태였음. `lib/providers/status.ts`(신규)로 Claude Code/Cursor(기존 `lib/agents/registry.ts` `isAvailable()` 재사용)·Local AI(Ollama, 실제 `fetch` 연결 확인)·OpenAI/Gemini 5종 모두 실제 상태로 교체. OpenAI/Gemini는 최초엔 env var 존재 여부만으로 "Configured"를 판정했으나, **AI Provider Integration v1.1(2026-07-14, `## AI Provider Integration v1.1` 참고)에서 실제 모델 목록 엔드포인트를 호출하는 라이브 헬스체크로 교체** — 키가 없으면 "Not Configured"(호출 없음), 키가 있고 호출이 성공하면 "Configured"(+ 실제 모델명), 키가 있어도 호출이 실패하면 "Unreachable"을 반환한다(`packages/cli`의 `{openai,gemini}.validate()`와 동일한 "실제로 호출해본다" 원칙이나, 이 위젯은 페이지 로드마다 그려지므로 CLI를 서브프로세스로 띄우지 않고 Ollama처럼 짧은 타임아웃의 직접 `fetch`만 사용).
  - **Website Builder**(`/developer/websites`, 신규) — `ai website create` CLI를 `lib/commandEngine/engine.ts`의 `execute()`로 실제 실행(child process, 새 npm 의존성 없음). 생성 이력은 `lib/websites/registry.ts`(`lib/data/websites.json`)에 기록. 실제 E2E 검증: 8단계 Planning 파이프라인 실행 → `.generated-websites/<slug>`에 완전한 Next.js 프로젝트 생성 확인.
  - **Workflow Center**(`/developer/workflows`, 신규) — 신규 백엔드 없음. 기존 `/api/workflows`·`/api/workflows/runs*`(run/pause/resume/cancel/retry)를 그대로 소비하는 UI만 추가.
  - **GitHub**(`/developer/github`) — 변경 없음. 기존 구현이 Branch/Commit/Status/Push/Pull을 이미 충족.
  - **Marketplace**(`/developer/marketplace`) — Dashboard v1에서는 자체 설치 추적 JSON(`lib/data/marketplace-installed.json`)이었으나, Marketplace v1(2026-07-14, `## Marketplace` 참고)에서 실제 CLI 패키지 시스템과 직접 통신하도록 전면 재구성됨. 4개 화면(Browse/Installed/Updates/Package Details)으로 확장.
  - **Settings**(`/developer/settings`) — Profile·Authentication 카드 신규 추가(`useAuth()` 재사용), 기존 AI 카드에 `/api/providers`(AI Workspace와 동일 엔드포인트, 로직 재사용) 요약 링크 추가. Theme(General 하위)·Workspace는 기존 그대로 요건 충족.
  - **Logs**(`/developer/logs`) — 기존 Terminal/Git/AI/System 4개 필터에 cross-cutting "Errors" 필터 1개만 추가(백엔드 변경 없음).
  - **Health**(`/developer/health`, 신규) — `lib/health/checks.ts`(신규)가 Git Status(기존 `lib/commandEngine/commands.ts`의 `git:status` 카탈로그 재사용)·Disk Usage(Node 내장 `fs.statfsSync`, 신규 의존성 없음)는 실시간으로, Build/Tests/Coverage는 수동 "Run Now" 버튼으로 실제 `npm run build`/`test`/`coverage`를 실행(동일 command engine 재사용)해 `lib/data/health-checks.json`에 캐시. Coverage 비율 파싱을 위해 `vitest.config.ts`의 `coverage.reporter`에 `"json-summary"` 추가. **Operations & Observability v1.1(2026-07-14)에서 CPU·Memory·Node version·Server Uptime·Active Sessions 5개 항목 추가**(`## Operations & Observability v1.1` 참고, 기존 Git/Disk/Build/Tests/Coverage는 무변경).
- Evidence: `app/developer/{page,workspace,terminal,github,ai,workflows,websites,marketplace,logs,health,settings,ui-map}/page.tsx`, `app/projects/{page.tsx,[id]/page.tsx}`, `components/developer/dashboard/*.tsx`, `lib/{providers,websites,marketplace,health}/*.ts`, `app/api/{providers,websites,marketplace,health}/**/route.ts`, `app/api/projects/[id]/route.ts`(DELETE), `components/developer/DeveloperNav.tsx`(Design Automation Phase 1 이후 18개 항목)
- 테스트: `tests/{projects,providers,websites,marketplace,health}/*.test.ts`(신규, 총 27개 테스트) — 모두 `fs.mkdtempSync` 임시 디렉터리 격리 또는 순수 함수 검증, 실제 `npm run build`/`test`(느리고 재귀적)나 실제 CLI 서브프로세스는 유닛 테스트에서 실행하지 않음(수동 curl E2E로 별도 확인).
- 인증: 모든 신규 라우트는 이미 존재하는 `/developer/**` 보호 범위 안에 들어가므로 `proxy.ts` 변경 없이 자동으로 보호됨(확인 완료).
- 별도 대시보드는 CLI 쪽에는 없음(CLI는 터미널 메뉴 UI만 제공, `packages/cli/src/session/`).

---

## Marketplace

**Status: ✅ Implemented — Marketplace v1 (working package management system) — 2026-07-14**

- Description: 이전 회차(Dashboard v1)에서 `remove`/`update` 명령이 실제로는 동작하지 않는 것으로 확인되었던 문제를 근본적으로 수정하고, Dashboard가 자체 "설치 추적" JSON 대신 실제 패키지 시스템과 직접 통신하도록 전면 재구성했다. CLI(`packages/cli/src/marketplace/*`)가 유일한 구현이며, Dashboard는 그 CLI를 `--json` 모드로 호출하는 얇은 브리지일 뿐 로직을 재구현하지 않는다.
- **발견하고 고친 버그(2건)**: `remove.ts`는 `<projectRoot>/packages/<name>`을 찾았지만 `install.ts`는 실제로 `<cwd>/agents|workflows|skills/<name>`에 설치한다 — 한 번도 서로 맞물려 동작한 적이 없었다. `update.ts`는 `<projectRoot>/marketplace/<name>`(평평한 경로)을 읽었지만 `publish`가 실제로 쓰는 경로는 `marketplace/<type>s/<name>`이다. 둘 다 `discoverLocalPackages()`(실제 설치 위치를 스캔) + `LocalMarketplaceProvider`(신규 `uninstall()` 메서드 포함) 기반으로 재작성했다.
- **버전 정보**: 별도 상태 파일 없이, 설치된 패키지 폴더 자체의 `manifest.json`(install()이 통째로 복사)이 "설치된 버전"의 기록이다. `getInstalledPackages()`가 이를 마켓플레이스에 게시된 최신 버전과 비교해 `updateAvailable`을 계산한다.
- **CLI**: `ai marketplace {install,remove,update,search,publish}` 신규 추가(기존 flat `ai install`/`ai search`/`ai remove`/`ai update`/`ai publish`는 동일 핸들러를 그대로 호출하도록 유지, 두 표면 모두 버그 수정 혜택을 받음). 전 명령에 `--json` 지원 추가. `update`는 이름 없이 실행하면 설치된 패키지 + 업데이트 가능 여부 목록(list mode)을, `--all`이면 업데이트 가능한 전부를 일괄 갱신한다.
- **Dashboard**: `/developer/marketplace`(Browse: 검색+타입 필터+Install), `/developer/marketplace/installed`(Installed: 버전·Remove·Update), `/developer/marketplace/updates`(Updates: 업데이트 가능 목록+Update All), `/developer/marketplace/[type]/[name]`(Package Details: manifest 전체+설치 상태+Install/Remove/Update). 전부 `lib/marketplace/registry.ts`(재작성)가 `node packages/cli/dist/index.js marketplace ... --json`을 실행(`lib/commandEngine/engine.ts`의 `execute()` 재사용, Website Builder 대시보드 연동과 동일 패턴)한 결과를 그대로 표시 — Dashboard 쪽에 패키지 로직이 전혀 없다.
- **Package validation 강화**: `manifest.ts`의 `validateManifest()`에 패키지 이름 안전 문자 검증(`/^[a-z0-9][a-z0-9-_]*$/i`)을 추가 — 검증되지 않은 이름이 `path.join(root, typeDir, name)`에 그대로 들어가는 경로 조작(path-traversal) 가능성을 막는다.
- Evidence:
  - CLI 핵심: `packages/cli/src/marketplace/{types,manifest,index}.ts`(name 검증, `AMBIGUOUS_PACKAGE` 에러 코드, `getInstalledPackages()` 신규), `providers/{types,local}.ts`(`uninstall()` 신규)
  - CLI 명령: `packages/cli/src/commands/{install,remove,update,search,publish}.ts`(핵심 로직을 `console.log`/`process.exit` 없는 순수 함수로 분리 — `resolveInstallEntry`/`installPackage`/`resolveInstalledPackage`/`removePackage`/`updatePackage`/`updateAllPackages`/`publishPackages`), `packages/cli/src/commands/marketplace.ts`(신규, `buildMarketplaceCommand()`), `packages/cli/src/index.ts`(등록)
  - Dashboard 브리지: `lib/marketplace/registry.ts`(재작성, CLI shell-out), `app/api/marketplace/{route.ts,installed/route.ts,publish/route.ts,[type]/[name]/route.ts}`(재작성/신규), `app/developer/marketplace/{page.tsx,installed/page.tsx,updates/page.tsx,[type]/[name]/page.tsx}`, `components/developer/marketplace/MarketplaceTabs.tsx`, `components/developer/dashboard/MarketplaceWidget.tsx`(실데이터로 갱신)
  - 테스트(신규, 49개): `tests/marketplace-cli/{manifest,local-provider,commands}.test.ts`(38개, CLI 로직을 `packages/cli/src/**/*.ts`에서 직접 import, subprocess 미사용), `tests/marketplace/{registry,cli-bridge}.test.ts`(11개, `execute()` mock으로 브리지 함수의 명령 조합·JSON 파싱·에러 전파 검증)
  - 검증: CLI `ai marketplace publish/search/install/update/remove --json` 스크래치 디렉터리에서 전체 라이프사이클 실행 확인(설치된 manifest.json에 버전 기록됨, update가 no-op→실제 적용까지 정확히 동작), Dashboard도 로그인 상태에서 동일 라이프사이클(publish→search→install→details→update→remove)을 실제 HTTP 요청으로 재확인. 테스트에 사용한 스크래치 패키지·`marketplace/index.json`·`marketplace/agents/e2e-dashboard-test/`·인증 테스트 계정은 검증 후 전부 삭제(사전에 `git ls-files`로 각 경로가 미추적임을 확인한 뒤 삭제).
- ~~여전히 남은 것: ... count: 0~~ — **해결됨(Production Validation, 2026-07-14)**: `agents/changelog-writer`를 실제로 생성·게시해 `agents` 카테고리 `count`가 `1`이 됨(`marketplace/manifest.json`). 나머지 4개 카테고리(prompts/skills/templates/workflows)는 여전히 `count: 0` — 카탈로그를 더 채우는 것은 `## Recommended Next Tasks`에 남겨둔다. 상세는 `## Production Validation`·`docs/PRODUCTION_VALIDATION.md` 참고.

---

## AI Platform v1

**Status: ✅ Implemented — AI-first operating system layer — 2026-07-14**

- Description: `packages/cli/src/providers/*`(4개 vendor: Anthropic/OpenAI/Gemini/Ollama)와 `lib/prompts/*`·`lib/agents/taskQueue.ts`(Next.js Task Queue)는 이미 실존했지만, Chat/Code/Content 실행 UI·5번째 vendor(OpenRouter)·API Key 쓰기 경로·실제 연결 확인(`.validate()`)·Task 재시도·Prompt 카테고리/변수/미리보기·CLI 노출·토큰 사용량 추적이 전부 빠져 있었다. 이번 작업은 그 빈틈만 채웠고, 기존에 이미 동작하던 `ProviderManager.complete()`(resolve→chat→simulate 폴백)·Task Queue·Prompt 버전 관리는 그대로 재사용했다.
- **AI Provider Manager**:
  - `packages/cli/src/providers/openrouter.ts`(신규, OpenAI 호환 API) — `registry.ts`의 `FACTORIES`·`manager.ts`의 `DEFAULT_CONFIG`에 5번째 vendor로 등록.
  - `ProviderManager.setProviderConfig(id, patch)`(신규) — API Key/host 쓰기 경로(`.runtime/config/providers.json` 부분 갱신). 구현 중 발견한 실제 버그: `readProvidersConfig()`가 파일이 없을 때 모듈 스코프의 `DEFAULT_CONFIG` 객체 리터럴을 **그대로(참조)** 반환하고 있어, 이 새 쓰기 경로(및 기존 `setDefaultProvider()`도 동일)가 그 반환값을 직접 mutate하면 프로세스 전역의 `DEFAULT_CONFIG` 자체가 영구 오염되는 문제가 있었다 — `structuredClone()`으로 수정(테스트로 실제 재현·확인).
  - `{openai,anthropic,gemini,openrouter}.validate()` — 기존 "API 키 존재 여부만 확인"에서 자기 자신의 `.models()`를 실제로 호출하는 라이브 헬스체크로 교체(Ollama의 기존 방식과 동일한 패턴으로 통일). 4개 vendor의 `chat()` 응답에서 `usage`(input/output 토큰) 파싱 추가.
  - `ProviderManager.complete()` 내부에서 실제 성공 호출마다 `.runtime/usage.json`에 토큰 사용량 기록(신규 `providers/usage.ts`) — Website Builder Content Engine·Agent Runtime·`ai chat`·`ai prompt execute`를 포함한 모든 호출자가 이 한 지점을 공유하므로 별도 계측 불필요.
  - `ai provider set-key <id> <key>`·`ai provider usage [--json]`(신규), `ai provider list`에 `--json` 추가, `ai models [provider]`(신규 top-level, `ai provider models`와 조회 로직 공유).
- **Prompt Library**: `PromptRecord.category`·`PromptVersion.variables`(신규 필드, 레거시 레코드는 읽을 때 `category: "General"`로 자동 보정). `lib/prompts/render.ts`(신규, `{{key}}` 치환 — CLI의 `prompt/renderer.ts`와 동일한 정규식을 미리보기 전용으로 의도적 복제)·`POST /api/prompts/[id]/preview`(신규, task 생성 없이 렌더링만). `/developer/prompts`(신규) — 카테고리 필터·생성 폼·버전 이력·미리보기·Agent 실행(기존 `/api/prompts/[id]/execute` 재사용). CLI 쪽은 `packages/cli/src/promptLibrary/registry.ts`(신규, 동일한 `<cwd>/lib/data/prompts.json`을 읽고 써서 `ai prompt`와 Dashboard가 실제로 데이터를 공유 — Next 앱 모듈을 CLI로 cross-import하지 않기 위한 의도적 소규모 복제)와 `ai prompt {list,show,create,preview,execute}`(신규).
- **AI Task Runner**: `taskQueue.retry(id)`(신규) — Failed 상태의 Task만 동일 agentId/prompt/context로 재-enqueue(새 실행 로직 없음, 원본 Task는 불변). `POST /api/agents/tasks/[id]/retry`(신규, 기존 `.../cancel` 라우트와 동일 패턴). `/developer/ai/tasks`(신규) — 전체 이력 테이블 + Cancel/Retry. CLI는 Dashboard의 `taskQueue`가 Next.js 서버 프로세스 in-memory 상태라 별도 OS 프로세스인 CLI가 관찰·제어할 수 없다는 실제 아키텍처 경계 때문에 자체 원장(`packages/cli/src/tasks/ledger.ts`, `.runtime/tasks.json`)을 사용 — `ai chat`/`ai prompt execute` 호출마다 기록되고, `ai task {list,show,retry}`(신규)가 이를 대상으로 동작. CLI 재시도는 동기 호출이라 "취소/진행률"은 의도적으로 없음(정직하게 생략, 위장하지 않음).
- **AI Workspace**(`/developer/ai`): 기존 Provider Status 그리드는 그대로 두고 "AI Studio" 섹션 신규 추가 — Chat/Code Generation/Content Generation 3개 프리셋(system prompt만 다르고 동일한 UI·동일한 API 호출, 3중 구현 아님)을 탭 전환(Marketplace의 탭 패턴 재사용)으로 제공. `POST /api/ai/chat`(신규, `node packages/cli/dist/index.js chat --json`을 shell-out, Website Builder·Marketplace와 동일한 bridge 패턴) ← `ai chat [message] [--system] [--provider] [--json]`(신규, `ProviderManager.complete()` 재사용). "Website Generation"/"Workflow Execution"은 각각 이미 존재하는 `/developer/websites`·`/developer/workflows` 페이지로의 quick-link 카드로 처리(재구현 없음).
- **Dashboard Integration**: `ProviderStatusWidget`(신규, 기존 `/api/providers` + 신규 `/api/ai/providers` 병합 — 연결 수·기본 provider 표시. "Model Status" 요구사항은 별도 위젯을 만들지 않고 여기 접힘, 의도적 스코프 축소)·`TokenUsageWidget`(신규, `/api/ai/usage`) → `app/developer/page.tsx` 그리드에 추가. `RunningTasksWidget`/`RecentActivityWidget`은 이미 "Active AI Tasks"/"Recent AI Activity" 요구사항을 충족하고 있어 변경하지 않음.
- **CLI 최종 명령 표면**: `ai chat`, `ai prompt {list,show,create,preview,execute}`, `ai provider {list,use,test,models,set-key,usage}`(확장), `ai models [provider]`(신규), `ai task {list,show,retry}`(신규) — 전부 `packages/cli/src/index.ts`에 기존과 동일한 방식(`program.command()`/`program.addCommand(build*Command())`)으로 등록.
- Evidence:
  - Provider: `packages/cli/src/providers/{openrouter,manager,usage,types,openai,anthropic,gemini}.ts`, `packages/cli/src/commands/{provider,models}.ts`
  - Prompt Library: `lib/prompts/{registry,render}.ts`, `app/api/prompts/{route.ts,[id]/route.ts,[id]/preview/route.ts}`, `app/developer/prompts/page.tsx`, `packages/cli/src/promptLibrary/registry.ts`, `packages/cli/src/commands/prompt.ts`
  - Task Runner: `lib/agents/taskQueue.ts`(`retry()`), `app/api/agents/tasks/[id]/retry/route.ts`, `app/developer/ai/tasks/page.tsx`, `packages/cli/src/tasks/ledger.ts`, `packages/cli/src/commands/{chat,task}.ts`
  - AI Workspace/Dashboard: `app/developer/ai/page.tsx`(AI Studio 섹션), `lib/ai/bridge.ts`(신규, shell-out bridge), `app/api/ai/{chat,providers,usage}/route.ts`, `components/developer/dashboard/{ProviderStatusWidget,TokenUsageWidget}.tsx`, `app/developer/page.tsx`
  - CLI 등록: `packages/cli/src/index.ts`
  - 테스트(신규 43개): `tests/ai-platform-cli/{openrouter,provider-config,usage,prompt-library,task-ledger}.test.ts`(23개, CLI 로직 직접 import, subprocess 미사용), `tests/prompts/{registry,render}.test.ts`(11개), `tests/agents/taskQueue-retry.test.ts`(3개, 실제 `shell` Agent로 성공 Task를 만들어 "Success Task는 재시도 불가"를 검증), `tests/ai/bridge.test.ts`(6개, `execute()` mock)
  - 검증: `npx tsc --noEmit`·`npm run lint`(무관한 사전 존재 오류만, 상세는 `## Build Status` 참고)·`npm run build`(루트+CLI)·`npm run test`(188/188) 전부 통과. 실제 E2E: 스크래치 디렉터리에서 `ai provider list/set-key/test`·`ai models`·`ai chat`(provider 미설정 → simulated 폴백 확인, Website Builder와 동일한 graceful-degradation)·`ai prompt` 전체 라이프사이클(create→list→show→preview→execute)·`ai task list/retry`(명시적 `--provider` 요청 실패 → Failed Task 기록 → retry로 새 Task 생성, 원본 불변 확인) 전부 실행 확인. Dashboard 쪽은 실제 로그인 세션으로 `/api/ai/{chat,providers,usage}`·`/api/prompts/[id]/preview`·`/api/agents/tasks/[id]/retry`·`/developer/{ai,ai/tasks,prompts}`(전부 200)·Dashboard Home HTML에 "Provider Status"/"Token Usage" 위젯 렌더링까지 curl로 확인. 검증 중 저장소 루트에 실수로 남을 뻔한 `.runtime/`(CLI가 실제 저장소 cwd로 shell-out될 때 생성됨)과 테스트용 인증 계정(`lib/data/users.json`)은 검증 후 삭제(둘 다 `.gitignore` 대상이라 애초에 git에는 영향 없음, `git status` 재확인 완료).

---

## AI Provider Integration v1.1

**Status: ✅ Implemented — retry, streaming, live Dashboard status — 2026-07-14**

- Description: AI Platform v1(위 `## AI Platform v1`)이 provider 호출을 "한 번 호출하고 성공/실패만 본다"는 수준에 머물러 있던 것을 보강한 후속 작업. 새 provider나 새 실행 경로를 추가하지 않고, 기존 4-vendor 구조(Anthropic/OpenAI/Gemini/Ollama, OpenRouter 포함 5종) 위에 3가지를 추가했다: (1) 일시적 실패에 대한 자동 재시도, (2) OpenAI/Anthropic의 실시간 스트리밍 응답, (3) Dashboard Provider Status의 OpenAI/Gemini 라이브 헬스체크(기존에는 env var 존재 여부만 확인).
- **재시도(retry, 공용 helper)**: `packages/cli/src/providers/provider.ts`의 `providerFetchJson()`/`providerFetchSseStream()`(신규 `providerFetchSseStream`)이 내부적으로 공유하는 `withRetry()` — 지수 백오프(기본 baseDelayMs 300ms, 시도마다 2배 증가)로 최대 `1 + retries`회(기본 retries=2, 총 3회) 시도한다. `isRetryableError()`가 재시도 대상을 판별: `TIMEOUT`(AbortSignal 타임아웃)·`REQUEST_FAILED` 중 상태 코드가 없는 네트워크 레벨 실패·429·5xx만 재시도하고, 401/403/400 등 나머지 4xx는 즉시 던진다(인증·입력 오류를 재시도해봤자 의미가 없기 때문). 모든 vendor 파일(`anthropic/openai/gemini/ollama/openrouter.ts`)이 기존과 동일한 시그니처로 이 helper를 그대로 재사용하므로 vendor별 재시도 로직 중복은 없다.
- **스트리밍**: `AIProvider` 인터페이스에 선택적 `chatStream?(request): AsyncGenerator<ChatStreamChunk>` 추가(`ChatStreamChunk = { delta, done, model?, usage? }`, `packages/cli/src/providers/types.ts`). Anthropic(SSE `content_block_delta`/`message_start`/`message_delta`/`message_stop` 파싱)과 OpenAI(SSE `choices[0].delta.content` + `[DONE]` 파싱)만 구현하고, Gemini/Ollama/OpenRouter는 구현하지 않는다(스트리밍 API가 없거나 이번 범위에서 제외 — `chatStream`이 없으면 호출자가 `chat()`으로 자동 폴백하므로 안전).
  - `providerFetchSseStream()`(신규, `provider.ts`) — `text/event-stream` 응답의 body를 라인 단위로 파싱해 `{event?, data}` 이벤트를 순차 yield하는 공용 helper. 연결 수립(fetch + status 확인)까지만 재시도 대상이고, 스트림이 이미 시작된 이후의 중단은 부분 응답을 감추지 않기 위해 재시도하지 않는다.
  - `ProviderManager.streamComplete(options)`(신규, `manager.ts`) — `complete()`와 동일한 resolve→attempt→simulate 폴백 의미론을 스트리밍으로 재구현. provider가 `chatStream`을 구현하지 않으면(Gemini/Ollama/OpenRouter) 기존 `chat()`을 호출해 결과를 단일 `done:true` 청크로 감싸 yield하므로, 호출자 입장에서는 모든 provider를 항상 스트림 인터페이스로 소비할 수 있다. 명시적으로 요청된 provider(`options.providerId`)가 실패하면 감추지 않고 그대로 던진다(기존 `complete()`와 동일한 규칙).
  - `ai chat --stream`(신규 플래그, `packages/cli/src/commands/chat.ts`) — `streamComplete()`가 yield하는 청크를 도착하는 대로 stdout에 이어 쓴다. `--json`과 함께 주면 기존 `--json` 소비자와의 호환을 위해 스트리밍 대신 기존 단일 JSON 응답으로 폴백한다. 완료/실패는 기존과 동일하게 `.runtime/tasks.json`(task ledger)에 기록된다.
- **Dashboard Provider Status 라이브 체크**: `lib/providers/status.ts`의 OpenAI/Gemini 판정을 "env var 존재 여부"에서 "실제 모델 목록 엔드포인트를 호출"로 교체 — `packages/cli`의 `{openai,gemini}.validate()`와 동일한 "실제로 호출해본다" 원칙이나, 이 위젯은 Dashboard 페이지 로드마다 그려지므로 CLI를 서브프로세스로 띄우지 않고 Ollama처럼 짧은 타임아웃(3초)의 직접 `fetch`만 사용한다(`checkLiveApiProvider()`, 신규 공용 헬퍼). 키가 없으면 "Not Configured"(호출 없음), 키가 있고 호출 성공이면 "Configured"(+ 실제 모델명 1개), 키가 있어도 호출이 실패하면(잘못된 키·네트워크 오류) "Unreachable"을 반환 — 이전에는 잘못된 키도 "Configured"로 잘못 표시되었다.
- **아직 통합하지 않은 것**: 이번 작업으로 `lib/providers/status.ts`(Dashboard)와 `packages/cli/src/providers/manager.ts`(AI Platform v1)가 "실제로 호출해서 검증한다"는 동일한 원칙을 공유하게 되었지만, 두 곳의 코드 자체는 여전히 독립적으로 존재한다(Dashboard는 Next.js 서버 프로세스에서 직접 `fetch`, CLI는 별도 프로세스의 `ProviderManager`) — 완전한 코드 통합은 `## Remaining TODO`의 관련 항목대로 별도 결정 사항으로 남겨둔다.
- Evidence:
  - `packages/cli/src/providers/provider.ts`(`withRetry()`, `isRetryableError()`, `providerFetchSseStream()`, `SseEvent`), `packages/cli/src/providers/types.ts`(`ChatStreamChunk`, `RetryOptions`, `ProviderError.status`)
  - `packages/cli/src/providers/anthropic.ts`·`openai.ts`(`chatStream()` 구현), `packages/cli/src/providers/manager.ts`(`streamComplete()`)
  - `packages/cli/src/commands/chat.ts`(`--stream` 플래그, `streamChat()`), `packages/cli/src/index.ts`(`ai chat --stream` 등록)
  - `lib/providers/status.ts`(`checkLiveApiProvider()`, `checkOpenAI()`, `checkGemini()`)
  - 테스트(신규 19개 — 최초 17개 + Production Validation에서 추가한 Timeout 2개, 기존 `tests/providers/status.test.ts` 갱신 포함): `tests/ai-platform-cli/provider-retry.test.ts`(11개 — `providerFetchJson()`/`providerFetchSseStream()`의 재시도·비재시도 조건, SSE 청크 경계 분할 파싱, `TIMEOUT` 코드 경로가 실제 `AbortController.abort()` 발동으로 발생하고 재시도 가능함을 검증하는 2개 포함), `tests/ai-platform-cli/streaming.test.ts`(8개 — Anthropic/OpenAI `chatStream()` 파싱, `ProviderManager.streamComplete()`의 simulate 폴백·명시적 provider 실패 전파·non-streaming provider(gemini) 폴백·streaming provider(anthropic) 청크·사용량 기록), `tests/providers/status.test.ts`(기존 5개 유지 + OpenAI/Gemini 라이브 체크 케이스 갱신 — 이 과정에서 "키 없으면 fetch가 전혀 호출되지 않는다"고 잘못 단언하던 기존 assertion 버그를 발견·수정: `getProviderStatuses()`가 Ollama 체크도 병렬로 항상 `fetch`하므로, "OpenAI/Gemini URL로는 호출되지 않는다"로 단언 범위를 좁혔다).
  - 검증: `npx tsc --noEmit`(0 errors) · `npm run build`(루트, 64개 라우트 정상 생성) · `npm test`(32 files / 208 tests 전부 통과, 회귀 없음).
  - **Production Validation(2026-07-14) 후속**: 이 provider 계층을 실 서비스 관점에서 검증한 결과는 `## Production Validation` 및 `docs/PRODUCTION_VALIDATION.md` 참고 — 재시도·타임아웃은 실 검증(mock), Health Check·Chat·Streaming의 실제 vendor 응답은 이 환경에 API 키가 없어 미검증 상태로 명시적으로 남아 있다.

---

## Production Validation

**Status: ✅ Completed (v1.0 RC + AI Provider Integration v1.1) — 2026-07-14**

- Description: v1.0 RC와 AI Provider Integration v1.1 완료 이후, 실 서비스 관점에서 4개 트랙(Provider·Marketplace·Website Builder·Dashboard)을 실제 CLI 실행·실제 브라우저 로그인 세션·실제 파일시스템 검증으로 확인. 새 기능은 추가하지 않고, 검증 중 실제로 발견된 문제만 최소 범위로 수정했다. 전체 근거·표·상세 결과는 `docs/PRODUCTION_VALIDATION.md`에 있고, 이 섹션은 요약만 다룬다.
- **Provider Validation** — 이 환경에 실 API 키(OpenAI/Anthropic/Gemini/OpenRouter)와 로컬 Ollama가 전혀 없어(직접 확인), 사용자 확인을 거쳐 재시도·타임아웃은 mock으로 검증하고 Health Check/Chat/Streaming의 실제 vendor 응답은 미검증 상태로 명시적으로 남김. 검증 중 `TIMEOUT` 코드 경로(`AbortController` 실제 만료) 전용 테스트가 없던 것을 발견해 2개 추가(`tests/ai-platform-cli/provider-retry.test.ts`).
- **Marketplace Validation** — `agents/changelog-writer`(신규, 실 콘텐츠 — 이 저장소의 CHANGELOG 작성 규칙을 따르는 Agent)를 실제로 생성·게시해 `marketplace/manifest.json`의 `count`가 최초로 `0`이 아닌 값을 갖게 됨(Recommended Next Task #4가 이번에 충족됨). publish/search/install/update/remove 전체 라이프사이클을 스크래치 디렉터리에서 실제 실행해 검증. 발견한 문제: `marketplace/manifest.json`의 `count`가 `publish` 후에도 자동 갱신되지 않아 실제와 어긋나 있었음(정적 값 교정, 자동 동기화 로직 추가는 새 기능이라 이번 범위 밖) — 및 `tests/marketplace/registry.test.ts`가 "실 저장소 manifest는 항상 count 0"이라고 하드코딩되어 있어 실제 게시 직후 깨지는 테스트였던 것을 발견·수정.
- **Website Builder Validation** — SaaS(→`landing`으로 매핑, "SaaS"는 canonical 타입이 아님)/Restaurant/Dental Clinic/Portfolio/E-commerce 5개 사이트를 스크래치 디렉터리에 생성해 `npm install`/`npm run build`/`npm run lint` 전부 통과(18개 라우트, 경고 0건) 확인. 파이프라인 자체의 버그는 발견되지 않음. `--out`을 지정해도 Planning Agent 스캐폴딩(`agents/{business-analyst,...}`, `workflows/website-builder/`)이 `process.cwd()` 기준으로 실 저장소에 생성되는 기존 문서화된 부수 효과가 재현되어, 검증 후 수동으로 정리함(코드 수정 없음).
- **Dashboard Validation** — 검증 전용 임시 계정으로 실제 로그인 세션을 만들어 Login/Provider Status/Marketplace/Website Builder/AI Workspace 5개 화면을 Playwright로 확인, 전부 실 데이터 기준으로 정상 동작(예: Marketplace 화면에 방금 게시한 `changelog-writer`가 실제로 표시됨). 검증에 사용한 dev 서버·계정 데이터는 전부 종료·삭제.
- Evidence: `docs/PRODUCTION_VALIDATION.md`(전체 결과), `agents/changelog-writer/`(신규 실 패키지), `marketplace/{index.json,agents/changelog-writer/,manifest.json}`(count 교정), `tests/ai-platform-cli/provider-retry.test.ts`(Timeout 테스트 2개 추가), `tests/marketplace/registry.test.ts`(하드코딩 단언 수정)
- 검증: `npx tsc --noEmit`(0 errors) · `npm run build`(64개 라우트) · `npm test`(32 files / 208 tests 전부 통과)

---

## Operations & Observability v1.1

**Status: ✅ Implemented — Audit Log, Metrics, Health 확장, Backup, Error Report — 2026-07-14**

- Description: v1.0 릴리스·Production Validation 완료 이후, 핵심 기능 변경 없이 운영 가시성만 보강한 후속 작업. 새 저장소를 최소한으로 늘리고(감사 로그 1개, 카운터 1개, export/import 브릿지 1개), 기존 API/타입은 하나도 변경하지 않았다 — 전부 새 파일 추가 또는 기존 모듈에 새 export를 얹는 방식(additive)으로만 구현.
- **Audit Log**(`lib/audit/log.ts`, 신규) — Login/Logout/Marketplace publish·install·remove/Website 생성/AI Task 실행을 기록(요구사항 5종) + Build 실행(Metrics의 "Build count" 계산 겸 Error Report 노출을 위해 추가). `lib/data/audit-log.json`에 append, `eventBus.ts`(200건 상한의 인메모리 히스토리, 서버 재시작 시 소실)와 달리 **디스크에 영구 저장**되며 500건 상한으로 오래된 항목부터 트리밍. `lib/audit/actor.ts`(신규)가 `next/headers`의 `cookies()` + 기존 `getCurrentUser()`로 actor(로그인 이메일)를 구한다(`app/api/auth/me/route.ts`와 동일한 패턴 재사용, `lib/auth/*`는 무변경). `/developer/audit-log`(신규) + `GET /api/audit`(신규, action/limit 필터).
- **Metrics**(`lib/metrics/registry.ts`, 신규) — Build count·Website generation count·AI task count·Marketplace installs 4개 영구 카운터(`lib/data/metrics.json`, 성공/실패와 무관하게 실행될 때마다 +1) + Provider usage(기존 `lib/ai/bridge.ts`의 `listUsageViaCli()`를 그대로 재사용, 중복 계측 없음). Audit Log가 500건 상한의 롤링 윈도우라 누적 카운터로는 부적합하다는 점을 확인하고 별도 영구 저장소로 분리했다. `/developer/metrics`(신규) + `GET /api/metrics`(신규) + Dashboard Home의 `MetricsWidget`(신규, 9번째 위젯).
- **Health Dashboard 확장**(`lib/health/checks.ts`) — 기존 `getGitStatus()`/`getDiskUsage()`/`runHealthCheck()`/`readHealthCache()`/`writeHealthCacheEntry()`는 시그니처·동작 모두 무변경. `getSystemInfo(cwd)`(신규 export)만 추가해 CPU(코어 수·모델·부하율)·Memory·Disk(기존 `getDiskUsage()` 재사용)·Node version(`process.version`)·Server Uptime(`process.uptime()`)·Active Sessions를 반환. CPU 부하율은 Windows에서 `os.loadavg()`가 항상 `[0,0,0]`을 반환하는 Node의 알려진 제약 때문에, `os.cpus()`의 누적 tick을 100ms 간격으로 두 번 샘플링해 직접 계산(신규 의존성 없음). Active Sessions는 `lib/auth/session.ts`에 신규 export `countActiveSessions()`를 추가해 구함(기존 `getValidSession()`/`createSession()`/`destroySession()`은 무변경). `GET /api/health` 응답에 `system` 필드만 추가(기존 `git`/`disk`/`cache` 필드는 그대로).
- **Backup**(`lib/backup/registry.ts`, 신규) — Export configuration(`.runtime/config/providers.json` — 실제 비밀값이 아닌 `${ENV_VAR}` 참조 템플릿만 담고 있어 내보내도 안전, `packages/cli/src/providers/manager.ts` 참고)·prompts(`lib/data/prompts.json`)·workflows(`lib/data/workflows.json`)를 하나의 JSON 번들로 내보내고, 부분 번들도 허용하는 Import를 지원(있는 섹션만 복원, 없는 섹션은 기존 상태 유지). 각 모듈을 다시 구현하지 않고 그 모듈들이 실제로 쓰는 고정 파일 경로를 직접 읽고 쓴다(`lib/marketplace/registry.ts`의 `getCatalogSummary()`가 `marketplace/manifest.json`을 직접 읽는 것과 동일한 원칙). `/developer/backup`(신규, Export 버튼은 파일 다운로드, Import는 파일 선택 후 업로드) + `GET /api/backup/export`·`POST /api/backup/import`(신규).
- **Error Report**(`/developer/errors`, 신규) — 별도 에러 저장소를 새로 만들지 않고 Audit Log에서 `success:false`인 항목만 필터링해 보여준다(`GET /api/errors`, 신규) — 로그인 실패·Marketplace 실패·Website 생성 실패·AI Task 실패·Build 실패가 한 곳에 모인다.
- **DeveloperNav**(`components/developer/DeveloperNav.tsx`) — Health 다음에 Audit Log·Metrics·Backup·Error Report 4개 링크 추가(13개 → 17개 항목).
- Evidence:
  - 신규 lib: `lib/audit/{log,actor}.ts`, `lib/metrics/registry.ts`, `lib/backup/registry.ts`
  - 기존 lib에 추가된 export(무변경 유지): `lib/health/checks.ts`(`getSystemInfo()`, `CpuInfo`/`MemoryInfo`/`SystemInfo` 타입), `lib/auth/session.ts`(`countActiveSessions()`)
  - 신규 페이지: `app/developer/{audit-log,metrics,backup,errors}/page.tsx`, `components/developer/dashboard/MetricsWidget.tsx`
  - 신규 API: `app/api/audit/route.ts`, `app/api/metrics/route.ts`, `app/api/backup/{export,import}/route.ts`, `app/api/errors/route.ts`
  - Audit Log·Metric 기록 훅(모두 additive, 각 라우트의 기존 로직·응답 형식은 무변경): `app/api/auth/{login,logout}/route.ts`, `app/api/marketplace/{publish,[type]/[name]}/route.ts`, `app/api/websites/route.ts`, `app/api/agents/run/route.ts`, `app/api/ai/chat/route.ts`, `app/api/health/run/route.ts`
  - 테스트(신규 20개): `tests/audit/log.test.ts`(7개 — record/list/필터/정렬/500건 상한 트리밍), `tests/metrics/registry.test.ts`(5개), `tests/backup/registry.test.ts`(5개 — export/import 왕복, 부분 번들), `tests/health/checks.test.ts`(`getSystemInfo()` 1개 추가), `tests/auth/session.test.ts`(`countActiveSessions()` 2개 추가)
  - 검증: `npx tsc --noEmit`(0 errors) · `npm run build`(90개 라우트 정상 생성, 신규 페이지 4개·API 5개 포함) · `npm test`(35 files / 228 tests 전부 통과, 회귀 없음). 실제 E2E: 검증 전용 임시 계정으로 로그인 → `/api/audit`(로그인 이벤트 실제 기록 확인) → `/api/metrics`(카운터 + 실제 Provider usage 확인) → `/api/backup/export`(configuration/prompts/workflows 빈 상태로 정상 응답) → 존재하지 않는 패키지로 marketplace install 실패 유발 → `/api/errors`에 그 실패가 실제로 나타남 + `marketplaceInstallCount`가 실패에도 불구하고 1 증가함을 확인 → `/api/health`의 `system` 필드(CPU 8코어·실제 모델명·Memory·Node v24.18.0·Uptime·Active Sessions)가 실제 머신 값을 반환함을 확인. Playwright로 5개 신규/확장 페이지(Audit Log·Metrics·Backup·Error Report·Health) 전부 렌더링과 실데이터 표시를 확인, Backup의 Export 버튼이 실제 파일 다운로드를 트리거함을 확인. 검증에 사용한 dev 서버·임시 계정·데이터(`lib/data/*`, `.runtime/`, 전부 `.gitignore` 대상)는 검증 후 전부 종료·삭제.
- 남은 제약(정직하게 기록): CPU 부하율은 100ms 샘플링 스냅샷이라 순간값이며 지속 추이를 보여주지 않는다. Metrics 카운터는 성공/실패를 구분하지 않고 "실행 횟수"만 센다(성공률이 필요하면 Audit Log를 함께 참고해야 함). Backup import는 파일 전체를 덮어쓰는 복원(restore) 방식이라 병합(merge)은 지원하지 않는다.

---

## Design Automation Phase 1

**Status: ✅ Implemented (Phase 1 of the Design Automation system only) — 2026-07-14**

- Description: `docs/03_DESIGN/{DESIGN_AUTOMATION_MASTER,CLAUDE_DESIGN_INTEGRATION,FIGMA_INTEGRATION,DESIGN_SYNC,DESIGN_WORKFLOW}.md`에 정의된 Design Automation 전체 시스템 중 **Phase 1만** 구현 — Requirement Analysis·Feature List·Site Map·User Flow·Screen List. Storyboard/Wireframe/Prototype/Claude Design 연동/Figma Import·Export/Design Sync/고객 승인 Workflow는 의도적으로 구현하지 않음(Phase 2 이후로 명시적으로 남김, `docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md`의 Phase 구분표 참고). 새 기능은 기존 API·타입을 하나도 변경하지 않고 추가만 했다(additive).
- **생성 파이프라인**(`lib/design/{types,generator,registry}.ts`, 전부 신규) — 입력(Project Name/Type/Requirements/Target Users) → 기존 `lib/ai/bridge.ts`의 `chatViaCli()`(Website Builder Content Engine·AI Studio와 동일한 CLI shell-out 브릿지, 신규 의존성 없음)로 AI에게 JSON 생성 요청 → 파싱 실패/Provider 미설정 시 결정론적 기본값(`buildDefaultDesignPlan()`)으로 전부-아니면-전무(all-or-nothing) 폴백(Website Builder Content Engine의 `generateSiteContent()`/`buildDefaultContent()`와 동일한 원칙). `chatFn`을 의존성 주입 가능하게 설계해(기본값은 실제 `chatViaCli`) 실제 CLI 서브프로세스 없이도 빠른 단위 테스트가 가능하다.
- **저장**(`lib/data/design-plans.json`, 신규) — 기존 registry 패턴(workspaces/projects/prompts/workflows/websites/audit-log/metrics)과 동일한 fs-JSON append 방식.
- **API**(`app/api/design/requirements/route.ts`, 신규) — `CLAUDE_DESIGN_INTEGRATION.md` 14번에 명시된 `POST /api/design/requirements` 그대로. `GET`(목록)도 함께 제공.
- **Dashboard**(`/developer/design`, 신규) — 입력 폼 + 생성 이력 + 5종 산출물 상세 뷰(Requirement Analysis/Feature List/Site Map/User Flow/Screen List). `DeveloperNav`에 "Design" 링크 추가(Workflow Center와 Website Builder 사이 — 기획이 빌드보다 먼저라는 파이프라인 순서 반영). Dashboard Home에 `DesignPlansWidget`(신규) 추가.
- **Audit Log·Metrics 연동**(additive) — `lib/audit/log.ts`의 `AuditAction` 유니온에 `"design.generate"` 추가(기존 8개 값은 무변경), 생성 성공 시 기존 `aiTaskCount` 카운터 재사용(새 카운터 추가하지 않음) — Operations & Observability v1.1 인프라를 그대로 재사용.
- 명세와 실제 구현의 차이(명세에 없던 세부사항, `DESIGN_AUTOMATION_MASTER.md` 3번에도 기록):
  - 5종 산출물마다 별도 API를 두지 않고 `POST /api/design/requirements` 하나가 전부 생성 — 명세의 Dashboard Integration(11번)도 이 5종을 "Requirements" 메뉴 하나로 묶어 보여주기 때문.
  - `projectId`(기존 `lib/projects/registry.ts` Project와 선택적 연결) — 명세에 없는 필드지만, Phase 5(승인 Workflow) 대비로 스키마에 포함(강제하지 않음).
  - `design.generate` Audit 액션·`aiTaskCount` 재사용 — 명세에 없지만 기존 AI 실행 경로(AI Studio·Website Builder)와의 일관성을 위해 추가.
- **알려진 제약**: 실제 HTTP 라우트 핸들러(`app/api/design/requirements/route.ts`)를 vitest에서 직접 호출하는 통합 테스트는 시도했으나 실패했다 — 이 라우트가 쓰는 `getCurrentActorEmail()`(`next/headers`의 `cookies()`)은 실제 Next.js 요청 처리 런타임 밖에서 호출하면 `` `cookies` was called outside a request scope `` 오류를 던진다(이 저장소의 다른 어떤 라우트도 이 방식으로 테스트되지 않는 이유와 동일). 따라서 통합 테스트는 라우트 바로 아래 계층(generator+registry 실 연동)까지만 다루고, 라우트 자체는 기존 관례대로 수동 curl/Playwright E2E로 검증했다.
- Evidence: `lib/design/{types,generator,registry}.ts`, `app/api/design/requirements/route.ts`, `app/developer/design/page.tsx`, `components/developer/dashboard/DesignPlansWidget.tsx`, `lib/audit/log.ts`(`design.generate` 추가), `components/developer/DeveloperNav.tsx`
- 테스트(신규 21개): `tests/design/generator.test.ts`(12개 — `buildDefaultDesignPlan()`/`parseDesignPlanContent()`의 all-or-nothing 검증·`generateDesignPlan()`의 성공/실패 폴백), `tests/design/registry.test.ts`(5개), `tests/design/integration.test.ts`(4개 — generator+registry 실 fs 연동 3개 + 실제 CLI 서브프로세스를 통한 end-to-end 폴백 검증 1개)
- 검증: `npx tsc --noEmit`(0 errors) · `npm run build`(신규 페이지 1개·API 1개 포함 정상 생성) · `npm test`(38 files / 249 tests 전부 통과, 회귀 없음). 실 E2E: 검증 전용 임시 계정으로 로그인 → Playwright로 실제 한글을 타이핑해 Design Plan 생성 → 5종 산출물이 모두 정상 렌더링됨을 확인(curl로 먼저 테스트했을 때는 Git Bash on Windows의 쉘 인코딩 문제로 한글이 깨져 보였으나, 실제 브라우저 입력에서는 문제없이 정상 저장·표시됨을 재확인 — 애플리케이션 버그 아님) → `/api/audit?action=design.generate`·`/api/metrics`의 `aiTaskCount`가 실제로 갱신됨을 확인. 검증에 사용한 dev 서버·임시 계정·데이터(`lib/data/*`, 전부 `.gitignore` 대상)는 검증 후 전부 종료·삭제.

---

## Design Automation Phase 2

**Status: ✅ Implemented (Storyboard Generator, built on top of Phase 1) — 2026-07-15**

- Description: Phase 1의 Design Plan(Site Map·Screen List)을 입력으로 Screen Flow·User
  Journey·Navigation Flow·Page Sequence·Screen Description 5종("Storyboard")을 생성. Phase 1과
  완전히 동일한 원칙(`chatViaCli()` 재사용, 전부-아니면-전무 파싱·결정론적 폴백, DI 가능한
  `chatFn`)을 그대로 따른다. 새 기능은 기존 API·타입을 하나도 변경하지 않고 추가만 했다.
- **생성 파이프라인**(`lib/design/{storyboard,storyboard-generator}.ts`, 신규 — 요구사항이 지정한 두 파일명 그대로: `storyboard.ts`=타입+registry, `storyboard-generator.ts`=생성 로직) — 입력은 Phase 1 `DesignPlanRecord`(`planId`로 조회) → `chatViaCli()`로 AI에게 JSON 생성 요청 → 파싱 실패/Provider 미설정 시 `buildDefaultStoryboard()`(Phase 1 Screen List 순서를 그대로 Screen Flow/Navigation/Page Sequence로 변환)로 폴백. `lib/data/design-storyboards.json`에 기존 registry 패턴으로 저장.
- **API**(`app/api/design/storyboard/{route.ts,[id]/route.ts}`, 신규) — 스펙이 명시한 `POST /api/design/storyboard`·`GET /api/design/storyboard/:id` 그대로. 응답은 스펙의 `{storyboardId, projectId, screens, flow}`를 포함하되(`screens`=`screenDescriptions`, `flow`=`screenFlow`, `projectId`=이 Storyboard가 생성된 Phase 1 Plan의 `id`), Dashboard가 필요로 하는 나머지 3종(userJourneys/navigationFlow/pageSequence)을 `storyboard` 필드 아래 전체 레코드로 추가 포함(스펙 확장, 축소 아님). `GET /api/design/storyboard`(목록, 신규 추가)도 함께 제공.
- **Dashboard**(`/developer/design/storyboard`, 신규) — Plan 선택 → Generate → Project/Site Map/Screen List/Screen Flow/Navigation Flow/User Journey를 요구사항 4번 계층 그대로 표시, Export JSON/Export Markdown 버튼(클라이언트 사이드 blob 다운로드, Logs 페이지의 기존 Export 패턴 재사용). `/developer/design`(Requirements)과 상호 링크("Storyboard →" / "← Requirements")로 연결 — `DeveloperNav`는 변경하지 않고 기존 "Design" 링크 하나만 재사용(Marketplace의 Installed/Updates 하위 페이지와 동일한 관례).
- **Audit Log**(additive) — `lib/audit/log.ts`의 `AuditAction`에 `"design.storyboard.generate"` 추가(기존 9개 값 무변경).
- **Metrics**(additive) — `lib/metrics/registry.ts`의 `MetricsCounters`에 `storyboardGenerationCount` 필드 추가(같은 `lib/data/metrics.json` 파일, 새 저장소 아님). `aiTaskCount`를 재사용하지 않은 이유: Phase 1의 `design.generate`가 이미 `aiTaskCount`를 쓰고 있어 합치면 "AI 호출 횟수"와 "Storyboard 생성 횟수"를 구분할 수 없어짐 — 요구사항의 "Increment storyboard generation count" 문구와 더 정확히 일치하는 선택.
- 명세와 실제 구현의 차이(명세에 없던 세부사항, `DESIGN_AUTOMATION_MASTER.md` 4번에도 기록):
  - API 응답에 `storyboard`(전체 레코드) 필드 추가 — 스펙의 4개 필드는 그대로 유지하면서 확장.
  - "Developer → Design → Storyboard" 계층을 중첩 네비게이션 메뉴 대신 두 페이지 간 상호 링크로 구현.
  - `aiTaskCount` 대신 신규 `storyboardGenerationCount` 필드 사용.
- **알려진 제약**(Phase 1과 동일): 실제 HTTP 라우트 핸들러를 vitest에서 직접 호출하는 통합 테스트는 `getCurrentActorEmail()`의 `next/headers` `cookies()`가 요청 컨텍스트 밖에서 예외를 던져 불가능 — 통합 테스트는 라우트 바로 아래 계층(storyboard-generator+storyboard registry 실 연동)까지 다루고, 라우트 자체는 수동 curl/Playwright E2E로 검증.
- Evidence: `lib/design/{storyboard,storyboard-generator}.ts`, `app/api/design/storyboard/{route.ts,[id]/route.ts}`, `app/developer/design/storyboard/page.tsx`, `lib/audit/log.ts`(`design.storyboard.generate` 추가), `lib/metrics/registry.ts`(`storyboardGenerationCount` 추가), `components/developer/dashboard/MetricsWidget.tsx`·`app/developer/metrics/page.tsx`(새 카운터 표시)
- 테스트(신규 25개): `tests/design/storyboard-generator.test.ts`(14개 — `buildDefaultStoryboard()`/`parseStoryboardContent()`의 all-or-nothing 검증·`generateStoryboard()`의 성공/실패 폴백), `tests/design/storyboard-registry.test.ts`(6개), `tests/design/storyboard-integration.test.ts`(4개 — generator+registry 실 fs 연동 3개 + 실제 CLI 서브프로세스를 통한 end-to-end 폴백 검증 1개), `tests/metrics/registry.test.ts`(`storyboardGenerationCount` 1개 추가 + 기존 테스트 1개 갱신)
- 검증: `npx tsc --noEmit`(0 errors) · `npm run build`(신규 페이지 1개·API 2개 포함 정상 생성) · `npm test`(41 files / 274 tests 전부 통과, 회귀 없음). 실 E2E: 검증 전용 임시 계정으로 로그인 → Phase 1에서 실제 Design Plan 생성 → Storyboard 페이지에서 그 Plan을 선택해 실제 Storyboard 생성 → Project/Site Map/Screen List/Screen Flow/Navigation Flow/User Journey가 모두 정상 렌더링됨을 확인(실제 브라우저 한글 타이핑, mojibake 없음) → Export JSON·Export Markdown 버튼이 실제 파일 다운로드를 트리거하고 Markdown 내용이 올바른 형식임을 확인 → `/api/audit?action=design.storyboard.generate`(정상 기록)·`/api/metrics`(`storyboardGenerationCount:1`이 `aiTaskCount:1`과 독립적으로 집계됨)·`GET /api/design/storyboard/:id`(정상 응답)·`GET /api/design/storyboard/does-not-exist`(404)를 모두 확인. 검증에 사용한 dev 서버·임시 계정·데이터(`lib/data/*`, 전부 `.gitignore` 대상)는 검증 후 전부 종료·삭제.

---

## Design Automation Phase 3

**Status: ✅ Implemented (Wireframe Generator, built on top of Phase 2) — 2026-07-15**

- Description: Phase 2의 Storyboard(Screen Description의 `keyElements`)를 입력으로 Desktop/
  Tablet/Mobile Layout·Component Layout·Responsive Layout·Screen Sections을 생성하는 "Wireframe".
  Phase 1·2와 완전히 동일한 원칙(`chatViaCli()` 재사용, 전부-아니면-전무 파싱·결정론적 폴백, DI
  가능한 `chatFn`)을 그대로 따른다. 새 기능은 기존 API·타입을 하나도 변경하지 않고 추가만 했다.
- **생성 파이프라인**(`lib/design/{wireframe,wireframe-generator}.ts`, 신규 — 요구사항이 지정한 두 파일명 그대로: `wireframe.ts`=타입(13종 고정 컴포넌트 팔레트 `ComponentType` 포함)+registry, `wireframe-generator.ts`=생성 로직) — 입력은 Phase 2 `StoryboardRecord`(`storyboardId`로 조회) → `chatViaCli()`로 AI에게 JSON 생성 요청 → 파싱 실패/Provider 미설정 시 `buildDefaultWireframe()`(Screen Description의 `keyElements`를 13종 컴포넌트로 정규화해 Header/Navigation/Hero/Main Content/Footer 섹션으로 그룹화, breakpoint당 columns만 12/8/4로 차등 부여)로 폴백. `lib/data/design-wireframes.json`에 기존 registry 패턴으로 저장.
- **API**(`app/api/design/wireframe/{route.ts,[id]/route.ts}`, 신규) — 요구사항이 명시한 `POST /api/design/wireframe`·`GET /api/design/wireframe/:id` 그대로. 응답은 요구사항의 `{wireframeId, projectId, layouts, components, responsive}`를 포함하되(`layouts`=화면별 desktop/tablet/mobile `BreakpointLayout` 3종 묶음 배열, `components`=전체 화면에서 실제로 쓰인 컴포넌트 인벤토리(`usedIn` 화면 목록 포함), `responsive`=desktop/tablet/mobile 3개 breakpoint의 min-width·column 수·설명 객체, `projectId`=Storyboard가 참조하는 Phase 1 Plan의 `id`를 그대로 전달), Dashboard가 필요로 하는 전체 레코드는 `wireframe` 필드 아래에 추가 포함(스펙 확장, 축소 아님). `GET /api/design/wireframe`(목록, 신규 추가)도 함께 제공.
- **Dashboard**(`/developer/design/wireframe`, 신규) — Storyboard 선택 → Generate → Project/Responsive Layout/Component Layout/화면별 Desktop·Tablet·Mobile Layout(Screen Sections)을 표시, Export JSON/Export Markdown 버튼(Phase 2와 동일한 클라이언트 사이드 blob 다운로드 패턴). `/developer/design/storyboard`와 상호 링크("Wireframe →" / "← Storyboard")로 연결 — `DeveloperNav`는 변경하지 않음(Phase 2와 동일한 관례).
- **Audit Log**(additive) — `lib/audit/log.ts`의 `AuditAction`에 `"design.wireframe.generate"` 추가(기존 10개 값 무변경). `app/developer/{audit-log,errors}/page.tsx`의 라벨/톤/필터 맵도 함께 갱신.
- **Metrics**(additive) — `lib/metrics/registry.ts`의 `MetricsCounters`에 `wireframeGenerationCount` 필드 추가(같은 `lib/data/metrics.json` 파일, 새 저장소 아님) — `aiTaskCount`·`storyboardGenerationCount`와 분리해 "AI 호출 횟수"·"Storyboard 생성 횟수"·"Wireframe 생성 횟수"를 각각 구분 가능하게 함. `app/developer/metrics/page.tsx`·`components/developer/dashboard/MetricsWidget.tsx`에도 표시 추가.
- 명세와 실제 구현의 차이(명세에 없던 세부사항, `DESIGN_AUTOMATION_MASTER.md` 5번에도 기록):
  - API 응답에 `wireframe`(전체 레코드) 필드 추가 — 스펙의 5개 필드는 그대로 유지하면서 확장.
  - "Screen Sections"를 별도 최상위 필드로 만들지 않고 각 `BreakpointLayout.sections`(화면×breakpoint별 섹션 목록)로 구현 — Desktop/Tablet/Mobile Layout 자체가 이미 그 breakpoint의 화면 구성 섹션을 담고 있어 중복 표현하지 않았다.
  - 결정론적 폴백에서는 breakpoint별 섹션 구성(components)을 동일하게 유지하고 `columns`(12/8/4)만 다르게 부여 — 실제 반응형 동작 차이는 `responsive` 필드의 `notes`로 서술(AI 경로는 breakpoint별로 다른 섹션 구성을 자유롭게 생성 가능).
  - "Developer → Design → Wireframe" 계층을 중첩 네비게이션 메뉴 대신 두 페이지 간 상호 링크로 구현(Phase 2와 동일한 패턴).
- **알려진 제약**(Phase 1·2와 동일): 실제 HTTP 라우트 핸들러를 vitest에서 직접 호출하는 통합 테스트는 `getCurrentActorEmail()`의 `next/headers` `cookies()`가 요청 컨텍스트 밖에서 예외를 던져 불가능 — 통합 테스트는 라우트 바로 아래 계층(wireframe-generator+wireframe registry 실 연동)까지 다루고, 라우트 자체는 수동 curl/Playwright E2E로 검증.
- Evidence: `lib/design/{wireframe,wireframe-generator}.ts`, `app/api/design/wireframe/{route.ts,[id]/route.ts}`, `app/developer/design/wireframe/page.tsx`, `lib/audit/log.ts`(`design.wireframe.generate` 추가), `lib/metrics/registry.ts`(`wireframeGenerationCount` 추가), `components/developer/dashboard/MetricsWidget.tsx`·`app/developer/metrics/page.tsx`(새 카운터 표시), `app/developer/{audit-log,errors}/page.tsx`(새 action 라벨), `app/developer/design/storyboard/page.tsx`("Wireframe →" 링크 추가)
- 테스트(신규 25개): `tests/design/wireframe-generator.test.ts`(15개 — `buildDefaultWireframe()`/`parseWireframeContent()`의 all-or-nothing 검증·`generateWireframe()`의 성공/실패 폴백), `tests/design/wireframe-registry.test.ts`(6개), `tests/design/wireframe-integration.test.ts`(4개 — generator+registry 실 fs 연동 3개 + 실제 CLI 서브프로세스를 통한 end-to-end 폴백 검증 1개), `tests/metrics/registry.test.ts`(`wireframeGenerationCount` 1개 추가 + 기존 테스트 1개 갱신)
- 검증: `npx tsc --noEmit`(0 errors) · `npm run build`(신규 페이지 1개·API 2개 포함 정상 생성) · `npm test`(44 files / 300 tests 전부 통과, 회귀 없음 — `tests/providers/status.test.ts`의 1건 타임아웃은 병렬 실행 시 네트워크 자원 경합으로 인한 기존 무관 플레이크로 확인, 단독 재실행 시 7/7 통과). 실 E2E: 검증 전용 임시 계정으로 로그인 → Design Plan → Storyboard → Wireframe 생성까지 전 구간을 curl(API 응답 shape 확인)과 실제 브라우저(Playwright, "Generate Wireframe" 버튼 클릭 → History 갱신 → Project/Responsive Layout/Component Layout/화면별 3-breakpoint Layout 정상 렌더링 → Export JSON/Markdown 실제 파일 다운로드 트리거)로 확인 → `/api/audit?action=design.wireframe.generate`(정상 기록)·`/api/metrics`(`wireframeGenerationCount`가 `storyboardGenerationCount`·`aiTaskCount`와 독립적으로 집계됨)·`GET /api/design/wireframe/:id`(정상 응답)·`GET /api/design/wireframe/does-not-exist`(404)를 모두 확인. 검증에 사용한 dev 서버·임시 계정·데이터(`lib/data/*`, 전부 `.gitignore` 대상)는 검증 후 전부 종료·삭제.

---

## Design Automation Phase 4

**Status: ✅ Implemented (Prototype Generator, built on top of Phase 3) — 2026-07-15**

- Description: Phase 3의 Wireframe(화면별 Desktop Layout의 컴포넌트 구성)을 입력으로 Click
  Flow·Navigation Flow·Screen Transition·Interaction Map·Component Actions·User Journey·
  Animation Preview·Prototype Preview를 생성하는 "Prototype". Phase 1~3과 완전히 동일한 원칙
  (`chatViaCli()` 재사용, 전부-아니면-전무 파싱·결정론적 폴백, DI 가능한 `chatFn`)을 그대로
  따른다. 새 기능은 기존 API·타입을 하나도 변경하지 않고 추가만 했다.
- **생성 파이프라인**(`lib/design/{prototype,prototype-generator}.ts`, 신규 — 요구사항이 지정한 두 파일명 그대로: `prototype.ts`=타입+registry(요구사항의 "Version" 지원 포함), `prototype-generator.ts`=생성 로직) — 입력은 Phase 3 `WireframeRecord`(`wireframeId`로 조회) → `chatViaCli()`로 AI에게 JSON 생성 요청 → 파싱 실패/Provider 미설정 시 `buildDefaultPrototype()`(13종 고정 컴포넌트 팔레트별 결정론적 인터랙션·애니메이션 정의 `COMPONENT_BEHAVIOR`를 화면 구성에 매핑, "대표 컴포넌트" 우선순위로 단일 Click Flow 생성)로 폴백. `lib/data/design-prototypes.json`에 기존 registry 패턴으로 저장.
- **Version(신규 registry 개념)** — 동일 `wireframeId`에 대해 다시 생성해도 기존 레코드를 덮어쓰지 않고 새 레코드를 추가하며 `version`을 1씩 증가시킨다(`createPrototype()`이 해당 `wireframeId`의 기존 레코드 수 + 1로 자동 계산, 명시적으로 넘기면 그 값을 그대로 사용해 테스트 가능). 별도 버전 API 없이 같은 `POST /api/design/prototype`을 같은 `wireframeId`로 다시 호출하는 것 자체가 새 버전을 만드는 방식.
- **API**(`app/api/design/prototype/{route.ts,[id]/route.ts}`, 신규) — 요구사항이 명시한 `POST /api/design/prototype`·`GET /api/design/prototype/:id` 그대로. 응답은 요구사항의 `{prototypeId, projectId, screens, interactions, transitions, journey, preview}`를 포함하되(`screens`=화면 참조 배열, `interactions`=화면별 인터랙션 맵, `transitions`=화면 전환 목록, `journey`=User Journey 배열, `preview`=Prototype Preview 요약 객체, `projectId`=Wireframe이 참조하는 Phase 1 Plan의 `id`를 그대로 전달), Dashboard가 필요로 하는 전체 레코드(`clickFlows`/`navigationFlow`/`componentActions`/`animationPreviews` 포함)는 `prototype` 필드 아래에 추가 포함(스펙 확장, 축소 아님). `GET /api/design/prototype`(목록, 신규 추가)도 함께 제공.
- **Dashboard**(`/developer/design/prototype`, 신규) — Wireframe 선택 → Generate → 요구사항이 명시한 순서(Project → Storyboard → Wireframe → Prototype Preview → Interaction Flow → Screen Transition → Journey → Export) 그대로 표시(Project/Storyboard/Wireframe 카드는 Phase 1·2·3 레코드를 체인으로 조회해 요약만 표시, 재구현 아님), Export JSON/Export Markdown 버튼(Phase 2·3과 동일한 클라이언트 사이드 blob 다운로드 패턴). `/developer/design/wireframe`와 상호 링크("Prototype →" / "← Wireframe")로 연결 — `DeveloperNav`는 변경하지 않음(Phase 2·3과 동일한 관례).
- **Audit Log**(additive) — `lib/audit/log.ts`의 `AuditAction`에 `"design.prototype.generate"` 추가(기존 11개 값 무변경, detail 메시지에 버전 번호 포함). `app/developer/{audit-log,errors}/page.tsx`의 라벨/톤/필터 맵도 함께 갱신.
- **Metrics**(additive) — `lib/metrics/registry.ts`의 `MetricsCounters`에 `prototypeGenerationCount` 필드 추가(같은 `lib/data/metrics.json` 파일, 새 저장소 아님) — `aiTaskCount`·`storyboardGenerationCount`·`wireframeGenerationCount`와 분리해 각각 독립 집계. `app/developer/metrics/page.tsx`·`components/developer/dashboard/MetricsWidget.tsx`에도 표시 추가.
- 명세와 실제 구현의 차이(명세에 없던 세부사항, `DESIGN_AUTOMATION_MASTER.md` 6번에도 기록):
  - API 응답에 `prototype`(전체 레코드) 필드 추가 — 스펙의 7개 필드는 그대로 유지하면서 확장.
  - Registry "Version" 지원을 신규 API 없이 재생성 시 자동 증가로 구현(히스토리 보존, 덮어쓰지 않음).
  - 결정론적 폴백의 Click Flow는 화면당 대표 컴포넌트 하나만으로 단일 흐름을 구성 — AI 경로는 여러 분기 흐름을 자유롭게 생성 가능.
  - "Developer → Design → Prototype" 계층을 중첩 네비게이션 메뉴 대신 두 페이지 간 상호 링크로 구현(Phase 2·3과 동일한 패턴).
- **알려진 제약**(Phase 1~3과 동일): 실제 HTTP 라우트 핸들러를 vitest에서 직접 호출하는 통합 테스트는 `getCurrentActorEmail()`의 `next/headers` `cookies()`가 요청 컨텍스트 밖에서 예외를 던져 불가능 — 통합 테스트는 라우트 바로 아래 계층(prototype-generator+prototype registry 실 연동)까지 다루고, 라우트 자체는 수동 curl/Playwright E2E로 검증.
- Evidence: `lib/design/{prototype,prototype-generator}.ts`, `app/api/design/prototype/{route.ts,[id]/route.ts}`, `app/developer/design/prototype/page.tsx`, `lib/audit/log.ts`(`design.prototype.generate` 추가), `lib/metrics/registry.ts`(`prototypeGenerationCount` 추가), `components/developer/dashboard/MetricsWidget.tsx`·`app/developer/metrics/page.tsx`(새 카운터 표시), `app/developer/{audit-log,errors}/page.tsx`(새 action 라벨), `app/developer/design/wireframe/page.tsx`("Prototype →" 링크 추가)
- 테스트(신규 32개): `tests/design/prototype-generator.test.ts`(19개 — `buildDefaultPrototype()`/`parsePrototypeContent()`의 all-or-nothing 검증·`generatePrototype()`의 성공/실패 폴백), `tests/design/prototype-registry.test.ts`(8개 — version 자동 증가·wireframeId별 독립 추적 포함), `tests/design/prototype-integration.test.ts`(5개 — generator+registry 실 fs 연동 4개(버전 증가 시나리오 포함) + 실제 CLI 서브프로세스를 통한 end-to-end 폴백 검증 1개), `tests/metrics/registry.test.ts`(`prototypeGenerationCount` 1개 추가)
- 검증: `npx tsc --noEmit`(0 errors) · `npm run build`(신규 페이지 1개·API 2개 포함 정상 생성) · `npm test`(47 files / 333 tests 전부 통과, 회귀 없음). 실 E2E: 검증 전용 임시 계정으로 로그인 → Design Plan → Storyboard → Wireframe → Prototype 생성까지 전 구간을 curl(API 응답 shape 확인, 재생성 시 version 1→2 증가 확인)과 실제 브라우저(Playwright, "Generate Prototype" 버튼 클릭으로 v3까지 생성 → History에 v1/v2/v3 모두 표시 → Project/Storyboard/Wireframe/Prototype Preview/Interaction Flow/Screen Transition/Journey가 요구사항 순서대로 정상 렌더링 → Export JSON/Markdown 실제 파일 다운로드 트리거)로 확인 → `/api/audit?action=design.prototype.generate`(버전 번호 포함해 정상 기록)·`/api/metrics`(`prototypeGenerationCount`가 다른 카운터와 독립적으로 집계됨)·`GET /api/design/prototype/:id`(정상 응답)·`GET /api/design/prototype/does-not-exist`(404)를 모두 확인. 검증에 사용한 dev 서버·임시 계정·데이터(`lib/data/*`, 전부 `.gitignore` 대상)는 검증 후 전부 종료·삭제.

---

## Authentication

**Status: ✅ Implemented (Development OS scope) — 2026-07-14**

- Description: 이메일/비밀번호 기반 세션 인증. `/login`이 실제 `POST /api/auth/login`을 호출하도록 연결되었고(`app/login/page.tsx`), 내부 Dashboard 전체(`/developer/**`, `/projects/**`)가 `proxy.ts`(Next.js 16의 `middleware.ts` 후속, Node.js 런타임 기본 실행)로 보호된다. `/signup` 백엔드는 이번 범위 밖(요청 범위에 없었음) — 계정 생성은 `scripts/create-auth-user.cjs`로만 가능.
- 세션 모델: 서버 측 불투명 토큰(`crypto.randomBytes(32)`)을 `lib/data/sessions.json`(기존 `lib/workspaces/registry.ts`와 동일한 fs-JSON 패턴, `.gitignore` 처리됨)에 저장하고, 쿠키(`ai_session`, HttpOnly·`Secure`(production only)·`SameSite=Lax`·7일 만료)에는 토큰만 담는다. 새 npm 패키지·새 `.env` 변수 없음(비밀번호는 Node 내장 `crypto.scryptSync`, 세션 토큰도 `crypto.randomBytes` — 서명 키 자체가 불필요한 구조).
- 보호 범위: `/developer/**` + `/projects/**`만 보호. `/api/workspaces`·`/api/terminal`·`/api/devserver` 등 다른 내부 API는 의도적으로 미보호 — `packages/cli`(`ai devmode` 등)가 브라우저 세션 없이 이 API들을 직접 호출하므로, 쿠키 게이팅을 걸면 CLI 연동이 깨짐(실제로 로그인 없이 `/api/devserver/status`가 계속 200을 반환하는지 curl로 확인 완료). 후속 과제로 남겨둠, 누락이 아님.
- Evidence:
  - `lib/auth/{types,password,users,session,auth,middleware}.ts`, `lib/auth/AuthContext.tsx`(client, `useAuth()`)
  - `proxy.ts`(저장소 루트) — `/developer/:path*`·`/projects/:path*`·`/login`에 대해 세션 확인 후 리다이렉트
  - `app/api/auth/{login,logout,me}/route.ts`
  - `app/login/page.tsx`(실제 제출 연결), `components/auth/AuthBar.tsx`(로그아웃 버튼 + 사용자 이메일, `app/developer/layout.tsx`·`app/projects/layout.tsx`에 배치), `app/layout.tsx`(`AuthProvider` 전역 연결)
  - `scripts/create-auth-user.cjs`(계정 생성 스크립트, 최초 계정 부트스트랩용)
  - 테스트: `tests/auth/{password,users,session,auth,middleware}.test.ts`(26개, `npm run test`로 실행)
  - 검증: `npm run test`(26/26 통과), 대상 파일 `npx eslint`(0 errors), 실행 중인 dev 서버에 curl로 End-to-End 확인 — 비로그인 `/developer` → `/login?redirect=/developer` 307, `/api/auth/me` 401, 로그인 실패 401, 로그인 성공 200 + `Set-Cookie: ai_session`, 로그인 상태 `/developer`·`/projects` 200, 로그인 상태 `/login` → `/developer` 307, 로그아웃 후 `/developer` 다시 307, 공개 페이지(`/`·`/about`·`/login`)는 비로그인으로도 200, `/api/devserver/status`는 비로그인으로도 200(CLI 호환성 확인)

---

## API Routes

**Status: ✅ Implemented (Development OS scope)**

- Description: 루트 Next.js 앱(`app/api/`)에 43개 Route Handler 존재(Dashboard v1에서 6개, Marketplace v1에서 3개 추가). CNBIZ Website(`apps/cnbiz-web`)에는 Contact 폼 전용 API 1개 존재.
- Evidence(루트, 전체 목록):
  - Agents: `app/api/agents/route.ts`, `app/api/agents/run/route.ts`, `app/api/agents/tasks/route.ts`, `app/api/agents/tasks/[id]/route.ts`, `app/api/agents/tasks/[id]/cancel/route.ts`
  - Auth: `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts` (자세한 내용은 `## Authentication` 참고)
  - Dev Inspector: `app/api/dev-inspector/{save-image,save-style,save-text}/route.ts`
  - Dev Server: `app/api/devserver/{start,stop,restart,status}/route.ts`
  - Health: `app/api/health/route.ts`, `app/api/health/run/route.ts` (신규, `## Dashboard` 참고)
  - Logs: `app/api/logs/route.ts`
  - Marketplace: `app/api/marketplace/route.ts`, `app/api/marketplace/installed/route.ts`, `app/api/marketplace/publish/route.ts`, `app/api/marketplace/[type]/[name]/route.ts` (Marketplace v1, `## Marketplace` 참고)
  - Projects: `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts`(GET/PATCH/**DELETE 신규**), `app/api/projects/bootstrap/route.ts`, `app/api/projects/health/route.ts`, `app/api/projects/import/route.ts`
  - Prompts: `app/api/prompts/route.ts`, `app/api/prompts/[id]/route.ts`, `app/api/prompts/[id]/execute/route.ts`
  - Providers: `app/api/providers/route.ts` (신규, `## Dashboard` 참고)
  - Sessions: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/run/route.ts`
  - Terminal: `app/api/terminal/route.ts`
  - Websites: `app/api/websites/route.ts` (신규, `## Dashboard` 참고)
  - Workflows: `app/api/workflows/route.ts`, `app/api/workflows/[id]/route.ts`, `app/api/workflows/[id]/run/route.ts`, `app/api/workflows/runs/route.ts`, `app/api/workflows/runs/[id]/route.ts`, `.../pause`, `.../resume`, `.../cancel`, `.../retry`
  - Workspaces: `app/api/workspaces/route.ts`
  - CNBIZ Website: `apps/cnbiz-web/app/api/contact/route.ts`

---

## Templates

**Status: ✅ Implemented (CLI) / 🚧 Partial (marketplace-facing package templates)**

- Description: CLI Generator가 사용하는 4종 템플릿(`agent`, `skill`, `website`, `workflow`)이 `packages/cli/src/templates/`에 실 콘텐츠로 존재. 반면 저장소 루트의 `packages/templates/`(마켓플레이스 게시용 패키지 템플릿 슬롯)는 README뿐인 빈 폴더.
- Evidence:
  - 실 콘텐츠: `packages/cli/src/templates/agent/*`, `packages/cli/src/templates/skill/*`, `packages/cli/src/templates/website/*`(→ Website Builder v2), `packages/cli/src/templates/workflow/*`, `packages/cli/src/generators/template.ts`
  - 빈 슬롯: `packages/templates/README.md`(콘텐츠 없음), `docs/06_TEMPLATES/*`(문서 템플릿 10종, 실제 코드 템플릿 아님)

---

## Documentation

**Status: ✅ Implemented**

- Description: `docs/`가 00~09 + 99 번호 체계로 구성되어 회사 정책·PMO·개발 표준·디자인 시스템·운영·AI 규칙·템플릿·지식·계획·작업이력·아카이브를 문서화. `AGENTS.md`/`CLAUDE.md`가 프로젝트 운영 규칙의 단일 진실 공급원 역할.
- Evidence(폴더별 파일 수, 현재 확인 기준):
  - `docs/00_COMPANY/`(4) — `PROJECT_VISION.md`, `ORGANIZATION.md`, `COMPANY_POLICY.md`, `DOCUMENT_INDEX.md`
  - `docs/01_PMO/`(4) — `PROJECT_ROADMAP.md`, `WBS.md`, `CHANGELOG.md`, `REQUEST.md`
  - `docs/02_DEVELOPMENT/`(4) — `CNBIZ_RULES.md`, `ARCHITECTURE.md`, `TECH_STACK.md`, `AI_COMPONENT_GUIDDE.md`
  - `docs/03_DESIGN/`(8) — `DESIGN_SYSTEM.md`·`UI_GUIDE.md`·`UX_GUIDE.md` + Design Automation 스펙 5종(`DESIGN_AUTOMATION_MASTER.md`·`CLAUDE_DESIGN_INTEGRATION.md`·`FIGMA_INTEGRATION.md`·`DESIGN_SYNC.md`·`DESIGN_WORKFLOW.md`, `## Design Automation Phase 1` 참고)
  - `docs/04_OPERATIONS/`(5)
  - `docs/05_AI/`(12) — `AGENTS.md`, `TOKEN_POLICY.md`, `WORKFLOW.md`, `PROMPTS.md` 등 + `docs/05_AI/skills/`
  - `docs/06_TEMPLATES/`(10)
  - `docs/07_KNOWLEDGE/`(2), `docs/08_PLANS/`(9 — 아래 참고)
  - `docs/09_WORK_HISTORY/`(5) — `CURRENT_CONTEXT.md`, `WORK_HISTORY.md` + `sessions/`
  - `docs/99_ARCHIVE/`(1)
- **`docs/08_PLANS/상가분양센터/`(7개 파일, 936KB, HTML/PDF/md)**: CNBIZ/AI Business OS와 무관한 것으로 보이는 별도 프로젝트("상가분양센터"=상업용 부동산 분양 센터) 화면 구조도·사용자 스토리보드·"의뢰자미팅용" 문서. **v1.0.0 클린업(2026-07-14)에서도 소유권 미확인으로 삭제하지 않고 그대로 유지**(`Remaining TODO` 참고, 실수로 함께 삭제될 뻔했으나 즉시 복구·재확인함).
- ~~`docs/` 최상위(번호 폴더 밖) 느슨한 파일 22개가 git에 커밋되어 있음~~ — **부분 해결(v1.0.0, 2026-07-14)**: 이전 감사 산출물로 추정되던 14개(`AGENT_AUDIT.md`, `CLI_AUDIT.md`, `CODE_QUALITY.md`, `DASHBOARD_AUDIT.md`, `FEATURE_MATRIX.md`, `IMPLEMENTATION_STATUS.md`, `PROJECT_AUDIT.md`, `PROJECT_STATUS.md`, `PROJECT_STATUS_CURRENT.md`, `REPOSITORY_AUDIT_COMPLETE.md`, `ROADMAP.md`, `TECH_DEBT.md`, `TODO_CURRENT.md`, `WEBSITE_BUILDER_AUDIT.md`, `WORKFLOW_AUDIT.md`)를 `git rm`했다 — 이 인덱스 문서(`REPOSITORY_INDEX.md`)가 유일한 최신 소스. 정상 운영 문서로 남긴 것: `README.md`, `UI_MAP.md`, `PROJECT_PAGES.md`, `faq.md`, `getting-started.md`, `installation.md`(Phase 5 계획 문서로 의도적 유지), `RELEASE_CHECKLIST.md`·`RELEASE_NOTES_v1.0.md`·`PRODUCTION_VALIDATION.md`(신규, Production Validation 결과).
- ~~`docs.zip`(240KB)·`docs_extract/`(70개 파일, 598KB)~~ — **해결됨(v1.0.0, 2026-07-14)**: `docs/` 스냅샷 압축본과 그 해제본으로 확인되어 `git rm`. `tree.txt`/`structure.txt`/`apps-tree.txt`/`packages-tree.txt`/`typescript-files.txt`(디렉터리 덤프 텍스트)와 `test-project/`(CLI 테스트 스크래치), `backup.bat`/`start-wor.bat`(구식 배치 스크립트, `ai devmode`/`ai deploy`로 대체됨)도 함께 제거했다.

---

## Tests

**Status: ✅ Implemented**

- Description: Vitest 기반 테스트 인프라(`vitest.config.ts`, `tests/setup.ts`, `npm test`/`test:watch`/`coverage`)를 신설하고 CI(`test.yml`)에도 연결. 기존 `tests/{e2e,fixtures,integration,mocks,performance,reports,security,unit}/`(README뿐인 빈 스텁)는 그대로 두고, 실제 코드를 검증하는 테스트를 `tests/{cli,workflow,website,agents,auth,projects,providers,websites,marketplace,marketplace-cli,health,ai-platform-cli,prompts,ai,audit,metrics,backup,design}/`에 추가. 47개 테스트 파일·333개 테스트 케이스(2026-07-15 Design Automation Phase 4 기준, Authentication 26개·Dashboard v1 27개·Marketplace v1 49개·AI Platform v1 43개·AI Provider Integration v1.1 17개·Production Validation Timeout 2개·Operations & Observability v1.1 20개·Design Automation Phase 1 21개·Phase 2 25개·Phase 3 25개·Phase 4 신규 32개 포함) 전부 실제 소스(가짜/no-op 아님)를 대상으로 함:
  - **Design Automation Phase 4(신규)** — `tests/design/prototype-generator.test.ts`(19개) + `tests/design/prototype-registry.test.ts`(8개, version 자동 증가 포함) + `tests/design/prototype-integration.test.ts`(5개, 실 fs 연동 4개(버전 증가 시나리오 포함) + 실제 CLI 서브프로세스 end-to-end 1개) + `tests/metrics/registry.test.ts`(`prototypeGenerationCount` 1개 추가), 자세한 내용은 `## Design Automation Phase 4` 참고.
  - **Design Automation Phase 3** — `tests/design/wireframe-generator.test.ts`(15개) + `tests/design/wireframe-registry.test.ts`(6개) + `tests/design/wireframe-integration.test.ts`(4개, 실 fs 연동 3개 + 실제 CLI 서브프로세스 end-to-end 1개) + `tests/metrics/registry.test.ts`(`wireframeGenerationCount` 1개 추가), 자세한 내용은 `## Design Automation Phase 3` 참고.
  - **Design Automation Phase 2** — `tests/design/storyboard-generator.test.ts`(14개) + `tests/design/storyboard-registry.test.ts`(6개) + `tests/design/storyboard-integration.test.ts`(4개, 실 fs 연동 3개 + 실제 CLI 서브프로세스 end-to-end 1개) + `tests/metrics/registry.test.ts`(`storyboardGenerationCount` 1개 추가), 자세한 내용은 `## Design Automation Phase 2` 참고.
  - **Design Automation Phase 1** — `tests/design/generator.test.ts`(12개) + `tests/design/registry.test.ts`(5개) + `tests/design/integration.test.ts`(4개, 실 fs 연동 3개 + 실제 CLI 서브프로세스 end-to-end 1개), 자세한 내용은 `## Design Automation Phase 1` 참고.
  - **Operations & Observability v1.1** — `tests/audit/log.test.ts`(7개, record/list/필터/정렬/500건 상한 트리밍) + `tests/metrics/registry.test.ts`(5개) + `tests/backup/registry.test.ts`(5개, export/import 왕복·부분 번들) + `tests/health/checks.test.ts`(`getSystemInfo()` 1개 추가) + `tests/auth/session.test.ts`(`countActiveSessions()` 2개 추가), 자세한 내용은 `## Operations & Observability v1.1` 참고.
  - **AI Provider Integration v1.1** — `tests/ai-platform-cli/{provider-retry,streaming}.test.ts`(17개) + `tests/providers/status.test.ts`(기존 5개 유지, OpenAI/Gemini 라이브 체크로 갱신), 자세한 내용은 `## AI Provider Integration v1.1` 참고.
  - **CLI startup** — 빌드된 `packages/cli/bin/ai.js`를 실제 하위 프로세스로 실행해 `--version`/`--help`/미등록 명령 처리를 검증(`dist/`가 없으면 skip). 루트 `pretest` 스크립트가 `npm test` 실행 전 CLI를 자동 빌드.
  - **Website Builder(CLI)** — `website/types.ts`(11개 사이트 타입·팔레트·카피)·`website/scaffold.ts`(`slugify()`/`resolveSiteType()`)·`website/content.ts`(Content Generator, 신규)의 실제 로직 검증.
  - **Workflow Engine** — `workflow/validator.ts`의 `validateWorkflowJson()`이 정상/비정상 `workflow.json`을 올바른 `WorkflowError` 코드로 구분하는지 검증.
  - **Utilities** — `utils/filesystem.ts`(`FileSystem`, 실제 임시 디렉터리에 대한 I/O 왕복)와 `utils/config.ts`(`findProjectRoot()`, 실제 저장소 트리 기준)를 `tests/cli/utils.test.ts`에서 검증.
  - **Agents(스켈레톤)** — `lib/agents/registry.ts`(Development OS Agent Service)의 3개 등록 Agent(`shell`/`claude-code`/`cursor`) 조회 로직 검증.
  - **Authentication** — `tests/auth/*`(password/users/session/auth/middleware), 자세한 내용은 `## Authentication` 참고.
  - **Dashboard v1** — `tests/{projects,providers,websites,health}/*.test.ts`, 자세한 내용은 `## Dashboard` 참고.
  - **Marketplace v1** — `tests/marketplace-cli/{manifest,local-provider,commands}.test.ts`(CLI 로직, subprocess 미사용, 38개) + `tests/marketplace/{registry,cli-bridge}.test.ts`(Dashboard 브리지, `execute()` mock, 11개), 자세한 내용은 `## Marketplace` 참고.
  - **AI Platform v1(신규)** — `tests/ai-platform-cli/{openrouter,provider-config,usage,prompt-library,task-ledger}.test.ts`(CLI 로직, 23개) + `tests/prompts/{registry,render}.test.ts`(Next.js Prompt Library, 11개) + `tests/agents/taskQueue-retry.test.ts`(Task Queue `retry()`, 실제 `shell` Agent로 검증, 3개) + `tests/ai/bridge.test.ts`(Dashboard↔CLI bridge, `execute()` mock, 6개), 자세한 내용은 `## AI Platform v1` 참고.
  - 이 작업 과정에서 실제로 발견·수정한 버그: `next build`의 TypeScript 타입체크가 루트 `tsconfig.json`(`exclude`가 비재귀 패턴이라 저장소 내 중첩 복제본까지 스캔)에서 빌드 실패 — `exclude`를 `"**/apps/**"`·`"**/packages/**"`·`"**/tests/**"` 재귀 패턴으로 교체(자세한 내용은 `## Build Status` 참고). Marketplace의 `remove`/`update` 명령이 애초에 한 번도 `install`과 맞물려 동작한 적이 없었던 버그도 이 과정에서 발견·수정(`## Marketplace` 참고). AI Platform v1 작업 중에는 `ProviderManager.readProvidersConfig()`가 파일이 없을 때 모듈 스코프 `DEFAULT_CONFIG` 객체를 참조로 반환해 쓰기 경로가 이를 영구 오염시키는 버그를 발견·수정(`## AI Platform v1` 참고).
  - 나머지 영역(Workflow/Agent Runtime의 실행 경로 자체, Orchestrator)은 아직 테스트 없음.
- Evidence: `vitest.config.ts`, `tests/setup.ts`, `tests/{cli,workflow,website,agents,auth,projects,providers,websites,marketplace,marketplace-cli,health,ai-platform-cli,prompts,ai,audit,metrics,backup,design}/*.test.ts`, 루트 `package.json`(`scripts.test`/`test:watch`/`coverage`/`pretest`, `devDependencies.vitest`/`@vitest/coverage-v8`), `.github/workflows/test.yml`

---

## CI/CD

**Status: 🚧 GitHub Actions updated for Vitest**

- Description: `.github/workflows/`에 5개 워크플로(`docs.yml`, `lint.yml`, `test.yml`, `security.yml`, `release.yml`)가 존재. `test.yml`을 실존하지 않던 `test:unit`/`test:integration`/`test:e2e` 스크립트 호출에서 실제 Vitest 스위트로 교체 완료.
  - `test.yml`(갱신) — `npm ci` → `npm run build --if-present`(루트 Next.js 앱 빌드) → `npm test`(Vitest 스위트 실행, `pretest`가 `@ai-business-os/cli` 빌드를 자동 수행) → `npm run coverage`(v8 커버리지 리포트 생성 후 아티팩트 업로드). 테스트 실패 시 해당 스텝이 0이 아닌 종료 코드를 반환해 워크플로 전체가 실패하도록 구성(별도 continue-on-error 없음). Node 20 매트릭스 유지.
  - **검증 방법**: 실제 GitHub Actions 실행 없이, `git archive HEAD`로 커밋된 상태를 추출한 뒤 당시 미커밋 변경분(신규 테스트·설정 파일)을 덧씌우고 `.git` 디렉터리만 별도로 생성(`actions/checkout@v4`와 동일 조건)한 격리된 스크래치 디렉터리에서 `npm ci`·`npm run build --if-present`·`npm test`·`npm run coverage`를 실제로 순서대로 실행 — 4단계 전부 종료 코드 0, 36개 테스트 전수 통과, `coverage/` 아티팩트 생성까지 확인. 검증 당시 로컬 워킹 디렉터리에 물리적으로 체크아웃되어 있던 `AI-Web-Master/`(중첩 복제본 실 파일)가 로컬 `npm run build`를 오염시켜 처음에는 실패했으나, `git archive`는 gitlink(`AI-Web-Master`는 `.gitmodules` 없이 커밋된 broken gitlink, `Documentation`/`Remaining TODO` 참고)의 실제 파일 내용을 포함하지 않으므로 `actions/checkout@v4` 기준 클린 체크아웃에는 이 문제가 재현되지 않음을 확인.
  - `lint.yml` — `npm run lint --if-present`(실질 동작, 이번 작업 범위 밖)
  - `security.yml` — `npm audit` + 시크릿 패턴 스캔(실질 동작, 이번 작업 범위 밖)
  - `docs.yml` — 필수 문서 파일 존재·빈 마크다운 파일 여부 검사(실질 동작, 이번 작업 범위 밖)
  - `release.yml` — 태그 push 시 문서 아카이브를 GitHub Release 자산으로 첨부(이번 작업 범위 밖)
- Evidence: `.github/workflows/{docs,lint,test,security,release}.yml`, 루트 `package.json`(`scripts`: `dev`/`build`/`start`/`lint`/`pretest`/`test`/`test:watch`/`coverage`)

---

## Build Status

**Status: ✅ 루트 앱 + `apps/cnbiz-web` 모두 정상 빌드 (2026-07-14)**

- Description: `npm run build`(루트)·`npx tsc --noEmit`(루트)·`apps/cnbiz-web`의 `npm run build`가 모두 타입 오류 없이 성공. 두 가지 서로 다른 원인으로 실패하던 것을 각각 최소 설정 변경으로 수정(애플리케이션 로직·Authentication 코드·`packages/cli`는 변경하지 않음):
  1. **루트 `tsc`/`next build`가 `AI-Web-Master/`(Remaining TODO에 기록된 `.gitmodules` 없는 broken gitlink, 커밋 `b954508`) 내부의 `apps/cnbiz-web` 복제본까지 타입체크하던 문제**: 루트 `tsconfig.json`의 `exclude`(`"apps"`, `"packages"`, `"tests"`)가 최상위 경로만 매칭하는 비재귀 패턴이라, `AI-Web-Master/apps/**` 같은 중첩 경로는 걸러지지 않고 `**/*.tsx` `include` 글롭에 그대로 포함됨. 그 결과 `AI-Web-Master/apps/cnbiz-web/app/about/page.tsx` 등이 **루트 tsconfig의 `@/*` 경로 별칭**(`apps/cnbiz-web` 자신의 것이 아님)으로 잘못 해석되어, 우연히 이름이 같은 루트 v1 레거시 컴포넌트(`components/sections/AboutHeroSection.tsx` 등, default export)와 충돌해 `TS2614`/`TS2307`을 발생시켰음. `apps/cnbiz-web`의 실제 소스 자체는 처음부터 정상이었음(격리된 `apps/cnbiz-web` 자체 빌드로 확인).
     - 수정: `tsconfig.json`의 `exclude`를 재귀 패턴(`"**/apps/**"`, `"**/packages/**"`, `"**/tests/**"`, `"**/node_modules/**"`)으로 교체.
  2. **`apps/cnbiz-web` 자체 빌드가 루트의 `proxy.ts`(이번 세션에서 Authentication 작업으로 신규 추가된 파일)를 자신의 파일로 오인하던 문제**: npm workspaces 모노레포에서 `next`가 루트에만 호이스팅되어 있어, Turbopack이 `apps/cnbiz-web`의 프로젝트 루트를 최상위 lockfile 기준(`D:\ai-web-master`)으로 자동 감지함. 그 결과 `apps/cnbiz-web`에 자체 `proxy.ts`가 없으면 Turbopack이 감지된 루트의 `proxy.ts`(Authentication 라우트 보호 로직)를 대신 사용하려 시도하고, `@/lib/auth/middleware`를 `apps/cnbiz-web`의 경로 별칭 기준으로 잘못 해석해 `Module not found` 오류가 발생. `turbopack.root`를 `apps/cnbiz-web` 자신으로 좁히는 방식은 호이스팅된 `next` 패키지 자체를 못 찾게 만들어(별도 `node_modules` 없음) 대안이 아니었음.
     - 수정: `apps/cnbiz-web/proxy.ts`(신규, no-op passthrough) 추가 — Next.js가 자기 자신에 가장 가까운 파일을 우선 사용하도록 만들어 루트 파일로의 폴백을 차단. Authentication 로직·`proxy.ts`(루트)는 무변경.
  3. **`.next/dev/types/routes.d.ts` 손상**: 이전 세션에서 강제 종료한 dev 서버가 쓰다 만 파일이 남아있었음(소스 아님, gitignore 대상 빌드 캐시) — `.next/` 삭제 후 재생성으로 해결, 소스 변경 없음.
- Evidence: `tsconfig.json`(`exclude` 재귀 패턴), `apps/cnbiz-web/proxy.ts`(신규, no-op)
- 검증(2026-07-14 최초): `npx tsc --noEmit`(루트, 0 errors) · `npm run build`(루트, 46개 라우트 정상 생성, `Proxy (Middleware)` 정상 표시) · `apps/cnbiz-web`의 `npm run build`(9개 라우트 정상 생성) · `npm run test`(62/62 통과, Authentication 26개 포함, 무변경) 전부 확인.
- **v1.0.0 클린업(2026-07-14) 갱신**: 원인이었던 `AI-Web-Master/`(broken gitlink) 자체를 저장소에서 제거했고, `eslint.config.mjs`의 `globalIgnores`도 재귀 패턴으로 교체해 lint 오류 0건을 달성함(`## Remaining TODO` 참고). 클린업 이후 `npx tsc --noEmit`·`npm run build`(루트+`apps/cnbiz-web`)·`npm run lint`·`npm test`(188/188) 전부 재검증 통과(`docs/RELEASE_CHECKLIST.md` 참고).

---

## Remaining TODO

- **Website Builder — 실 배포(Deployment) 자동 실행 없음**: `vercel.json`/`.env.example`만 생성되고 CLI가 실제 배포 명령을 실행하지 않음(Website Builder v2 > Deployment 참고).
- **Authentication — signup 백엔드 및 일부 내부 API 미보호**: 로그인/로그아웃/세션은 구현 완료(`## Authentication` 참고)했으나, `/signup`은 여전히 정적 폼(범위 밖)이고 `/api/workspaces`·`/api/terminal`·`/api/devserver` 등 다른 내부 API는 `packages/cli`(`ai devmode` 등)가 세션 없이 직접 호출하는 구조라 의도적으로 미보호 상태.
- **테스트 커버리지가 아직 얕음**: Website Builder/Workflow Engine/Utilities/Agent Runtime/Authentication 중 순수 로직 일부만 커버. Orchestrator·Provider 실제 호출·Development OS Workflow Engine(`lib/workflows`)·API 라우트·Dashboard 컴포넌트는 여전히 테스트 없음.
- **`lint.yml`에는 아직 build 스텝이 없음**: 빌드 검증은 `test.yml`에만 추가됨(`release.yml`은 태그 push 시에만 build 실행) — `lint.yml`도 별도로 build를 검증할지는 정책 결정 필요.
- ~~`eslint.config.mjs`의 `globalIgnores`도 `tsconfig.json`과 동일한 비재귀 패턴 버그가 있음~~ — **해결됨(v1.0.0, 2026-07-14)**: `"apps/**"`·`"packages/**"`·`"next-env.d.ts"`·`"build/**"`·`".next/**"`·`"out/**"`를 전부 재귀 패턴(`"**/apps/**"` 등)으로 교체하고 `"**/coverage/**"` 무시를 추가했다. 원인이었던 `AI-Web-Master/`(broken gitlink) 자체도 이번 클린업에서 제거됨.
- **⚠ 다른 프로젝트로 추정되는 자료가 이 저장소에 커밋되어 있음(`docs/08_PLANS/상가분양센터/`, 7개 파일, 936KB)**: CNBIZ/AI Business OS와 무관해 보이는 상업용 부동산 분양 관련 UI/UX 구조도·스토리보드·"의뢰자미팅용" 문서. v1.0.0 클린업에서도 **의도적으로 삭제하지 않았다** — 사용자 확인이 우선 필요하다는 판단은 여전히 유효.
- ~~저장소 루트 정리 필요~~ — **해결됨(v1.0.0, 2026-07-14)**: 자기 자신의 중첩 복제본(`AI-Web-Master/`, broken gitlink), 이전 감사 산출물(`docs.zip`, `docs_extract/`), 대형 텍스트 덤프(`tree.txt`, `structure.txt`, `apps-tree.txt`, `packages-tree.txt`, `typescript-files.txt`), 스크래치 프로젝트(`test-project/`), 구식 배치 스크립트(`backup.bat`, `start-wor.bat`), `docs/` 최상위 구 감사 문서 14종을 전부 `git rm`했다(히스토리 재작성은 하지 않음 — 과거 커밋에는 여전히 남아 있으나 HEAD 기준 작업 트리에는 없음). `docs/08_PLANS/상가분양센터/`만 소유권 미확인으로 예외 유지.
- **⚠ 루트 `app/{about,services,portfolio,contact}`(v1 레거시 CNBIZ 마케팅 페이지)가 Development OS와 같은 Next.js 앱에 여전히 공존**: `apps/cnbiz-web`(v2)로 실제 서비스가 이전되어 `WBS.md` 기준 2026-07-01부로 동결됐음에도, 루트 앱에서 인증 없이 계속 공개 상태로 서빙되고 있음(`proxy.ts`의 보호 대상은 `/developer/**`·`/projects/**`뿐). v1.0.0 클린업은 stabilization에 집중하기 위해 이 삭제를 범위에서 제외했다 — 별도 승인 후 제거 여부 결정 필요.
- **Agent Runtime / Workflow Engine 이원화**: Development OS(`lib/agents`, `lib/workflows`)와 CLI(`packages/cli/src/runtime`, `packages/cli/src/workflow`)에 유사한 개념이 각각 독립적으로 구현되어 있어 장기적으로 개념 통합 여부에 대한 결정이 필요(현재는 의도적으로 별개 애플리케이션이라 문제는 아님).
- **Marketplace v1 — 카탈로그가 여전히 얇음(1개 패키지)**: Production Validation(2026-07-14)에서 `agents/changelog-writer`를 실제로 게시해 `count: 0`이던 상태는 해소했으나(`## Production Validation` 참고), agents 외 4개 카테고리(prompts/skills/templates/workflows)는 여전히 0개. Install/Remove/Update 로직 자체는 2026-07-14에 수정·검증 완료(`## Marketplace` 참고).
- **Marketplace v1 — 온라인 레지스트리 Provider 없음**: `LocalMarketplaceProvider`(파일시스템 기반)만 존재. `getMarketplaceProvider()`가 향후 다른 Provider로 교체 가능하도록 인터페이스로 분리되어 있으나 실제 구현은 없음.
- **Dashboard v1 — Website Builder는 `packages/cli/dist/index.js`가 빌드되어 있어야 동작**: `npm run build --workspace=@ai-business-os/cli`(루트 `pretest`가 자동 실행) 이후에만 `/developer/websites`의 Create가 성공. 없으면 API가 400으로 명확히 안내하지만, 클린 체크아웃 직후 첫 사용 시 놓치기 쉬움.
- **Dashboard v1 — Logs 카테고리 이름이 요청한 "Application/Workflow/CLI" 표현과 다름**: 기존 Terminal/Git/AI/System 4개 카테고리(`lib/events/eventBus.ts`)를 그대로 두고 cross-cutting "Errors" 필터만 추가함(재설계 방지 목적). 정확한 이름 매핑이 필요하면 `EventCategory` 자체를 확장하는 별도 작업 필요.
- ~~Dashboard v1 검증 과정에서 생성된 실 CLI 산출물이 저장소에 남아있음~~ — **해결됨(2026-07-14)**: `/developer/websites` E2E 검증 중 `ai website create`가 자동 생성한 8개 Planning Agent 디렉터리(`agents/{business-analyst,component-generator,page-generator,project-generator,qa,seo-generator,site-planner,ui-designer}/`, git 미추적 확인 후 삭제 — 기존에 git으로 추적되던 `agents/*.md` 10개 파일은 무변경 보존), `workflows/website-builder/`(E2E 생성 샘플로 판단, CLI가 필요 시 자동 재생성하므로 삭제), `.runtime/`(에이전트 memory/history/실행 로그 등 캐시성 데이터로 확인 후 삭제 + `.gitignore`에 `/.runtime/` 추가) 정리 완료.
- **AI Platform v1 — `ai task`의 Cancel/Progress는 의도적으로 제한적**: Dashboard의 `taskQueue`(in-memory, Next.js 서버 프로세스 상주)와 달리 `ai task`는 CLI 프로세스가 만드는 파일 기반 원장(`.runtime/tasks.json`)만 다룬다. CLI 호출은 동기적이라 실행 중인 호출을 다른 프로세스에서 취소하거나 진행률을 볼 수 없음 — 이는 실제 아키텍처 경계(별도 OS 프로세스)이며 향후 CLI가 장기 실행 프로세스로 상주하는 구조로 바뀌지 않는 한 해소되지 않음(`## AI Platform v1` 참고, 위장하지 않고 문서화됨).
- **AI Platform v1 / AI Provider Integration v1.1 — 실제 API 키 미검증**: 이 개발 환경에는 실제 Anthropic/OpenAI/Gemini/OpenRouter API 키가 없어, `ai chat`(`--stream` 포함)/`ai prompt execute`/Dashboard AI Studio/Provider Status 라이브 헬스체크는 전부 mock된 `fetch` 또는 시뮬레이션 폴백 경로로만 확인됨(Website Builder와 동일한 기존 폴백 메커니즘 재사용, 신규 위험 아님). 실제 키 준비 후 재검증 권장 — 특히 재시도(`withRetry`)와 스트리밍 SSE 파싱은 실제 vendor 응답 형식과 100% 동일하다는 보장이 mock에는 없다.
- ~~`lib/providers/status.ts`(Dashboard Provider Status 그리드)가 OpenAI/Gemini를 env var 존재 여부만으로 판정~~ — **부분 해결(AI Provider Integration v1.1, 2026-07-14)**: 실제 모델 목록 엔드포인트를 호출하는 라이브 헬스체크로 교체함(`## AI Provider Integration v1.1` 참고). 다만 `lib/providers/status.ts`와 `packages/cli/src/providers/manager.ts`의 코드 자체는 여전히 두 곳에 독립적으로 존재 — 완전한 통합 여부는 아래 항목대로 별도 결정 필요.

---

## Recommended Next Tasks

> v1.0.0 클린업(2026-07-14)에서 처리된 항목(구 저장소 루트 정리, eslint 비재귀 패턴)은 목록에서 제거했다. 아래는 v1.0.0 이후에도 남아 있는 항목이다.

1. **`docs/08_PLANS/상가분양센터/` 소유권 확인** — v1.0.0 클린업에서도 삭제하지 않고 보류. 다른 고객사 자료로 추정되는 문서가 이 저장소에 남아 있음을 사용자에게 확인하고, `git rm`(및 민감도에 따라 히스토리 제거) 여부를 결정.
2. **루트 `app/{about,services,portfolio,contact}`(v1 레거시 CNBIZ 마케팅 페이지) 제거 여부 결정** — `apps/cnbiz-web`(v2)로 이미 대체됐으나 루트 앱에 인증 없이 공존 중. 삭제 승인 시 별도 작업으로 제거.
3. **테스트 커버리지 확장** — Orchestrator(`packages/cli/src/orchestrator`), Development OS Workflow Engine(`lib/workflows/engine.ts`), Provider 시뮬레이션 폴백 경로(`packages/cli/src/providers/manager.ts`) 등 아직 다루지 않은 영역에 순서대로 테스트 추가.
4. **Marketplace 실 데이터 계속 채우기** — Production Validation(2026-07-14)에서 `agents/changelog-writer` 1개를 실제로 게시해 최초 실 데이터를 채웠다(`## Production Validation` 참고). prompts/skills/templates/workflows 4개 카테고리는 여전히 0개 — 필요에 따라 추가 게시.
5. **Authentication — 다른 내부 API 보호 여부 결정** — `/developer/**`·`/projects/**`는 보호되지만 `/api/workspaces`·`/api/terminal`·`/api/devserver` 등은 `packages/cli` 호환을 위해 의도적으로 미보호 상태. CLI 쪽에도 세션 전달(예: API 토큰) 방식을 도입해 이 API들까지 보호 범위를 넓힐지, 현재 상태를 유지할지 결정 필요.
6. **온라인 Marketplace Provider 도입 여부 결정** — 현재는 `LocalMarketplaceProvider`(파일시스템)만 존재. 여러 프로젝트/팀 간 패키지 공유가 필요해지면 HTTP 기반 Provider를 `MarketplaceProvider` 인터페이스에 맞춰 추가하는 방향으로 확장 가능(인터페이스는 이미 이를 염두에 두고 분리되어 있음).
7. **AI Platform v1 / AI Provider Integration v1.1 — 실제 API 키로 검증 필요** — 이번 검증은 이 환경에 실제 Provider API 키가 없어 전부 시뮬레이션 폴백 또는 mock된 `fetch` 경로로만 확인됨(`## AI Platform v1`·`## AI Provider Integration v1.1` 참고). 실제 Anthropic/OpenAI/Gemini/OpenRouter 키가 준비되면 `ai provider set-key`·`ai chat`(`--stream` 포함)·`ai prompt execute`의 실제 응답·토큰 사용량 기록에 더해, 재시도(429/5xx 발생 시 실제로 재시도되는지)와 스트리밍(실제 SSE 응답이 청크 파싱과 어긋나지 않는지)도 재확인 권장.
8. **`lib/providers/status.ts`(Dashboard Provider Status 그리드)와 `packages/cli/src/providers/manager.ts`(AI Platform v1) 코드 통합 여부 결정** — AI Provider Integration v1.1(2026-07-14)에서 두 곳 모두 "실제로 호출해서 검증한다"는 동일한 원칙으로 의미론은 맞춰졌으나(`## AI Provider Integration v1.1` 참고), 코드 자체는 여전히 두 곳에 독립적으로 존재한다(`ProviderStatusWidget`은 두 결과를 병합해서 보여줄 뿐). 장기적으로 하나로 합칠지는 별도 결정 필요.
