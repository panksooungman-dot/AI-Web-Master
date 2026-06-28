# Architecture

AI Development Operating System — 시스템 아키텍처

---

## Overall Architecture

이 저장소는 두 층으로 구성됩니다.

1. **Operating System Layer** — AI·사람이 협업하는 개발 운영 체계 (문서, 에이전트, 템플릿, 스크립트)
2. **Application Layer** — 실제 제품 코드 (`src/`, `app/`)

```
┌─────────────────────────────────────────────────────────────┐
│                    Human Lead (승인·비전)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              AI Agents (agents/)                             │
│  Planner │ Builder │ Reviewer │ Architect │ Documenter        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│           Documentation Workflow (docs/)                     │
│  context → plan → build → skills                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│     Templates (templates/)  │  Scripts (scripts/)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Application (src/ + app/)                       │
│  presentation → application → domain → infrastructure      │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Responsibilities

| 경로 | 책임 |
|------|------|
| `PROJECT_VISION.md` | 비전, 원칙, 미션 |
| `AI_RULES.md` | AI 에이전트 운영 규칙 |
| `PROJECT_ROADMAP.md` | 단계별 로드맵 |
| `ARCHITECTURE.md` | 본 문서 — 시스템 아키텍처 |
| `TECH_STACK.md` | 기술 스택 정의 |
| `AGENTS.md` | Next.js 16 에이전트 규칙 |
| `docs/context/` | 배경 맥락, 용어, 제약 |
| `docs/plan/` | 설계·명세 (Plan 산출물) |
| `docs/build/` | 구현·배포 기록 (Build 산출물) |
| `docs/skills/` | 스킬·워크플로 정의 |
| `agents/` | 에이전트 역할·handoff 정의 |
| `templates/` | 문서·코드 보일러플레이트 |
| `scripts/` | 자동화 스크립트 |
| `src/` | 애플리케이션 소스 (Clean Architecture) |
| `app/` | Next.js App Router (프레젠테이션 진입점) |

---

## Data Flow

### 문서·개발 흐름

```
요청/아이디어
    → docs/context/     (맥락 수집)
    → docs/plan/        (설계·승인)
    → src/ + app/       (구현)
    → Review            (PR, Reviewer Agent)
    → docs/build/       (구현·배포 기록)
```

### 애플리케이션 런타임 (예정)

```
Browser
    → app/ (Next.js routes, RSC/Client Components)
    → src/presentation/ (UI 컴포넌트, 뷰 모델)
    → src/application/  (유스케이스, 서비스)
    → src/domain/       (엔티티, 도메인 규칙)
    → src/infrastructure/ (API, DB, 외부 서비스)
```

의존성 방향: **바깥 → 안쪽** (Infrastructure는 Domain 인터페이스 구현)

---

## Development Lifecycle

| 단계 | 담당 | 산출물 |
|------|------|--------|
| 1. Understand | Planner, Human | `docs/context/` |
| 2. Plan | Planner, Architect | `docs/plan/` |
| 3. Implement | Builder | `src/`, `app/` |
| 4. Test | Builder, CI | 테스트·린트 결과 |
| 5. Review | Reviewer | PR 코멘트, 리뷰 기록 |
| 6. Document | Documenter | `docs/build/`, ADR |

---

## AI Workflow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Planner  │───▶│ Builder  │───▶│ Reviewer │───▶│Documenter│
│ (Plan)   │    │ (Build)  │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
      │               │                │                │
      ▼               ▼                ▼                ▼
 docs/plan/      src/, app/         PR review      docs/build/
```

- **Architect**: Plan·Build 전반의 아키텍처 거버넌스
- **Human Lead**: Plan 승인, 프로덕션 배포 승인
- Handoff는 Git PR, 문서 링크, `@` 컨텍스트로 추적

---

## Layered Architecture

`src/` 내부 4계층 (Clean Architecture):

| 계층 | 역할 | 예시 |
|------|------|------|
| **presentation** | UI, 페이지 조합, 사용자 입력 | React 컴포넌트, hooks |
| **application** | 유스케이스, 오케스트레이션 | `CreateChatUseCase`, 서비스 |
| **domain** | 엔티티, 값 객체, 도메인 규칙 | `Message`, `Conversation` |
| **infrastructure** | 외부 연동 구현 | HTTP 클라이언트, DB 리포지토리 |

`app/` (Next.js)은 **라우팅·레이아웃·서버 컴포넌트 진입점**이며, 비즈니스 로직은 `src/`에 둡니다.

---

## Future Scalability

| 영역 | 확장 방향 |
|------|-----------|
| **에이전트** | Ops, Security Agent 추가 (`PROJECT_ROADMAP.md`) |
| **자동화** | `scripts/` + CI + Cursor Automations |
| **멀티 테넌트** | domain 계층에 테넌트 경계 정의 |
| **API** | Route Handlers → application 유스케이스 위임 |
| **DB** | infrastructure에 Repository 패턴, domain 인터페이스 |
| **캐시·큐** | infrastructure 확장, application은 인터페이스만 의존 |
| **모노레포** | OS 레이어를 별도 패키지로 분리 가능 |

원칙: 계층 경계와 문서 워크플로는 규모가 커져도 유지합니다.
