# STEP 3 결과

> 검증일: 2026-07-23. 대상: `apps/cnbiz-web`(실제 프로덕션 — 루트 `app/`은 레거시, 대상 아님).
> 새 기능 추가·리팩터링·구조 변경은 하지 않았다. 아래 "수정된 파일"은 전부 STEP 3 도중 실제
> 실행(dev 서버 기동 + curl/Playwright 실 조작)으로 재현한 결함에 대한 최소 수정이다.

---

## 1. 검증 완료 항목

| # | 항목 | 방법 | 결과 |
|---|---|---|---|
| 1 | 전체 Build (TypeScript/ESLint/Build) | `npx tsc --noEmit` / `npm run lint` / `npm run build` | ✅ 통과 |
| 2 | Registry 전수 조사(16개 대상 + Agents/Session/Task Queue/Events) | 소스 코드 직접 판독, CollectionStore 사용 여부·CRUD 존재 여부·ID 생성 방식·Race Condition 확인 | ✅ 완료(아래 2번 표) |
| 3 | Design Pipeline 실행 검증 | 실제 dev 서버 기동 → 계정 생성 → 로그인 → curl로 Plan→Storyboard→Wireframe→Prototype→ClaudeDesign→Review→Approval→**Design Sync**(생성/조회/재동기화/롤백)→**Website Build** 전체 라이브 실행 | ✅ 전 구간 정상, 데이터 정합성 확인(아래 3번) |
| 4 | API 검증(REST/Auth/예외 처리) | 동일 라이브 세션에서 curl로 정상/예외 경로(잘못된 비밀번호·미인증·404·400) 실측 | ✅ 전부 기대한 상태 코드·메시지 반환 |
| 5 | Frontend 검증 | Playwright 실 브라우저로 `/login`·`/developer`·`/developer/design/sync`·`/developer/prompts`·`/developer/workflows`·`/developer/workspace`·`/developer/planning`·`/developer/deployment` 방문, 콘솔 에러 확인 + 390px 모바일 뷰포트 확인 | ✅ 콘솔 에러 0건(전 페이지), Design Sync 페이지가 API로 만든 실제 레코드를 정확히 렌더링함을 확인 |
| 6 | Regression Test | `npx vitest run`(전체) | ✅ 68 files / 509 tests 전부 통과 |
| 7 | Performance Check | 코드 판독 — `await` 누락·중복 조회 패턴 확인 | ✅ 치명적 문제 없음, Low 항목 1건 발견(아래) |
| 8 | 문서 검증(REPORT.md vs PROJECT_STATUS.md) | 두 문서 대조 | ✅ 상호 모순 없음(아래 8번 상세) |

---

## 2. 발견된 문제

### Critical
없음. (근거: STEP 1의 Critical 2건은 이미 해결·검증됨 — `REPORT.md` STEP 1 참고. 이번 STEP 3에서 신규 Critical은 라이브 파이프라인 실행·전체 테스트·빌드 어디에서도 재현되지 않았다.)

### High

**H-1. (발견·수정 완료) 로컬 계정 부트스트랩 스크립트 3개가 잘못된 경로에 씀 — 로그인 자체가 불가능했음**

- **근거**: 2026-07-16 커밋 `0954f09`가 `lib/db/fsStore.ts`의 로컬 fs 폴백 기본 경로를 `process.cwd()/lib/data`에서 `os.tmpdir()/cnbiz-web/data`로 변경했다(Vercel 읽기 전용 번들 경로 문제 회피 목적). 그러나 로그인 계정을 만드는 유일한 방법인 `scripts/{create-auth-user,set-user-role,reset-user-password}.cjs` 3개는 여전히 `process.cwd()/lib/data/users.json`에 쓰고 있었다.
- **재현**: 실제로 `node scripts/create-auth-user.cjs`를 실행해 계정을 만들고 dev 서버에 `POST /api/auth/login`을 호출한 결과 `401 이메일 또는 비밀번호가 올바르지 않습니다`. `os.tmpdir()/cnbiz-web/data/users.json`은 빈 배열(`[]`)이었고, 계정은 `apps/cnbiz-web/lib/data/users.json`(dev 서버가 전혀 읽지 않는 경로)에 만들어져 있었다.
- **영향**: 이 저장소에는 회원가입 API가 없다(의도적 설계, `create-auth-user.cjs` 헤더 주석 참고) — 즉 로컬 개발 환경에서 로그인 계정을 만드는 **유일한 경로가 완전히 깨져 있었다.**
- **수정**: 3개 스크립트의 fs 폴백 경로를 `os.tmpdir()/cnbiz-web/data`로 일치시킴. Supabase 경로(프로덕션용)는 무변경.
- **검증**: 수정 후 동일한 명령으로 계정 생성 → 로그인 200 확인.

**H-2. (발견·수정 완료) `lib/backup/registry.ts`가 동일한 이유로 Prompt/Workflow Backup을 항상 빈 배열로 내보냄**

- **근거**: H-1과 같은 원인 — `lib/backup/registry.ts`의 `promptsPath()`/`workflowsPath()`가 `cwd/lib/data/{prompts,workflows}.json`을 읽고 썼다. STEP 2에서 Prompt/Workflow를 `CollectionStore`로 이전할 때는 이 파일이 대상 목록에 없어 손대지 않았고(REPORT.md STEP 2에 "후속 과제"로만 기록), 당시 "로컬 개발에서는 fsStore가 같은 경로를 쓰므로 영향 없다"고 적었으나 **이는 STEP 3에서 실측한 결과 틀린 서술이었다** — `fsStore`의 실제 기본 경로가 이미 `os.tmpdir()`로 바뀌어 있었기 때문에, **로컬 개발에서도** Prompt/Workflow 섹션은 항상 빈 배열이었다.
- **재현**: dev 서버로 Prompt·Workflow를 각각 생성한 뒤 `GET /api/backup/export` 호출 → 수정 전에는 `prompts:[]`, `workflows:[]` (실제로는 존재하는데도). 수정 후 동일 절차로 `promptsCount:2, workflowsCount:2` 확인(직전에 만든 레코드 정확히 반영).
- **수정**: fs 폴백 경로를 `lib/db/fsStore.ts`와 동일한 `os.tmpdir()/cnbiz-web/data`로 일치시키되, 테스트 격리를 위해 `exportBackup()`/`importBackup()`에 선택적 `fsStoreDataDir` 인자를 추가(기존 코드베이스의 `store: CollectionStore = getDefaultStore()` DI 관례와 동일한 패턴 — 다른 레지스트리들도 전부 이 방식으로 테스트 가능하게 되어 있음).
- **한계(수정 범위 밖)**: 이 수정은 **로컬 개발 환경**의 정합성만 복구한다. **프로덕션**(Supabase가 store로 선택된 환경)에서는 Prompt/Workflow가 애초에 로컬 파일에 저장되지 않으므로 Backup의 두 섹션은 여전히 항상 빈 배열이다 — 이를 완전히 고치려면 `lib/backup/registry.ts`가 `CollectionStore`(`store.list("prompts")`/`store.list("workflows")`)를 직접 사용하도록 바꿔야 하는데, 이는 이 모듈의 "고정 파일 경로가 계약"이라는 설계 원칙 자체를 바꾸는 것이라 STEP 3의 "구조 변경 금지" 원칙에 따라 손대지 않았다. 후속 작업으로 남긴다(아래 5번).

**H-3. Registry 전체에 구조적인 Race Condition 존재 (발견, 미수정 — 구조 변경 필요)**

- **근거**: `apps/cnbiz-web/lib/**`의 배열형 Registry(Projects/Websites/Website Orders/Clients/Requests/Inquiries/AI Jobs/Workflows/Prompts/Workspaces/Design 계열/Audit 전부 포함, 예외 없이 16개 전부)가 공통적으로 `list() → 메모리에서 mutate → replaceAll()` 패턴을 쓴다. 이 세 단계는 원자적이지 않다 — 두 요청이 동시에 같은 컬렉션에 쓰면(A가 `list()`로 5건을 읽고, B도 같은 5건을 읽은 뒤, A가 6건으로 `replaceAll()`, 그 다음 B가 **자신이 읽은 5건 기준으로 만든** 6건으로 `replaceAll()`) A가 추가한 레코드가 통째로 사라진다(lost update).
- **직접 확인**: `lib/db/fsStore.ts`·`lib/db/supabaseStore.ts` 양쪽 다 이 문제에서 자유롭지 않음을 코드로 확인(STEP 1에서 고친 것은 `replaceAll()` 자체의 delete→insert 순서 문제이지, 여러 `replaceAll()` 호출 사이의 원자성이 아니다). `getDoc`/`setDoc` 기반 싱글턴(Metrics·Health cache)도 `읽기→merge→setDoc` 패턴이라 동일한 종류의 레이스가 있다.
- **심각도 판단**: High로 분류하되 STEP 3에서는 수정하지 않음 — 진짜 원자성을 확보하려면 `CollectionStore` 인터페이스 자체에 단일 레코드 단위의 원자적 append/update 연산(예: Postgres 함수/RPC, 또는 Supabase의 조건부 upsert)을 추가해야 하고, 이는 인터페이스 변경(구조 변경)이라 STEP 3의 "구조 변경 금지" 원칙과 충돌한다. 이 저장소의 현재 트래픽 특성(단일 사용자 개발/데모 단계로 추정)에서는 실질적 충돌 확률이 낮지만, 실사용자가 늘어나면 반드시 다뤄야 한다.

### Medium

**M-1. Task Queue·Session·Event Bus가 프로세스 메모리에만 존재(비영속) — 이미 알려진 설계 한계, 미수정**

- `lib/agents/taskQueue.ts`·`lib/agents/session.ts`·`lib/events/eventBus.ts` 셋 다 `CollectionStore`를 쓰지 않고 순수 JS `Map`/배열을 모듈 스코프에 유지한다. Vercel 서버리스처럼 요청마다 다른 인스턴스가 응답할 수 있는 환경에서는, 한 요청에서 만든 Task/Session이 다른 요청(다른 인스턴스)에서 조회되지 않을 수 있다.
- STEP 1·STEP 2의 대상 목록에 없었고, 이번 STEP 3도 "새 저장 계층 설계"는 구조 변경에 해당해 손대지 않았다. Development OS가 지금까지 단일 로컬 dev 서버로만 검증되어 온 것과 일치해, 실제 배포 환경에서 이 3개 기능(AI Task 실행·AI Session·실시간 Log)이 실제로 얼마나 안정적인지는 별도 확인이 필요하다.

**M-2. `lib/backup/registry.ts`의 프로덕션 공백 — H-2 한계 항목과 동일 내용, 여기 다시 명시**

- H-2에서 이미 상세 기술. 로컬 정합성은 이번에 복구했으나 프로덕션 Prompt/Workflow Backup은 여전히 공백. 후속 작업 필요.

### Low

**L-1. Design Sync 관련 API 라우트가 동일 컬렉션을 요청 1건당 2회 읽음(성능, 정확성 문제 아님)**

- `app/api/design/sync/route.ts`의 `POST` 핸들러가 `getLatestSyncForReview()`(1회 `store.list("design-sync")`) 호출 후 `recordSync()`가 내부적으로 다시 `store.list("design-sync")`를 호출한다. 기능은 정확하지만(둘 다 최신 상태를 읽으므로 값이 달라지지 않음), 매 Sync 요청마다 같은 컬렉션을 2번 읽는 비효율이 있다. 이 저장소의 다른 여러 라우트에서도 같은 모양(조회 함수 + 쓰기 함수가 각자 자기만의 `list()`를 호출)이 반복된다 — 리팩터링(호출 경로 재구성)이 필요한 개선이라 STEP 3의 "리팩터링 금지" 원칙에 따라 손대지 않음.

**L-2. File Upload 전용 API 부재(기능 격차이지 회귀 아님)**

- 요청 문서가 언급한 "File Upload"에 해당하는 실제 바이너리 업로드 엔드포인트는 이 저장소에 없다. `uploadedFiles`는 외부 챗봇(cnbiz.ai.kr)이 이미 업로드한 파일의 메타데이터(URL/파일명)만 JSON으로 전달받는 필드다(`PROJECT_STATUS.md`에도 "CNBIZ.AI.KR이 첨부파일 저장 책임"으로 이미 명시되어 있음). 새 기능이라 STEP 3에서 구현하지 않음.

---

## 3. Design Pipeline 라이브 실행 결과

실제 dev 서버(`npm run dev`)를 기동하고, 검증 전용 계정으로 로그인한 뒤 curl로 전체 체인을 실행했다(모든 ID가 STEP 1에서 도입한 `crypto.randomUUID()` 기반임을 육안으로 확인):

```
Design Plan   → design-e2512296-...       (5종 산출물 정상 생성)
Storyboard    → storyboard-45648b78-...   (Screen Flow 4개)
Wireframe     → wireframe-4e1a32a1-...    (Layout 4개)
Prototype     → prototype-c90ea329-...    (v1)
Claude Design → claude-design-46347a2b-...
Review        → review-30ba3a16-...       (in_review → approve → approved)
Design Sync   → sync-0c6f516d-...
   v1 in_sync (patch 23) → v2 재동기화 in_sync(patch 0, 변경 없음 정확히 반영)
   → v3 rollback to v1 (rolled_back, history 3건 append-only 보존)
Website Build → website-build-19be4101-... (Success, 연결 레지스트리 정상 기록)
```

각 단계의 입력·출력·ID·타입이 전부 정합적으로 이어졌고, `GET` 재조회 시 방금 만든 레코드가 정확히 돌아옴을 확인했다(`/api/design/sync/:id`, `/api/design/website`). Prompt(`POST/PATCH /api/prompts`, 버전 이력 2개로 증가 확인)·Workflow(`POST/GET /api/workflows`)·Workspace(`POST/GET /api/workspaces`, 실제 폴더 생성 확인)도 같은 세션에서 라이브로 CRUD 확인했다.

**참고**: STEP 3 요청 문서의 이상적 파이프라인 명칭("Analysis→Planning→DesignDocument→...→UI Design→Design System→Component Design→Prototype")은 실제 구현된 Phase 이름과 문자 그대로 일치하지 않는다. 실제 구현은 Phase 1(Plan, DesignDocument SSOT를 부수 효과로 함께 저장)·Phase 2(Storyboard)·Phase 3(Wireframe)·Phase 4(Prototype)·Phase 5(Claude Design — Design/UI/Component/Theme/Layout Prompt 5종을 한 번에 생성, "UI Design/Design System/Component Design"이 개념적으로 여기 포함됨)·Phase 6(Review)·Phase 7(Figma)·Phase 8(Design Sync)·Phase 9(Website Build) 9단계다. "Analysis"에 해당하는 것은 별도 기능인 AI Analysis Engine(`lib/ai-analysis/*`, Inquiry 파이프라인용)이며 Design Plan 파이프라인과는 별개다. 이름을 요청 문서 표현에 맞춰 새로 만들지 않았다(새 기능 추가 금지 원칙).

`design-document-registry.ts`(SSOT)는 자체 API 엔드포인트가 없는 내부 계층이라(다른 Phase의 adapter가 내부적으로만 참조) 직접 curl 검증은 못했지만, 기존 `tests/design/design-document-{registry,service}.test.ts`(17개, 이번 회귀 테스트에서 전부 통과)가 이를 커버한다.

---

## 4. 수정된 파일

| 파일 | 수정 내용 |
|---|---|
| `apps/cnbiz-web/scripts/create-auth-user.cjs` | fs 폴백 경로를 `os.tmpdir()/cnbiz-web/data`로 수정(H-1) |
| `apps/cnbiz-web/scripts/set-user-role.cjs` | 〃 |
| `apps/cnbiz-web/scripts/reset-user-password.cjs` | 〃 |
| `apps/cnbiz-web/lib/backup/registry.ts` | Prompt/Workflow fs 폴백 경로를 `os.tmpdir()/cnbiz-web/data`로 수정, 테스트 격리를 위한 `fsStoreDataDir` 선택적 인자 추가(H-2) |
| `apps/cnbiz-web/tests/backup/registry.test.ts` | 위 변경에 맞춰 fixture 경로를 실제 사용 경로와 일치하도록 수정(기존 5개 테스트 케이스는 무변경, 경로만 정정) |

**변경하지 않은 파일**: 위 표 외에는 STEP 3에서 소스 코드를 전혀 수정하지 않았다(전부 조사·라이브 실행 검증만 수행).

---

## 5. 테스트 결과

| 구분 | 명령 | 결과 |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| ESLint | `npm run lint` | ✅ 0 errors |
| Build | `npm run build` | ✅ 성공(전체 라우트 정상 생성) |
| Unit / Integration | `npx vitest run` | ✅ 68 files / 509 tests 전부 통과 |
| E2E(라이브 실행) | dev 서버 + curl(Design Pipeline 전체·Prompt·Workflow·Workspace CRUD·Auth 정상/예외 경로) + Playwright(8개 페이지, 모바일 뷰포트 1개) | ✅ 전부 기대 결과와 일치, 콘솔 에러 0건 |
| Regression | 위 Unit/Integration과 동일 스위트, STEP 1·STEP 2 산출물 포함 전체 재실행 | ✅ 회귀 없음 |

검증에 사용한 dev 서버·임시 계정(`step3-verify@cnbiz.local`)·임시 워크스페이스 폴더·`.generated-websites/design-step3`·`packages/cli`가 저장소 루트에 재생성한 스캐폴딩 산출물(`agents/{business-analyst,component-generator,...}`·`workflows/website-builder/`, Website Build 라이브 실행의 알려진 부수 효과 — `PROJECT_STATUS.md`·과거 CHANGELOG에 이미 문서화된 동일 현상)은 검증 후 전부 정리했다. `lib/data/`·`os.tmpdir()/cnbiz-web/data/`는 둘 다 gitignore 대상이라 git에는 애초에 영향 없음을 `git status`로 재확인했다.

---

## 6. 아직 남은 문제

1. **H-3(Race Condition)** — 모든 배열형 Registry에 구조적으로 존재. 다음 전용 STEP에서 `CollectionStore` 인터페이스 확장(원자적 단일-레코드 연산 추가)으로 다뤄야 함.
2. **M-1(Task Queue/Session/Event Bus 비영속)** — 서버리스 다중 인스턴스 환경에서의 실동작을 별도로 확인해야 함(현재는 로컬 단일 프로세스 기준으로만 검증됨).
3. **M-2/H-2 잔여분(Backup 프로덕션 공백)** — `lib/backup/registry.ts`를 CollectionStore 기반으로 재작성해야 완전히 해결됨(설계 변경 필요).
4. **L-1(중복 조회)** — 다수 라우트에서 반복되는 패턴, 리팩터링 필요.
5. STEP 2 REPORT.md에 이미 기록된 "Backup ↔ Prompt/Workflow 격차"에 대한 서술은 "로컬 개발은 영향 없다"는 부분이 부정확했음이 이번에 드러났다 — `REPORT.md`를 함께 갱신해 정정한다(STEP 3 섹션에 반영).

Critical은 없다. 위 항목들은 전부 구조 변경·설계 변경이 필요해 STEP 3 원칙(리팩터링 금지·구조 변경 금지)상 이번 단계에서는 고치지 않았다.

---

## 7. 다음 STEP 진행 가능 여부

**가능.** Critical 0건, 발견된 High 3건 중 2건(H-1·H-2)은 라이브로 재현·수정·재검증까지 완료했고, 나머지 1건(H-3)은 구조 변경이 필요해 범위 밖으로 명시적으로 남겼다. 전체 빌드·린트·회귀 테스트가 모두 통과하며, Design Pipeline과 6개 마이그레이션 대상 모듈(Design Sync·Website Build·Prompt·Workflow·Workspace·Health)이 실제 서버 구동 환경에서 정상 동작함을 라이브로 확인했다. STEP 4로 진행해도 안전하다고 판단하나, STEP 4 시작 전 사용자 확인을 기다린다.
