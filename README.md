# AI Business OS

**ai-web-master** — AI가 개발 팀의 반복 업무를 수행하고, 사람은 방향과 품질 기준을 정의하는 **AI Development Operating System**입니다.

`v1.0.0` · npm workspaces 모노레포 · Next.js 16 + React 19 + TypeScript 5

---

## Project Overview

이 저장소는 세 개의 축으로 구성됩니다.

| 축 | 위치 | 설명 |
|---|------|------|
| **Development OS** | 루트 `app/`, `lib/`, `components/` | Terminal·Workspace·GitHub·AI·Workflow·Marketplace·Health를 관리하는 내부 대시보드(`/developer`) |
| **AI Business OS CLI** | `packages/cli`(`ai` 명령) | 어떤 컴퓨터·어떤 프로젝트에서도 쓰는 전역 CLI — 프로젝트 생성, 웹사이트 빌더, 워크플로, AI Provider, 패키지 관리 |
| **CNBIZ Website** | `apps/cnbiz-web` | 실제 프로덕션(`cnbiz.kr`)에 배포되는 고객사 홈페이지 — 이 저장소 안에서 별도 워크스페이스로 관리 |

---

## Features

### 🖥 Dashboard (Development OS)
- **Dashboard Home**(`/developer`) — Projects·Running AI Tasks·Active Workflows·Marketplace Packages·Provider Status·Token Usage·Recent Activity·System Health 위젯
- **Project Manager**(`/projects`) — 프로젝트 생성(신규 Workspace 자동 부트스트랩)·조회·삭제
- **Terminal / Workspace / GitHub Manager** — 실제 셸 명령 실행, 실 폴더 기반 Workspace, Git 상태·커밋·푸시
- **AI Workspace**(`/developer/ai`) — Provider 상태(Claude Code/Cursor/Ollama/OpenAI/Gemini), AI Studio(Chat/Code/Content), Task 이력·재시도
- **Workflow Center**(`/developer/workflows`) — Run/Pause/Resume/Cancel/Retry
- **Website Builder**(`/developer/websites`) — CLI의 `ai website create`를 대시보드에서 실행
- **Marketplace**(`/developer/marketplace`) — Browse/Installed/Updates/Package Details
- **Health**(`/developer/health`) — Git 상태·디스크 사용량 실시간, Build/Test/Coverage 수동 실행
- **Authentication** — 이메일/비밀번호 세션 인증으로 `/developer/**`, `/projects/**` 보호

### ⌨ AI Business OS CLI

- 프로젝트 생성·전역 런처(`ai new`, `ai project`, `ai devmode`, `ai deploy`, `ai doctor`)
- Agent/Workflow/Skill 스캐폴딩 및 실행(`ai create`, `ai run`, `ai workflow`, `ai orchestrator`)
- **Website Builder v2**(`ai website create`) — 11개 사이트 타입, 11페이지 Next.js 프로젝트 자동 생성
- **Marketplace**(`ai marketplace {install,remove,update,search,publish}`)
- **AI Platform**(`ai chat`, `ai prompt`, `ai provider`, `ai models`, `ai task`)

### 🌐 Website Builder v2
`ai website create --site-type <type>`로 Business Analyst → Site Planner → … → Project Generator 8단계 Agent 파이프라인이 실행되어, Home·About·Services·Products·Pricing·FAQ·Blog·Contact·Privacy·Terms·404 11페이지를 갖춘 완전한 Next.js 프로젝트를 생성합니다. 타입별 색상 팔레트·카피, 디자인 토큰, 12종 재사용 컴포넌트, SEO(sitemap/robots/OG/JSON-LD), 로고·파비콘·플레이스홀더 이미지, `.env.example`/`vercel.json`까지 함께 생성됩니다. 지원 타입: `website`, `landing`, `portfolio`, `corporate`, `agency`, `dental`, `hospital`, `restaurant`, `shopping`, `blog`, `education`.

### 📦 Marketplace
Agent·Workflow·Skill 패키지를 로컬 마켓플레이스(`marketplace/manifest.json`)에 게시·검색·설치·업데이트·제거할 수 있는 패키지 관리 시스템입니다. CLI(`ai marketplace ...`)가 유일한 구현이며, Dashboard는 이를 그대로 호출하는 얇은 브리지입니다.

### 🤖 AI Platform
- **Provider Manager** — Anthropic/OpenAI/Gemini/Ollama/OpenRouter 5개 vendor, 실제 연결 확인(`.validate()`), API Key 설정(`ai provider set-key`), 토큰 사용량 추적(`ai provider usage`)
- **Prompt Library** — 카테고리·버전·변수 치환·미리보기(`ai prompt`, `/developer/prompts`)
- **Task Runner** — Task 큐잉·취소·재시도(`ai task`, `/developer/ai/tasks`)
- Provider 미설정 시에도 결정론적 시뮬레이션으로 항상 동작(graceful degradation)

---

## Installation

### 요구 사항
- Node.js (LTS 권장), npm
- Windows 10(21H2 이상) / 11 — CLI 설치 스크립트가 `winget`으로 Git/Node.js/VS Code를 자동 설치

### 저장소 개발 환경

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 Development OS가 실행됩니다. `/developer`는 로그인이 필요합니다 — 최초 계정은 아래로 생성합니다.

```bash
node scripts/create-auth-user.cjs <email> <password>
```

### AI Business OS CLI 전역 설치 (다른 PC에서도 동일)

**더블클릭(권장)**: `packages/cli/Setup.cmd`

**PowerShell**:
```powershell
.\packages\cli\install.ps1
```

Git/Node.js/VS Code 설치 확인(없으면 winget으로 자동 설치) → `npm install -g`로 `ai` 명령 전역 등록 → 세션 PATH 즉시 반영 → `ai doctor`로 최종 점검까지 자동 수행됩니다.

```powershell
ai doctor      # Git · Node.js · npm · VS Code · Claude Code 설치 상태 점검
ai new         # 새 프로젝트 생성
ai devmode     # VS Code + npm run dev(포트 자동 감지) + 브라우저 미리보기 + Visual Editor 자동 연결
```

제거: `npm uninstall -g @cnbiz/ai-business-os-cli`

---

## CLI Usage

```bash
ai                      # 대화형 메뉴(State 기반 런처)
ai project              # 최근 프로젝트 선택 후 열기
ai new / devmode / deploy / doctor / register

ai website create --site-type dental --name "OO치과"   # Website Builder v2
ai website create --help

ai marketplace search <keyword>
ai marketplace install <type>/<name>
ai marketplace update [--all]
ai marketplace remove <name>
ai marketplace publish

ai chat "질문"                       # Provider 미설정 시 시뮬레이션 폴백
ai provider list / set-key / test / usage
ai models [provider]
ai prompt list / show / create / preview / execute
ai task list / show / retry

ai create <agent|workflow|skill>
ai run <agent>
ai workflow / ai orchestrator / ai tools
ai install / ai search / ai remove / ai update / ai publish
```

전체 명령 목록은 `ai --help` 참고.

---

## Development

```bash
npm run dev      # Development OS 개발 서버
npm run build    # Development OS 프로덕션 빌드
npm run lint     # ESLint
npx tsc --noEmit # 타입 체크
npm test         # Vitest 전체 테스트 (packages/cli 자동 빌드 후 실행)
npm run coverage # 커버리지 리포트
```

`apps/cnbiz-web`, `packages/cli` 등 각 워크스페이스는 `npm run <script> --workspace=<name>`으로 개별 실행할 수 있습니다.

---

## Folder Structure

```
ai-web-master/
├── app/                    # Development OS (Next.js App Router)
├── lib/                    # Development OS 서비스 레이어
├── components/             # Development OS UI
├── apps/
│   └── cnbiz-web/          # CNBIZ 홈페이지 (cnbiz.kr 프로덕션)
├── packages/
│   ├── cli/                # AI Business OS CLI (@ai-business-os/cli, `ai` 명령)
│   ├── design-system/ ui/ utils/ layout-primitives/ dev-inspector/
├── tests/                  # Vitest 테스트
├── marketplace/            # 로컬 마켓플레이스 카탈로그
├── scripts/                # 설치·자동화 스크립트
├── docs/
│   ├── 00_COMPANY/          # 비전·조직·정책·문서 인덱스
│   ├── 01_PMO/               # 로드맵·WBS·체인지로그
│   ├── 02_DEVELOPMENT/        # 아키텍처·기술 스택·개발 규칙
│   ├── 03_DESIGN/              # 디자인 시스템
│   ├── 05_AI/                   # AI 에이전트 규칙·워크플로·스킬
│   ├── 06_TEMPLATES/             # 문서 템플릿
│   ├── 08_PLANS/                  # 설계·명세
│   ├── 09_WORK_HISTORY/            # 작업 이력
│   ├── REPOSITORY_INDEX.md         # 저장소 구현 현황 인덱스(항상 최신 소스 코드 기준)
│   ├── RELEASE_CHECKLIST.md        # 릴리스 직전 점검 결과
│   └── RELEASE_NOTES_v1.0.md       # v1.0 릴리스 노트
├── AGENTS.md               # Claude Code 프로젝트 운영 규칙
└── CLAUDE.md                # Claude Code 자동 인식 규칙
```

---

## Documentation

| 문서 | 설명 |
|------|------|
| [`docs/REPOSITORY_INDEX.md`](./docs/REPOSITORY_INDEX.md) | 저장소 전체 구현 현황(모듈별 Status·Evidence) — 항상 최신 소스 기준 |
| [`docs/RELEASE_NOTES_v1.0.md`](./docs/RELEASE_NOTES_v1.0.md) | v1.0 릴리스 노트 |
| [`docs/RELEASE_CHECKLIST.md`](./docs/RELEASE_CHECKLIST.md) | 릴리스 직전 클린업·검증 결과 |
| [`docs/00_COMPANY/PROJECT_VISION.md`](./docs/00_COMPANY/PROJECT_VISION.md) | 비전·원칙 |
| [`docs/01_PMO/PROJECT_ROADMAP.md`](./docs/01_PMO/PROJECT_ROADMAP.md) | 로드맵 |
| [`docs/01_PMO/WBS.md`](./docs/01_PMO/WBS.md) | 작업 단계·진행률 |
| [`docs/01_PMO/CHANGELOG.md`](./docs/01_PMO/CHANGELOG.md) | 전체 변경 이력 |
| [`docs/02_DEVELOPMENT/ARCHITECTURE.md`](./docs/02_DEVELOPMENT/ARCHITECTURE.md) | 아키텍처 |
| [`docs/02_DEVELOPMENT/TECH_STACK.md`](./docs/02_DEVELOPMENT/TECH_STACK.md) | 기술 스택 |
| [`AGENTS.md`](./AGENTS.md) | Claude Code 운영 규칙 |

---

## License

Private project (`"private": true` in `package.json`). 라이선스 정책은 Human Lead가 별도로 정의합니다.
