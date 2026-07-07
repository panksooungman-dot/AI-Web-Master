# AI Development Operating System

**ai-web-master** — AI와 사람이 문서·재사용 워크플로·모듈형 아키텍처로 협업하는 AI 우선 소프트웨어 개발 환경입니다.

---

## Project Overview

이 저장소는 단순한 웹 앱이 아니라 **AI Development Operating System (AI Dev OS)** 입니다.

- **문서 우선**: Context → Plan → Build → Review → Document
- **에이전트 협업**: Planner, Builder, Reviewer, Architect, Documenter
- **클린 아키텍처**: `src/` 4계층 + Next.js `app/`
- **재사용**: `docs/06_TEMPLATES/`, `docs/05_AI/skills/`, `scripts/`

현재 단계: **Phase 0 — Foundation** (문서·구조 구축, 애플리케이션 코드 미작성)

---

## AI Business OS CLI 설치 (다른 PC에서 개발 환경 구축)

`packages/cli`는 어떤 컴퓨터·어떤 프로젝트에서도 쓸 수 있는 전역 CLI(`ai` 명령)다.
새 PC에서 아래 과정으로 **10분 안에** VS Code + Git + Node.js + devmode(실시간
미리보기 + Visual Editor)까지 설치·검증할 수 있다.

### 요구 사항

- Windows 10(21H2 이상) 또는 Windows 11 — `winget`이 기본 내장되어 있어야
  Git/Node.js/VS Code를 자동 설치할 수 있다. 이미 설치되어 있다면 winget이
  없어도 무방하다.

### 설치

**방법 1 — 더블클릭 (권장)**

`packages/cli/Setup.cmd`를 더블클릭한다. 관리자 권한이 필요 없다.

**방법 2 — PowerShell**

```powershell
.\packages\cli\install.ps1
```

설치 스크립트는 순서대로 다음을 수행한다:

1. Git / Node.js / VS Code 설치 여부 확인 — 없으면 `winget`으로 자동 설치
2. `npm install -g`로 `ai` 명령을 시스템 전역에 등록
3. 현재 세션의 PATH를 즉시 갱신 (새 터미널을 열지 않아도 바로 사용 가능)
4. `ai doctor`로 최종 점검 결과 출력

Git/Node.js/VS Code가 이미 설치되어 있다면 전체 과정은 수 초, 처음부터 설치해야
하면 다운로드 속도에 따라 대략 5~10분 내외로 끝난다.

### 설치 확인 및 사용

```powershell
ai doctor      # Git · Node.js · npm · VS Code · Claude Code 설치 상태 점검
ai new         # 새 프로젝트 생성 (이름 · 회사 · 경로 입력)
ai devmode     # VS Code 실행 + npm run dev(포트 자동 감지) + 브라우저 미리보기
               # + Visual Editor(@cnbiz/dev-inspector) 자동 연결
```

`ai devmode`는 등록된 프로젝트가 없으면 현재 폴더를 대상으로 바로 동작한다
(`--path <경로>` 또는 `--name <이름>`으로 프로젝트 지정 가능). 처음 여는 Next.js
프로젝트라면 Visual Editor(브라우저 좌하단 "🎨 편집 모드" 버튼)를 코드 수정 없이
자동으로 연결해준다.

### 제거

```powershell
npm uninstall -g @cnbiz/ai-business-os-cli
```

자세한 아키텍처(공유 패키지 구조, Visual Editor 자동 연결 방식)는
[`docs/01_PMO/CHANGELOG.md`](./docs/01_PMO/CHANGELOG.md)의 2026-07-07 항목을 참고한다.

---

## Vision

> 개발을 “사람이 코드를 치는 일”에서 “사람과 AI가 함께 시스템을 운영하는 일”로 전환한다.

상세: [`PROJECT_VISION.md`](./docs/00_COMPANY/PROJECT_VISION.md)

---

## Folder Structure

```
ai-web-master/
├── docs/
│   ├── 00_COMPANY/        # 비전·조직·정책·문서 인덱스
│   ├── 01_PMO/            # 로드맵·WBS·체인지로그
│   ├── 02_DEVELOPMENT/    # 아키텍처·기술 스택·개발 규칙
│   ├── 03_DESIGN/         # 디자인 시스템
│   ├── 04_OPERATIONS/     # 운영(예정)
│   ├── 05_AI/             # AI 에이전트 정의·규칙·워크플로·스킬
│   ├── 06_TEMPLATES/      # 문서·기능 템플릿
│   ├── 07_KNOWLEDGE/      # 배경 맥락·지식베이스
│   ├── 08_PLANS/          # 설계·명세 (Plan)
│   ├── 09_WORK_HISTORY/   # 작업 이력·컨텍스트 관리 (CURRENT_CONTEXT·WORK_HISTORY·sessions)
│   └── 99_ARCHIVE/        # 보관
│
├── AGENTS.md              # Claude Code 프로젝트 운영 규칙
├── CLAUDE.md              # Claude Code 자동 인식 규칙
├── scripts/               # 자동화 스크립트
│
├── src/                   # 애플리케이션 소스 (Clean Architecture)
└── app/                   # Next.js App Router
```

---

## Getting Started

### Prerequisites

- Node.js (LTS 권장)
- npm

### Install & Run

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

### Other Commands

```bash
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint
```

### For AI Agents

작업 전 필수 읽기:

1. [`AI_RULES.md`](./docs/05_AI/AI_RULES.md)
2. [`PROJECT_VISION.md`](./docs/00_COMPANY/PROJECT_VISION.md)
3. [`ARCHITECTURE.md`](./docs/02_DEVELOPMENT/ARCHITECTURE.md)
4. 관련 `docs/` 문서

---

## Development Workflow

```
Understand → Plan → Implement → Test → Review → Document
```

| 단계 | 위치 |
|------|------|
| Context | `docs/07_KNOWLEDGE/` |
| Plan | `docs/08_PLANS/` |
| Build | `src/`, `app/` |
| Review | PR, Reviewer Agent |
| Document | `docs/09_WORK_HISTORY/` |

템플릿: [`docs/06_TEMPLATES/`](./docs/06_TEMPLATES/)

---

## AI Workflow

```
Context → Plan → Build → Review → Document
```

| 에이전트 | 모드 | 문서 |
|---------|------|------|
| Planner | Plan | [`docs/05_AI/Planner.md`](./docs/05_AI/Planner.md) |
| Builder | Build | [`docs/05_AI/Builder.md`](./docs/05_AI/Builder.md) |
| Reviewer | — | [`docs/05_AI/Reviewer.md`](./docs/05_AI/Reviewer.md) |
| Architect | Plan/Build | [`docs/05_AI/Architect.md`](./docs/05_AI/Architect.md) |
| Documenter | — | [`docs/05_AI/Documenter.md`](./docs/05_AI/Documenter.md) |

Cursor: `@docs/05_AI/AI_RULES.md`, `@docs/07_KNOWLEDGE`, Plan/Build 모드, `/` 스킬 활용

---

## Documentation

| 문서 | 설명 |
|------|------|
| [PROJECT_VISION.md](./docs/00_COMPANY/PROJECT_VISION.md) | 비전·원칙 |
| [AI_RULES.md](./docs/05_AI/AI_RULES.md) | AI 운영 규칙 |
| [PROJECT_ROADMAP.md](./docs/01_PMO/PROJECT_ROADMAP.md) | 로드맵 |
| [ARCHITECTURE.md](./docs/02_DEVELOPMENT/ARCHITECTURE.md) | 아키텍처 |
| [TECH_STACK.md](./docs/02_DEVELOPMENT/TECH_STACK.md) | 기술 스택 |
| [docs/](./docs/) | 워크플로 문서 |

---

## License

Private project (`"private": true` in `package.json`).  
라이선스 정책은 Human Lead가 별도로 정의합니다.
