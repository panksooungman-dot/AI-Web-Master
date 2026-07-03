# CHANGELOG

프로젝트 변경 이력을 기록합니다.

---

## 2026-07-03

### 추가 (Added)

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
