# AI Development Operating System

**ai-web-master** — AI와 사람이 문서·재사용 워크플로·모듈형 아키텍처로 협업하는 AI 우선 소프트웨어 개발 환경입니다.

---

## Project Overview

이 저장소는 단순한 웹 앱이 아니라 **AI Development Operating System (AI Dev OS)** 입니다.

- **문서 우선**: Context → Plan → Build → Review → Document
- **에이전트 협업**: Planner, Builder, Reviewer, Architect, Documenter
- **클린 아키텍처**: `src/` 4계층 + Next.js `app/`
- **재사용**: `templates/`, `docs/skills/`, `scripts/`

현재 단계: **Phase 0 — Foundation** (문서·구조 구축, 애플리케이션 코드 미작성)

---

## Vision

> 개발을 “사람이 코드를 치는 일”에서 “사람과 AI가 함께 시스템을 운영하는 일”로 전환한다.

상세: [`PROJECT_VISION.md`](./PROJECT_VISION.md)

---

## Folder Structure

```
ai-web-master/
├── PROJECT_VISION.md      # 비전·원칙·미션
├── AI_RULES.md            # AI 에이전트 운영 규칙
├── PROJECT_ROADMAP.md     # 로드맵·마일스톤
├── ARCHITECTURE.md        # 시스템 아키텍처
├── TECH_STACK.md          # 기술 스택
├── AGENTS.md              # Next.js 16 에이전트 규칙
│
├── docs/
│   ├── context/           # 배경 맥락
│   ├── plan/              # 설계·명세
│   ├── build/             # 구현·배포 기록
│   └── skills/            # 스킬·워크플로
│
├── agents/                # 에이전트 정의
├── templates/             # 문서·기능 템플릿
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

1. [`AI_RULES.md`](./AI_RULES.md)
2. [`PROJECT_VISION.md`](./PROJECT_VISION.md)
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
4. 관련 `docs/` 문서

---

## Development Workflow

```
Understand → Plan → Implement → Test → Review → Document
```

| 단계 | 위치 |
|------|------|
| Context | `docs/context/` |
| Plan | `docs/plan/` |
| Build | `src/`, `app/` |
| Review | PR, Reviewer Agent |
| Document | `docs/build/` |

템플릿: [`templates/`](./templates/)

---

## AI Workflow

```
Context → Plan → Build → Review → Document
```

| 에이전트 | 모드 | 문서 |
|---------|------|------|
| Planner | Plan | [`agents/Planner.md`](./agents/Planner.md) |
| Builder | Build | [`agents/Builder.md`](./agents/Builder.md) |
| Reviewer | — | [`agents/Reviewer.md`](./agents/Reviewer.md) |
| Architect | Plan/Build | [`agents/Architect.md`](./agents/Architect.md) |
| Documenter | — | [`agents/Documenter.md`](./agents/Documenter.md) |

Cursor: `@AI_RULES.md`, `@docs/context`, Plan/Build 모드, `/` 스킬 활용

---

## Documentation

| 문서 | 설명 |
|------|------|
| [PROJECT_VISION.md](./PROJECT_VISION.md) | 비전·원칙 |
| [AI_RULES.md](./AI_RULES.md) | AI 운영 규칙 |
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | 로드맵 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 아키텍처 |
| [TECH_STACK.md](./TECH_STACK.md) | 기술 스택 |
| [docs/](./docs/) | 워크플로 문서 |

---

## License

Private project (`"private": true` in `package.json`).  
라이선스 정책은 Human Lead가 별도로 정의합니다.
