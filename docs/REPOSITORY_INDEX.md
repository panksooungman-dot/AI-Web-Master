# AI Business OS Repository Index

> 생성일: 2026-07-14 (최종 갱신: 2026-07-14 — v1.0.0 Release Candidate 정리 반영)
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
| `npm test`(Vitest) | ✅ 30 files / 188 tests 전부 통과 |

세부 근거는 `docs/RELEASE_CHECKLIST.md`(클린업·자동 검증)와 `docs/RELEASE_NOTES_v1.0.md`(신규 기능·Known Issues)를 참고. 아래 모듈별 섹션의 `Status` 표기는 이 릴리스 시점 기준으로 유지된다.

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
  - **Dashboard Home**(`/developer`) — Projects·Running AI Tasks·Active Workflows·Marketplace Packages·Provider Status·Token Usage·Recent Activity·System Health 8개 위젯(뒤 2개는 AI Platform v1, `## AI Platform v1` 참고). 전부 기존/신규 API를 그대로 소비(`components/developer/dashboard/*Widget.tsx`).
  - **Project Manager**(`/projects`) — 기존 List/Recent/Open/Create/Details에 Delete 추가(`lib/projects/registry.ts`의 `deleteProject()`, `DELETE /api/projects/[id]`).
  - **AI Workspace**(`/developer/ai`) — 기존에는 Ollama/ChatGPT 카드가 하드코딩된 가짜 상태였음. `lib/providers/status.ts`(신규)로 Claude Code/Cursor(기존 `lib/agents/registry.ts` `isAvailable()` 재사용)·Local AI(Ollama, 실제 `fetch` 연결 확인)·OpenAI/Gemini(env var 존재 여부, `packages/cli`의 `ProviderManager.configured`와 동일한 의미론이나 해당 패키지는 import하지 않음) 5종 모두 실제 상태로 교체.
  - **Website Builder**(`/developer/websites`, 신규) — `ai website create` CLI를 `lib/commandEngine/engine.ts`의 `execute()`로 실제 실행(child process, 새 npm 의존성 없음). 생성 이력은 `lib/websites/registry.ts`(`lib/data/websites.json`)에 기록. 실제 E2E 검증: 8단계 Planning 파이프라인 실행 → `.generated-websites/<slug>`에 완전한 Next.js 프로젝트 생성 확인.
  - **Workflow Center**(`/developer/workflows`, 신규) — 신규 백엔드 없음. 기존 `/api/workflows`·`/api/workflows/runs*`(run/pause/resume/cancel/retry)를 그대로 소비하는 UI만 추가.
  - **GitHub**(`/developer/github`) — 변경 없음. 기존 구현이 Branch/Commit/Status/Push/Pull을 이미 충족.
  - **Marketplace**(`/developer/marketplace`) — Dashboard v1에서는 자체 설치 추적 JSON(`lib/data/marketplace-installed.json`)이었으나, Marketplace v1(2026-07-14, `## Marketplace` 참고)에서 실제 CLI 패키지 시스템과 직접 통신하도록 전면 재구성됨. 4개 화면(Browse/Installed/Updates/Package Details)으로 확장.
  - **Settings**(`/developer/settings`) — Profile·Authentication 카드 신규 추가(`useAuth()` 재사용), 기존 AI 카드에 `/api/providers`(AI Workspace와 동일 엔드포인트, 로직 재사용) 요약 링크 추가. Theme(General 하위)·Workspace는 기존 그대로 요건 충족.
  - **Logs**(`/developer/logs`) — 기존 Terminal/Git/AI/System 4개 필터에 cross-cutting "Errors" 필터 1개만 추가(백엔드 변경 없음).
  - **Health**(`/developer/health`, 신규) — `lib/health/checks.ts`(신규)가 Git Status(기존 `lib/commandEngine/commands.ts`의 `git:status` 카탈로그 재사용)·Disk Usage(Node 내장 `fs.statfsSync`, 신규 의존성 없음)는 실시간으로, Build/Tests/Coverage는 수동 "Run Now" 버튼으로 실제 `npm run build`/`test`/`coverage`를 실행(동일 command engine 재사용)해 `lib/data/health-checks.json`에 캐시. Coverage 비율 파싱을 위해 `vitest.config.ts`의 `coverage.reporter`에 `"json-summary"` 추가.
- Evidence: `app/developer/{page,workspace,terminal,github,ai,workflows,websites,marketplace,logs,health,settings,ui-map}/page.tsx`, `app/projects/{page.tsx,[id]/page.tsx}`, `components/developer/dashboard/*.tsx`, `lib/{providers,websites,marketplace,health}/*.ts`, `app/api/{providers,websites,marketplace,health}/**/route.ts`, `app/api/projects/[id]/route.ts`(DELETE), `components/developer/DeveloperNav.tsx`(13개 항목으로 확장)
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
- 여전히 남은 것: 실제로 `ai publish`(또는 대시보드의 Publish)를 실행하기 전까지는 저장소의 실제 `marketplace/manifest.json` 5개 카테고리가 여전히 `count: 0`이다 — 메커니즘은 이제 정상 동작하지만, 아직 아무도 실제 패키지를 게시하지 않았을 뿐이다.

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
  - `docs/03_DESIGN/`(3) — `DESIGN_SYSTEM.md` 등
  - `docs/04_OPERATIONS/`(5)
  - `docs/05_AI/`(12) — `AGENTS.md`, `TOKEN_POLICY.md`, `WORKFLOW.md`, `PROMPTS.md` 등 + `docs/05_AI/skills/`
  - `docs/06_TEMPLATES/`(10)
  - `docs/07_KNOWLEDGE/`(2), `docs/08_PLANS/`(9 — 아래 참고)
  - `docs/09_WORK_HISTORY/`(5) — `CURRENT_CONTEXT.md`, `WORK_HISTORY.md` + `sessions/`
  - `docs/99_ARCHIVE/`(1)
- **`docs/08_PLANS/상가분양센터/`(7개 파일, 936KB, HTML/PDF/md)**: CNBIZ/AI Business OS와 무관한 것으로 보이는 별도 프로젝트("상가분양센터"=상업용 부동산 분양 센터) 화면 구조도·사용자 스토리보드·"의뢰자미팅용" 문서. **v1.0.0 클린업(2026-07-14)에서도 소유권 미확인으로 삭제하지 않고 그대로 유지**(`Remaining TODO` 참고, 실수로 함께 삭제될 뻔했으나 즉시 복구·재확인함).
- ~~`docs/` 최상위(번호 폴더 밖) 느슨한 파일 22개가 git에 커밋되어 있음~~ — **부분 해결(v1.0.0, 2026-07-14)**: 이전 감사 산출물로 추정되던 14개(`AGENT_AUDIT.md`, `CLI_AUDIT.md`, `CODE_QUALITY.md`, `DASHBOARD_AUDIT.md`, `FEATURE_MATRIX.md`, `IMPLEMENTATION_STATUS.md`, `PROJECT_AUDIT.md`, `PROJECT_STATUS.md`, `PROJECT_STATUS_CURRENT.md`, `REPOSITORY_AUDIT_COMPLETE.md`, `ROADMAP.md`, `TECH_DEBT.md`, `TODO_CURRENT.md`, `WEBSITE_BUILDER_AUDIT.md`, `WORKFLOW_AUDIT.md`)를 `git rm`했다 — 이 인덱스 문서(`REPOSITORY_INDEX.md`)가 유일한 최신 소스. 정상 운영 문서로 남긴 것: `README.md`, `UI_MAP.md`, `PROJECT_PAGES.md`, `faq.md`, `getting-started.md`, `installation.md`(Phase 5 계획 문서로 의도적 유지), `RELEASE_CHECKLIST.md`·`RELEASE_NOTES_v1.0.md`(신규).
- ~~`docs.zip`(240KB)·`docs_extract/`(70개 파일, 598KB)~~ — **해결됨(v1.0.0, 2026-07-14)**: `docs/` 스냅샷 압축본과 그 해제본으로 확인되어 `git rm`. `tree.txt`/`structure.txt`/`apps-tree.txt`/`packages-tree.txt`/`typescript-files.txt`(디렉터리 덤프 텍스트)와 `test-project/`(CLI 테스트 스크래치), `backup.bat`/`start-wor.bat`(구식 배치 스크립트, `ai devmode`/`ai deploy`로 대체됨)도 함께 제거했다.

---

## Tests

**Status: ✅ Implemented**

- Description: Vitest 기반 테스트 인프라(`vitest.config.ts`, `tests/setup.ts`, `npm test`/`test:watch`/`coverage`)를 신설하고 CI(`test.yml`)에도 연결. 기존 `tests/{e2e,fixtures,integration,mocks,performance,reports,security,unit}/`(README뿐인 빈 스텁)는 그대로 두고, 실제 코드를 검증하는 테스트를 `tests/{cli,workflow,website,agents,auth,projects,providers,websites,marketplace,marketplace-cli,health,ai-platform-cli,prompts,ai}/`에 추가. 30개 테스트 파일·188개 테스트 케이스(2026-07-14 AI Platform v1 기준, Authentication 26개·Dashboard v1 27개·Marketplace v1 49개·AI Platform v1 43개 포함) 전부 실제 소스(가짜/no-op 아님)를 대상으로 함:
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
- Evidence: `vitest.config.ts`, `tests/setup.ts`, `tests/{cli,workflow,website,agents,auth,projects,providers,websites,marketplace,marketplace-cli,health,ai-platform-cli,prompts,ai}/*.test.ts`, 루트 `package.json`(`scripts.test`/`test:watch`/`coverage`/`pretest`, `devDependencies.vitest`/`@vitest/coverage-v8`), `.github/workflows/test.yml`

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
- **Marketplace v1 — 메커니즘은 정상이지만 실제 게시된 패키지는 여전히 0개**: `ai marketplace publish`(또는 Dashboard의 Publish)를 아무도 실행하지 않아 `marketplace/manifest.json` 5개 카테고리가 여전히 `count: 0`. Install/Remove/Update 로직 자체는 2026-07-14에 수정·검증 완료(`## Marketplace` 참고) — 남은 건 실제 콘텐츠뿐.
- **Marketplace v1 — 온라인 레지스트리 Provider 없음**: `LocalMarketplaceProvider`(파일시스템 기반)만 존재. `getMarketplaceProvider()`가 향후 다른 Provider로 교체 가능하도록 인터페이스로 분리되어 있으나 실제 구현은 없음.
- **Dashboard v1 — Website Builder는 `packages/cli/dist/index.js`가 빌드되어 있어야 동작**: `npm run build --workspace=@ai-business-os/cli`(루트 `pretest`가 자동 실행) 이후에만 `/developer/websites`의 Create가 성공. 없으면 API가 400으로 명확히 안내하지만, 클린 체크아웃 직후 첫 사용 시 놓치기 쉬움.
- **Dashboard v1 — Logs 카테고리 이름이 요청한 "Application/Workflow/CLI" 표현과 다름**: 기존 Terminal/Git/AI/System 4개 카테고리(`lib/events/eventBus.ts`)를 그대로 두고 cross-cutting "Errors" 필터만 추가함(재설계 방지 목적). 정확한 이름 매핑이 필요하면 `EventCategory` 자체를 확장하는 별도 작업 필요.
- ~~Dashboard v1 검증 과정에서 생성된 실 CLI 산출물이 저장소에 남아있음~~ — **해결됨(2026-07-14)**: `/developer/websites` E2E 검증 중 `ai website create`가 자동 생성한 8개 Planning Agent 디렉터리(`agents/{business-analyst,component-generator,page-generator,project-generator,qa,seo-generator,site-planner,ui-designer}/`, git 미추적 확인 후 삭제 — 기존에 git으로 추적되던 `agents/*.md` 10개 파일은 무변경 보존), `workflows/website-builder/`(E2E 생성 샘플로 판단, CLI가 필요 시 자동 재생성하므로 삭제), `.runtime/`(에이전트 memory/history/실행 로그 등 캐시성 데이터로 확인 후 삭제 + `.gitignore`에 `/.runtime/` 추가) 정리 완료.
- **AI Platform v1 — `ai task`의 Cancel/Progress는 의도적으로 제한적**: Dashboard의 `taskQueue`(in-memory, Next.js 서버 프로세스 상주)와 달리 `ai task`는 CLI 프로세스가 만드는 파일 기반 원장(`.runtime/tasks.json`)만 다룬다. CLI 호출은 동기적이라 실행 중인 호출을 다른 프로세스에서 취소하거나 진행률을 볼 수 없음 — 이는 실제 아키텍처 경계(별도 OS 프로세스)이며 향후 CLI가 장기 실행 프로세스로 상주하는 구조로 바뀌지 않는 한 해소되지 않음(`## AI Platform v1` 참고, 위장하지 않고 문서화됨).
- **AI Platform v1 — 실제 API 키 미검증**: 이 개발 환경에는 실제 Anthropic/OpenAI/Gemini/OpenRouter API 키가 없어, `ai chat`/`ai prompt execute`/Dashboard AI Studio는 전부 시뮬레이션 폴백 경로로만 확인됨(Website Builder와 동일한 기존 폴백 메커니즘 재사용, 신규 위험 아님). 실제 키 준비 후 재검증 권장.

---

## Recommended Next Tasks

> v1.0.0 클린업(2026-07-14)에서 처리된 항목(구 저장소 루트 정리, eslint 비재귀 패턴)은 목록에서 제거했다. 아래는 v1.0.0 이후에도 남아 있는 항목이다.

1. **`docs/08_PLANS/상가분양센터/` 소유권 확인** — v1.0.0 클린업에서도 삭제하지 않고 보류. 다른 고객사 자료로 추정되는 문서가 이 저장소에 남아 있음을 사용자에게 확인하고, `git rm`(및 민감도에 따라 히스토리 제거) 여부를 결정.
2. **루트 `app/{about,services,portfolio,contact}`(v1 레거시 CNBIZ 마케팅 페이지) 제거 여부 결정** — `apps/cnbiz-web`(v2)로 이미 대체됐으나 루트 앱에 인증 없이 공존 중. 삭제 승인 시 별도 작업으로 제거.
3. **테스트 커버리지 확장** — Orchestrator(`packages/cli/src/orchestrator`), Development OS Workflow Engine(`lib/workflows/engine.ts`), Provider 시뮬레이션 폴백 경로(`packages/cli/src/providers/manager.ts`) 등 아직 다루지 않은 영역에 순서대로 테스트 추가.
4. **Marketplace 실 데이터 채우기** — Install/Remove/Update/Publish 메커니즘은 이제 CLI·Dashboard 양쪽에서 검증 완료(`## Marketplace` 참고)했으므로, 실제 `ai marketplace publish`로 agent/workflow/skill을 최소 1개 이상 게시해 `marketplace/manifest.json`의 count를 실제 값으로 갱신 — 남은 유일한 작업.
5. **Authentication — 다른 내부 API 보호 여부 결정** — `/developer/**`·`/projects/**`는 보호되지만 `/api/workspaces`·`/api/terminal`·`/api/devserver` 등은 `packages/cli` 호환을 위해 의도적으로 미보호 상태. CLI 쪽에도 세션 전달(예: API 토큰) 방식을 도입해 이 API들까지 보호 범위를 넓힐지, 현재 상태를 유지할지 결정 필요.
6. **온라인 Marketplace Provider 도입 여부 결정** — 현재는 `LocalMarketplaceProvider`(파일시스템)만 존재. 여러 프로젝트/팀 간 패키지 공유가 필요해지면 HTTP 기반 Provider를 `MarketplaceProvider` 인터페이스에 맞춰 추가하는 방향으로 확장 가능(인터페이스는 이미 이를 염두에 두고 분리되어 있음).
7. **AI Platform v1 — 실제 API 키로 검증 필요** — 이번 검증은 이 환경에 실제 Provider API 키가 없어 전부 시뮬레이션 폴백 경로로만 확인됨(`## AI Platform v1` 참고). 실제 Anthropic/OpenAI/Gemini/OpenRouter 키가 준비되면 `ai provider set-key`·`ai chat`·`ai prompt execute`의 실제 응답·토큰 사용량 기록을 재확인 권장.
8. **`lib/providers/status.ts`(Dashboard Provider Status 그리드)와 `packages/cli/src/providers/manager.ts`(AI Platform v1) 통합 여부 결정** — 현재 두 곳 모두 "Provider 연결 상태"를 별도로 계산한다(`ProviderStatusWidget`은 두 결과를 병합해서 보여줄 뿐, 내부 로직은 여전히 둘). 장기적으로 하나로 합칠지는 별도 결정 필요.
