# src

애플리케이션 **소스 코드** 루트입니다.

> **현재 상태**: 구조 문서만 존재. 애플리케이션 코드는 **명시적 요청 시에만** 생성합니다.

---

## Intended Application Architecture

`src/` 는 [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) 4계층을 따릅니다. Next.js `app/` 은 라우팅·레이아웃 진입점이며, 비즈니스 로직은 `src/` 에 둡니다.

```
src/
├── presentation/      # UI, 컴포넌트, hooks, 뷰 상태
├── application/       # 유스케이스, 서비스, DTO 매핑
├── domain/            # 엔티티, 값 객체, 도메인 규칙, 리포지토리 인터페이스
└── infrastructure/    # API 클라이언트, DB, 외부 서비스 구현
```

### 계층별 책임

| 계층 | 책임 | 의존 가능 |
|------|------|-----------|
| **presentation** | 사용자 인터페이스, 이벤트 처리 | application, domain (읽기) |
| **application** | 유스케이스 오케스트레이션 | domain |
| **domain** | 핵심 비즈니스 규칙 | 없음 (순수) |
| **infrastructure** | 외부 세계 연동 | domain (인터페이스 구현) |

### `app/` 과의 관계

```
app/
├── layout.tsx          # 루트 레이아웃
├── page.tsx            # 라우트 → presentation 컴포넌트 조합
├── (routes)/           # 기능별 라우트 그룹
└── api/                # Route Handlers → application 유스케이스 위임

src/presentation/       # 재사용 UI, 페이지 단위 컴포넌트
src/application/        # use cases (서버·클라이언트 공통)
src/domain/             # 비즈니스 핵심
src/infrastructure/     # OpenAI, DB, HTTP 등
```

**규칙**: `app/` 에 비즈니스 로직을 두지 않습니다. Route Handler는 application 계층을 호출만 합니다.

---

## Data Flow (Runtime)

```
User
  → app/ (route, RSC/Client Component)
  → presentation/ (UI, hooks)
  → application/ (UseCase.execute)
  → domain/ (entities, rules)
  → infrastructure/ (repositories, APIs)
```

---

## Development Workflow

1. `docs/07_KNOWLEDGE/` — 맥락 확보
2. `docs/08_PLANS/` — 설계 승인
3. `docs/06_TEMPLATES/feature-template.md` — 범위 정의
4. Builder Agent — 계층별 구현
5. Reviewer Agent — 검토
6. `docs/09_WORK_HISTORY/` — 구현 기록

---

## Coding Standards

`AI_RULES.md` 준수:

- Readable, Reusable, Small Modules
- Clean Architecture, Strong Typing
- No Duplicated Logic

Next.js 16: `node_modules/next/dist/docs/` 참조, deprecated API 금지.

---

## Future Structure (Phase 1+)

```
src/
├── presentation/
│   ├── components/
│   ├── hooks/
│   └── pages/           # 페이지 단위 조합 (app/에서 import)
├── application/
│   ├── use-cases/
│   └── services/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── repositories/    # interfaces only
└── infrastructure/
    ├── api/
    ├── db/
    └── ai/              # LLM providers
```

---

## Rules

- Plan 승인 없이 `src/` 코드 생성 금지
- domain 계층은 framework·DB 라이브러리에 의존하지 않음
- 새 계층·폴더 추가는 Architect Agent + `docs/08_PLANS/` ADR 선행
- 테스트는 application·domain 우선 (Phase 1+)

상세: `ARCHITECTURE.md`, `TECH_STACK.md`
