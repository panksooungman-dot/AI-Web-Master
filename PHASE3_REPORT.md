# Phase 3 Report — 고객별 독립 GitHub Repository + Vercel Project 자동 생성

> 작성일: 2026-07-24
> 이어지는 작업: `REWIRING_REPORT.md`(Phase 1/2/4)의 Phase 3. 기존 AI Generate Workflow
> (`lib/aiJobs/{worker,executor}.ts`)는 수정하지 않고, 그 성공 이후에만 실행되는 새 파이프라인을
> 추가했다.

---

## 아키텍처 요약

```
AI Generate 성공 (lib/aiJobs/worker.ts::processJob, 기존/무변경)
        │
        ▼
triggerDeployment() (worker.ts, 신규) — 이 Job이 만든 WebsiteRecord를 찾는다
        │
        ▼
runDeploymentPipeline() (lib/deployment/pipeline.ts, 신규 오케스트레이터)
        │
  1. GITHUB_TOKEN/VERCEL_TOKEN 확인 — 없으면 "NotConfigured"로 즉시 종료(아래 "설계 결정" 참고)
  2. lib/github/client.ts    createRepository()      — GitHub REST API
  3. lib/git/client.ts       ensureRepoInitialized()
  4. lib/git/client.ts       commitAll()
  5. lib/git/client.ts       pushToRemote()           — 토큰은 커밋/로그에 남기지 않음
  6. lib/vercel/client.ts    createProject()          — Vercel REST API
  7. lib/vercel/client.ts    linkGitRepository()
  8. lib/vercel/client.ts    createDeployment()       — Production 배포
  9. lib/websites/registry.ts updateWebsiteDeployment() — 결과를 WebsiteRecord에 저장
        │
        └─ 실패 시: 역순 롤백(Vercel Project 삭제 → GitHub Repo 삭제) + Audit Log 기록
```

요구사항의 8단계와 위 목록의 대응: 1=AI Generate 완료(전제조건), 2=Step 2, 3~5=Step 3·4,
6~7=Step 5·6, 8=Step 7, 9=Step 8.

---

## 새 모듈

| 모듈 | 파일 | 역할 |
|---|---|---|
| `lib/github/*` | `types.ts`, `client.ts` | GitHub REST API — 저장소 생성/삭제(롤백) |
| `lib/git/*` | `types.ts`, `client.ts` | 로컬 git 조작 — init/commit/push(토큰 URL, 비영속) |
| `lib/vercel/*` | `types.ts`, `client.ts` | Vercel REST API — Project 생성/삭제/GitHub 연결/배포 |
| `lib/deployment/*` | `types.ts`, `pipeline.ts` | 위 세 모듈을 조합하는 오케스트레이터 + 롤백 |

세 클라이언트 모두 새 npm 의존성(Octokit, Vercel SDK 등) 없이 `fetch`만 사용한다 —
`lib/design/figma-generator.ts`(Design Automation Phase 7)가 이미 쓰던 관례(토큰은
`process.env`, `fetchFn` 매개변수로 주입 가능)를 그대로 따랐다.

### 설계 결정 1 — 토큰 미설정 시 "가짜 성공"을 만들지 않는다

Figma 연동은 토큰이 없으면 결정론적 가짜 콘텐츠로 폴백한다(`simulated:true`) — 그 콘텐츠는
Preview UI에서만 쓰이는 서술적 데이터라 안전하다. 하지만 이 파이프라인의 산출물은 **실제로
클릭하면 열리는 저장소/배포 URL**이다. 그래서 `GITHUB_TOKEN`·`VERCEL_TOKEN`이 없으면 실제 API를
전혀 호출하지 않고 `WebsiteRecord.deploymentStatus = "NotConfigured"`로만 기록한다 — 존재하지
않는 URL을 관리자 화면에 실제 링크처럼 보여주는 것을 피하기 위함이다.

**이 환경에는 `GITHUB_TOKEN`/`VERCEL_TOKEN`이 설정되어 있지 않다**(`.env.local` 확인). 따라서
이번 구현은 GitHub·Vercel 양쪽 REST API 엔드포인트·응답 파싱 로직을 **실제 계정으로 왕복
검증하지 못했다** — AI Provider 연동(`PROJECT_STATUS.md` 2026-07-20 항목)·Figma 연동과 동일한
한계다. 엔드포인트 경로(`v9`/`v10`/`v13`)는 Vercel/GitHub 공개 문서 기준으로 작성했다.

### 설계 결정 2 — 토큰이 `commandEngine.execute()`의 로그에 남지 않도록 별도 git 실행기 사용

`lib/git/client.ts`는 저장소에 이미 있는 `lib/commandEngine/engine.ts`의 `execute()`를 의도적으로
재사용하지 않았다. 그 함수는 실행한 명령 **문자열 전체**를 `commandHistoryStore`/이벤트 버스에
기록하도록 설계되어 있는데(Terminal/Git Manager 화면이 사람에게 보여주기 위한 용도), `pushToRemote()`는
GitHub 토큰이 포함된 URL을 인자로 다뤄야 한다. 대신 `git`을 인자 배열(argv)로 직접 spawn하는
최소 실행기를 두어 — 어디에도 이 토큰을 로깅하지 않는다. 추가로:
- push 대상 URL은 `git remote add`로 `.git/config`에 **영구 기록하지 않는다** — `git push
  <token-url> HEAD:main` 형태로 그 호출 한 번의 인자로만 존재했다가 사라진다(디스크에 남지
  않음).
- `lib/deployment/pipeline.ts`가 남기는 Audit Log에도 토큰 값은 절대 포함하지 않는다(저장소
  이름·URL 등 공개 가능한 정보만 기록).

---

## Rollback

`lib/deployment/pipeline.ts`가 어느 단계에서 실패하든, **이미 생성된 외부 리소스만** 역순으로
정리한다:
- Vercel Project까지 생성된 뒤 실패 → Vercel Project 삭제 → GitHub Repo 삭제
- GitHub Repo만 생성된 뒤(커밋/푸시 단계) 실패 → GitHub Repo만 삭제(Vercel은 애초에 안 만들어짐)
- 로컬 git commit/push는 되돌리지 않는다 — 원격 저장소 자체를 삭제하므로 되돌릴 대상이 없다.
- 롤백 자체가 실패하면(`deleteProject`/`deleteRepository`가 실패 반환) 결과의 `rolledBack: false`로
  표시되고, Audit Log에 "롤백 일부 실패 — 수동 확인 필요"로 기록된다 — 관리자가 GitHub/Vercel
  대시보드에서 직접 정리해야 함을 명시적으로 알린다.

---

## 로그 기록

`lib/audit/log.ts`의 기존 인프라(Design Automation 각 Phase가 이미 그렇게 해온 것과 동일한 방식)를
그대로 재사용해 `AuditAction`에 8개 추가:

```
deployment.github.create_repo
deployment.git.commit_push
deployment.vercel.create_project
deployment.vercel.link_repo
deployment.vercel.deploy
deployment.pipeline.success
deployment.pipeline.failed
deployment.pipeline.rollback
```

`app/developer/audit-log/page.tsx`·`app/developer/errors/page.tsx`의 라벨/톤/필터 맵도 갱신
(두 파일 모두 `Record<AuditAction, ...>` exhaustive 타입이라 안 하면 컴파일 자체가 실패한다).
`/developer/audit-log`에서 위 8개 액션으로 필터링해 전체 파이프라인 이력을 확인할 수 있다.

**포함하지 않은 것(범위 밖)**: `lib/metrics/registry.ts`에 새 카운터(예: `deploymentCount`)를
추가하지 않았다 — 요구사항이 "로그 기록"이었고 Audit Log로 이미 충족되며, Metrics 대시보드 위젯
추가는 별도 UI 작업이라 스코프를 넘는다고 판단했다.

---

## 데이터 모델 변경 (전부 additive)

- `lib/websites/registry.ts`의 `WebsiteRecord`에 `repository?`·`deployment?`·`deploymentStatus?`·
  `deploymentError?` 4개 옵셔널 필드 추가. 기존 필드·기존 레코드는 무변경(Phase 3 이전 레코드는
  이 필드들이 그냥 `undefined`).
- `getWebsite(id)`·`updateWebsiteDeployment(id, patch)` 함수 신규 추가(기존 `listWebsites`/
  `createWebsiteRecord`는 무변경).
- "Project/Website 레코드에 저장" 중 **Website 레코드에만** 저장했다 — `WebsiteOrderRecord`("Project"에
  해당, `lib/websiteOrders/types.ts`의 주석 참고)는 이미 `websiteIds` 배열로 WebsiteRecord를
  가리키고 있어 URL을 두 곳에 중복 저장하면 정합성이 어긋날 위험이 있다고 판단했다.

---

## AI Generate Workflow와의 연결부 (`lib/aiJobs/worker.ts`)

`executeJob()`(Website Builder CLI 실행 — 기존, **무변경**)과 `processJob()`의 Running/Success/Failed
상태 전이 로직도 **무변경**이다. 추가한 것은 `processJob()`의 마지막에 붙인 한 줄뿐이다:

```ts
await updateAiJobStatus(jobId, "Success", {}, store);
await triggerDeployment(jobId, deployFn, store).catch((error) => {
  console.error(`Deployment pipeline failed for AI Job ${jobId}`, error);
});
```

**배포 파이프라인 실패가 이미 기록된 AiJob의 "Success"를 절대 되돌리지 않는다** — 생성(AI
Generate)과 배포(Phase 3)는 서로 다른 관심사이기 때문이다(생성 자체는 성공했는데 예컨대 GitHub
API가 일시적으로 죽어 있었다는 이유로 "생성 실패"로 보이면 안 된다). 배포 실패 원인은
`WebsiteRecord.deploymentStatus`/`deploymentError`와 Audit Log에서 확인한다.

`triggerDeployment()`는 `executeJob()`이 생성한 Website의 id를 직접 받지 못하는 기존 시그니처
제약(수정하지 않기로 함) 때문에, `WebsiteOrder.websiteIds` 배열의 **마지막 항목**(이 Job이 방금
`addWebsiteToOrder()`로 추가한 것)을 대상으로 삼는다.

---

## 변경/신규 파일 목록 (Phase 3분만)

**신규**
```
apps/cnbiz-web/lib/github/types.ts
apps/cnbiz-web/lib/github/client.ts
apps/cnbiz-web/lib/git/types.ts
apps/cnbiz-web/lib/git/client.ts
apps/cnbiz-web/lib/vercel/types.ts
apps/cnbiz-web/lib/vercel/client.ts
apps/cnbiz-web/lib/deployment/types.ts
apps/cnbiz-web/lib/deployment/pipeline.ts
apps/cnbiz-web/tests/github/client.test.ts
apps/cnbiz-web/tests/vercel/client.test.ts
apps/cnbiz-web/tests/git/client.test.ts
apps/cnbiz-web/tests/deployment/pipeline.test.ts
apps/cnbiz-web/tests/aiJobs/worker.test.ts
```

**수정**
```
apps/cnbiz-web/lib/websites/registry.ts   — WebsiteRecord 확장 + getWebsite()/updateWebsiteDeployment()
apps/cnbiz-web/lib/aiJobs/worker.ts       — triggerDeployment() 추가, processJob() 끝에 1줄 연결
apps/cnbiz-web/lib/audit/log.ts           — AuditAction 8개 추가
apps/cnbiz-web/app/developer/audit-log/page.tsx — 라벨/톤/필터 맵 갱신
apps/cnbiz-web/app/developer/errors/page.tsx    — 라벨 맵 갱신
apps/cnbiz-web/.env.example               — GITHUB_TOKEN/GITHUB_OWNER/VERCEL_TOKEN/VERCEL_TEAM_ID 추가
apps/cnbiz-web/tests/websites/registry.test.ts  — getWebsite()/updateWebsiteDeployment() 테스트 추가
```

(위 목록과 별개로, 이전 턴의 `REWIRING_REPORT.md`(Phase 1/2/4) 변경분도 같은 작업 트리에
커밋되지 않은 채 남아 있다 — `git status`로 함께 확인 가능.)

---

## 테스트

새 테스트 5개 파일, 총 49개 테스트 케이스:

| 파일 | 개수 | 검증 내용 |
|---|---|---|
| `tests/github/client.test.ts` | 11 | 미설정 시 fetch 호출 안 함, owner 있/없음에 따른 엔드포인트 분기, 201/422 응답 파싱, 삭제 204/404/403/네트워크 오류 |
| `tests/vercel/client.test.ts` | 17 | 미설정 시 fetch 호출 안 함, teamId 쿼리 부착, project/link/deployment 성공·실패, URL에 `https://` 접두사 부착 확인 |
| `tests/git/client.test.ts` | 10(9 unit + 1 실제 git) | init 멱등성, commit 순서·"nothing to commit" 처리, push URL에 토큰 임베드 확인 + `git remote add`가 전혀 호출되지 않음(비영속) 확인, 실제 git 서브프로세스로 커밋 생성까지 1회 검증 |
| `tests/deployment/pipeline.test.ts` | 6 | NotConfigured 조기 종료, 전체 성공 시 7단계 호출 순서, 슬러그 생성(한글→"site" 폴백), 중간 실패 시 롤백 대상이 정확히 좁혀짐(Vercel 생성 전 실패 → GitHub만 롤백), 롤백 자체 실패 시 `rolledBack:false` |
| `tests/aiJobs/worker.test.ts` | 5 | 성공 Job의 마지막 Website로 배포 트리거, 재시도(WebsiteOrder에 Website 2개) 시 최신 것 선택, 실패 Website/미생성/존재하지 않는 Job에는 배포를 트리거하지 않음 |

**의도적으로 실제 GitHub/Vercel API를 호출하는 테스트는 작성하지 않았다** — `GITHUB_TOKEN`/
`VERCEL_TOKEN`이 없어 애초에 불가능하고, 있었더라도 매 테스트 실행마다 실제 저장소/프로젝트를
만들었다 지우는 것은 위험하고 부적절하다고 판단했다(이전 `REWIRING_REPORT.md`에서 실제 이메일
발송을 스킵한 것과 같은 원칙).

---

## 검증

- `npx tsc --noEmit` — 0 errors
- `npm test` — **73 files / 564 tests 전부 통과**(신규 49개 포함, 회귀 없음)
- `npm run build` — 정상 생성(라우트 수 무변경, `lib/deployment`·`lib/github`·`lib/git`·
  `lib/vercel`은 API 라우트가 아니라 페이지 목록에 나타나지 않음)
- `npx eslint .` — 0 errors/warnings
- `git status` — 위 목록 그대로, 커밋은 하지 않았습니다(사용자 승인 대기)

---

## 확인 필요 (실사용 전 필수)

1. **`GITHUB_TOKEN`/`GITHUB_OWNER`/`VERCEL_TOKEN`/`VERCEL_TEAM_ID` 발급·설정** — 지금 상태로는
   AI Generate가 성공해도 배포 파이프라인이 매번 `NotConfigured`로 조용히 스킵된다(오류로
   보이지 않음 — `/developer/audit-log`에서 `deployment.pipeline.failed` 필터로 확인 가능).
2. **실제 계정 1회 왕복 검증** — 이번 구현은 문서 기준으로만 작성했다. 실제 토큰을 넣고
   레스토랑/기업 홈페이지 등 샘플 1건을 승인해 GitHub 저장소·Vercel 프로젝트·배포 URL이 실제로
   만들어지는지 확인하는 세션이 별도로 필요하다.
3. **GitHub 조직/개인 계정 선택** — `GITHUB_OWNER`를 조직으로 둘지, 토큰 소유자 개인 계정으로
   둘지 정책 결정이 필요하다(현재는 미설정 시 개인 계정 폴백).
4. **Vercel Team 여부** — 이전 세션에서 확인된 `panksooungman-dots-projects` 팀을 그대로 쓸지,
   고객 프로젝트 전용 별도 팀을 새로 만들지 결정이 필요하다(`VERCEL_TEAM_ID`).
