# AI Business OS Repository Index

> 생성일: 2026-07-14 (최종 갱신: 2026-07-14 — 커밋 상태 재확인)
> 이 문서는 저장소의 **현재 소스 코드**만을 근거로 작성되었다. 이전 감사 보고서(`docs/PROJECT_STATUS*.md`, `docs/REPOSITORY_AUDIT_COMPLETE.md`, `docs/TODO_CURRENT.md` 등)는 내용을 참고하지 않았으나, 이번 갱신에서 이 파일들이 더 이상 "로컬 미추적 상태"가 아니라 **git에 커밋되어 저장소의 일부가 되었음**을 확인했다(커밋 `b2c0b6a`). `AI-Web-Master/`(이 저장소 자체의 중첩 복제본)도 실제로는 훨씬 이전 커밋(`b954508`)부터 이미 broken gitlink(모드 `160000`, `.gitmodules` 없음)로 추적되고 있었음을 이번에 재확인했다 — 이전 버전 문서에서 "git 미추적"이라 기술한 것은 부정확했다. 상세 내용은 `Documentation`·`Remaining TODO` 섹션 참고.

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
  - `ai workflow`, `ai memory`, `ai orchestrator`, `ai provider`, `ai tools`, `ai website` — 서브커맨드 그룹
  - `ai init`, `ai add`, `ai install`, `ai doctor`, `ai search`, `ai remove`, `ai update`, `ai publish`
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

**Status: ✅ Implemented**

`packages/cli/src/website/` + `packages/cli/src/templates/website/` — `ai website create` 명령. Business Analyst→Site Planner→...→Project Generator 8단계 Agent 파이프라인(Workflow Engine 재사용) + Content Engine으로 11페이지 Next.js 프로젝트를 생성.

- Evidence(진입점): `packages/cli/src/commands/website.ts`, `packages/cli/src/website/builder.ts`(`buildWebsite()`), `packages/cli/src/website/agents.ts`(8-Agent 파이프라인 spec), `packages/cli/src/website/scaffold.ts`(`scaffoldWebsiteProject()`)
- Dashboard v1(2026-07-14)에서 `/developer/websites`가 이 CLI 명령을 `child_process`로 직접 실행하는 UI를 추가함(`## Dashboard` 참고) — 파이프라인 자체는 무변경, 실행 방식만 대시보드에서 트리거 가능해짐. 실제 실행 시 `agents/`·`workflows/website-builder/`·`.runtime/`에 8개 Planning Agent·Workflow 정의가 최초 1회 생성됨(CLI의 기존 동작, Dashboard가 새로 만든 것 아님).

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

- Description: Provider Layer(`ProviderManager.complete()`)를 재사용해 페이지별 카피(헤드라인·기능·후기·플랜·FAQ·블로그 요약 등)를 생성. Provider 미설정/실패 시에도 예외 없이 결정론적 기본 콘텐츠로 폴백.
- Evidence: `packages/cli/src/website/content.ts`(`generateSiteContent()`), `packages/cli/src/providers/manager.ts`(`ProviderManager.complete()`), `packages/cli/src/prompt/renderer.ts`

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
  - **Dashboard Home**(`/developer`) — Projects·Running AI Tasks·Active Workflows·Marketplace Packages·Recent Activity·System Health 6개 위젯. 전부 기존 API를 그대로 소비(신규 로직 없음, `components/developer/dashboard/*Widget.tsx`).
  - **Project Manager**(`/projects`) — 기존 List/Recent/Open/Create/Details에 Delete 추가(`lib/projects/registry.ts`의 `deleteProject()`, `DELETE /api/projects/[id]`).
  - **AI Workspace**(`/developer/ai`) — 기존에는 Ollama/ChatGPT 카드가 하드코딩된 가짜 상태였음. `lib/providers/status.ts`(신규)로 Claude Code/Cursor(기존 `lib/agents/registry.ts` `isAvailable()` 재사용)·Local AI(Ollama, 실제 `fetch` 연결 확인)·OpenAI/Gemini(env var 존재 여부, `packages/cli`의 `ProviderManager.configured`와 동일한 의미론이나 해당 패키지는 import하지 않음) 5종 모두 실제 상태로 교체.
  - **Website Builder**(`/developer/websites`, 신규) — `ai website create` CLI를 `lib/commandEngine/engine.ts`의 `execute()`로 실제 실행(child process, 새 npm 의존성 없음). 생성 이력은 `lib/websites/registry.ts`(`lib/data/websites.json`)에 기록. 실제 E2E 검증: 8단계 Planning 파이프라인 실행 → `.generated-websites/<slug>`에 완전한 Next.js 프로젝트 생성 확인.
  - **Workflow Center**(`/developer/workflows`, 신규) — 신규 백엔드 없음. 기존 `/api/workflows`·`/api/workflows/runs*`(run/pause/resume/cancel/retry)를 그대로 소비하는 UI만 추가.
  - **GitHub**(`/developer/github`) — 변경 없음. 기존 구현이 Branch/Commit/Status/Push/Pull을 이미 충족.
  - **Marketplace**(`/developer/marketplace`, 신규) — `lib/marketplace/registry.ts`(신규)가 저장소 루트의 실제 `marketplace/manifest.json`을 읽어 카탈로그 요약(현재 5개 카테고리 모두 count 0, 정직한 빈 상태 표시)을 제공하고, 설치 추적은 별도 `lib/data/marketplace-installed.json`에 기록. `packages/cli/src/marketplace/*`는 재사용하지 않음(그 패키지의 `remove.ts`/`update.ts`가 `install.ts`/`publish.ts`와 디렉터리 규칙이 어긋나는 기존 버그가 있어, 대신 저장소에 이미 있는 fs-JSON 레지스트리 패턴을 새로 적용).
  - **Settings**(`/developer/settings`) — Profile·Authentication 카드 신규 추가(`useAuth()` 재사용), 기존 AI 카드에 `/api/providers`(AI Workspace와 동일 엔드포인트, 로직 재사용) 요약 링크 추가. Theme(General 하위)·Workspace는 기존 그대로 요건 충족.
  - **Logs**(`/developer/logs`) — 기존 Terminal/Git/AI/System 4개 필터에 cross-cutting "Errors" 필터 1개만 추가(백엔드 변경 없음).
  - **Health**(`/developer/health`, 신규) — `lib/health/checks.ts`(신규)가 Git Status(기존 `lib/commandEngine/commands.ts`의 `git:status` 카탈로그 재사용)·Disk Usage(Node 내장 `fs.statfsSync`, 신규 의존성 없음)는 실시간으로, Build/Tests/Coverage는 수동 "Run Now" 버튼으로 실제 `npm run build`/`test`/`coverage`를 실행(동일 command engine 재사용)해 `lib/data/health-checks.json`에 캐시. Coverage 비율 파싱을 위해 `vitest.config.ts`의 `coverage.reporter`에 `"json-summary"` 추가.
- Evidence: `app/developer/{page,workspace,terminal,github,ai,workflows,websites,marketplace,logs,health,settings,ui-map}/page.tsx`, `app/projects/{page.tsx,[id]/page.tsx}`, `components/developer/dashboard/*.tsx`, `lib/{providers,websites,marketplace,health}/*.ts`, `app/api/{providers,websites,marketplace,health}/**/route.ts`, `app/api/projects/[id]/route.ts`(DELETE), `components/developer/DeveloperNav.tsx`(13개 항목으로 확장)
- 테스트: `tests/{projects,providers,websites,marketplace,health}/*.test.ts`(신규, 총 27개 테스트) — 모두 `fs.mkdtempSync` 임시 디렉터리 격리 또는 순수 함수 검증, 실제 `npm run build`/`test`(느리고 재귀적)나 실제 CLI 서브프로세스는 유닛 테스트에서 실행하지 않음(수동 curl E2E로 별도 확인).
- 인증: 모든 신규 라우트는 이미 존재하는 `/developer/**` 보호 범위 안에 들어가므로 `proxy.ts` 변경 없이 자동으로 보호됨(확인 완료).
- 별도 대시보드는 CLI 쪽에는 없음(CLI는 터미널 메뉴 UI만 제공, `packages/cli/src/session/`).

---

## Marketplace

**Status: 🚧 Partial (CLI) / ✅ Dashboard tracking UI implemented — 2026-07-14**

- Description: CLI 쪽 로직(`ai search`/`ai publish`/`ai install`)은 로컬 파일시스템 기반으로 구현되어 있으나(`LocalMarketplaceProvider`), 저장소 루트의 `marketplace/manifest.json`은 `agents/prompts/skills/templates/workflows` 5개 카테고리 모두 `"count": 0`으로 실제 게시된 패키지가 하나도 없는 빈 상태. 온라인 레지스트리 Provider는 없음(로컬 Provider만 존재, `getMarketplaceProvider()` 주석에 "향후 온라인 레지스트리 추가" 명시). Dashboard v1(`## Dashboard` 참고)에서 `/developer/marketplace` 화면이 이 매니페스트를 실제로 읽어 표시하고 설치 추적 UI(Install/Remove)를 추가했지만, CLI의 `remove`/`update` 명령이 가진 디렉터리 규칙 불일치 버그는 이번 작업에서 고치지 않았고(범위 밖) 대시보드도 그 로직을 재사용하지 않는다 — 실제 게시된 패키지가 0개인 현재로서는 두 경로 모두 실질적인 차이가 없다.
- Evidence:
  - CLI 구현: `packages/cli/src/marketplace/{index,manifest,types}.ts`, `packages/cli/src/marketplace/providers/{local,types}.ts`, `packages/cli/src/commands/{publish,search,install,remove,update}.ts`
  - 빈 상태: `marketplace/manifest.json`(`"count": 0` × 5), `marketplace/{agents,prompts,skills,templates,workflows}/README.md`(내용 없이 안내문만 존재)
  - Dashboard 추적 UI(신규, CLI와 별개 구현): `lib/marketplace/registry.ts`, `app/api/marketplace/{route.ts,[name]/route.ts}`, `app/developer/marketplace/page.tsx`, `tests/marketplace/registry.test.ts`

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

- Description: 루트 Next.js 앱(`app/api/`)에 40개 Route Handler 존재(Dashboard v1에서 6개 추가: providers 1·websites 1·marketplace 2·health 2). CNBIZ Website(`apps/cnbiz-web`)에는 Contact 폼 전용 API 1개 존재.
- Evidence(루트, 전체 목록):
  - Agents: `app/api/agents/route.ts`, `app/api/agents/run/route.ts`, `app/api/agents/tasks/route.ts`, `app/api/agents/tasks/[id]/route.ts`, `app/api/agents/tasks/[id]/cancel/route.ts`
  - Auth: `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts` (자세한 내용은 `## Authentication` 참고)
  - Dev Inspector: `app/api/dev-inspector/{save-image,save-style,save-text}/route.ts`
  - Dev Server: `app/api/devserver/{start,stop,restart,status}/route.ts`
  - Health: `app/api/health/route.ts`, `app/api/health/run/route.ts` (신규, `## Dashboard` 참고)
  - Logs: `app/api/logs/route.ts`
  - Marketplace: `app/api/marketplace/route.ts`, `app/api/marketplace/[name]/route.ts` (신규, `## Dashboard` 참고)
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
- **`docs/08_PLANS/상가분양센터/`(7개 파일, 936KB, HTML/PDF/md)**: CNBIZ/AI Business OS와 무관한 것으로 보이는 별도 프로젝트("상가분양센터"=상업용 부동산 분양 센터) 화면 구조도·사용자 스토리보드·"의뢰자미팅용" 문서. 커밋 `b954508`에서 함께 추가됨. 다른 고객사 자료가 이 저장소에 잘못 포함됐을 가능성이 있어 `Remaining TODO`에 별도로 기록.
- **`docs/` 최상위(번호 폴더 밖) 느슨한 파일 22개가 git에 커밋되어 있음**: 두 그룹으로 나뉜다.
  - 정상 운영 문서로 보이는 것: `README.md`, `UI_MAP.md`, `PROJECT_PAGES.md`, `faq.md`, `getting-started.md`, `installation.md`(`docs/01_PMO/CHANGELOG.md`의 2026-07-05/07-09/07-10 기록과 일치, Phase 5 계획 문서로 의도적으로 유지 중인 것들 포함).
  - 이전 감사 산출물로 보이는 것(커밋 `deaeb45`, `b2c0b6a`에서 추가): `AGENT_AUDIT.md`, `CLI_AUDIT.md`, `CODE_QUALITY.md`, `DASHBOARD_AUDIT.md`, `FEATURE_MATRIX.md`, `IMPLEMENTATION_STATUS.md`, `PROJECT_AUDIT.md`, `PROJECT_STATUS.md`, `PROJECT_STATUS_CURRENT.md`, `REPOSITORY_AUDIT_COMPLETE.md`, `ROADMAP.md`, `TECH_DEBT.md`, `TODO_CURRENT.md`, `WEBSITE_BUILDER_AUDIT.md`, `WORKFLOW_AUDIT.md` — 이번 인덱스 작성·갱신에 이 파일들의 **내용**은 소스로 사용하지 않았다(사용자 요청 사항). 다만 이전 버전 문서에서 이들을 "git 미추적"이라 기술한 것은 부정확했음을 이번에 확인·정정한다 — 실제로는 커밋되어 저장소 히스토리에 포함되어 있다.
- **`docs.zip`(240KB)·`docs_extract/`(70개 파일, 598KB)**: `docs/` 스냅샷을 압축한 것과 그 압축 해제본으로 추정되며, 둘 다 커밋 `b2c0b6a`에서 함께 추가됨(git 미추적 로컬 파일이 아니라 이제 저장소에 커밋된 상태).

---

## Tests

**Status: ✅ Implemented**

- Description: Vitest 기반 테스트 인프라(`vitest.config.ts`, `tests/setup.ts`, `npm test`/`test:watch`/`coverage`)를 신설하고 CI(`test.yml`)에도 연결. 기존 `tests/{e2e,fixtures,integration,mocks,performance,reports,security,unit}/`(README뿐인 빈 스텁)는 그대로 두고, 실제 코드를 검증하는 테스트를 `tests/{cli,workflow,website,agents,auth,projects,providers,websites,marketplace,health}/`에 추가. 16개 테스트 파일·88개 테스트 케이스(2026-07-14 Dashboard v1 기준, Authentication 26개 포함) 전부 실제 소스(가짜/no-op 아님)를 대상으로 함:
  - **CLI startup** — 빌드된 `packages/cli/bin/ai.js`를 실제 하위 프로세스로 실행해 `--version`/`--help`/미등록 명령 처리를 검증(`dist/`가 없으면 skip). 루트 `pretest` 스크립트가 `npm test` 실행 전 CLI를 자동 빌드.
  - **Website Builder(CLI)** — `website/types.ts`(11개 사이트 타입·팔레트·카피)와 `website/scaffold.ts`(`slugify()`/`resolveSiteType()`)의 실제 로직 검증.
  - **Workflow Engine** — `workflow/validator.ts`의 `validateWorkflowJson()`이 정상/비정상 `workflow.json`을 올바른 `WorkflowError` 코드로 구분하는지 검증.
  - **Utilities** — `utils/filesystem.ts`(`FileSystem`, 실제 임시 디렉터리에 대한 I/O 왕복)와 `utils/config.ts`(`findProjectRoot()`, 실제 저장소 트리 기준)를 `tests/cli/utils.test.ts`에서 검증.
  - **Agents(스켈레톤)** — `lib/agents/registry.ts`(Development OS Agent Service)의 3개 등록 Agent(`shell`/`claude-code`/`cursor`) 조회 로직 검증.
  - **Authentication** — `tests/auth/*`(password/users/session/auth/middleware), 자세한 내용은 `## Authentication` 참고.
  - **Dashboard v1(신규)** — `tests/{projects,providers,websites,marketplace,health}/*.test.ts`, 자세한 내용은 `## Dashboard` 참고.
  - 이 작업 과정에서 실제로 발견·수정한 버그: `next build`의 TypeScript 타입체크가 루트 `tsconfig.json`(`exclude`가 비재귀 패턴이라 저장소 내 중첩 복제본까지 스캔)에서 빌드 실패 — `exclude`를 `"**/apps/**"`·`"**/packages/**"`·`"**/tests/**"` 재귀 패턴으로 교체(자세한 내용은 `## Build Status` 참고).
  - 나머지 영역(Workflow/Agent Runtime의 실행 경로 자체, Orchestrator, Provider 실제 호출)은 아직 테스트 없음.
- Evidence: `vitest.config.ts`, `tests/setup.ts`, `tests/{cli,workflow,website,agents,auth,projects,providers,websites,marketplace,health}/*.test.ts`, 루트 `package.json`(`scripts.test`/`test:watch`/`coverage`/`pretest`, `devDependencies.vitest`/`@vitest/coverage-v8`), `.github/workflows/test.yml`

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
- 검증: `npx tsc --noEmit`(루트, 0 errors) · `npm run build`(루트, 46개 라우트 정상 생성, `Proxy (Middleware)` 정상 표시) · `apps/cnbiz-web`의 `npm run build`(9개 라우트 정상 생성) · `npm run test`(62/62 통과, Authentication 26개 포함, 무변경) 전부 확인. `npm run lint`는 이번 작업 범위(build/tsc) 밖이며, `AI-Web-Master/`(동일한 broken gitlink) 내부 파일에서 나는 기존 lint 오류 3건은 그대로 남아있음(별도 승인 필요 항목, 아래 Remaining TODO 참고).

---

## Remaining TODO

- **Website Builder — 실 배포(Deployment) 자동 실행 없음**: `vercel.json`/`.env.example`만 생성되고 CLI가 실제 배포 명령을 실행하지 않음(Website Builder v2 > Deployment 참고).
- **Marketplace — 게시된 패키지 0개**: 로컬 Provider 구현은 있으나 `marketplace/manifest.json` 5개 카테고리 전부 `count: 0`, 온라인 레지스트리 Provider 없음.
- **Authentication — signup 백엔드 및 일부 내부 API 미보호**: 로그인/로그아웃/세션은 구현 완료(`## Authentication` 참고)했으나, `/signup`은 여전히 정적 폼(범위 밖)이고 `/api/workspaces`·`/api/terminal`·`/api/devserver` 등 다른 내부 API는 `packages/cli`(`ai devmode` 등)가 세션 없이 직접 호출하는 구조라 의도적으로 미보호 상태.
- **테스트 커버리지가 아직 얕음**: Website Builder/Workflow Engine/Utilities/Agent Runtime/Authentication 중 순수 로직 일부만 커버. Orchestrator·Provider 실제 호출·Development OS Workflow Engine(`lib/workflows`)·API 라우트·Dashboard 컴포넌트는 여전히 테스트 없음.
- **`lint.yml`에는 아직 build 스텝이 없음**: 빌드 검증은 `test.yml`에만 추가됨(`release.yml`은 태그 push 시에만 build 실행) — `lint.yml`도 별도로 build를 검증할지는 정책 결정 필요.
- **`eslint.config.mjs`의 `globalIgnores`도 `tsconfig.json`과 동일한 비재귀 패턴 버그가 있음**: `"apps/**"`·`"packages/**"`·`"*.cjs"`가 최상위 경로만 매칭해, `AI-Web-Master/`(broken gitlink) 내부 파일 3건이 `npm run lint`에서 계속 오류로 잡힘(`Build Status` 참고). 이번 작업은 build/tsc만 범위였기 때문에 `eslint.config.mjs`는 의도적으로 손대지 않음 — 저장소 루트 클린업(TODO 항목 참고)과 함께, 혹은 별도로 재귀 패턴(`"**/apps/**"` 등)으로 교체할지 결정 필요.
- **⚠ 다른 프로젝트로 추정되는 자료가 이 저장소에 커밋되어 있음(`docs/08_PLANS/상가분양센터/`, 7개 파일, 936KB)**: CNBIZ/AI Business OS와 무관해 보이는 상업용 부동산 분양 관련 UI/UX 구조도·스토리보드·"의뢰자미팅용" 문서가 커밋 `b954508`에 포함됨. 다른 고객사 자료 유출/오염 가능성이 있어 삭제 여부와 별개로 **사용자 확인이 우선 필요**.
- **저장소 루트 정리 필요(git에 이미 커밋된 상태, 로컬 미추적 파일이 아님)**: 이전 버전 문서와 달리 이제 아래 항목들은 모두 git 히스토리에 실제로 포함되어 있음이 확인됨 — 자기 자신의 중첩 복제본(`AI-Web-Master/`, `.gitmodules` 없이 커밋된 broken gitlink, 모드 `160000`, 커밋 `b954508`), 이전 감사 산출물(`docs.zip`, `docs_extract/`70개 파일, `docs/PROJECT_STATUS*.md`, `docs/REPOSITORY_AUDIT_COMPLETE.md`, `docs/TODO_CURRENT.md`, `docs/{AGENT,CLI,PROJECT,WEBSITE_BUILDER,WORKFLOW}_AUDIT.md` 등 커밋 `deaeb45`/`b2c0b6a`), 대형 텍스트 덤프(`tree.txt`, `structure.txt`, `apps-tree.txt`, `packages-tree.txt`, 커밋 `b954508`/`1148f3a`), 스크래치 프로젝트(`test-project/`, 커밋 `4e7900d`). 로컬 파일 삭제가 아니라 `git rm`(+커밋)이 필요하며, 저장소 히스토리에서 완전히 없애려면 히스토리 재작성 여부까지 사용자 승인이 필요(문서 관리 규칙).
- **Agent Runtime / Workflow Engine 이원화**: Development OS(`lib/agents`, `lib/workflows`)와 CLI(`packages/cli/src/runtime`, `packages/cli/src/workflow`)에 유사한 개념이 각각 독립적으로 구현되어 있어 장기적으로 개념 통합 여부에 대한 결정이 필요(현재는 의도적으로 별개 애플리케이션이라 문제는 아님).
- **Dashboard v1 — Marketplace는 여전히 실제 패키지 0개**: `/developer/marketplace`의 Install/Remove는 동작하지만 추적 전용(`lib/data/marketplace-installed.json`)이라, 실제 `ai publish`로 패키지를 게시하기 전까지는 "Available Packages"가 항상 0으로 보임. Update Available도 비교할 버전이 없어 N/A로 고정.
- **Dashboard v1 — Website Builder는 `packages/cli/dist/index.js`가 빌드되어 있어야 동작**: `npm run build --workspace=@ai-business-os/cli`(루트 `pretest`가 자동 실행) 이후에만 `/developer/websites`의 Create가 성공. 없으면 API가 400으로 명확히 안내하지만, 클린 체크아웃 직후 첫 사용 시 놓치기 쉬움.
- **Dashboard v1 — Logs 카테고리 이름이 요청한 "Application/Workflow/CLI" 표현과 다름**: 기존 Terminal/Git/AI/System 4개 카테고리(`lib/events/eventBus.ts`)를 그대로 두고 cross-cutting "Errors" 필터만 추가함(재설계 방지 목적). 정확한 이름 매핑이 필요하면 `EventCategory` 자체를 확장하는 별도 작업 필요.
- ~~Dashboard v1 검증 과정에서 생성된 실 CLI 산출물이 저장소에 남아있음~~ — **해결됨(2026-07-14)**: `/developer/websites` E2E 검증 중 `ai website create`가 자동 생성한 8개 Planning Agent 디렉터리(`agents/{business-analyst,component-generator,page-generator,project-generator,qa,seo-generator,site-planner,ui-designer}/`, git 미추적 확인 후 삭제 — 기존에 git으로 추적되던 `agents/*.md` 10개 파일은 무변경 보존), `workflows/website-builder/`(E2E 생성 샘플로 판단, CLI가 필요 시 자동 재생성하므로 삭제), `.runtime/`(에이전트 memory/history/실행 로그 등 캐시성 데이터로 확인 후 삭제 + `.gitignore`에 `/.runtime/` 추가) 정리 완료.

---

## Recommended Next Tasks

1. **`docs/08_PLANS/상가분양센터/` 소유권 확인(최우선)** — 다른 고객사 자료로 추정되는 문서가 이 저장소에 커밋되어 있음을 사용자에게 즉시 확인하고, 필요 시 `git rm`(및 민감도에 따라 히스토리 제거) 여부를 결정.
2. **저장소 루트 클린업 승인 요청** — `AI-Web-Master/`(broken gitlink)·`docs.zip`/`docs_extract/`·`tree.txt`/`structure.txt`/`apps-tree.txt`/`packages-tree.txt`·`test-project/`가 이미 git에 커밋되어 있음을 반영해, `git rm` 대상과 히스토리 재작성 필요 여부를 사용자와 함께 확정.
3. **테스트 커버리지 확장** — Orchestrator(`packages/cli/src/orchestrator`), Development OS Workflow Engine(`lib/workflows/engine.ts`), Provider 시뮬레이션 폴백 경로(`packages/cli/src/providers/manager.ts`) 등 아직 다루지 않은 영역에 순서대로 테스트 추가.
4. **Marketplace 실 데이터 채우기 또는 범위 재확정** — 로컬 Provider가 이미 동작하므로, 실제 `ai publish`로 최소 1개 이상의 agent/workflow/skill을 게시해 `marketplace/manifest.json`의 count를 실제 값으로 갱신하거나, Phase 5(Productization) 착수 시점까지 보류할지 명시적으로 결정.
5. **Authentication — 다른 내부 API 보호 여부 결정** — `/developer/**`·`/projects/**`는 보호되지만 `/api/workspaces`·`/api/terminal`·`/api/devserver` 등은 `packages/cli` 호환을 위해 의도적으로 미보호 상태. CLI 쪽에도 세션 전달(예: API 토큰) 방식을 도입해 이 API들까지 보호 범위를 넓힐지, 현재 상태를 유지할지 결정 필요.
6. **`eslint.config.mjs`의 비재귀 ignore 패턴 수정** — `tsconfig.json`과 동일한 버그가 `globalIgnores`에도 있어 `AI-Web-Master/` 내부 파일이 `npm run lint`에서 계속 오류로 잡힘(`Remaining TODO` 참고). 저장소 루트 클린업(#2)과 함께 처리하거나 선행 처리.
7. **Marketplace 실 데이터 채우기** — Dashboard의 Install/Remove UI는 이제 동작하므로, 실제 `ai publish`로 최소 1개 패키지를 게시해 End-to-End(게시→대시보드에 표시→설치)를 검증하면 좋음.
8. **OpenAI/Gemini 연결 상태의 실제 API 검증 여부 결정** — 현재 `/developer/ai`는 env var 존재 여부만으로 "Configured"를 판단(비용 없음, 의존성 없음). 실제 `/v1/models` 호출까지 검증할지는 후속 결정 필요.
