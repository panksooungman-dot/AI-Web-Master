# CHANGELOG

프로젝트 변경 이력을 기록합니다.

---

## 2026-07-03

### 추가 (Added)

- Phase 4: AI Workflow Engine — `lib/workflows/`에 Development OS·Agent Engine·Project Manager를 연결하는 워크플로 오케스트레이션 엔진 신규 구현. 새 대시보드는 만들지 않고 서비스 레이어 + API 라우트로만 구성
  - **재사용 중심 설계**: 6종 Step(Create Workspace·Run Terminal·Initialize Git·Execute AI Prompt·Commit Changes·Push Repository) 전부가 새 실행 로직 없이 기존 서비스로만 위임됨 — Create Workspace는 `lib/workspaces/registry.ts`의 `createWorkspace()`, 나머지 5종은 전부 `lib/agents/taskQueue.ts`의 `taskQueue.enqueue()`(→ Agent Service → `executeShellCommand`)로 위임. Git 관련 Step은 `git ` 접두사 자동 분류로 Git 이벤트도 별도 코드 없이 발생
  - `lib/workflows/types.ts`·`lib/workflows/registry.ts`(Workflow 정의 fs 저장 `lib/data/workflows.json`, 기존 registry 패턴과 동일) — Create workflow
  - `lib/workflows/engine.ts` — Execute·Pause·Resume·Cancel(Task Queue의 Pending/Running/Completed/Failed 상태 전이 재사용), 각 Step의 Timestamp·Duration·Logs·Result를 `StepExecutionRecord`로 기록(Execution History). Task 완료 대기는 폴링이 아닌 기존 Event Bus 구독(`eventBus.subscribe`)으로 구현. Cancel은 진행 중인 Step의 `taskQueue.cancel()`을 그대로 호출해 실제 프로세스를 종료
  - `lib/events/eventBus.ts` — `EventCategory`에 `workflow` 한 종류만 추가(기존 agent/terminal/git 카테고리와 이벤트 버스 자체는 그대로 재사용, 새 이벤트 버스를 만들지 않음)
  - API 라우트(신규 페이지 없음) — `app/api/workflows`(목록·생성)·`app/api/workflows/[id]`·`app/api/workflows/[id]/run`, `app/api/workflows/runs`(전체 실행 이력)·`app/api/workflows/runs/[id]`·`.../pause`·`.../resume`·`.../cancel`
  - curl로 End-to-End 검증: Workspace 생성→파일 작성→`git init`→커밋까지 4단계 전부 실제 파일시스템·Git에 반영됨을 확인. Pause(진행 중이던 Step은 끝까지 완료 후 다음 Step 전에 정지)→Resume(나머지 Step 정상 완료) 확인. Cancel 시 10초 대기 명령이 약 1.8초 만에 실제 프로세스 종료됨을 확인(soft-cancel 아님)
  - `npm run lint`·`npm run build` 통과(31개 라우트), Development OS·Project Manager·Agent Engine 전부 회귀 없음을 재확인

- Phase 3: Project Manager — `app/projects/`에 Development OS 위에서 실행되는 첫 번째 애플리케이션 신규 구현
  - `lib/projects/registry.ts` — `ProjectRecord`(Name·Company·Type·Description·Workspace 연결·Status·CreatedAt·LastOpenedAt) fs 기반 저장(`lib/data/projects.json`, Workspace registry와 동일한 패턴)
  - `lib/projects/status.ts` — 기존 공용 서비스 `runTerminalCommand`(`lib/terminal/client.ts`)만 재사용해 Git 상태(branch·dirty count·last commit)와 AI 도구 설치 여부(`claude --version`·`cursor --version`)를 조회. Terminal/GitHub/AI Manager 페이지는 전혀 수정하지 않음
  - `app/api/projects/route.ts`(GET 목록·POST 생성), `app/api/projects/[id]/route.ts`(GET 단건·PATCH로 Last Opened 갱신) 신규 구현. 기존에 있던(구) `app/api/projects/create|list|open`은 VS Code를 직접 실행하는 별개의 구식 개념이라 신규 API로 교체
  - `app/projects/page.tsx` — Project List(Name·Company·Status·Created At·Last Opened) + New Project 폼(Name·Company·Type·Description·**기존** Workspace 선택, 새 Workspace를 만들지 않고 `/api/workspaces`로 기존 목록만 재사용)
  - `app/projects/[id]/page.tsx` — Open Project 시 `useWorkspaceStore().selectWorkspace()`로 Workspace 선택 + Dashboard(Terminal 상태·Git 상태·AI 상태·Recent Activity)를 표시하고 Terminal/GitHub Manager/AI Manager로 이동하는 링크 제공. Development OS의 UI는 재사용만 하고 재구현하지 않음(`components/developer/Card`·`Badge`·`PageHeader`·`StatusMessage` 재사용)
  - `npm run lint`, `npm run build` 모두 통과, Development OS 6개 페이지는 수정 없이 그대로 유지됨을 확인
- Phase 4: AI Agent Engine — AI-WEB-MASTER의 핵심 엔진을 `lib/agents/`·`lib/prompts/`·`lib/events/`에 신규 구현. 새 대시보드/페이지는 만들지 않고, 순수 서비스 레이어 + 이를 노출하는 API 라우트로만 구성
  - **공통 리팩터링(중복 제거 목적)**: Terminal API(`app/api/terminal/route.ts`)에 인라인으로 있던 shell 실행 로직(PowerShell/CMD/Git Bash 실행, `cd` 처리)을 `lib/terminal/server.ts`의 `executeShellCommand()`로 추출. 라우트는 이 함수를 호출하는 얇은 어댑터로 변경(외부 동작·응답 형식은 동일하게 유지, Terminal/GitHub/AI Manager/Project Manager 전 페이지에서 회귀 없음을 재확인). 이 함수를 Agent Engine이 HTTP 왕복 없이 그대로 재사용
  - **Agent Service** — `lib/agents/types.ts`(Agent 인터페이스), `lib/agents/registry.ts`(Agent 등록·조회), `lib/agents/implementations/`(Shell·Claude Code·Cursor 3개 Agent, 모두 `executeShellCommand` 재사용). Claude Code는 `claude -p`로 headless 프롬프트 실행, Cursor는 `cursor --version` 가용성 확인 + Workspace 폴더 열기
  - **Task Queue** — `lib/agents/taskQueue.ts`. Queue·Progress(0~100)·Status(Queued/Running/Success/Failed/Cancelled)·Cancel을 인메모리로 구현. Cancel은 `AbortController`로 실제 프로세스를 종료(soft-cancel이 아닌 실제 kill을 확인)
  - **Prompt Manager** — `lib/prompts/registry.ts`(fs 기반 저장 `lib/data/prompts.json`, Workspace/Project registry와 동일 패턴)로 프롬프트 저장·버전 관리(수정 시 새 버전 추가, 기존 버전 보존), `lib/prompts/executor.ts`로 특정 버전을 Task Queue/Session에 실행 위임
  - **AI Session** — `lib/agents/session.ts`. Workspace에 바인딩된 세션 생성, 세션 내 실행 히스토리(Task 참조) 추적
  - **Event Bus** — `lib/events/eventBus.ts`. Agent(`task.queued`·`task.started`·`task.completed`·`task.failed`·`task.cancelled`)·Terminal·Git(명령어가 `git `으로 시작하면 자동 분류) 이벤트를 `executeShellCommand`/Task Queue에서 발행
  - **API 라우트(신규 페이지 없음)** — `app/api/agents`(목록)·`app/api/agents/run`·`app/api/agents/tasks`·`app/api/agents/tasks/[id]`·`app/api/agents/tasks/[id]/cancel`, `app/api/prompts`·`app/api/prompts/[id]`·`app/api/prompts/[id]/execute`, `app/api/sessions`·`app/api/sessions/[id]`·`app/api/sessions/[id]/run`
  - curl로 전체 파이프라인(Agent 목록 조회 → Task 실행/취소/큐잉 취소 → Prompt 생성/버전 추가/실행 → Session 생성/실행/히스토리 조회) End-to-End 동작 확인, `npm run lint`·`npm run build` 통과, Development OS 6개 페이지와 Project Manager 전부 회귀 없음을 재확인

- AI Manager MVP (Task 010) — `app/developer/ai/page.tsx` 신규 구현. Claude Code(Status·Version·Start·Stop·Restart), ChatGPT(Status·Open·Settings 토글 패널), Cursor(Status·Open·Version), Ollama(Status·Installed Models, 향후 사용) 카드와 AI 실행 로그 영역 추가. 실제 프로세스 실행 없이 로컬 state로만 상태·로그 관리(UI/상태 관리 MVP 단계). 모바일(390px) 반응형 확인 완료
- Logs Manager MVP (Task 011) — `app/developer/logs/page.tsx` 신규 구현. Terminal·Git·AI·System 4개 카테고리의 Mock 로그(Timestamp·Category·Message·Status)를 카드로 표시. Search Logs(메시지 검색)와 All/Terminal/Git/AI/System 필터를 조합 적용, Refresh(Mock 데이터 재조회)·Clear Logs(초기화)·Export(현재 로그를 JSON 파일로 다운로드) 버튼 구현. 모바일(390px) 반응형 확인 완료
- Settings Manager MVP (Task 012) — `app/developer/settings/page.tsx` 신규 구현. General(Theme·Language·Auto Save), Terminal(Default Shell·Font Size·Working Directory), Git(User Name·User Email·Default Branch), AI(Claude Code Path·Cursor Path·ChatGPT URL), Workspace(Default Workspace Path·Auto Open Last Workspace), About(App/Node/Next.js Version) 6개 섹션 구현. Save·Reset(기본값)·Export Settings(JSON 다운로드)·Import Settings(JSON 업로드) 버튼 구현, `localStorage`(`ai-web-master:settings`)로 저장(Database 미사용). 모바일(390px) 반응형 확인 완료
- Phase 2: Integrate Development OS — `lib/settings/store.ts` 신규 구현(`Settings` 타입·`DEFAULT_SETTINGS`·`readSettings()`를 공용 모듈로 분리, Settings Manager가 이를 사용하도록 리팩터링). Settings > Git의 User Name/Email을 Save·Import 시 실제 `git config --global user.name`/`user.email`로 동기화. Terminal API(`app/api/terminal/route.ts`)에 `shell`(PowerShell/CMD/Git Bash) 파라미터를 추가해 요청받은 셸(`powershell.exe`/`cmd.exe`/`bash.exe`)로 실제 실행. Terminal 페이지가 Settings의 Default Shell·Font Size(입력창·출력 영역에 즉시 반영)·Default Workspace Path(Workspace 미선택 시 시작 경로로 자동 적용)를 실제로 사용하도록 연결. AI Manager가 `claude --version`·`cursor --version`을 실행해 실제 설치 여부와 버전을 표시(미설치 시 Start/Open 버튼 비활성화). GitHub Manager의 Commit이 Settings의 Git User Name/Email을 `git -c user.name=... -c user.email=...` 오버라이드로 사용
- Phase 2: Development OS Stabilization — Terminal·Workspace·GitHub·AI·Logs·Settings 6개 페이지를 전수 검토하고 공용 컴포넌트/훅으로 정리
  - `components/developer/PageHeader.tsx`, `Card.tsx`, `Badge.tsx`, `StatusMessage.tsx`(+`LoadingText`), `DeveloperNav.tsx` 신규 구현 — 6개 페이지에서 중복되던 헤더·카드·배지·로딩/에러 메시지 UI를 공용 컴포넌트로 추출
  - `lib/terminal/client.ts`(`runTerminalCommand`·`fetchDefaultCwd`) 신규 구현 — Terminal/GitHub/AI/Settings 4곳에 흩어져 있던 `/api/terminal` fetch 보일러플레이트를 공용 함수로 통합
  - `lib/hooks/useResolvedCwd.ts` 신규 구현 — Terminal·GitHub에 중복돼 있던 cwd 해석 로직(Workspace → Settings Default Workspace Path → 서버 기본값)을 공용 훅으로 추출. 이 과정에서 GitHub Manager에 없던 "Default Workspace Path" fallback을 Terminal과 동일하게 적용해 두 페이지의 동작을 일치시킴(기존 불일치 수정)
  - `app/developer/layout.tsx` 신규 구현 — 6개 페이지가 각자 선언하던 `<main className="min-h-screen bg-gray-950 ...">` 래퍼를 공용 레이아웃으로 통합하고, 모든 도구를 오가는 `DeveloperNav`를 추가(라우팅 개선). `app/developer/page.tsx`는 nav와 중복되던 3개 링크 목록을 제거하고 안내 문구만 남기도록 단순화
  - Workspace 목록 로딩 시 fetch 실패에 대한 에러 처리 추가(기존에는 실패 시 무한 로딩 상태로 남을 수 있었음), Terminal/GitHub의 cwd 해석 실패도 "Loading..." 대신 에러 메시지로 표시
  - Settings의 저장/가져오기 상태 메시지가 Git 설정 동기화 실패 시에도 항상 초록색으로 표시되던 버그 수정(`StatusMessage` 도입으로 성공/실패에 따라 초록/빨강 구분)
  - `eslint.config.mjs`에 `*.cjs` 무시 패턴 추가 — Next.js 앱 소스가 아닌 독립 스크립트(`screenshot.cjs`)의 `require()` 오탐 제거
  - `npm run lint`, `npm run build` 모두 경고 없이 통과 확인
- Terminal Engine (Task 002) — `app/api/terminal/route.ts` 신규 구현. POST로 받은 `command`를 `child_process.spawn`으로 Windows PowerShell에 전달하여 실행하고 결과를 `{ success, output }` / `{ success: false, error }` JSON으로 반환
- `app/developer/terminal/page.tsx`를 Client Component로 전환하여 실제 API와 연결 — `useState`(command/output/isLoading), Run 버튼·Enter 키 실행, 출력 누적, Clear 버튼, 로딩 상태 표시 추가. 기존 UI(Tailwind 스타일·레이아웃)는 그대로 유지
- `pwd`·`dir`·`git status`·`node -v`·`npm -v` 명령으로 API·UI 동작 확인 완료
- Terminal Test & Fix (Task 003) — 출력을 `{ type, text }` 라인 배열로 구조화하여 명령(`> command`)은 흰색, 정상 출력은 초록색, 에러는 빨간색(`text-red-500`)으로 구분 렌더링. `pwd`·`dir`·`node -v`·`npm -v`·`git --version` 명령으로 재검증 완료
- Workspace Manager (Task 003) — `lib/mock/workspaces.ts`(Workspace 타입·Mock 데이터), `app/developer/workspace/page.tsx`(Workspace 목록: Search·New Workspace·Rename·Delete·Open, 카드에 Name·Path·Status·Last Opened 표시), `app/developer/workspace/[id]/page.tsx`(Workspace 상세: Files·Terminal·GitHub·AI·Logs 탭, Mock 콘텐츠) 신규 구현. DB 미사용, Mock Data 기반. 모바일(390px) 반응형 확인 완료
- Terminal Session (Task 004) — `app/api/terminal/route.ts`에 `GET`(초기 cwd 반환) 추가, `POST`가 클라이언트가 보낸 `cwd`를 기준으로 PowerShell을 실행하고 실행 후 `cwd`를 응답에 포함하도록 개선. `cd` 명령은 PowerShell로 넘기지 않고 서버에서 직접 경로를 검증·해석(`path.resolve`, `~`·`..`·상대/절대 경로 지원)하여 존재하지 않는 경로는 에러 처리
- `app/developer/terminal/page.tsx` — 현재 작업 경로를 상단과 입력창 Prompt(`{cwd} >`)에 표시, 명령 실행마다 서버가 반환한 `cwd`로 갱신하여 다음 명령에도 유지. `↑`/`↓` 방향키로 명령 히스토리 탐색 기능 추가. 출력 영역에 자동 스크롤(`useRef` + `useEffect`) 추가
- `pwd`·`cd app`·`dir`·`cd ..`·`git status`·`npm -v` 순차 실행 및 히스토리 탐색으로 재검증 완료
- Workspace Session (Task 005) — `lib/store/workspace-store.tsx`에 `WorkspaceStoreProvider`/`useWorkspaceStore` 신규 구현. 현재 Workspace(`id`·`name`·`path`)를 React Context로 보관하고 `localStorage`(`ai-web-master:current-workspace`)에 저장해 새로고침 후에도 유지. `app/developer/layout.tsx`를 추가해 `/developer` 하위 전체에 Provider 적용
- Workspace 목록·상세 페이지에서 Workspace를 열면(`Open`/카드 이름 클릭, 상세 페이지 진입) `selectWorkspace`를 호출해 현재 Workspace로 저장하도록 연결
- `app/developer/terminal/page.tsx` — 현재 Workspace가 있으면 Terminal의 초기 작업 경로(cwd)를 `Workspace.path`로 사용(없으면 기존 `process.cwd()` fallback 유지), 헤더에 `Workspace: {name}` 표시 추가. Workspace를 변경한 뒤 Terminal로 이동하면 자동으로 새 경로를 반영
- Real Workspace (Task 006) — `lib/workspaces/registry.ts` 신규 구현. `fs.mkdirSync`로 실제 폴더를 생성하고 `name`·`path`·`createdAt`을 `lib/data/workspaces.json`(machine-local, `.gitignore` 처리)에 기록. 목록 조회 시 `fs.existsSync`로 실제 존재하는 폴더만 표시(삭제된 폴더는 registry에서 자동 정리)
- `app/api/workspaces/route.ts` 신규 구현 — `GET`(실제 폴더 기준 Workspace 목록), `POST`(이름·경로를 받아 실제 폴더 생성 및 등록, 존재하지 않는 경로는 `recursive: true`로 자동 생성)
- `app/workspaces/page.tsx` 신규 구현 — Workspace 목록·New Workspace 생성 폼(Name 입력 시 Path를 `D:/Workspace/{name}`로 자동 제안, 직접 수정 가능), Open 클릭 시 `useWorkspaceStore`로 현재 Workspace 저장 후 `/developer/terminal`로 이동
- `app/layout.tsx`에 `WorkspaceStoreProvider`를 루트 레벨로 이동해 `/workspaces`와 `/developer/terminal`이 하나의 Context를 공유하도록 변경
- GitHub Manager (Task 007) — `app/developer/github/page.tsx` 신규 구현. Terminal API(`/api/terminal`)를 재사용해 `git status --porcelain`·`git branch`·`git remote -v`·`git log --oneline -5`를 실행하고 Repository Name·Branch·Remote URL·Last Commit·Git Status(Modified/Added/Deleted/Untracked)·Git Log(최근 5개)를 화면에 표시. Clone·Pull·Push·Fetch 버튼과 Commit Message 입력 후 커밋(`git add -A` + `git commit -m`) 기능 추가, 액션 성공 시 자동 새로고침. GitHub API는 사용하지 않고 로컬 Git 명령만 사용

### 변경 (Changed)

- Mock Workspace 전체 제거 — `lib/mock/workspaces.ts`, `app/developer/workspace/page.tsx`, `app/developer/workspace/[id]/page.tsx`, `app/developer/layout.tsx`(Provider가 루트로 이전되어 불필요) 삭제하고 실제 폴더 기반 구현(`app/workspaces/`)으로 대체
- 라우팅 정리(Task 008) — `app/workspaces/page.tsx`를 `app/developer/workspace/page.tsx`로 이동해 `/developer/workspace`·`/developer/terminal`·`/developer/github` 3개 라우트를 `/developer/*` 하위로 통일. 빈 껍데기 상태였던 `app/developer/[id]/page.tsx`(라우팅 충돌로 `/developer/workspace` 500 에러의 원인이었음)와 `app/developer/ai`·`create`·`logs`·`projects`·`settings` 아래의 빈 스텁 페이지를 제거해 `npm run build` type-check 실패 원인 제거. `app/developer/page.tsx`가 존재하지 않는 `@/components/developer/DeveloperCenter`를 import하던 문제를 Workspace·Terminal·GitHub로 이동하는 최소한의 링크 목록으로 교체

### 수정 (Fixed)

- `app/api/terminal/route.ts` — PowerShell 실행 결과에 한글이 포함된 경우(`dir`의 "디렉터리" 헤더, PowerShell 오류 메시지 등) 콘솔 코드페이지 불일치로 문자가 깨지던 문제 수정. 실행 명령 앞에 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;`을 추가해 UTF-8로 통일
- `npm run build` 프로덕션 빌드 실패 수정 — 위 라우팅 정리로 `next build`가 오류 없이 완료되고 `/developer`·`/developer/workspace`·`/developer/terminal`·`/developer/github`가 모두 정적/동적 라우트로 정상 생성됨을 확인

---

## 2026-07-01

### 추가 (Added)

- 회사소개 페이지(`/about`) 신규 구현 — `AboutHeroSection`, `VisionMissionSection`(id="values"), `HistorySection`(id="history"), `TeamSection`
- 연혁·조직 콘텐츠는 자료 수령 전까지 임시 데이터로 구성 (WBS 5.3·5.4)
- 헤더 메인 메뉴에 "포트폴리오" 추가, `/portfolio` Placeholder 페이지 신규 구현 (`PortfolioComingSoonSection`) — 상세 콘텐츠는 자료·기획 확정 후 추가 예정 (WBS 7단계 신설)
- 사업소개 페이지(`/services`) 신규 구현 — `ServicesHeroSection`, `ServicesOverviewSection`, `ServicesDetailSection`(id="consulting"·"ai"·"development"·"cloud"), `ServiceProcessSection`(도입 프로세스 5단계)
- 문의하기 페이지(`/contact`) UI 신규 구현 — `ContactForm`(Client Component, 이름·연락처·이메일·문의내용 4개 필드), `ContactSection`(연락처 정보 카드 + 폼 조합, id="form"). 클라이언트 유효성 검사와 idle/submitting/success/error 제출 피드백 UI 포함. 이메일 발송 API(`app/api/contact/route.ts`)는 사용자 승인 전까지 미구현 — 폼은 `/api/contact` 호출 구조만 미리 연결해두어, 현재는 항상 오류 상태 UI로 정상 처리됨
- SEO 구현 — `lib/site-config.ts`(공통 SITE_URL·OG 기본값), `app/opengraph-image.tsx`(`next/og` 기반 동적 OG 이미지), `app/sitemap.ts`(확정 5페이지), `app/robots.ts`(`/login`·`/signup`·`/admin` 크롤링 차단), 루트 레이아웃에 Organization JSON-LD 추가. 전 페이지에 canonical·OG(siteName/locale/image)·Twitter Card 적용

- `globals.css`에 DESIGN_SYSTEM.md 기준 컬러 토큰 추가 (`--primary: #005BAC`, `--primary-light`, `--primary-dark`, `--secondary: #1F2937`)

### 변경 (Changed)

- 메인페이지 Hero 섹션 색상을 디자인 시스템 토큰으로 교체, 버튼 radius 8px로 통일, 섹션 패딩을 80px 기준으로 조정, 버튼 키보드 포커스 스타일 추가
- Header·MobileMenu의 강조 색상(`blue-600`)을 Primary 토큰으로 교체, 모바일 메뉴 CTA 버튼 radius를 Header와 동일한 8px로 통일
- Hero 배지 라벨 크기를 `text-xs`→`text-sm`으로 수정하여 CNBIZ_RULES.md Label 규격 및 사이트 내 다른 섹션 라벨과 통일, 섹션 패딩을 `py-20 lg:py-24`로 재조정(모바일 80px·데스크탑 96px)

### 수정 (Fixed)

- 없음

---

## 2026-06-30

### 추가 (Added)

- Claude Code 프로젝트 문서 구성
- CLAUDE.md 작성
- AGENTS.md 작성
- PROJECT_VISION.md 작성
- PROJECT_ROADMAP.md 작성
- ARCHITECTURE.md 작성
- TECH_STACK.md 작성
- CNBIZ_RULES.md 작성
- WBS.md 작성

### 변경 (Changed)

- AI 작업 규칙 추가
- 작업 시작/종료 절차 추가

### 수정 (Fixed)

- 없음
