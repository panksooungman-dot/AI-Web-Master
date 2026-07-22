# REPORT — Persistence Integration 이후 전체 프로젝트 검증

> 작성일: 2026-07-22 (Claude Code)
> 범위: 저장소 루트(`ai-web-master`, CLI 중심)와 `apps/cnbiz-web`(실제 프로덕션 앱) 양쪽을 모두 검증했습니다.
> 이 문서는 **분석 전용**입니다 — 코드는 수정하지 않았습니다.
> 참고: 이 문서는 이전 버전(2026-07-18, 저장소 구조 분석)을 대체합니다. 저장소 구조·중복 분석은 `Repository_Modernization_Report.md`/`REFACTOR_CHECK_REPORT.md` 등 다른 문서를 참고하세요.
> 참고2: 세션 시작 시 두 워크스페이스 모두 `node_modules`가 설치되어 있지 않아(`npm install` 미실행 상태) 1차 `tsc`/`eslint` 시도가 전부 "Cannot find module 'next'/'react'" 오류로 나왔습니다. 이는 코드 결함이 아니라 미설치 상태였을 뿐이며, 루트에서 `npm install`(npm workspaces로 `apps/*`·`packages/*` 전체 설치) 실행 후 아래 모든 검증을 재실행했습니다.

---

## 0. 요약(Executive Summary)

"Persistence Integration"은 `lib/db/{collectionStore,fsStore,memoryStore,supabaseStore,index}.ts`라는 공용 저장소 추상화(`CollectionStore`: `list`/`replaceAll`/`getDoc`/`setDoc`, 전부 `Promise` 반환)를 도입해, 기존에 각 레지스트리가 개별적으로 갖고 있던 "동기 fs 읽기 → JS 배열 조작 → 동기 fs 쓰기" 패턴을 auth·audit·projects·websites·Design Automation Phase 1~7 등 다수 레지스트리에 적용한 리팩터링입니다. 프로덕션에서는 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 설정된 경우 Supabase의 단일 테이블(`app_collections`)을 백엔드로 쓰고, 미설정 로컬 개발에서는 `fsStore`(임시 디렉터리 fallback)를 씁니다.

**타입체크·빌드·기존 테스트는 표면적으로 전부 통과합니다.** 그러나 이번 검증에서 실제 코드를 추적한 결과, 이 마이그레이션은 **불완전하고 일관성이 없으며**, 코드 주석이 실제 구현과 어긋나는 지점이 있고, 저장소 추상화 자체에 프로덕션에서 데이터가 유실될 수 있는 구조적 결함이 있습니다. 가장 심각한 것부터 나열하면:

1. **`CollectionStore.replaceAll()`(Supabase 백엔드)가 "전체 DELETE 후 전체 INSERT"로 구현되어 있어, 동시 쓰기가 있으면 레코드 전체가 유실될 수 있습니다.** (Critical)
2. **Design Automation Phase 8·9(`design-sync.ts`·`website-build.ts`)와 Prompt/Workflow/Workspace/Health 4개 레지스트리가 이번 마이그레이션에서 누락되어, 여전히 `process.cwd()` 기준 fs에 직접 쓰고 있습니다.** Vercel 프로덕션은 배포 번들 경로가 읽기 전용이라 이 기능들은 실제 배포 환경에서 정상 동작하지 않을 가능성이 높습니다. (Critical)
3. **다수 레지스트리의 레코드 ID가 `Date.now()`만으로 생성되어(랜덤 접미사 없음) 같은 밀리초에 두 레코드가 생성되면 ID가 충돌합니다.** 이는 추측이 아니라 **실제로 재현되는 테스트 실패**로 확인했습니다(`tests/websites/registry.test.ts`, `tests/requests/registry.test.ts`). 이 패턴은 고객 문의(`lib/inquiries/registry.ts`) 등 실사용 데이터 레지스트리에도 동일하게 존재합니다. (Critical)
4. 위 3번의 결과로 `apps/cnbiz-web`의 테스트 스위트(465개)가 **플레이키(flaky)** 합니다 — 4회 반복 실행에서 3~5개가 매번 다르게 실패했습니다. (High)

아래에 전체 목록을 Critical → Low 순으로 정리합니다.

---

## 1. 기계적 검증 결과 요약

| 항목 | 루트(`ai-web-master`, CLI 중심) | `apps/cnbiz-web`(실제 프로덕션) |
|---|---|---|
| 1. TypeScript(`tsc --noEmit`) | ✅ 0 errors | ✅ 0 errors |
| 2. ESLint | ✅ 0 errors/warnings | ✅ 0 errors/warnings |
| 3. Build(`next build`) | ✅ 9개 라우트 정상 생성 | ✅ 90개 라우트 정상 생성(Proxy 포함) |
| 4. 테스트(`vitest run`) | ✅ 16 files / 126 tests 전부 통과 | ⚠️ 60 files / 465 tests, **3~5개가 실행마다 다르게 실패(플레이키)** |

TypeScript·ESLint·Build가 전부 깨끗하다는 사실이 "안전하다"를 의미하지 않습니다 — 아래 Critical 항목들은 전부 **타입 시스템이 볼 수 없는 런타임/동시성/환경 문제**이기 때문에 정적 검사를 통과하고도 존재합니다. 이는 4번 항목(테스트)에서 실제로 드러났습니다.

### 순환 의존성(항목 8)
`madge --circular`로 `lib/`·`app/` 전체(261개 파일)를 검사한 결과 **순환 의존성 없음**을 확인했습니다.

### import/export 깨짐(항목 9)
`tsc`/`next build` 양쪽이 0 errors이므로 모듈 해석·타입 수준의 import/export 깨짐은 없습니다.

---

## 2. Critical

### C-1. `CollectionStore.replaceAll()`(Supabase)가 "전체 삭제 후 전체 삽입"이라 동시 쓰기 시 데이터가 유실된다

- **원인**: `apps/cnbiz-web/lib/db/supabaseStore.ts`의 `replaceAll()`은
  ```ts
  async replaceAll(collection, records) {
    await client.from("app_collections").delete().eq("collection", collection);
    if (records.length === 0) return;
    await client.from("app_collections").insert(rows);
  }
  ```
  즉 컬렉션 전체를 지우고 다시 넣는 2단계 non-atomic 연산입니다. 그리고 이 함수를 호출하는 모든 `createXxx()`/`updateXxx()` 함수(예: `lib/inquiries/registry.ts`, `lib/websiteOrders/registry.ts`, `lib/aiJobs/registry.ts`, `lib/clients/registry.ts`, `lib/design/*.ts` 등 CollectionStore로 이관된 **모든** 레지스트리)는 공통적으로 `const records = await store.list(...)` → JS 배열에서 push/find/mutate → `await store.replaceAll(...)` 패턴입니다. 두 번의 네트워크 왕복(Supabase REST 호출) 사이에는 아무런 락(lock)·트랜잭션·낙관적 동시성 제어가 없습니다.
- **영향 범위**: CollectionStore로 이관된 **모든 레지스트리**(auth, audit, projects, websites, inquiries, clients, websiteOrders, aiJobs, Design Automation Phase 1~7 등) — 사실상 이 앱의 영속 데이터 전체. 특히 `POST /api/external/inquiries`(cnbiz.ai.kr 챗봇이 서버-투-서버로 호출, 인증 없이도 도달 가능한 외부 엔드포인트)는 `createInquiry()` → `find-or-create Client` → `createWebsiteOrder()` → `createAiJob()` → `processJob()`으로 이어지는 체인 전체가 이 패턴이라, 문의 두 건이 거의 동시에 들어오면 그 중 하나(또는 그 문의가 만든 Client/WebsiteOrder/AiJob 레코드)가 통째로 사라질 수 있습니다. AI Job Worker가 여러 Job을 처리하며 `aiJobs` 컬렉션에 상태를 갱신하는 경우도 동일한 위험이 있습니다.
- **재현 방법**:
  1. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`가 설정된 환경(또는 동등하게 네트워크 지연이 있는 스토어)에서
  2. 동일 컬렉션에 대해 `Promise.all([createInquiry(A), createInquiry(B)])`처럼 두 개의 생성 요청을 동시에 보냅니다.
  3. Request A의 `list()`가 끝난 직후, Request B의 `list()`가 (A의 `replaceAll()`이 커밋되기 전에) 같은 스냅샷을 읽습니다.
  4. A가 `replaceAll([...기존, A])`로 먼저 쓰고, 뒤이어 B가 `replaceAll([...기존(A 없음), B])`로 쓰면 A가 완전히 사라집니다.
  5. 로컬 재현은 `createMemoryStore()`/`createFsStore()`로도 원리상 동일하게 구성 가능하지만(둘 다 read 스냅샷 기반 `replaceAll` 전체 덮어쓰기), 실제 네트워크 왕복이 있는 Supabase 백엔드에서 경합 창(race window)이 훨씬 크므로 프로덕션에서 훨씬 더 잘 재현됩니다.
- **수정 방법**: (a) 최소한 Supabase 쪽 `replaceAll()`을 "전체 delete+insert"가 아니라 `upsert`(레코드별 insert-or-update) + 명시적 삭제 대상만 delete하는 방식으로 바꾸거나, (b) `CollectionStore`에 `insertOne`/`updateOne`/`deleteOne` 같은 레코드 단위 원자적 연산을 추가해 각 레지스트리가 "전체를 읽고 전체를 다시 쓰는" 패턴 자체를 쓰지 않도록 리팩터링하거나, (c) Postgres 함수/트랜잭션(RPC)으로 delete+insert를 하나의 원자적 서버사이드 트랜잭션으로 묶습니다. 근본 수정은 (b) 방향이 맞지만 모든 호출부 리팩터링이 필요해 규모가 큽니다.
- **수정 난이도**: 높음(Supabase 스토어 자체는 작지만, 모든 레지스트리가 "list 후 전체 replaceAll"이라는 동일 계약에 의존하고 있어 계약을 바꾸려면 전 레지스트리 호출부 재작업이 필요).

---

### C-2. Design Automation Phase 8·9와 Prompt/Workflow/Workspace/Health 4개 레지스트리가 마이그레이션에서 누락되어 여전히 `process.cwd()` 기준 fs에 직접 쓴다 — 프로덕션(Vercel)에서 정상 동작하지 않을 가능성

- **원인**: `lib/db/collectionStore.ts`의 문서 주석은 "이 앱의 모든 레지스트리(auth, audit, metrics, projects, workspaces, websites, Design Automation 레지스트리 전부)가 CollectionStore를 쓴다"고 명시하지만, 실제 코드는 그렇지 않습니다. 아래 6개 파일은 여전히 `path.join(process.cwd(), "lib", "data", "*.json")`을 직접 `fs.readFileSync`/`fs.writeFileSync`로 읽고 씁니다(전부 동기, `CollectionStore`/`getDefaultStore` 미사용):
  - `lib/design/design-sync.ts` (Design Automation **Phase 8**, `/api/design/sync*`, `/developer/design/sync`)
  - `lib/design/website-build.ts` (Design Automation **Phase 9**, `/api/design/website*`, `/developer/design/website`)
  - `lib/prompts/registry.ts` (Prompt Library, `/api/prompts*`, `/developer/prompts`)
  - `lib/workflows/registry.ts` (Workflow Center 정의, `/api/workflows*`, `/developer/workflows`, `/developer/planning`)
  - `lib/workspaces/registry.ts` (Workspace Manager, `/api/workspaces`, `/developer/workspace`, `/projects`) — **동기 함수라 `async`조차 아님**
  - `lib/health/checks.ts`의 캐시 부분(`/api/health`, `/developer/health`, `/developer/deployment`)

  반면 같은 Design Automation 파이프라인의 Phase 1~7(`registry.ts`·`storyboard.ts`·`wireframe.ts`·`prototype.ts`·`claude-design.ts`·`review-registry.ts`·`figma.ts`)은 전부 `CollectionStore`로 정상 이관되어 있습니다. 즉 **하나의 파이프라인 안에서 앞부분(1~7)은 새 방식, 뒷부분(8~9)은 옛 방식이라는 데이터 아키텍처 불일치**가 존재합니다.

  `lib/db/fsStore.ts`(CollectionStore의 로컬 폴백)는 정확히 이 문제를 알고 있어서 자체 주석에 "`getDefaultStore()`의 fail-fast 가드 덕분에 Production에서는 이 store가 선택되는 일이 없어야 정상이다 ... 배포 산출물의 읽기 전용 경로(예: `/var/task/apps/cnbiz-web`)가 아니라 `os.tmpdir()`을 쓴다"고 명시합니다. 그런데 위 6개 파일은 이 안전장치를 거치지 않고 **독자적으로 `process.cwd()`를 그대로 사용**하므로, 정확히 그 fsStore가 피하려던 문제(읽기 전용 배포 경로에 쓰기 시도)에 그대로 노출됩니다.
- **영향 범위**: Design Sync·Website Build 연동(Design Automation Phase 8·9), Prompt Library, Workflow Center, Workspace Manager, Health Dashboard 캐시. Workspace/Health는 원래 로컬 개발 도구 성격이 강해 상대적으로 영향이 적지만, Prompt Library·Workflow Center·Design Sync·Website Build는 `/developer/**` 대시보드에서 실제 사용자가 쓰는 기능입니다.
- **재현 방법**: Vercel 등 읽기 전용 배포 파일시스템에서 `POST /api/prompts`(또는 `/api/design/sync`, `/api/workflows`)를 호출하면 `fs.mkdirSync(path.join(process.cwd(), "lib", "data"))`가 `EROFS`(read-only file system)로 실패해 500 에러가 발생합니다(로컬 `npm run dev`/`next start`에서는 `process.cwd()`가 쓰기 가능한 개발 디렉터리이므로 재현되지 않고, 이번 세션에서도 실제 배포 환경 접근 권한이 없어 라이브 재현은 하지 못했습니다 — 코드 경로 추적과 `fsStore.ts`의 주석에 근거한 정적 분석 결론입니다).
- **수정 방법**: 위 6개 파일을 Phase 1~7과 동일하게 `CollectionStore`/`getDefaultStore()` 기반으로 이관합니다. Workspace Manager는 "실제 로컬 폴더를 만든다"는 본질적 목적 때문에 어차피 서버리스 프로덕션에서 완전히 동작할 수 없는 기능이므로(이건 이번 마이그레이션과 무관한 기존 설계 한계), 레지스트리 데이터 저장 부분만이라도 이관하거나 "로컬 전용 기능"임을 문서에 명시합니다.
- **수정 난이도**: 중간(각 파일은 이미 CollectionStore로 이관된 자매 레지스트리와 거의 동일한 모양이라 패턴을 그대로 따라 하면 되지만, 6개 파일 전체 반복 작업 + 콜백/호출부 async 전환이 필요).

---

### C-3. 다수 레지스트리가 `Date.now()`만으로 ID를 생성해 같은 밀리초에 생성된 레코드끼리 ID가 충돌한다 — 실제 테스트 실패로 재현됨

- **원인**: 아래 레지스트리들은 레코드 `id`를 `` `<prefix>-${Date.now()}` `` 형태로만 생성합니다(랜덤 접미사 없음, `Math.random()`도 없음):
  - `lib/inquiries/registry.ts` → `inquiry-${Date.now()}`
  - `lib/clients/registry.ts` → `client-${Date.now()}`
  - `lib/websites/registry.ts` → `website-${Date.now()}`
  - `lib/prompts/registry.ts` → `prompt-${Date.now()}`
  - `lib/requests/registry.ts` → `request-${Date.now()}`
  - `lib/workspaces/registry.ts` → `workspace-${Date.now()}`
  - `lib/aiJobs/registry.ts` → `ai-job-${Date.now()}`
  - `lib/workflows/registry.ts` → `workflow-${Date.now()}`
  - `lib/websiteOrders/registry.ts` → `website-order-${Date.now()}`
  - `lib/projects/registry.ts` → `project-${Date.now()}`

  반면 같은 저장소 안에서도 `lib/design/*.ts`(Design Automation 전 Phase, 예: `` `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` ``)와 `lib/events/eventBus.ts`는 **타임스탬프 + 랜덤 접미사**를 쓰고 있어 충돌 위험이 사실상 없습니다. 즉 **같은 코드베이스 안에 "안전한 ID 생성 방식"과 "위험한 ID 생성 방식"이 공존**합니다.

  `Date.now()`는 밀리초 단위이고, 위 함수들은 전부 `store.list()` → push → `store.replaceAll()`처럼 그 자체로 I/O 왕복이 있는 비동기 작업입니다. 테스트처럼 두 번의 생성 호출이 앞뒤로 아주 가깝게(1ms 이내) 실행되면 두 레코드가 **완전히 동일한 `id`**를 갖게 됩니다.
- **영향 범위**: ID로 레코드를 찾는 모든 조회/수정 함수(`getRequest`, `updateRequestStatus`, `getWebsite` 등)가 `records.find(r => r.id === id)`로 **첫 번째 일치 레코드만** 반환하므로, ID가 충돌하면 (a) 나중에 만든 레코드는 이후 절대 개별 조회할 수 없고, (b) `updateXxx(idA, ...)` 호출이 실제로는 의도한 레코드가 아니라 같은 id를 가진 다른 레코드를 수정/조회하는 결과로 이어질 수 있습니다. `lib/inquiries/registry.ts`가 이 목록에 포함된다는 점이 특히 중요합니다 — `POST /api/external/inquiries`는 cnbiz.ai.kr 챗봇이 실제 고객 문의를 넣는 유일한 경로이므로, 짧은 시간에 두 건의 문의가 들어오면(챗봇 다중 사용자 동시 접속 시 충분히 가능) 실제 고객 데이터가 서로 뒤섞이거나 유실될 수 있습니다.
- **재현 방법**(이번 세션에서 실제로 재현·확인함, 추측 아님):
  ```
  cd apps/cnbiz-web && npm test -- --run
  ```
  아래 두 테스트가 반복 실행 시 간헐적으로 실패합니다(4회 실행 중 매번 실패, 실패 개수·목록은 실행마다 다름 — 전형적인 타이밍 의존 플레이크):
  - `tests/websites/registry.test.ts > listWebsites() returns newest first`
    ```
    AssertionError: expected 'First' to be 'Second'
    ```
    두 `createWebsiteRecord()` 호출이 같은 밀리초에 실행되면 `createdAt`(정렬 기준)도 동일해지고, `Array.prototype.sort`는 안정 정렬이라 동률일 때 원래(삽입) 순서를 그대로 유지 — "최신순"이 삽입 순서로 뒤바뀝니다.
  - `tests/requests/registry.test.ts > updateRequestStatus() changes status ... leaving other records untouched`
    ```
    AssertionError: expected 'InReview' to be 'New'
    ```
    `created`와 `other` 두 레코드가 같은 밀리초에 생성되어 **동일한 id**를 갖게 되면, `updateRequestStatus(created.id, "InReview")`가 배열의 첫 번째 일치 레코드(사실상 두 레코드 중 하나, `findIndex`가 첫 매치만 찾음)를 수정하고, 이어서 `getRequest(other.id, ...)`도 같은 id로 첫 번째 일치 레코드(=방금 수정된 레코드)를 반환해 "다른 레코드는 영향받지 않아야 한다"는 테스트 전제 자체가 깨집니다.
  - 동일한 원인이 `tests/design/review-registry.test.ts > addReviewComment() ... bumping updatedAt`(`expect(updated.updatedAt).not.toBe(record.createdAt)`)에서도 한 번 관측되었습니다 — 이쪽은 ID 충돌이 아니라 `updatedAt`/`createdAt`이 모두 `new Date().toISOString()`(밀리초 단위) 기반이라, 같은 밀리초에 두 시각을 찍으면 "값이 달라야 한다"는 단언이 실패하는 동일 계열의 문제입니다.
- **수정 방법**: 모든 ID 생성을 `` `<prefix>-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` ``(이미 `lib/design/*`·`lib/events/eventBus.ts`가 쓰는 패턴) 또는 `crypto.randomUUID()`로 통일합니다. 정렬/변경-감지용 타임스탬프 비교에 의존하는 테스트·로직은 밀리초 동률 가능성을 인지하고 `id` 기반 tie-break를 추가하거나(예: 정렬 시 `createdAt` 동률이면 `id`로 2차 정렬), 테스트는 실행 사이에 최소 지연을 넣거나 mock timer를 쓰는 방식으로 결정론적으로 만듭니다.
- **수정 난이도**: 낮음(ID 생성 로직 자체는 각 파일 1줄 수정 — 이미 검증된 패턴이 코드베이스 안에 존재). 다만 변경 대상 파일이 10개 이상이라 반복 작업량은 있습니다.

---

## 3. High

### H-1. `apps/cnbiz-web` 테스트 스위트가 플레이키하다 — 4회 실행에서 3~5개 테스트가 매번 다르게 실패

- **원인**: C-3(밀리초 ID/타임스탬프 충돌)의 직접적 결과입니다.
- **영향 범위**: `apps/cnbiz-web`의 CI 게이팅 신뢰도 전체. "테스트 전체 실행" 결과가 실행마다 달라지므로, 실제 회귀가 있어도 "원래 플레이키한 테스트겠지"로 오인해 지나칠 위험이 커집니다. 실제로 이 저장소의 `docs/01_PMO/CHANGELOG.md`에도 과거 세션에서 `tests/agents/taskQueue-retry.test.ts`를 "기존에 알려진 무관한 타이밍 플레이크"로 반복 언급한 전례가 있어(2026-07-15 항목 다수), 이런 식으로 실제 결함이 "알려진 플레이크"로 묻힐 패턴이 이미 있습니다.
- **재현 방법**: 위 C-3 참고. 이번 세션에서 `cd apps/cnbiz-web && npm test -- --run`을 4회 반복 실행한 결과:
  - 1회차: 3 failed / 462 passed
  - 2회차: 5 failed / 460 passed
  - 3회차: 4 failed / 461 passed
  - 4회차: 4 failed / 461 passed (최종 확인 실행)
  - 매번 `tests/websites/registry.test.ts`·`tests/requests/registry.test.ts`는 공통으로 실패, 그 외에 `tests/design/review-registry.test.ts`(1회), `tests/agents/taskQueue-retry.test.ts`(3회, 이건 CHANGELOG에 이미 기록된 기존 무관 플레이크로 보임 — retry 로직 자체의 타이밍 이슈이지 CollectionStore와는 무관)가 번갈아 나타났습니다.
- **수정 방법**: C-3을 고치면 `tests/websites/registry.test.ts`·`tests/requests/registry.test.ts`·`tests/design/review-registry.test.ts`의 플레이크는 해소됩니다. `tests/agents/taskQueue-retry.test.ts`는 별개 원인(타이밍)이라 이번 리포트 범위(Persistence Integration) 밖이지만, 테스트 스위트 전체 신뢰도를 위해 함께 조사할 가치가 있습니다.
- **수정 난이도**: 낮음(C-3 수정에 종속).

---

### H-2. `collectionStore.ts`의 문서 주석이 실제 구현과 어긋난다

- **원인**: `lib/db/collectionStore.ts` 상단 주석은 "every registry in this app (auth, audit, metrics, projects, workspaces, websites, and the Design Automation registries)"라고 명시하지만, 실측 결과 `workspaces`는 이관되지 않았고(C-2 참고) `metrics`도 별도 확인이 필요합니다. 문서와 실제 구현이 어긋나면 다음 개발자(사람이든 AI 에이전트든)가 "workspaces는 이미 안전하게 이관됐다"고 오인하고 그 위에 기능을 쌓을 위험이 있습니다.
- **영향 범위**: 문서 신뢰도, 향후 유지보수 시 오판 위험.
- **재현 방법**: `lib/db/collectionStore.ts`의 주석과 `lib/workspaces/registry.ts`의 실제 구현(동기 `fs.readFileSync`/`writeFileSync`, `CollectionStore` import 없음)을 나란히 비교.
- **수정 방법**: C-2를 고치며 workspaces도 이관하거나, 이관하지 않기로 확정한다면 주석에서 workspaces를 빼고 "왜 제외했는지"를 명시.
- **수정 난이도**: 낮음(문서만 고치는 경우) / 중간(실제로 이관하는 경우, C-2와 동일).

---

## 4. Medium

### M-1. `lib/requests/registry.ts`의 `createRequest()`는 실제로는 도달 불가능한 죽은 코드다

- **원인**: PROJECT_STATUS.md에 기록된 "CNBIZ.KR 브랜드 피벗"에 따라 `/contact`·`/request` 페이지와 `app/api/requests/submit`이 제거되었고, `lib/requests/*`·`/developer/requests`는 "과거 데이터 조회용 관리자 백엔드로 보존(신규 접수는 받지 않음)"으로 명시되어 있습니다. 실제로 저장소 전체에서 `createRequest`를 import하는 곳은 `tests/requests/registry.test.ts` 뿐이고, 어떤 API 라우트나 페이지도 호출하지 않습니다(`listRequests`/`getRequest`/`updateRequestStatus`는 `/developer/requests`가 여전히 사용 중이라 살아있음).
- **영향 범위**: 기능상 문제는 없음(의도된 설계). 다만 테스트가 프로덕션에서 실행되지 않는 코드 경로를 검증하고 있어, "테스트가 통과한다"는 것이 실제 서비스 동작을 보장하지 않는다는 착시를 줄 수 있습니다.
- **재현 방법**: `grep -rn "createRequest" app/ lib/` — `lib/requests/registry.ts` 자기 자신 외에는 매치 없음(테스트 파일 제외).
- **수정 방법**: 의도된 죽은 코드이므로 그대로 두거나, "재접수 API가 부활할 때까지 보존"이라는 취지를 `lib/requests/registry.ts` 상단 주석에 명시. 시급하지 않음.
- **수정 난이도**: 매우 낮음(주석 추가) 또는 해당 없음(그대로 유지).

### M-2. `lib/workspaces/registry.ts`의 `getWorkspace()`가 어디서도 호출되지 않는다

- **원인**: `ts-prune` 결과 및 `grep` 확인 결과, `getWorkspace(id)`를 호출하는 API 라우트/페이지가 없습니다(`app/api/workspaces/route.ts`는 `createWorkspace`/`listWorkspaces`만 사용).
- **영향 범위**: 기능 영향 없음(단순 미사용 export).
- **재현 방법**: `grep -rn "getWorkspace(" app/ lib/` → 정의부 1건만 매치.
- **수정 방법**: 실제로 필요 없다면 제거, 향후 "단건 조회 API"가 계획되어 있다면 주석으로 의도 명시.
- **수정 난이도**: 매우 낮음.

### M-3. Design Automation의 `listXxxForYyy()` 계열 필터 함수 다수가 어디서도 호출되지 않는 것으로 보인다

- **원인**: `ts-prune` 결과 `listStoryboardsForPlan`(storyboard.ts) · `listWireframesForStoryboard`(wireframe.ts) · `listPrototypesForWireframe`(prototype.ts) · `listClaudeDesignsForPrototype`(claude-design.ts) · `listReviewsForClaudeDesign`(review-registry.ts) · `getLatestWebsiteBuildForReview`(website-build.ts)가 미사용으로 표시됐습니다. (참고: 같은 도구가 `lib/design/approval.ts`의 `approveReview`/`rejectReview`/`requestRevision`/`cancelApproval`도 미사용으로 표시했지만, 이는 오탐(false positive)입니다 — 이 4개는 같은 파일의 `applyApproval()`이 내부적으로 호출하는 디스패치 대상이라 실제로는 사용 중입니다. 이번 리포트에서는 다른 코드가 import하지 않는 것을 직접 확인한 6개만 열거합니다.)
- **영향 범위**: 기능 영향 없음. 각 Phase의 상세 대시보드 페이지(`/developer/design/{storyboard,wireframe,prototype,claude,review}`)가 "특정 상위 레코드에 연결된 하위 레코드만" 보여주는 대신 전체 목록(`listXxx()`)을 가져와 클라이언트에서 직접 필터링하는 방식으로 구현되어 있을 가능성이 높습니다(정확한 확인은 각 페이지 컴포넌트를 개별적으로 더 봐야 함 — 이번 검증에서는 표층 grep까지만 확인).
- **재현 방법**: `npx ts-prune -p tsconfig.json`(apps/cnbiz-web) 결과에서 위 6개 항목 확인.
- **수정 방법**: 실제 미사용이 최종 확인되면 제거하거나, 테스트에서만 쓰인다면(각 Phase의 `*-registry.test.ts`가 이 함수들을 직접 테스트하고 있어 완전한 죽은 코드는 아님) 그대로 두어도 무방.
- **수정 난이도**: 낮음.

---

## 5. Low

### L-1. `tests/agents/taskQueue-retry.test.ts`의 기존 타이밍 플레이크(Persistence Integration과 무관)

- **원인**: `retry() returns null for a task that is not Failed (e.g. Success)` 테스트가 이번 4회 실행 중 3회 실패했습니다. `docs/01_PMO/CHANGELOG.md`의 2026-07-15 항목에 이미 "전체 병렬 실행 시 무관한 기존 타이밍 플레이크로 확인, 단독 재실행 시 통과"라고 기록되어 있어 **이번 마이그레이션 이전부터 존재하던 별개의 문제**로 판단됩니다.
- **영향 범위**: 테스트 스위트 신뢰도(H-1과 합쳐서 봐야 함). Persistence Integration 자체의 결함은 아닙니다.
- **재현 방법**: 위 테스트 스위트 반복 실행.
- **수정 방법**: 이번 리포트 범위 밖 — 별도 조사 필요(리포트에는 기록만 남김).
- **수정 난이도**: 미산정(별도 조사 필요).

### L-2. 순환 의존성 없음 / import-export 깨짐 없음 (정보성, 문제 아님)

`madge --circular`(261개 파일) 결과 순환 의존성 0건. `tsc`/`next build`가 양쪽 워크스페이스에서 0 errors이므로 import/export 경로 자체의 깨짐도 없습니다. 이 두 항목은 이번 검증에서 문제가 발견되지 않았음을 기록합니다.

### L-3. 저장소에 `node_modules`가 커밋되어 있지 않아 최초 실행 시 반드시 `npm install`이 필요함(환경 노트)

- **원인/영향**: 코드 결함은 아니지만, 이번 세션 시작 시 `node_modules`가 전혀 없어 최초 `tsc`/`eslint` 시도가 전부 "모듈을 찾을 수 없음" 오류로 나왔습니다(패키지 문제가 아니라 미설치 상태). 새 검증 세션·CI 실행 시 `npm install` 선행이 전제되어야 함을 명확히 해 둘 필요가 있습니다.
- **재현 방법**: 클린 체크아웃 상태에서 `npx tsc --noEmit` 실행 시 재현.
- **수정 방법**: 해당 없음(정상적인 워크플로) — 다만 온보딩 문서에 "검증 전 `npm install` 필수"를 명시하면 혼동을 줄일 수 있음.
- **수정 난이도**: 해당 없음.

---

## 6. 파이프라인 데이터 흐름 검증(항목 5) 상세 근거

`Design Plan(Phase 1) → Storyboard(2) → Wireframe(3) → Prototype(4) → Claude Design(5) → Review/Approval(6) → Figma(7) → Design Sync(8) → Website Build(9, "React Generator"에 해당 — 실제 React/Next.js 코드를 생성하는 것은 `packages/cli/src/website/*`(Website Builder v2 CLI)이며, `lib/design/website-build.ts`·`website-build-adapter.ts`는 그 CLI를 호출하기 위한 매핑/기록 계층)`으로 이어지는 체인을 각 단계의 타입·ID 참조로 추적했습니다.

- 각 단계는 상위 단계의 레코드 id(`planId`/`storyboardId`/`wireframeId`/`prototypeId`/`claudeDesignId`/`reviewId`/`figmaId`)를 다음 단계 레코드에 그대로 보관하는 구조이며, 전부 `string` 타입으로 일관되어 있어 `tsc`가 타입 불일치를 잡아내지 못하는 영역은 아닙니다(실제로 타입 불일치는 발견되지 않았습니다).
- 다만 C-3에서 지적한 대로 이 id들 자체가 밀리초 충돌에 취약하므로(Design Automation Phase 1~7도 접미사가 있을 뿐 여전히 `Date.now()` 기반), 파이프라인 전체가 "타입은 맞지만 런타임에 잘못된 레코드를 가리킬 수 있다"는 위험을 이론적으로 안고 있습니다 — 다만 랜덤 접미사가 있어 실제 충돌 확률은 C-3 목록의 레지스트리들보다 훨씬 낮습니다.
- Phase 6→7→8→9 사이의 "Approval Rule"(Review가 `approved` 상태가 아니면 409)은 Figma export(`app/api/design/figma/export`)와 Website Build(`app/api/design/website`) 양쪽에서 일관되게 구현되어 있음을 확인했습니다(코드 검토 기준, 정상).
- Phase 8(Design Sync)은 CHANGELOG 자체가 "이 저장소에는 Design으로부터 실제 파일을 생성하는 진짜 코드베이스가 없다"고 명시하고 있어, "Code" 스냅샷은 항상 결정론적으로 재생성되는 문자열이지 실제 파일시스템 상태가 아닙니다 — 즉 Phase 8은 설계상 시뮬레이션이며 이번 검증에서 별도의 데이터 불일치는 발견되지 않았으나, C-2로 인해 이 Phase 자체의 영속화가 프로덕션에서 실패할 수 있다는 점이 더 근본적인 문제입니다.

---

## 7. 참고 — 이번 세션에서 실행한 명령 요약

```bash
# 루트
npm install                 # 최초 1회, node_modules 없어서 필요했음
npx tsc --noEmit             # 0 errors
npx eslint .                 # 0 errors
npm run build                 # 9 routes, exit 0
npm test -- --run             # 16 files / 126 tests, exit 0

# apps/cnbiz-web
npx tsc --noEmit             # 0 errors
npx eslint .                 # 0 errors
npm run build                 # 90 routes, exit 0
npm test -- --run             # 60 files / 465 tests — 4회 반복 실행, 매번 3~5개 실패(플레이키, 원인은 C-3)

# 공통
npx madge --circular --extensions ts,tsx lib app   # 순환 의존성 0건
npx ts-prune -p tsconfig.json                       # 미사용 export 후보 목록(수동 검증 후 M-2·M-3에 반영)
```
