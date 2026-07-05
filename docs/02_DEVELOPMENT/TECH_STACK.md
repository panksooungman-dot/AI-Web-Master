# Technology Stack

AI Development Operating System — 기술 스택

---

## Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 16.2.9 | App Router, RSC, API Routes |
| **React** | 19.2.4 | UI 컴포넌트 |
| **TypeScript** | ^5 | 정적 타입 |
| **Tailwind CSS** | ^4 | 스타일링 |
| **Geist Font** | (next/font) | 타이포그래피 |

> Next.js 16은 기존 버전과 API·관례가 다릅니다. 구현 전 `node_modules/next/dist/docs/` 를 참조하세요.

---

## Backend

| 기술 | 상태 | 용도 |
|------|------|------|
| **Next.js Route Handlers** | 예정 | REST/API 엔드포인트 |
| **Server Actions** | 예정 | 서버 뮤테이션 |
| **src/application/** | 예정 | 유스케이스·비즈니스 오케스트레이션 |
| **src/domain/** | 예정 | 도메인 모델·규칙 |

현재: 백엔드 로직 미구현. API는 `app/api/` 또는 Route Handlers로 추가 예정.

---

## Database

| 기술 | 상태 | 용도 |
|------|------|------|
| **TBD** | 미선정 | 영구 저장소 |

후보 (Phase 3에서 `docs/plan/` 에서 결정):

- PostgreSQL + Prisma / Drizzle
- SQLite (개발·프로토타입)
- Supabase / PlanetScale (관리형)

원칙: `src/infrastructure/` 에만 DB 접근 코드를 둡니다.

---

## Authentication

| 기술 | 상태 | 용도 |
|------|------|------|
| **TBD** | 미구현 | 사용자 인증·세션 |

후보 (Phase 3):

- NextAuth.js / Auth.js
- Clerk, Supabase Auth
- JWT + HttpOnly Cookie (자체 구현)

---

## Hosting

| 환경 | 플랫폼 | 상태 |
|------|--------|------|
| **개발** | `localhost:3000` (`npm run dev`) | ✅ |
| **스테이징** | Vercel Preview | 🔲 예정 |
| **프로덕션** | Vercel (권장) | 🔲 예정 |

---

## CI/CD

| 도구 | 상태 | 용도 |
|------|------|------|
| **GitHub Actions** | 🔲 예정 | lint, build, test |
| **Vercel** | 🔲 예정 | 자동 배포 |
| **scripts/** | 🔲 예정 | 로컬·CI 공통 자동화 |

현재 `package.json` scripts: `dev`, `build`, `start`, `lint`

---

## Testing

| 도구 | 상태 | 용도 |
|------|------|------|
| **ESLint** | ✅ | 정적 분석 (`eslint-config-next`) |
| **Vitest / Jest** | 🔲 예정 | 단위·통합 테스트 |
| **Playwright** | 🔲 예정 | E2E (선택) |

---

## AI Tools

| 도구 | 용도 |
|------|------|
| **Cursor Agents** | Plan / Build 모드, 멀티 에이전트 |
| **Cursor Skills** | `/` 스킬, `docs/skills/` 연동 |
| **Cursor Rules** | `AGENTS.md`, `.cursor/rules` |
| **Bugbot / Security Review** | PR 품질·보안 검토 |
| **Cursor SDK** | Phase 4 — 프로그래매틱 에이전트 (예정) |
| **Cursor Automations** | Phase 2+ — 이벤트 기반 자동화 (예정) |

---

## Developer Tools

| 도구 | 용도 |
|------|------|
| **Node.js** | 런타임 (권장 LTS) |
| **npm** | 패키지 관리 |
| **Git** | 버전 관리 |
| **TypeScript** | 타입 체크 |
| **PostCSS** | Tailwind 파이프라인 |

---

## Future Technologies

| 영역 | 후보 | Phase |
|------|------|-------|
| ORM | Prisma, Drizzle | 3 |
| 캐시 | Redis, Upstash | 3–4 |
| 메시지 큐 | Inngest, BullMQ | 4 |
| Observability | Sentry, Vercel Analytics | 3 |
| AI API | OpenAI, Anthropic, Vercel AI SDK | 1–2 |
| Vector DB | Pinecone, pgvector | 4 |

기술 도입은 반드시 `docs/plan/` 에 ADR(Architecture Decision Record)로 기록합니다.
