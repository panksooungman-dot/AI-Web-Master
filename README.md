# AI-Web-Master

AI Business OS 기반의 CNBIZ 회사 홈페이지 리뉴얼 프로젝트

`v1.0.0` · npm workspaces 모노레포 · Next.js 16 + React 19 + TypeScript 5

---

## Active Application

현재 개발은 **apps/cnbiz-web**에서 진행됩니다.

다음 디렉터리는 Legacy(v1)이며 신규 기능을 추가하지 않습니다.

- app/
- components/
- lib/

---

## Project Structure

### Active Application

`apps/cnbiz-web`
- 실제 운영 서비스
- 관리자(Admin)
- 고객 페이지
- AI Website Builder
- API

### Shared Packages

`packages/`
- ui
- utils
- cli

### AI Platform

- `agents/`
- `skills/`
- `marketplace/`
- `orchestration/`
- `memory/`
- `prompts/`

### Documentation

`docs/`

### Legacy (Read Only)

- `app/`
- `components/`
- `lib/`

유지보수 외에는 수정하지 않습니다.

### 신규 프로젝트 추가 규칙

1. 모든 신규 프로젝트는 `apps/<project-name>/` 아래에 생성한다.
2. 신규 프로젝트는 `apps/cnbiz-web/lib`를 직접 import하지 않는다.
3. 공통 코드가 2개 이상의 프로젝트에서 필요해지는 시점에만 `packages/`로 승격한다.
4. `packages/` 승격은 실제 중복이 확인된 이후에만 수행한다(가정만으로 미리 추출하지 않는다).
5. Legacy(루트 `app/`, 루트 `components/`)는 신규 기능 개발에 사용하지 않는다.
6. **Packages Responsibility** — `packages/`는 프로젝트에 독립적인 코드만 포함한다.
   - 허용: UI, Design System, Layout, Authentication, Database, CollectionStore, Shared Types, Shared Utils, CLI, Templates, Build Tool, AI Infrastructure
   - 금지: CNBIZ·ShoppingMall·CRM·ERP 등 프로젝트 전용 Business Logic, Website Builder 전용 화면, 프로젝트 전용 API/UI
   - 기준: "여러 프로젝트에서 그대로 사용할 수 있는 코드"만 `packages/`에 둔다.
7. **Dependency Direction** — 의존성은 `apps → packages`, `packages → packages`만 허용한다. `apps → apps`(예: `apps/shoppingmall`이 `apps/cnbiz-web`을 직접 import) 및 `packages → apps`는 금지한다. 프로젝트 간 공유는 반드시 `packages/`를 통한다.

**Repository Philosophy**: "필요할 때 공통화"를 따른다. "앞으로 필요할 것 같아서" 미리 `packages/`를 만들지 않는다(Rule of Two — 최소 2곳에서 실제로 필요해지기 전까지는 추상화하지 않는다).

#### Packages Promotion Checklist

`packages/`로 승격하려면 아래 4가지 조건을 **모두** 만족해야 한다.

- [ ] **Rule 1 — 실사용 2곳 이상**: 최소 두 개 이상의 프로젝트(예: `apps/cnbiz-web`, `apps/shoppingmall`)에서 **실제로** 사용 중이어야 한다. "앞으로 사용할 예정"은 인정하지 않는다.
- [ ] **Rule 2 — Business Logic 없음**: 프로젝트 고유 Business Logic가 없어야 한다. 허용(UI/Layout/Auth/DB/CollectionStore/Shared Types/Shared Utils/CLI/Templates/AI Infrastructure) vs 금지(CNBIZ Workflow, ShoppingMall Checkout, CRM Customer Pipeline, ERP Inventory Logic, Website Builder Screen 등 프로젝트 전용 로직).
- [ ] **Rule 3 — 독립 테스트 가능**: `apps/` 없이 `packages/` 단독으로 동작·테스트 가능해야 한다.
- [ ] **Rule 4 — 이름에서 프로젝트명 제거 가능**: 프로젝트 이름을 제거해도 의미가 유지되어야 한다. 가능(`AuthService`·`Database`·`CollectionStore`·`SharedButton`·`LayoutShell`) vs 금지(`CNBIZDashboard`·`ShoppingMallCart`·`CRMLeadPipeline`·`ERPInventory`·`WebsiteBuilderEditor`).

**판단 순서**(Repository Decision Rule):

1. 실제로 두 프로젝트 이상에서 사용하는가? → 아니오 → `apps/` 안에 둔다.
2. 프로젝트 전용 코드인가? → 예 → `apps/` 안에 둔다.
3. 독립 실행 가능한가? → 아니오 → `apps/` 안에 둔다.
4. 프로젝트 이름을 제거해도 되는가? → 아니오 → `apps/` 안에 둔다.
5. 위 네 조건을 모두 만족하는가? → 예 → `packages/` 승격 가능.

**Repository Philosophy(순서)**: "먼저 구현" → "실제 중복 확인" → "packages 승격" 순서를 따른다. "미래를 예상해서" 미리 공통화하지 않는다(Rule of Two 유지).

#### Repository Review Checklist

새로운 기능을 Merge하기 전에 반드시 아래 항목을 확인한다.

- [ ] **Architecture** — 다른 `apps/*`를 직접 import하지 않았는가? (허용: `apps→packages`, `packages→packages` / 금지: `apps→apps`, `packages→apps`)
- [ ] **Packages** — `packages/`에 프로젝트 전용 코드가 들어가지 않았는가? (허용: `packages/auth`·`packages/database`·`packages/ui`·`packages/layout-primitives`·`packages/utils` / 금지: `packages/cnbiz-dashboard`·`packages/shoppingmall-cart`·`packages/crm`·`packages/erp`)
- [ ] **Rule of Two** — packages 승격이 Rule of Two를 만족하는가? 최소 두 프로젝트에서 실제로 사용되는가? 아니라면 `apps/` 안에 둔다.
- [ ] **Promotion Checklist** — Packages Promotion Checklist 4개 조건(실사용 2곳 이상 / Business Logic 없음 / 독립 테스트 가능 / 프로젝트명 제거 가능)을 모두 통과했는가?
- [ ] **Legacy** — Legacy(루트 `app/`, 루트 `components/`)에 신규 기능을 추가하지 않았는가?
- [ ] **Repository Structure** — 새 프로젝트는 `apps/` 아래에 생성되었는가?
- [ ] **Naming** — `packages/` 이름에 프로젝트명이 포함되어 있지 않은가? (허용: `Auth`·`Database`·`CollectionStore`·`SharedButton`·`LayoutShell` / 금지: `CNBIZ`·`ShoppingMall`·`CRM`·`ERP`·`WebsiteBuilder`)
- [ ] **Dependency** — 의존성이 `apps→packages→packages` 방향만 따르는가?
- [ ] **Documentation** — Repository Rules 변경 시 `README.md`·`CLAUDE.md` 두 문서가 동시에 수정되었는가?

**Code Review Rule**: Repository Review Checklist는 사람·AI Agent·Code Reviewer 모두 동일하게 적용한다. Repository Rule보다 우선하지 않는다 — Repository Rule을 실행하기 위한 Review 절차다.

**Repository Governance**: Repository 운영은 다음 순서를 따른다.

```
Repository Rules
  ↓
Packages Promotion Checklist
  ↓
Repository Decision Rule
  ↓
Repository Review Checklist
  ↓
Merge
```

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

### 📨 Customer Inquiry Pipeline (External API)
cnbiz.ai.kr 프로젝트 AI 챗봇이 서버-투-서버로 호출하는 `POST /api/external/inquiries`(`x-api-key` 인증) 1건으로 Inquiry → Client(find-or-create) → WebsiteOrder → AiJob이 연쇄 생성되고 관리자에게 이메일로 알림됩니다. 관리자는 `/api/inquiries`·`/api/clients`·`/api/website-orders`·`/api/ai-jobs`(전부 `developer` 세션 인증)로 조회·상태 관리합니다. **AI Job을 실제로 실행해 웹사이트를 생성하는 worker는 아직 없어(Queued 상태로 대기), 데이터 계층까지만 완성된 상태입니다.**

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
