# Plan: Phase 1 MVP — Core Platform

> 작성일: 2026-06-28  
> 작성자: Planner Agent  
> 상태: Draft  
> Context: [`docs/context/001-project-foundation.md`](../07_KNOWLEDGE/001-project-foundation.md)

---

## Objective

Phase 0(Foundation)에서 구축한 AI Dev OS 골격 위에 **첫 실행 가능한 애플리케이션 레이어**를 구현한다.

구체적 목표:

1. `src/` Clean Architecture 4계층 스캐폴딩 완료
2. AI 채팅 UI MVP (프레젠테이션 + mock/stub 응답)
3. 기본 API Route Handler → application 유스케이스 연동 패턴 확립
4. CI 파이프라인 (lint + build) 도입
5. **Context → Plan → Build → Review → Document** end-to-end 사이클 1회 실증

본 Plan은 [`docs/context/001-project-foundation.md`](../07_KNOWLEDGE/001-project-foundation.md)의 Phase 1 진입 기준(#6–#9)을 충족하기 위해 작성되었다.

---

## Scope

### In Scope

| 영역 | 내용 |
|------|------|
| `src/` 구조 | `presentation/`, `application/`, `domain/`, `infrastructure/` 폴더 및 README |
| UI | AI 채팅 화면 (헤더, 메시지 목록, 입력창) |
| API | `POST /api/chat` — stub 응답 (실제 LLM 연동 없음) |
| Domain | `Message`, `Conversation` 엔티티 (최소) |
| Application | `SendMessageUseCase` (stub) |
| `app/` | 홈을 채팅 UI로 교체, Route Handler 위임 |
| CI | `.github/workflows/ci.yml` — lint + build |
| 문서 | `docs/build/001-phase1-mvp-implementation.md` (Build 후) |

### Out of Scope (Phase 1)

| 제외 항목 | 이유 | 예정 Phase |
|-----------|------|------------|
| 실제 LLM API 연동 (OpenAI 등) | 인프라·비용·시크릿 관리 선행 필요 | Phase 2 |
| Database / 영구 저장 | `TECH_STACK.md` TBD | Phase 3 |
| Authentication | 동일 | Phase 3 |
| Vitest/Jest 테스트 | CI lint+build 우선, 테스트는 Phase 1 후반 또는 1.1 | Phase 1.1 |
| `scripts/` 실행 파일 | Phase 2 자동화 | Phase 2 |
| 프로덕션 배포 | 스테이징 검증 후 | Phase 3 |

---

## Functional Requirements

### FR-1: Chat UI

| ID | 요구사항 |
|----|----------|
| FR-1.1 | 사용자는 메시지를 입력하고 전송할 수 있다 |
| FR-1.2 | 전송된 메시지는 목록에 사용자 메시지로 표시된다 |
| FR-1.3 | 전송 후 stub AI 응답이 목록에 표시된다 |
| FR-1.4 | 빈 메시지는 전송되지 않는다 |
| FR-1.5 | 로딩 중 입력 비활성화 (또는 로딩 표시) |

### FR-2: API

| ID | 요구사항 |
|----|----------|
| FR-2.1 | `POST /api/chat` 는 `{ message: string }` 를 받는다 |
| FR-2.2 | 응답은 `{ reply: string }` 형식이다 |
| FR-2.3 | Route Handler는 application 유스케이스만 호출한다 |
| FR-2.4 | 잘못된 입력 시 400, 서버 오류 시 500 반환 |

### FR-3: Architecture

| ID | 요구사항 |
|----|----------|
| FR-3.1 | 비즈니스 로직은 `src/` 에만 존재한다 |
| FR-3.2 | `domain/` 은 framework·Next.js에 의존하지 않는다 |
| FR-3.3 | `app/page.tsx` 는 presentation 컴포넌트를 조합만 한다 |

### FR-4: DevOps

| ID | 요구사항 |
|----|----------|
| FR-4.1 | `main` PR 시 GitHub Actions에서 lint + build 실행 |
| FR-4.2 | 실패 시 merge 차단 (branch protection 권장) |

---

## Non-Functional Requirements

| ID | 카테고리 | 요구사항 |
|----|----------|----------|
| NFR-1 | 성능 | 초기 페이지 로드 < 3s (로컬 dev 기준) |
| NFR-2 | 유지보수 | 계층 간 import 방향 준수 (`ARCHITECTURE.md`) |
| NFR-3 | 타입 안전 | TypeScript strict, 공개 API에 명시적 타입 |
| NFR-4 | 접근성 | 입력·버튼에 적절한 label / aria (기본 수준) |
| NFR-5 | 보안 | API 키·시크릿 코드·문서에 포함 금지 |
| NFR-6 | 문서 | Build 완료 후 `docs/build/` 기록 필수 |
| NFR-7 | 호환성 | Next.js 16 App Router, `node_modules/next/dist/docs/` 준수 |

---

## Architecture

### Context Reference

본 설계는 다음 Context 제약을 따른다 ([`001-project-foundation.md`](../07_KNOWLEDGE/001-project-foundation.md)):

- Clean Architecture: `app/` = 라우팅·조합, `src/` = 비즈니스 로직
- Plan 승인 후 Build 시작
- DB·Auth 미포함 (Phase 3 이연)

### Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│  app/                                                    │
│  ├── page.tsx          → ChatPage (presentation)        │
│  └── api/chat/route.ts → SendMessageUseCase (application)│
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  src/presentation/                                       │
│  ChatPage, MessageList, ChatInput, useChat (hook)       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  src/application/                                        │
│  SendMessageUseCase, ChatService (port)                 │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  src/domain/                                             │
│  Message, Conversation, MessageRole (enum)            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  src/infrastructure/                                     │
│  StubChatProvider (implements ChatService port)         │
└─────────────────────────────────────────────────────────┘
```

### Runtime Flow

```
User types message
  → presentation/useChat.ts (fetch)
  → app/api/chat/route.ts
  → application/SendMessageUseCase
  → domain/Message validation
  → infrastructure/StubChatProvider.generateReply()
  → response → UI update
```

### Key Decisions

| 결정 | 선택 | 근거 |
|------|------|------|
| LLM | Stub (echo + prefix) | Phase 1은 아키텍처·워크플로 검증 우선 |
| 상태 관리 | React useState + custom hook | 외부 의존성 최소화 |
| 영속성 | In-memory (클라이언트) | DB Phase 3 |
| API 스타일 | Route Handler REST | Next.js 16 표준 패턴 |

---

## Folder Structure

### New / Modified Paths

```
src/
├── presentation/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatPage.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── ChatInput.tsx
│   │   └── ui/              # 공통 UI (필요 시)
│   └── hooks/
│       └── useChat.ts
├── application/
│   ├── use-cases/
│   │   └── SendMessageUseCase.ts
│   └── ports/
│       └── ChatService.ts   # interface
├── domain/
│   ├── entities/
│   │   ├── Message.ts
│   │   └── Conversation.ts
│   └── value-objects/
│       └── MessageRole.ts
└── infrastructure/
    └── ai/
        └── StubChatProvider.ts

app/
├── page.tsx                 # modify: ChatPage 렌더
├── layout.tsx               # modify: 메타데이터 (최소)
└── api/
    └── chat/
        └── route.ts         # new

.github/
└── workflows/
    └── ci.yml               # new

docs/
└── build/
    └── 001-phase1-mvp-implementation.md   # Build 후 작성
```

### Unchanged

- `docs/`, `agents/`, `templates/`, `.cursor/rules/` — 구조 유지
- 루트 OS 문서 — Build 범위 외 (Documenter가 필요 시 링크만)

---

## Tasks

### Phase 1.1 — Scaffolding

| # | Task | 담당 | 산출물 |
|---|------|------|--------|
| T1 | Human Lead Plan 승인 | Human Lead | 본 문서 상태 → Approved |
| T2 | `src/` 4계층 폴더 생성 | Builder | `src/presentation/` … `infrastructure/` |
| T3 | domain 엔티티 정의 | Builder | `Message`, `Conversation`, `MessageRole` |
| T4 | application port + use case | Builder | `ChatService`, `SendMessageUseCase` |
| T5 | infrastructure stub | Builder | `StubChatProvider` |

### Phase 1.2 — UI & API

| # | Task | 담당 | 산출물 |
|---|------|------|--------|
| T6 | presentation 컴포넌트 | Builder | `ChatPage`, `MessageList`, `ChatInput` |
| T7 | `useChat` hook | Builder | `hooks/useChat.ts` |
| T8 | `app/page.tsx` 연동 | Builder | 홈 → ChatPage |
| T9 | `app/api/chat/route.ts` | Builder | POST handler |

### Phase 1.3 — Quality & Docs

| # | Task | 담당 | 산출물 |
|---|------|------|--------|
| T10 | `npm run lint` 통과 | Builder | — |
| T11 | `npm run build` 통과 | Builder | — |
| T12 | GitHub Actions CI | Builder/Ops | `.github/workflows/ci.yml` |
| T13 | Reviewer 검토 | Reviewer | PR 리뷰 |
| T14 | Build 문서 작성 | Documenter | `docs/build/001-phase1-mvp-implementation.md` |

### Dependency Order

```
T1 → T2 → T3 → T4 → T5 → T6,T7 → T8,T9 → T10,T11 → T12 → T13 → T14
```

---

## Risks

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Next.js 16 API 변경 | Build 실패 | `node_modules/next/dist/docs/` 사전 확인 |
| 계층 경계 위반 | 기술 부채 | `.cursor/rules/architecture.mdc`, Reviewer 검토 |
| Scope creep (LLM·DB 조기 도입) | 일정 지연 | Out of Scope 명시, Phase 2로 이연 |
| CI 미설정 시 품질 저하 | broken main | T12 필수, branch protection |
| Stub만으로 UX 평가 어려움 | 이해관계자 기대치 | Phase 2 LLM 연동 Plan 별도 작성 |

---

## Acceptance Criteria

### Architecture

- [ ] `src/` 4계층 폴더 존재
- [ ] `domain/` 에 Next.js·React import 없음
- [ ] `app/api/chat/route.ts` 가 use case만 호출
- [ ] `app/page.tsx` 에 비즈니스 로직 없음

### Functional

- [ ] 메시지 입력·전송·표시 동작
- [ ] Stub AI 응답 표시
- [ ] 빈 메시지 전송 차단
- [ ] API 잘못된 입력 400 반환

### Quality

- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] GitHub Actions CI 통과

### Documentation (Context 기준 #6–#9)

- [ ] Plan 승인 (본 문서 Approved)
- [ ] `docs/build/001-phase1-mvp-implementation.md` 작성
- [ ] Reviewer 승인 기록
- [ ] Context → Plan → Build → Review → Document 사이클 완료

### Handoff to Builder

**승인자**: _Human Lead (서명 대기)_  
**우선순위**: P0  
**시작 조건**: 본 Plan 상태 = **Approved**  
**참조**: [`docs/context/001-project-foundation.md`](../07_KNOWLEDGE/001-project-foundation.md)

---

## References

- Context: [`docs/context/001-project-foundation.md`](../07_KNOWLEDGE/001-project-foundation.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`TECH_STACK.md`](./TECH_STACK.md)
- [`AI_RULES.md`](../05_AI/AI_RULES.md)
- [`PROJECT_ROADMAP.md`](../01_PMO/PROJECT_ROADMAP.md)
- [`agents/Builder.md`](../05_AI/Builder.md)
- [`templates/plan-template.md`](../06_TEMPLATES/plan-template.md)
