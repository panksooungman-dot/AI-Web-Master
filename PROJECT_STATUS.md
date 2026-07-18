# AI Business OS - PROJECT STATUS

> 최종 분석: 2026-07-18 (Claude Code, 전체 코드 기준 실측)
> 이 문서는 추측이 아닌 실제 파일/코드 확인 결과만 반영합니다.

---

## 1. 프로젝트 개요

이 저장소(`D:\ai-web-master`)는 npm workspaces 모노레포이며, **성격이 다른 두 시스템**이 함께 들어 있습니다.

| 시스템 | 위치 | 역할 |
|---|---|---|
| **CNBIZ Website v1 (레거시)** | 루트 `app/`, `lib/`, `components/` | 정적 마케팅 사이트 5페이지만 존재. 2026-07-01 기준으로 동결됨 |
| **CNBIZ Website v2 + AI Business OS (실제 운영 시스템)** | `apps/cnbiz-web/` | 실제 프로덕션(`cnbiz.kr`) 사이트 + `/developer` 내부 대시보드(Development OS) + 전체 API가 전부 여기에 있음 |

⚠️ **가장 중요한 사실**: 2026-07-15 커밋 `526831e`("WIP: AI Business OS integration checkpoint")에서 원래 루트에 있던 Development OS 전체(대시보드, 에이전트, 워크플로, 인증, Design Automation 등)가 `apps/cnbiz-web`으로 이동했습니다. **루트 `app/`·`lib/`에는 이제 레거시 정적 사이트 5페이지만 남아 있고, 실제로 동작하는 코드는 전부 `apps/cnbiz-web` 안에 있습니다.** 이 문서의 모든 항목은 이 실측 결과를 기준으로 작성했습니다.

---

## 2. 구현 완료 기능

### CNBIZ Website v2 (`apps/cnbiz-web`, 고객 대상 공개 사이트)
- 페이지: `/`(Home), `/about`, `/services`, `/portfolio`(placeholder), `/contact`, `/login`, `/signup`(폼만, 백엔드 없음)
- 문의 폼 → API(`/api/contact`) → 로컬 저장 + Resend 이메일 발송, honeypot·rate limit 스팸 방지
- SEO: sitemap.xml, robots.txt, Organization JSON-LD, Google Analytics 4

### Development OS 대시보드 (`apps/cnbiz-web/app/developer/**`, 총 17개 모듈)
Terminal, Workspace, GitHub, AI Workspace(+Tasks), Website Builder, Workflow Center, Marketplace(+Installed/Updates/상세), Settings, Logs, Health, Audit Log, Metrics, Backup, Error Report, Design Automation(9개 하위 페이지) — 전부 실제 API와 연결되어 동작.

### 인증 시스템
이메일/비밀번호 로그인, 세션 쿠키, RBAC 4단계 역할(`user`/`admin`/`developer`/`super_admin`), `/developer`·`/projects` 보호.

### AI 홈페이지 생성기 (Website Builder v2)
CLI(`ai website create`) + 대시보드(`/developer/websites`) 양쪽에서 실행 가능. 11개 사이트 타입, 11페이지 고정 생성, SEO/디자인 토큰/배포 파일 포함.

### Design Automation (문서에 없던 Phase 9까지 확인됨)
Phase 1(요구사항 분석) ~ Phase 8(Design Sync)에 더해, **CHANGELOG에 기록되지 않은 Phase 9(`lib/design/website-build.ts`, `website-build-adapter.ts`, `/developer/design/website`)**가 실제 코드에 존재 — 승인된 Design Review를 Website Builder v2 빌드로 연결하는 기능. 9개 Phase 전부 코드·API·페이지가 실제로 존재함을 확인.

### 백엔드 인프라 (`apps/cnbiz-web/lib/`)
27개 모듈(agents, ai, audit, auth, backup, commandEngine, contact, db, design, dev, devserver, events, health, hooks, marketplace, metrics, paths, projects, prompts, providers, settings, store, terminal, websites, workflows, workspaces) — 전부 실제 로직 존재, mock 아님.

### CLI (`packages/cli`, 219개 파일)
`ai new/devmode/deploy/doctor/project/register`, Website Builder, Marketplace 5개 명령, Prompt Library, Task Runner, Provider Manager(5개 vendor) 등.

---

## 3. 구현 중인 기능

- **Design Automation Phase 9(Website Build 연동)** — 코드는 존재하나 CHANGELOG에 검증 기록이 없어 실사용 검증이 안 된 상태로 보임(문서화 누락).
- **`apps/cnbiz-web`로의 테스트 이관** — `apps/cnbiz-web`에 자체 `vitest.config.ts`는 추가돼 있으나 테스트 파일이 0개. 이관이 절반만 진행된 상태.

---

## 4. 미구현 기능

- **루트 테스트 스위트 붕괴**: 루트 `tests/`의 64개 파일 중 **48개**가 삭제된 루트 `lib/*` 경로를 import하고 있어 깨져 있음(`npm test` 실행 시 다수 실패, `Cannot find module '../../lib/agents/registry'` 등으로 직접 확인). 남은 16개(`tests/cli`, `tests/ai-platform-cli`, `tests/marketplace-cli`, `tests/website`, `tests/workflow`)만 유효 — 전부 `packages/cli`를 테스트하는 것이라 lib 이동의 영향을 받지 않음.
- **회원가입(signup) 백엔드**: `/signup` 페이지는 정적 폼만 존재, `/api/signup` 없음. 계정 생성은 CLI 스크립트(`create-auth-user.cjs`)로만 가능.
- **앱 내 역할(Role) 관리 UI**: 없음. Settings 페이지에 역할 변경 기능 없고, `set-user-role.cjs` 스크립트로만 가능.
- **Portfolio 실제 콘텐츠**: `PortfolioPlaceholderSection.tsx`에 TODO 배지로 placeholder만 존재.
- **Contact 연락처 정보**: 전화번호·이메일·주소·운영시간 — `ContactInfoSection.tsx`에 TODO 배지로 표시.
- **About 연혁·조직도**: 섹션 자체가 아예 없음(설립연도 등 사실 정보 미확정으로 의도적 제외).
- **GSC(Google Search Console) 연동**: 미완료.

---

## 5. 디자인 구현 현황

- 디자인 토큰/컴포넌트: `packages/design-system`(3파일), `packages/ui`(7), `packages/layout-primitives`(6) — CNBIZ Website v2가 사용 중.
- Design Automation(AI 기반 디자인 자동화, `apps/cnbiz-web/lib/design/`) Phase 1~9 전부 코드 존재:
  - Phase1 요구사항 분석 · Phase2 Storyboard · Phase3 Wireframe · Phase4 Prototype · Phase5 Claude Design 프롬프트 생성 · Phase6 Review/Approval · Phase7 Figma Import/Export · Phase8 Design Sync · Phase9 Website Build 연동
  - 각 Phase마다 `/developer/design/*` 페이지와 `/api/design/*` API가 1:1로 대응.
- 실제 웹사이트(CNBIZ v2) 자체의 반응형(390/768/1280)·접근성·Lighthouse 전수 테스트는 WBS 기준 미완료 상태로 남아있음(코드 레벨 확인 대상 아님, 수동 QA 필요).

---

## 6. 관리자 시스템 구현 현황

- `/developer/**` 전체가 관리자(Development OS) 대시보드이며 `developer`/`super_admin` role만 접근 가능(`lib/auth/rbac.ts`).
- 실제 존재하는 관리 모듈: Terminal, Workspace, GitHub, AI Workspace, Website Builder, Workflow Center, Marketplace, Settings, Logs, Health, Audit Log, Metrics, Backup, Error Report, Design Automation 9종.
- `/admin` 이라는 별도 경로도 RBAC 로직상 정의되어 있으나(`resolveProtectedArea`), 실제 페이지(`app/admin/**`)는 아직 없음 — 접근 규칙만 있고 화면은 없는 상태.
- 계정/역할 관리는 대시보드 UI가 아니라 CLI 스크립트(`create-auth-user.cjs`, `set-user-role.cjs`, `reset-user-password.cjs`)로만 가능.

---

## 7. 고객(의뢰자) 시스템 구현 현황

- 고객이 접하는 것은 CNBIZ Website v2 공개 페이지(Home/About/Services/Portfolio/Contact)와 문의 폼뿐.
- 문의 접수 → 로컬 JSON 저장 + 이메일 알림(Resend)까지 구현 완료.
- 고객 전용 로그인/마이페이지/프로젝트 진행 조회 같은 "고객 포털" 개념은 존재하지 않음 — `/login`은 관리자(Development OS) 로그인이며 고객용이 아님.
- 즉 "의뢰자가 로그인해서 자기 프로젝트 상태를 보는" 기능은 미구현.

---

## 8. AI 홈페이지 생성 기능 구현 현황

- `packages/cli/src/website/{types,content,scaffold,builder,agents,workflow}.ts`에 실제 구현.
- 11개 사이트 타입(website/landing/portfolio/corporate/agency/dental/hospital/restaurant/shopping/blog/education), 사이트당 색상 팔레트 차등 적용.
- 페이지 11종 고정 생성(Home/About/Services/Products/Pricing/FAQ/Blog/Contact/Privacy/Terms/404), SEO(sitemap/robots/OG 이미지/JSON-LD), 배포 파일(`.env.example`/`vercel.json`) 포함.
- 실행 경로 2가지: CLI(`ai website create`) 직접 실행 / 대시보드(`/developer/websites` → `/api/websites` → CommandEngine이 CLI를 shell-out).
- Design Automation Phase 9(`website-build.ts`)를 통해 "승인된 디자인 → 실제 웹사이트 빌드"로 연결하는 경로도 코드상 존재(문서화·검증 기록 없음, 위 3번 참고).

---

## 9. 데이터베이스 및 API 구현 현황

### 저장소 구조
- `apps/cnbiz-web/lib/db/{fsStore,memoryStore,supabaseStore,collectionStore,index}.ts` — `getDefaultStore()`가 `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` 존재 여부로 Supabase/fs 스토어를 선택, production에서 누락 시 fail-fast.
- Supabase 테이블: `app_collections`(collection/id/data 구조 하나로 모든 registry를 저장) — users(인증), 기타 컬렉션 공용.
- 로컬 fs 기반 registry(`lib/data/*.json`, 런타임 생성): projects, workspaces, prompts, workflows, sessions, users, audit-log, contact-submissions 등.

### API 라우트
- `apps/cnbiz-web/app/api/**`에 **81개** route.ts 파일 존재 — agents, ai, audit, auth(login/logout/me — signup 없음), backup, contact, design(10개 하위 리소스), dev-inspector, devserver, errors, health, logs, marketplace, metrics, projects, prompts, providers, sessions, terminal, websites, workflows, workspaces 전 영역 커버.
- 루트 `app/`에는 API 라우트가 하나도 없음(레거시 정적 사이트라 불필요).

---

## 10. 전체 진행률(%)

| 영역 | 진행률 | 근거 |
|---|---|---|
| CNBIZ Website v2 공개 페이지 | 80% | Portfolio·Contact 정보 TODO, 반응형/접근성 전수 QA 미완료 |
| Development OS 대시보드 | 90% | 17개 모듈 전부 실동작, 관리자 UI 내 역할관리만 없음 |
| AI 홈페이지 생성기 | 85% | 기능 자체는 완결, Phase9 연동만 미검증 |
| Design Automation (9 Phase) | 85% | 코드·API·페이지 전부 존재, Phase9 실사용 검증 기록 없음 |
| 인증/권한 | 75% | 로그인/RBAC 완비, signup·역할관리 UI 없음 |
| 테스트 인프라 | 25% | 64개 중 16개만 유효(25%), 실제 동작 코드(`apps/cnbiz-web/lib`) 커버리지 0 |
| **전체 종합** | **약 70%** | 기능 구현은 폭넓게 진행됐으나 테스트 인프라가 코드 이동을 못 따라가 신뢰도 저하 |

---

## 11. 최근 완료 작업

- Design Automation Phase 8(Design Sync) 구현 및 검증 (2026-07-15)
- Design Automation Phase 7(Figma Import/Export) 구현 및 검증 (2026-07-15)
- Design Automation Phase 6(Review & Approval) 구현 및 검증 (2026-07-15)
- **`apps/cnbiz-web`로 Development OS 전체 이관** (커밋 `526831e`, 2026-07-15) — CHANGELOG에 별도 기록되지 않은 대규모 구조 변경
- 프로덕션 로그인 401 오류 디버깅 및 해결 (이번 세션) — 원인은 Vercel의 `SUPABASE_SERVICE_ROLE_KEY`가 실제로 갱신되지 않고 있었던 것. `apps/cnbiz-web/scripts/reset-user-password.cjs`, 루트 `scripts/test-login.ps1` 신규 작성

---

## 12. 다음 개발 우선순위

1. **루트 테스트 스위트 복구 또는 정리** — 48개 깨진 테스트 파일을 `apps/cnbiz-web` 기준으로 재작성하거나, 이미 이관된 코드를 테스트하지 못하는 죽은 테스트라면 명시적으로 정리. 현재 `npm test`가 사실상 신뢰할 수 없는 상태.
2. **`apps/cnbiz-web`에 테스트 커버리지 이식** — vitest 설정은 있으나 테스트 파일이 0개인 상태를 해소.
3. **회원가입 API 및 앱 내 역할 관리 UI** — 현재 계정 생성/역할 변경이 전부 CLI 스크립트 의존이라 운영 편의성이 낮음.
4. **Portfolio 실제 사례 콘텐츠 확보** 및 **Contact 연락처 정보 확정** (자료 수령 필요, 코드 문제 아님).
5. **Design Automation Phase 9(Website Build 연동)** 실사용 검증 및 CHANGELOG 문서화.
6. **WBS.md 최신화** — 현재 WBS는 2026-07-01/05 기준으로 동결되어 있어 이후의 대규모 구조 변경·Design Automation 9 Phase를 전혀 반영하지 못함.

---

## Git 커밋

### 모든 변경사항 한 번에 커밋

```bash
git add -A
git commit -m "feat: 작업 내용"
git push origin main
```

### 진행률 자동 업데이트 (Claude Code)

```text
현재 프로젝트 전체를 분석해서 PROJECT_STATUS.md를 업데이트해줘.

실제 구현된 코드만 기준으로 작성하고,
완료 / 진행 중 / 미구현 기능을 구분해서
전체 진행률과 다음 작업 우선순위를 업데이트해줘.
```

### 커밋 메시지 예시

```text
feat: 의뢰 접수 페이지 구현
feat: AI 홈페이지 생성 기능 추가
feat: 고객 대시보드 구현
fix: 관리자 로그인 오류 수정
docs: 프로젝트 진행률 업데이트
refactor: 코드 구조 개선
```
