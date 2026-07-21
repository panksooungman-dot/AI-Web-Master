# Current System Architecture

> 작성일: 2026-07-21
> 근거: 이 저장소(`AI-Web-Master`)의 실제 코드·설정 파일 확인 결과만 반영. 사용자 제공 확인 사실(아래 0번)은 그대로 인용하고, 이 저장소 코드로 검증되지 않는 부분은 "미확인"으로 명시한다.

---

## 0. 확인된 사실 (전제)

이 문서 작성을 요청하며 아래 4가지가 사실로 제시되었다. 이 저장소의 코드는 이 사실들과 모순되지 않으며(4번은 코드로 직접 확인됨), 문서 전체가 이를 전제로 한다.

1. `cnbiz.ai.kr`는 실제 운영 중이다.
2. `cnbiz.ai.kr`의 문의폼과 `/admin` 기능이 실제 동작한다.
3. `cnbiz.ai.kr`는 별도의 Git 저장소가 없다.
4. 현재 GitHub에서 관리되는 저장소는 `AI-Web-Master`뿐이다.

**중요**: `cnbiz.ai.kr`의 소스 코드·배포 방식·운영 주체는 이 저장소 어디에도 없다. 아래 내용 중 `cnbiz.ai.kr` 내부 구현에 관한 서술은 전부 "이 저장소가 알고 있는 것"(= 외부 API 계약)에 한정되며, `cnbiz.ai.kr` 자체의 실제 소스는 이 문서의 조사 범위 밖이다.

---

## 1. 저장소 구조 (AI-Web-Master)

npm workspaces 기반 모노레포(`package.json`의 `workspaces: ["apps/*", "packages/*"]`).

```
AI-Web-Master/                    ← GitHub에서 유일하게 관리되는 저장소
│
├── apps/
│   └── cnbiz-web/                ← ★ 활성 애플리케이션 (Active)
│       ├── app/
│       │   ├── (공개 페이지) /about /services /portfolio /contact /request /login /signup
│       │   ├── /developer/**     ← Development OS 대시보드 (32개 페이지, 세션 인증 필요)
│       │   ├── /admin/**         ← 라우트 보호 로직만 존재, 실제 페이지 없음(2.3절 참고)
│       │   └── api/
│       │       ├── external/inquiries        ← cnbiz.ai.kr 챗봇이 호출하는 대상(3절)
│       │       ├── contact, requests          ← cnbiz.kr 자체 공개 폼
│       │       ├── inquiries, clients,
│       │       │   website-orders, ai-jobs    ← 관리자 CRUD(세션 인증)
│       │       └── (그 외 devserver/terminal/workflows/marketplace 등 Dev OS API 다수)
│       ├── lib/                  ← 도메인 로직 (auth, inquiries, clients, websiteOrders, aiJobs, db 등)
│       └── proxy.ts              ← RBAC 라우트 보호 (Next.js 16 middleware)
│
├── app/, components/, lib/(site-config.ts, dev/)
│                                 ← ★ Legacy v1 (frozen) — CNBIZ 홈페이지 구버전
│                                    정적 마케팅 페이지만 존재(/about /services /portfolio 등),
│                                    API·관리자 기능 없음. 유지보수 목적 외 수정 금지
│
├── packages/                     ← 공유 패키지 (apps 간 재사용)
│   ├── design-system, ui, layout-primitives, utils, dev-inspector
│   └── cli                       ← `ai` 전역 CLI (Website Builder, Agent Runtime 등)
│
├── agents/, skills/, prompts/, marketplace/, orchestration/, memory/
│                                 ← AI Platform 구성요소 (CLI/Skill 시스템, 별도 제품화 트랙)
│
├── docs/                         ← 문서 (00_COMPANY ~ 09_WORK_HISTORY, architecture)
└── tests/                        ← Vitest 테스트 (apps/cnbiz-web 대상 다수)
```

### 1.1 apps/cnbiz-web — 실제 서비스되는 시스템

`cnbiz.kr` 도메인으로 배포되는 신규(v2) CNBIZ 공식 홈페이지이자, 동시에 다음 3가지 역할을 겸한다.

| 역할 | 내용 | 근거 |
|---|---|---|
| 공개 홈페이지 | Home/About/Services/Portfolio/Contact/제작 의뢰(Request) | `apps/cnbiz-web/app/{page,about,services,portfolio,contact,request}` |
| Development OS 대시보드 | Terminal/Workspace/GitHub/AI/Website Builder/Workflow/Marketplace 등 32개 내부 운영 화면 | `apps/cnbiz-web/app/developer/**`, `docs/REPOSITORY_INDEX.md` |
| Customer Inquiry Pipeline | `cnbiz.ai.kr` 챗봇이 호출하는 외부 연동 API | `apps/cnbiz-web/app/api/external/**`, `docs/EXTERNAL_API.md` |

배포: Vercel Git 연동, `main` 브랜치 push 시 자동 배포(`docs/01_PMO/WBS.md` v2 진행 현황 — 배포 섹션). 저장소 내에는 `vercel.json` 등 배포 설정 파일이 없고 Vercel 프로젝트 설정(대시보드)에만 존재함을 확인.

### 1.2 app/, components/, 루트 lib/ — Legacy v1 (frozen)

2026-07-04 모노레포 전환 이전의 CNBIZ 홈페이지 v1. 정적 마케팅 페이지(About/Services/Portfolio/Contact)만 있고 API·관리자 기능이 없다(`find app/api` 결과 디렉터리 자체가 없음을 확인). `CLAUDE.md`·`README.md` 양쪽에서 "유지보수 목적 외 수정하지 않음"으로 명시.

### 1.3 packages/ — 공유 패키지

`apps/cnbiz-web`이 `@cnbiz/design-system`·`@cnbiz/ui`·`@cnbiz/layout-primitives`·`@cnbiz/utils`·`@cnbiz/dev-inspector`를 `transpilePackages`로 참조(`apps/cnbiz-web/next.config.ts`). `packages/cli`는 `ai` 전역 CLI로 Website Builder·Agent Runtime 등을 제공하며 `apps/cnbiz-web`과는 별도 배포 단위.

### 1.4 agents/, skills/, marketplace/ 등 — AI Platform

`docs/01_PMO/PROJECT_ROADMAP.md`의 Phase 5(AI Business OS Productization)에서 별도 제품/스타터킷으로 분리 예정인 트랙. CNBIZ 홈페이지 서비스 자체와는 독립적인 구성요소다.

---

## 2. cnbiz.ai.kr ↔ AI-Web-Master 관계

### 2.1 두 도메인은 서로 다른, 독립된 시스템이다

| | `cnbiz.kr` | `cnbiz.ai.kr` |
|---|---|---|
| 소스 코드 | 이 저장소 `apps/cnbiz-web` | **이 저장소에 없음** |
| Git 관리 | ✅ `AI-Web-Master` | ❌ 별도 저장소 없음(확인된 사실) |
| 운영 상태 | 배포·검증 완료(Vercel) | 실제 운영 중(확인된 사실) |
| 문의폼 | `apps/cnbiz-web`의 `/contact`, `/request` (코드 존재, 구현 완료) | 실제 동작 중(확인된 사실, 구현 위치 미확인) |
| `/admin` | 라우트 보호 로직만 존재, **실제 페이지 없음**(`docs/ADMIN_GUIDE.md` 2절) | 실제 동작 중(확인된 사실, 구현 위치 미확인) |

`docs/01_PMO/WBS.md`도 목표 URL을 "`cnbiz.kr`(v2, Vercel 프로덕션) / `cnbiz.ai.kr`(기존 운영 사이트, 별도 유지·미변경)"로 명시적으로 구분해두고 있어, 이 관계는 이번에 새로 발견된 것이 아니라 기존에도 인지되어 있던 구도임을 확인했다.

### 2.2 유일한 연결점: External Inquiry API (단방향)

두 시스템 사이에 코드·데이터베이스 공유는 없다. 유일한 연결은 `cnbiz.ai.kr`의 AI 챗봇이 서버-투-서버로 호출하는 API 하나다(`docs/EXTERNAL_API.md`).

```
cnbiz.ai.kr (챗봇, 소스 미확인)
        │  POST /api/external/inquiries  (x-api-key 인증)
        ▼
apps/cnbiz-web  (AI-Web-Master 저장소)
        │
        ▼
Inquiry 생성 → Client(find-or-create) → WebsiteOrder 생성 → AiJob 생성
        │
        ▼
AiJob 즉시 실행(Worker) → Website Builder CLI → 로컬 산출물(.generated-websites/)
        │
        ▼
cnbiz.ai.kr ◄── GET /api/external/inquiries/{id}  (진행 상태 폴링)
```

- 인증: `CHATBOT_API_KEY`(`x-api-key` 헤더), 미설정 시 로컬 개발 환경에서만 인증 생략 허용(`apps/cnbiz-web/.env.example`, `lib/auth/apiKey.ts`).
- 방향은 **`cnbiz.ai.kr` → `AI-Web-Master` 단방향**이다. `AI-Web-Master`가 `cnbiz.ai.kr`의 코드·DB·관리자 화면에 접근하는 경로는 없다.
- `previewUrl`/`deployUrl`은 현재 항상 `null`이다 — Website Builder가 로컬 디스크에만 산출물을 생성하고 별도 호스팅·배포 파이프라인이 없기 때문(`docs/EXTERNAL_API.md` 4절).

### 2.3 `/admin` 이름 중복에 대한 주의

이 저장소(`apps/cnbiz-web`)에도 `/admin` 경로가 존재하지만, RBAC 보호 로직만 미리 배선되어 있을 뿐 **실제 화면은 없다**(`docs/ADMIN_GUIDE.md`, `apps/cnbiz-web/proxy.ts` 확인). 즉:

- 사용자가 확인한 "실제 동작하는 `/admin`"은 `cnbiz.ai.kr` 쪽이며, 이 저장소의 `/admin`과는 **이름만 같은 별개의 시스템**이다.
- 이 저장소의 실질적인 "관리자용" 화면은 `/admin`이 아니라 `/developer/**`(Health·Backup·Audit Log·Metrics·Inquiries API 등)에 있다.

---

## 3. 운영 시스템과 Git 관리 범위 구분

| 구분 | Git 관리(`AI-Web-Master`) | Git 관리 밖 |
|---|---|---|
| **`cnbiz.kr`**(신규 홈페이지 + Dev OS + External API) | ✅ `apps/cnbiz-web`, Vercel 자동 배포 | — |
| **CNBIZ 홈페이지 v1**(레거시) | ✅ 루트 `app/`·`components/`·`lib/`(frozen) | — |
| **`cnbiz.ai.kr`**(기존 운영 사이트, 챗봇·문의폼·`/admin`) | ❌ 없음 | ✅ 소스·배포·운영 전체가 이 저장소 밖 |
| **AI Platform**(CLI·Skill·Marketplace) | ✅ `packages/cli`, `agents/`, `skills/` 등 | — |

핵심 구도: **이 저장소가 관리하는 코드는 `cnbiz.kr` 하나뿐이며, 실제 운영 중인 시스템은 `cnbiz.kr`(신규, Git 관리)와 `cnbiz.ai.kr`(기존, Git 관리 밖) 둘이다.** `AI-Web-Master`가 곧 "CNBIZ 전체 시스템"이 아니라, "CNBIZ 시스템 중 Git으로 관리되는 부분 + `cnbiz.ai.kr`을 향한 API 창구"라는 점이 이번 정리의 핵심이다.

---

## 4. 관리상 문제점 분석

### 4.1 `cnbiz.ai.kr` 소스가 버전 관리되지 않음 (최우선 리스크)

실제 운영 중이고 문의폼·`/admin`이 실사용되는 시스템임에도 Git 저장소가 없다. 이는 다음을 의미한다.

- 변경 이력·롤백 지점이 없어, 장애 발생 시 "직전 정상 상태"로 되돌릴 방법이 코드 레벨에서 보장되지 않는다.
- 코드 리뷰·CI(`AI-Web-Master`에는 `.github/workflows/{lint,test,security,release}.yml`이 있지만 `cnbiz.ai.kr`에는 대응물이 없음)를 거치지 않고 변경이 반영될 가능성이 있다.
- 특정 인원·호스팅 계정에 대한 의존도(버스 팩터)가 코드 레벨에서 드러나지 않아 조직적으로 파악되지 않을 위험이 있다.

### 4.2 도메인·경로 이름 중복으로 인한 혼동 위험

- `cnbiz.kr` vs `cnbiz.ai.kr` — 철자가 유사해 문서·커뮤니케이션에서 혼동되기 쉽다(WBS.md가 반복적으로 괄호 설명을 덧붙여야 했던 것이 이 위험의 방증).
- `/admin` 경로가 두 시스템에 동일한 이름으로 각각 존재하되 하나는 실제 동작, 하나는 빈 스켈레톤이라 신규 기여자·AI 에이전트가 "이 저장소의 `/admin`을 고치면 실제 운영 admin이 바뀐다"고 오인할 수 있다.

### 4.3 단방향 통합의 관측성·회복력 부재

- `AI-Web-Master`는 `cnbiz.ai.kr`이 보낸 요청만 수신할 뿐, `cnbiz.ai.kr` 쪽 문의폼·`/admin`의 정상 동작 여부를 확인할 방법이 없다(헬스체크·모니터링 연동 없음).
- `PROJECT_STATUS.md`에 따르면 AiJob을 실제로 실행하는 `processQueuedJobs()`/`processJob()`을 호출하는 트리거가 저장소 어디에도 연결되어 있지 않아, `cnbiz.ai.kr`이 문의를 접수해도 실사용 단계까지는 아직 도달하지 못한 상태다(2026-07-19 기준). 이는 이 문서의 새 발견이 아니라 기존 `PROJECT_STATUS.md`가 이미 식별한 항목이지만, 두 시스템 간 신뢰 가능한 연동이라는 관점에서 이 문서에도 명시해 둔다.

### 4.4 자격증명(API Key) 관리 정책 미비

`CHATBOT_API_KEY`는 단일 정적 키이며, 로컬 개발 환경에서는 미설정 시 인증을 생략하도록 허용되어 있다(`docs/EXTERNAL_API.md` 2절). 키 회전(rotation) 주기·유출 시 대응 절차·`cnbiz.ai.kr` 쪽 키 보관 방식에 대한 문서화가 이 저장소 안에는 없다.

### 4.5 레거시 v1이 저장소에 계속 공존

`app/`·`components/`·루트 `lib/`이 "frozen"으로 문서화되어 있지만, 코드베이스 구조상으로는 `apps/cnbiz-web`과 유사한 페이지 이름(`/about`, `/services`, `/portfolio`, `/contact`)을 가진 별개 트리가 동일 저장소에 공존한다. 문서(CLAUDE.md/README.md)를 읽지 않은 상태로 탐색하면 실수로 v1을 수정할 구조적 위험이 남아 있다.

### 4.6 배포 설정이 코드화되어 있지 않음

Vercel 프로젝트 설정(도메인 연결, 환경 변수 등)이 저장소 내 파일이 아닌 Vercel 대시보드에만 존재해(`vercel.json` 부재 확인), 배포 구성의 재현성·감사 가능성이 코드 레벨에서 보장되지 않는다.

---

## 5. 개선 방안 제안

| 우선순위 | 제안 | 목적 |
|---|---|---|
| 높음 | `cnbiz.ai.kr` 소스를 최소한이라도 버전 관리 체계로 편입(별도 Git 저장소 생성 또는 기존 호스팅에서 코드 export 후 정기 백업) | 4.1 리스크 해소, 롤백·감사 가능성 확보 |
| 높음 | 이 문서를 `CLAUDE.md`/`README.md`에서 참조하도록 연결하고, 상단에 "`cnbiz.kr` ≠ `cnbiz.ai.kr`" 경고를 명시 | 4.2 혼동 위험 완화 |
| 중간 | `PROJECT_STATUS.md`가 이미 식별한 AiJob 실행 트리거(`processQueuedJobs`) 연결 작업을 진행해 External API 파이프라인을 실사용 가능 상태로 완성 | 4.3 관측성·회복력 확보 |
| 중간 | External API 호출 실패율·응답 시간에 대한 간단한 헬스체크/알림(기존 Audit Log·Metrics 인프라 재사용 가능) 추가 | 4.3 보완 |
| 중간 | `CHATBOT_API_KEY` 회전 절차와 프로덕션 필수 여부(현재도 프로덕션에서는 필수)를 `docs/EXTERNAL_API.md`에 운영 정책 섹션으로 보강 | 4.4 해소 |
| 낮음 | 루트 `app/`·`components/`에 명시적 배너(README 또는 파일 상단 주석)로 "Legacy — 수정 금지" 재확인 | 4.5 완화 |
| 낮음 | 가능한 범위에서 Vercel 설정을 `vercel.json`으로 코드화 | 4.6 재현성 확보 |

---

## 6. 근거 자료

- `docs/EXTERNAL_API.md` — `cnbiz.ai.kr` 연동 계약 상세
- `docs/ADMIN_GUIDE.md` — RBAC·`/admin` 상태
- `docs/01_PMO/WBS.md` — `cnbiz.kr`/`cnbiz.ai.kr` 도메인 구분, 배포 현황
- `docs/01_PMO/CHANGELOG.md`(2026-07-19, 2026-07-15) — Customer Inquiry Pipeline·Dev OS 이관 이력
- `PROJECT_STATUS.md` — AiJob 실행 트리거 미연결 등 진행 중 항목
- `CLAUDE.md` / `README.md` — Repository 운영 규칙, Legacy 범위
- `apps/cnbiz-web/proxy.ts`, `apps/cnbiz-web/.env.example` — RBAC·API Key 설정(코드 직접 확인)
