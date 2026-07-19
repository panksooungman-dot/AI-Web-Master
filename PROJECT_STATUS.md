# AI Business OS - PROJECT STATUS

> 최종 분석: 2026-07-19 (Claude Code, 전체 코드 기준 실측 — 커밋 `0759bd5` 기준)
> 이 문서는 추측이 아닌 실제 파일/코드 확인 결과만 반영합니다.

## 프로젝트 개요
AI 기반 홈페이지 제작 및 운영 플랫폼. `apps/cnbiz-web`(CNBIZ Website v2 + Development OS 대시보드)과, 이번 세션에 신규 구현된 cnbiz.ai.kr 챗봇 연동용 Customer Inquiry Pipeline(Inquiry→Client→WebsiteOrder→AiJob)으로 구성됩니다. 루트 `app/`·`components/`(CNBIZ v1)는 레거시로 동결되어 있습니다.

---

## 전체 진행률
**약 85%**

| 영역 | 진행률 | 근거 |
|---|---|---|
| CNBIZ Website v2 공개 페이지 | 85% | Home/About/Services/Portfolio/Contact/Request/Login/Signup. Portfolio·Contact 정보 TODO |
| Development OS 대시보드 | 90% | `/developer/**` 32개 페이지 실동작. 신규 4개 엔티티(Inquiry/Client/WebsiteOrder/AiJob) 관리자 화면만 없음 |
| AI 홈페이지 생성기(Website Builder v2) | 85% | CLI+대시보드 완결, Design Automation Phase 9 연동만 미검증 |
| **Customer Inquiry Pipeline(신규)** | **75%** | 데이터 계층·External API·Worker·Executor까지 전부 구현. **자동 실행 트리거와 관리자 UI가 없어 실사용은 아직 불가**(아래 참고) |
| 인증/권한 | 82% | 세션 인증 + API Key 인증(x-api-key) + RBAC 4-role 완비. signup 백엔드·역할관리 UI만 없음 |
| 고객(의뢰자) 시스템 | 60% | 제작 의뢰 접수·관리자 확인까지 완료. 고객 본인이 조회하는 포털 없음 |
| 테스트 인프라 | 100% | `apps/cnbiz-web` 58 files / 444 tests 전부 통과 |

---

## ✅ 완료된 기능

**기존 시스템**
- CNBIZ Website v2 공개 사이트, 문의(Contact)·제작 의뢰(Request) 폼(`lib/{contact,requests}/*`, `/developer/requests`)
- Development OS 대시보드 32개 페이지(Terminal/Workspace/GitHub/AI Workspace/Website Builder/Workflow Center/Marketplace/Settings/Logs/Health/Audit Log/Metrics/Backup/Design Automation 9종 등)
- 인증(이메일/비밀번호 세션) + RBAC 4-role — `lib/auth/{types,password,users,session,auth,middleware,rbac}.ts`, `proxy.ts`
- Website Builder v2(CLI `ai website create` + 대시보드) — `packages/cli/src/website/*`, `lib/websites/registry.ts`, `/developer/websites`
- Database — `lib/db/{collectionStore,fsStore,memoryStore,supabaseStore,index}.ts`(단일 Supabase 테이블 `app_collections`)

**이번 세션 신규 구현**
- Inquiry/Client/WebsiteOrder/AiJob 도메인 데이터 계층 — `lib/{inquiries,clients,websiteOrders,aiJobs}/{types,registry}.ts`(FK 체인 전부 연결)
- 챗봇 서버-투-서버 인증 — `lib/auth/apiKey.ts`(x-api-key, timingSafeEqual)
- 오케스트레이션 엔드포인트 — `POST /api/external/inquiries`: Inquiry 생성→Client find-or-create→WebsiteOrder 생성→AiJob 생성→관리자 이메일 알림(`lib/inquiries/notify.ts`, 기존 `lib/contact/email` 재사용)
- 관리자 CRUD API 8개 — `/api/{inquiries,clients,website-orders,ai-jobs}/route.ts`, `[id]/route.ts`
- **AI Job Worker + Executor** — `lib/aiJobs/worker.ts`(Queued→Running→Success/Failed 상태 전이) + `lib/aiJobs/executor.ts`(AiJob 조회→Website Builder CLI 실행(`app/api/websites/route.ts`와 동일 방식)→`createWebsiteRecord()`→`addWebsiteToOrder()` 연결까지 실제 구현)
- `lib/contact/store.ts`를 `CollectionStore` 기반으로 전환(프로덕션에서 Contact 제출이 저장되지 않던 버그 수정)
- Agent→Skill Phase 2 완료(`prompts/{planner,reviewer,documenter,tester}.md` 병합, `system.md` 전체 각주 반영)
- Repository 운영 규칙 v1~v4(`CLAUDE.md`/`README.md`) — 신규 프로젝트 배치 규칙, packages 승격 체크리스트, Review 체크리스트

---

## 🚧 진행 중인 기능 (일부 구현)

- **Customer Inquiry Pipeline 실행** — Worker(`worker.ts`)·Executor(`executor.ts`) 로직은 완성됐지만, **`processQueuedJobs()`/`processJob()`을 호출하는 코드가 저장소 어디에도 없음**(API 라우트·cron·스케줄러 전부 확인, 0건). 즉 AiJob이 생성돼도 누군가 이 함수를 수동으로 호출하지 않는 한 영원히 `Queued` 상태로 남습니다. **이번 세션에서 새로 발견된 가장 중요한 미연결 지점입니다.**
- Inquiry/Client/WebsiteOrder/AiJob 관리자 UI — API는 완료, `/developer/{inquiries,clients,website-orders,ai-jobs}` 화면 자체가 없음(`/developer/requests`·`/developer/websites`에는 있음)
- Design Automation Phase 9(Website Build 연동) — 코드 존재, CHANGELOG 검증 기록 없음
- 인증 — signup 백엔드·앱 내 역할관리 UI 없음(CLI 스크립트로만 가능)

---

## ⏳ 예정된 기능 (미구현)

- Customer 포털(고객 본인 의뢰 상태 조회) — `Role` 타입에 `customer` 자체가 없음
- Deploy 자동화 — `ai deploy`는 branch check + `git push`만 수행, 실제 빌드/배포 실행 코드 없음(Vercel Git 연동이 그 이후를 담당)
- Notification 다채널화 — 이메일(Resend)만 존재, Slack/SMS/webhook/in-app 없음
- Portfolio 실콘텐츠, Contact 연락처 정보 확정(자료 수령 필요)
- GSC(Google Search Console) 연동

---

## 최근 완료 작업

- **AI Job Worker/Executor 구현**(2026-07-19) — `lib/aiJobs/{worker,executor}.ts` 신규. Executor는 기존 `getAiJob`·`getWebsiteOrder`·`getClient`·`execute`(commandEngine)·`createWebsiteRecord`·`addWebsiteToOrder`만 재사용해 연결(신규 CRUD/Registry 없음). `AiJobStatus`에 없는 `"Completed"` 오타를 `"Success"`로 수정해 타입 오류 해소. lint/tsc/vitest(58 files/444 tests)/build 전부 통과 확인
- **Customer Inquiry Pipeline 도메인 모델 확립**(2026-07-19) — Inquiry→Client→WebsiteOrder→AiJob 설계, Commercial Entity 명칭을 `ClientProject`에서 `WebsiteOrder`로 최종 확정(기존 `lib/projects`Dev Workspace와의 명칭 충돌 방지)
- **External API + Admin CRUD 구현**(2026-07-19) — `POST /api/external/inquiries` 오케스트레이션, API Key 인증, 관리자 CRUD 8개 라우트
- **`lib/contact/store.ts` CollectionStore 전환**(2026-07-19) — 프로덕션 데이터 유실 위험 해소
- **Agent→Skill Phase 2 완료 + Repository 운영 규칙 확립**(2026-07-19) — `prompts/*.md` 5개 병합, `CLAUDE.md`/`README.md`에 신규 프로젝트 규칙·Packages Promotion Checklist·Repository Review Checklist 추가
- 의뢰 접수 시스템(`/request`) 구현(2026-07-18)
- 출시 준비 점검 — 공개 Contact 폼 401 버그 등 수정(2026-07-18)
- `apps/cnbiz-web`로 Development OS 전체 이관(커밋 `526831e`, 2026-07-15)

---

## 다음 작업 우선순위

1. **AI Job 실행 트리거 연결** — `processQueuedJobs()`(또는 `processJob(jobId)`)를 실제로 호출하는 경로 추가(관리자 수동 실행 API, 또는 주기 실행). 현재 유일하게 남은 "완성됐지만 아무도 호출하지 않는" 단절 지점
2. **Inquiry/Client/WebsiteOrder/AiJob 관리자 UI** — `/developer/requests`와 동일한 패턴으로 목록/상세 화면 추가
3. **회원가입 백엔드 + 역할관리 UI**
4. **Portfolio 실콘텐츠·Contact 연락처 정보 확정**(자료 수령 필요)
5. **Design Automation Phase 9 실사용 검증**

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

## Git 커밋 방법

### 모든 변경사항 한 번에 커밋

```bash
git status
git add -A
git commit -m "feat: 업데이트 내용"
git push origin main
```

### 한 줄로 실행

```bash
git add -A && git commit -m "feat: 업데이트 내용" && git push origin main
```

### 커밋 메시지 예시

```bash
feat: 의뢰 접수 페이지 구현
feat: AI 홈페이지 생성 기능 추가
feat: 고객 대시보드 구현
fix: 관리자 로그인 오류 수정
docs: 프로젝트 진행률 업데이트
refactor: 코드 구조 개선
```

### 작업 순서

1. 기능 개발
2. PROJECT_STATUS.md 진행률 업데이트
3. `git add -A`
4. `git commit -m "작업 내용"`
5. `git push origin main`

---

# 개발 작업 규칙 (Working Rules)

## Single Source of Truth

- PROJECT_STATUS.md를 프로젝트의 Single Source of Truth(SSOT)로 사용한다.

## 구현 규칙

- 이미 구현된 기능은 수정·재구현·리팩터링하지 않는다.
- PROJECT_STATUS.md에서 "미구현" 또는 "일부 구현"으로 표시된 항목만 작업한다.
- 작업 전에 기존 코드의 재사용 여부를 먼저 확인한다.
- 새로운 Domain, API, Registry, Auth, RBAC, Website Builder를 생성하는 것은 금지한다.

## 작업 절차

1. PROJECT_STATUS.md 확인
2. 기존 코드 검색
3. 기존 구현 재사용 여부 확인
4. 필요한 경우에만 구현
5. PROJECT_STATUS.md 업데이트
6. 테스트
7. Git Commit

## 구현 금지

다음은 이미 구현되어 있으므로 새로 만들지 않는다.

- Domain Registry
- CollectionStore
- CRUD API
- Authentication
- RBAC
- Website Builder
- External Inquiry Orchestration
- Notification(Email)