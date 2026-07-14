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

**Status: ✅ Implemented (Development OS scope only)**

- Description: `/developer` 하위에 Workspace·Terminal·GitHub·AI·Logs·Settings 관리 화면과 UI Map Explorer(화면별 인라인 iframe 미리보기)를 제공. `/projects`에 Project Manager(목록·생성·상세 대시보드: Git 상태·AI 도구 상태·Recent Activity) 제공.
- Evidence: `app/developer/{page,workspace,terminal,github,ai,logs,settings,ui-map}/page.tsx`, `app/projects/{page.tsx,[id]/page.tsx}`, `components/developer/DevServerManagerCard.tsx`, `components/developer/UiMapExplorer.tsx`
- 별도 대시보드는 CLI 쪽에는 없음(CLI는 터미널 메뉴 UI만 제공, `packages/cli/src/session/`).

---

## Marketplace

**Status: 🚧 Partial**

- Description: CLI 쪽 로직(`ai search`/`ai publish`/`ai install`)은 로컬 파일시스템 기반으로 구현되어 있으나(`LocalMarketplaceProvider`), 저장소 루트의 `marketplace/manifest.json`은 `agents/prompts/skills/templates/workflows` 5개 카테고리 모두 `"count": 0`으로 실제 게시된 패키지가 하나도 없는 빈 상태. 온라인 레지스트리 Provider는 없음(로컬 Provider만 존재, `getMarketplaceProvider()` 주석에 "향후 온라인 레지스트리 추가" 명시).
- Evidence:
  - 구현: `packages/cli/src/marketplace/{index,manifest,types}.ts`, `packages/cli/src/marketplace/providers/{local,types}.ts`, `packages/cli/src/commands/{publish,search,install,remove,update}.ts`
  - 빈 상태: `marketplace/manifest.json`(`"count": 0` × 5), `marketplace/{agents,prompts,skills,templates,workflows}/README.md`(내용 없이 안내문만 존재)

---

## Authentication

**Status: ❌ Not Implemented**

- Description: `/login`, `/signup` 페이지가 존재하나 순수 UI 폼(Client Component)뿐이며 `onSubmit`이 `e.preventDefault()`만 호출하고 실제 인증 요청·세션 생성 로직이 전혀 없음. 저장소 전체에서 `supabase.auth`, NextAuth, JWT, 세션 검증 등 실제 인증 구현을 나타내는 코드가 발견되지 않음(`lib/supabase.ts`는 클라이언트 초기화만 존재, 실사용처 없음).
- Evidence: `app/login/page.tsx`, `app/signup/page.tsx`(둘 다 `handleSubmit`이 `preventDefault()`만 수행), `lib/supabase.ts`(초기화 코드만 존재, import하는 곳 없음)

---

## API Routes

**Status: ✅ Implemented (Development OS scope)**

- Description: 루트 Next.js 앱(`app/api/`)에 31개 Route Handler 존재. CNBIZ Website(`apps/cnbiz-web`)에는 Contact 폼 전용 API 1개 존재.
- Evidence(루트, 전체 목록):
  - Agents: `app/api/agents/route.ts`, `app/api/agents/run/route.ts`, `app/api/agents/tasks/route.ts`, `app/api/agents/tasks/[id]/route.ts`, `app/api/agents/tasks/[id]/cancel/route.ts`
  - Dev Inspector: `app/api/dev-inspector/{save-image,save-style,save-text}/route.ts`
  - Dev Server: `app/api/devserver/{start,stop,restart,status}/route.ts`
  - Logs: `app/api/logs/route.ts`
  - Projects: `app/api/projects/route.ts`, `app/api/projects/[id]/route.ts`, `app/api/projects/bootstrap/route.ts`, `app/api/projects/health/route.ts`, `app/api/projects/import/route.ts`
  - Prompts: `app/api/prompts/route.ts`, `app/api/prompts/[id]/route.ts`, `app/api/prompts/[id]/execute/route.ts`
  - Sessions: `app/api/sessions/route.ts`, `app/api/sessions/[id]/route.ts`, `app/api/sessions/[id]/run/route.ts`
  - Terminal: `app/api/terminal/route.ts`
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

- Description: Vitest 기반 테스트 인프라(`vitest.config.ts`, `tests/setup.ts`, `npm test`/`test:watch`/`coverage`)를 신설하고 CI(`test.yml`)에도 연결. 기존 `tests/{e2e,fixtures,integration,mocks,performance,reports,security,unit}/`(README뿐인 빈 스텁)는 그대로 두고, 실제 코드를 검증하는 테스트를 4개 신규 폴더(`tests/cli`·`tests/workflow`·`tests/website`·`tests/agents`)에 추가. 6개 테스트 파일·36개 테스트 케이스 전부 실제 소스(가짜/no-op 아님)를 대상으로 하며, 로컬 실행과 CI와 동일한 클린 체크아웃(`npm ci` → `npm run build` → `npm test` → `npm run coverage`) 양쪽에서 전수 통과 확인:
  - **CLI startup** — 빌드된 `packages/cli/bin/ai.js`를 실제 하위 프로세스로 실행해 `--version`/`--help`/미등록 명령 처리를 검증(`dist/`가 없으면 skip). 루트 `pretest` 스크립트가 `npm test` 실행 전 CLI를 자동 빌드.
  - **Website Builder** — `website/types.ts`(11개 사이트 타입·팔레트·카피)와 `website/scaffold.ts`(`slugify()`/`resolveSiteType()`)의 실제 로직 검증.
  - **Workflow Engine** — `workflow/validator.ts`의 `validateWorkflowJson()`이 정상/비정상 `workflow.json`을 올바른 `WorkflowError` 코드로 구분하는지 검증.
  - **Utilities** — `utils/filesystem.ts`(`FileSystem`, 실제 임시 디렉터리에 대한 I/O 왕복)와 `utils/config.ts`(`findProjectRoot()`, 실제 저장소 트리 기준)를 `tests/cli/utils.test.ts`에서 검증.
  - **Agents(스켈레톤)** — `lib/agents/registry.ts`(Development OS Agent Service)의 3개 등록 Agent(`shell`/`claude-code`/`cursor`) 조회 로직 검증.
  - 이 작업 과정에서 실제로 발견·수정한 버그: `next build`의 TypeScript 타입체크가 루트 `tsconfig.json`(`exclude`에 `tests`가 없었음)을 통해 신규 `tests/**`까지 스캔해 `tests/setup.ts`의 `process.env.NODE_ENV` 대입(읽기 전용 타입)에서 빌드 실패 — `tsconfig.json`의 `exclude`에 `"tests"`를 추가(기존 `apps`/`packages` 제외 패턴과 동일한 방식)하고 `tests/setup.ts`는 불필요해진 대입 없이 최소화.
  - 나머지 영역(Workflow/Agent Runtime의 실행 경로 자체, Orchestrator, Provider 실제 호출, Dashboard/API 라우트 등)은 아직 테스트 없음.
- Evidence: `vitest.config.ts`, `tests/setup.ts`, `tests/cli/{startup,utils}.test.ts`, `tests/website/{types,scaffold}.test.ts`, `tests/workflow/validator.test.ts`, `tests/agents/registry.test.ts`, 루트 `package.json`(`scripts.test`/`test:watch`/`coverage`/`pretest`, `devDependencies.vitest`/`@vitest/coverage-v8`), 루트 `tsconfig.json`(`exclude: ["node_modules","apps","packages","tests"]`), `.github/workflows/test.yml`

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

## Remaining TODO

- **Website Builder — 실 배포(Deployment) 자동 실행 없음**: `vercel.json`/`.env.example`만 생성되고 CLI가 실제 배포 명령을 실행하지 않음(Website Builder v2 > Deployment 참고).
- **Marketplace — 게시된 패키지 0개**: 로컬 Provider 구현은 있으나 `marketplace/manifest.json` 5개 카테고리 전부 `count: 0`, 온라인 레지스트리 Provider 없음.
- **Authentication 완전 미구현**: `/login`·`/signup`이 정적 폼뿐이며 세션·토큰 발급 로직 없음.
- **테스트 커버리지가 아직 얕음**: Website Builder/Workflow Engine/Utilities/Agent Runtime 중 순수 로직 일부만 커버. Orchestrator·Provider 실제 호출·Development OS Workflow Engine(`lib/workflows`)·API 라우트·Dashboard 컴포넌트는 여전히 테스트 없음.
- **`lint.yml`에는 아직 build 스텝이 없음**: 빌드 검증은 `test.yml`에만 추가됨(`release.yml`은 태그 push 시에만 build 실행) — `lint.yml`도 별도로 build를 검증할지는 정책 결정 필요.
- **⚠ 다른 프로젝트로 추정되는 자료가 이 저장소에 커밋되어 있음(`docs/08_PLANS/상가분양센터/`, 7개 파일, 936KB)**: CNBIZ/AI Business OS와 무관해 보이는 상업용 부동산 분양 관련 UI/UX 구조도·스토리보드·"의뢰자미팅용" 문서가 커밋 `b954508`에 포함됨. 다른 고객사 자료 유출/오염 가능성이 있어 삭제 여부와 별개로 **사용자 확인이 우선 필요**.
- **저장소 루트 정리 필요(git에 이미 커밋된 상태, 로컬 미추적 파일이 아님)**: 이전 버전 문서와 달리 이제 아래 항목들은 모두 git 히스토리에 실제로 포함되어 있음이 확인됨 — 자기 자신의 중첩 복제본(`AI-Web-Master/`, `.gitmodules` 없이 커밋된 broken gitlink, 모드 `160000`, 커밋 `b954508`), 이전 감사 산출물(`docs.zip`, `docs_extract/`70개 파일, `docs/PROJECT_STATUS*.md`, `docs/REPOSITORY_AUDIT_COMPLETE.md`, `docs/TODO_CURRENT.md`, `docs/{AGENT,CLI,PROJECT,WEBSITE_BUILDER,WORKFLOW}_AUDIT.md` 등 커밋 `deaeb45`/`b2c0b6a`), 대형 텍스트 덤프(`tree.txt`, `structure.txt`, `apps-tree.txt`, `packages-tree.txt`, 커밋 `b954508`/`1148f3a`), 스크래치 프로젝트(`test-project/`, 커밋 `4e7900d`). 로컬 파일 삭제가 아니라 `git rm`(+커밋)이 필요하며, 저장소 히스토리에서 완전히 없애려면 히스토리 재작성 여부까지 사용자 승인이 필요(문서 관리 규칙).
- **Agent Runtime / Workflow Engine 이원화**: Development OS(`lib/agents`, `lib/workflows`)와 CLI(`packages/cli/src/runtime`, `packages/cli/src/workflow`)에 유사한 개념이 각각 독립적으로 구현되어 있어 장기적으로 개념 통합 여부에 대한 결정이 필요(현재는 의도적으로 별개 애플리케이션이라 문제는 아님).

---

## Recommended Next Tasks

1. **`docs/08_PLANS/상가분양센터/` 소유권 확인(최우선)** — 다른 고객사 자료로 추정되는 문서가 이 저장소에 커밋되어 있음을 사용자에게 즉시 확인하고, 필요 시 `git rm`(및 민감도에 따라 히스토리 제거) 여부를 결정.
2. **저장소 루트 클린업 승인 요청** — `AI-Web-Master/`(broken gitlink)·`docs.zip`/`docs_extract/`·`tree.txt`/`structure.txt`/`apps-tree.txt`/`packages-tree.txt`·`test-project/`가 이미 git에 커밋되어 있음을 반영해, `git rm` 대상과 히스토리 재작성 필요 여부를 사용자와 함께 확정.
3. **테스트 커버리지 확장** — Orchestrator(`packages/cli/src/orchestrator`), Development OS Workflow Engine(`lib/workflows/engine.ts`), Provider 시뮬레이션 폴백 경로(`packages/cli/src/providers/manager.ts`) 등 아직 다루지 않은 영역에 순서대로 테스트 추가.
4. **Marketplace 실 데이터 채우기 또는 범위 재확정** — 로컬 Provider가 이미 동작하므로, 실제 `ai publish`로 최소 1개 이상의 agent/workflow/skill을 게시해 `marketplace/manifest.json`의 count를 실제 값으로 갱신하거나, Phase 5(Productization) 착수 시점까지 보류할지 명시적으로 결정.
5. **Authentication 범위 결정** — `/login`·`/signup`이 실제 기능으로 필요한지, 아니면 Development OS 범위 밖(CNBIZ Website에는 해당 없음)이라 제거 대상인지 확정.
