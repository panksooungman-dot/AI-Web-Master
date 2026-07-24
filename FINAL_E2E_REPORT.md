# FINAL_E2E_REPORT — Git Scope 수정 + GitHub `workflow` 권한 추가 이후 최종 운영 검증

> 작성일: 2026-07-24
> 선행 조건: `GIT_SCOPE_FIX_REPORT.md`의 수정 적용 완료(`lib/git/client.ts`), GitHub Fine-grained
> PAT에 `workflow` 권한 추가 완료(사용자 조치)
> 실행 계정: `GITHUB_TOKEN`(workflow 권한 추가됨)/`VERCEL_TOKEN`, 앱: `apps/cnbiz-web`(dev 서버,
> 포트 3400)

---

## 최종 판정: **FAIL**

Git Scope 버그는 **실제 운영 환경에서 완전히 해결되었음을 이번 회차에서 직접 증명**했다 —
GitHub Repository 생성부터 Git Push까지 이번에 처음으로 전부 성공했고, 모노레포 오염도 전혀
발생하지 않았다. 하지만 **마지막 단계인 Vercel Production Deploy에서 별개의 새로운 코드 결함**이
발견되어 최종 배포까지는 도달하지 못했다. 롤백은 정상 실행되어 GitHub 저장소·Vercel 프로젝트 모두
정확히 정리됐다.

---

## 결과 요약표

| 항목 | 값 |
|---|---|
| Repository URL | `https://github.com/panksooungman-dot/portfolio-25dd6208` — **롤백으로 삭제됨**(현재 404, 삭제 확인 완료) |
| Commit SHA | `0ff8533fd615d15be171654c107dae48aa1be9ae`("Initial deployment via AI Business OS", 54개 파일 — 전부 생성된 사이트 자신의 파일, 모노레포 파일 0개) |
| Push 성공 여부 | ✅ 성공(`deployment.git.commit_push` audit 기록, GitHub 원격에 실제로 반영된 뒤 롤백으로 저장소 자체가 삭제됨) |
| Vercel Project URL | 프로젝트 ID `prj_J7cNuXR8ckAZlew5gOSbhCzo3YGG`(이름 `portfolio-25dd6208`) — **롤백으로 삭제됨**(현재 404, 삭제 확인 완료) |
| Production URL | 없음(Deploy 자체가 실패해 생성되지 않음) |
| Deployment Status | `Failed` (`WebsiteRecord.deploymentStatus`, 정확히 기록됨) |
| Audit Log | ✅ 6단계 전부 정확히 기록(아래 상세) |
| Rollback | ✅ 실행됨, 성공 — Vercel Project·GitHub Repository 둘 다 실제 삭제됨을 API로 재확인 |

---

## 1. outDir 독립 저장소 검증 (사전 확인, 실제 파이프라인 실행 전)

실제 `ai-web-master` 저장소 안(`.generated-websites/manual-verify-outdir`)에서 고쳐진
`ensureRepoInitialized()`/`commitAll()`을 직접 호출해 확인:

```
=== outDir/.git exists === true
=== git rev-parse --show-toplevel (outDir) === D:/ai-web-master/.generated-websites/manual-verify-outdir
=== outDir path === D:\ai-web-master\.generated-websites\manual-verify-outdir
=== matches outDir? === true
=== git rev-parse --show-toplevel (ai-web-master root) === D:/ai-web-master
=== outDir toplevel !== repoRoot toplevel? === true
=== commitAll === {"success":true, ... "1 file changed, 1 insertion(+)"}
=== files in outDir's HEAD commit === site-file.txt
=== ai-web-master root git log -3 (should be unchanged) === f41dcef ... (변경 없음)
```

`outDir/.git` 존재, `git rev-parse --show-toplevel`이 정확히 `outDir` 자신을 가리킴, 상위
`ai-web-master` 저장소의 toplevel과 다름 — 3가지 모두 확인. 검증에 사용한 임시 outDir·테스트
파일은 즉시 삭제.

---

## 2. 최종 End-to-End 테스트 (실제 GitHub/Vercel 계정, workflow 권한 포함)

### 테스트 절차
1. `POST /api/inquiries`로 테스트 Inquiry 생성 → Inquiry/Client/WebsiteOrder/AiJob(Queued) 정상 생성
2. `developer` 계정으로 `POST /api/ai-jobs/{id}/run` 호출(관리자 "승인" 버튼과 동일 라우트) →
   Website Builder CLI 실행 성공(AiJob: Success) → 배포 파이프라인 자동 트리거

### GitHub Repository 생성 — ✅ 성공
- 이름: `portfolio-25dd6208`, Owner: `panksooungman-dot`(개인 계정)
- URL: `https://github.com/panksooungman-dot/portfolio-25dd6208`
- Audit: `deployment.github.create_repo`(success: true)

### Git Init(outDir) — ✅ 성공(사고 재발 없음)
- `outDir`(`.generated-websites/ai-job-38478542-1e8e-45f3-840e-13437b9af896`)가 독립 `.git`을
  가진 저장소로 생성됨
- **모노레포 오염 없음**: 실행 전후 `ai-web-master` 루트의 `git log --oneline -3`이 완전히 동일
  (`f41dcef` HEAD 그대로), `git status`도 이 세션에서 이미 존재하던 변경분(`PHASE3_REPORT.md`
  등)만 그대로 유지 — Git Scope 수정이 실제 운영 조건에서 정확히 작동함을 증명

### Git Commit — ✅ 성공
- 로컬 커밋: `0ff8533` "Initial deployment via AI Business OS"
- `git show --name-only HEAD`(outDir 기준) 결과 **54개 파일 전부 생성된 사이트 자신의 파일** —
  이전 사고에서처럼 모노레포 파일이 섞이는 일이 전혀 없었음

### Git Push — ✅ 성공 (이번 회차 최초 성공)
- Audit: `deployment.git.commit_push`(success: true, detail: `panksooungman-dot/portfolio-25dd6208`)
- 이전 회차의 차단 원인이었던 `.github/workflows/docs.yml`에 대한 `refusing to allow a Personal
  Access Token ... without workflow scope` 오류가 이번에는 발생하지 않음 — GitHub PAT에 추가된
  `workflow` 권한이 정상 작동함을 확인

### Vercel Project 생성 — ✅ 성공
- Project ID: `prj_J7cNuXR8ckAZlew5gOSbhCzo3YGG`, 이름: `portfolio-25dd6208`
- Audit: `deployment.vercel.create_project`(success: true)

### GitHub Repository 연결(Vercel ↔ GitHub) — ✅ 성공
- Audit: `deployment.vercel.link_repo`(success: true)

### Production Deploy — ❌ 실패 (신규 코드 결함 발견)

**API 응답 전문**:
```json
HTTP 400
{
  "error": {
    "code": "bad_request",
    "message": "Invalid request: `gitSource` missing required property `repoId`."
  }
}
```

**원인**: `lib/vercel/client.ts`의 `createDeployment()`가 Vercel `POST /v13/deployments`에 보내는
`gitSource`가 다음과 같이 `repoId`(연결된 GitHub 저장소의 숫자 ID) 없이 구성되어 있다:
```ts
gitSource: { type: "github", ref: input.gitBranch ?? "main" },
```
Vercel API는 `type: "github"` 소스로 배포를 생성할 때 `repoId`를 필수로 요구하는데(이 값은
GitHub 저장소가 실제로 연결되어 있음을 명시적으로 알려주는 식별자), 지금 코드는 이 필드 자체를
채울 방법이 없다 — `CreateDeploymentInput` 타입에 `repoId` 필드가 없고, `runDeploymentPipeline()`
이 `createDeployment()`를 호출하는 지점(`lib/deployment/pipeline.ts` Step 7)에서도
`repository.id`(Step 2 `createRepository()`가 이미 응답으로 받아 갖고 있는 숫자 GitHub repo ID,
`GitHubRepository.id: number`)를 전달하지 않는다. 즉 필요한 값 자체는 파이프라인 안에 이미
존재하지만(Step 2에서 받은 `repository.id`), Step 7까지 전달되지 않고 있다.

이 문제는 `PHASE3_REPORT.md`가 이미 명시했던 한계("엔드포인트 버전은 Vercel 공개 문서 기준으로만
작성했고 실제 계정으로 왕복 검증하지 못했다")가 실제로 현실화된 사례다 — GitHub/Push 관련 두
결함(오설정·권한 부족·Git Scope 버그)을 전부 해결하고 나서야 비로소 도달할 수 있었던, 파이프라인의
가장 마지막 단계에서만 드러나는 결함이었다.

**권장 수정(적용하지 않음 — 이번 요청 범위는 검증까지)**:
1. `lib/vercel/client.ts`의 `CreateDeploymentInput`에 `repoId: number` 필드 추가
2. `createDeployment()`의 `gitSource`를 `{ type: "github", repoId: input.repoId, ref: input.gitBranch ?? "main" }`로 수정
3. `lib/deployment/pipeline.ts` Step 7 호출부에서 Step 2의 `repository.id`를 그대로 전달:
   ```ts
   const deployment = await deps.createDeployment({
     name: repoName,
     projectId: vercelProject.id,
     gitBranch: repository.defaultBranch,
     repoId: repository.id, // 추가
   });
   ```

### Deployment URL 저장 — 저장 안 됨(설계대로)
Deploy가 실패해 `WebsiteRecord.repository`/`deployment` 필드는 저장되지 않고,
`deploymentStatus: "Failed"` + `deploymentError`(위 API 응답 그대로)만 정확히 기록됨.

### Audit Log — ✅ 정확 (6개 액션 전부)

```json
[
  { "action": "deployment.github.create_repo",  "success": true,  "detail": "panksooungman-dot/portfolio-25dd6208" },
  { "action": "deployment.git.commit_push",      "success": true,  "detail": "panksooungman-dot/portfolio-25dd6208" },
  { "action": "deployment.vercel.create_project","success": true,  "detail": "portfolio-25dd6208", "projectId": "prj_J7cNuXR8ckAZlew5gOSbhCzo3YGG" },
  { "action": "deployment.vercel.link_repo",     "success": true,  "detail": "panksooungman-dot/portfolio-25dd6208" },
  { "action": "deployment.pipeline.failed",      "success": false, "detail": "Vercel 배포 실패 (400): ... gitSource missing required property repoId ..." },
  { "action": "deployment.pipeline.rollback",    "success": true,  "detail": "롤백 완료", "repository": "panksooungman-dot/portfolio-25dd6208", "vercelProjectId": "prj_J7cNuXR8ckAZlew5gOSbhCzo3YGG" }
]
```

성공한 4단계(create_repo·commit_push·create_project·link_repo)가 정확히 기록되고, 실패 시점
(Production Deploy)과 그 직후 롤백까지 순서대로 정확히 남았다. `deployment.vercel.deploy`·
`deployment.pipeline.success`는 도달하지 못했으므로 기록되지 않음(설계대로).

### Rollback — ✅ 실행 및 외부 검증 완료

파이프라인 내부 로그(`rolledBack: true`)뿐 아니라 **GitHub/Vercel API로 직접 재조회해 실제
삭제됐음을 확인**:
```
GET /repos/panksooungman-dot/portfolio-25dd6208            → 404 Not Found
GET /v10/projects/prj_J7cNuXR8ckAZlew5gOSbhCzo3YGG          → 404 {"error":{"code":"not_found", ...}}
```

---

## 발견된 문제 총정리 (이번 회차까지 전체 이력)

| # | 문제 | 상태 |
|---|---|---|
| 1 | `GITHUB_OWNER` 오설정(개인 계정을 org로 취급) | ✅ 해결 (환경 변수 수정) |
| 2 | GitHub PAT 저장소 생성 권한 부족(403) | ✅ 해결 (새 토큰 발급) |
| 3 | **Git Scope 치명적 버그**(모노레포 전체 커밋 위험) | ✅ 해결 (`lib/git/client.ts` 수정, `GIT_SCOPE_FIX_REPORT.md`) — **이번 회차 실 운영 검증으로 재확인 완료** |
| 4 | GitHub PAT `workflow` 권한 부족(push 거부) | ✅ 해결 (권한 추가, 이번 회차 실 운영 검증으로 확인) |
| 5 | **Vercel `createDeployment()`의 `gitSource.repoId` 누락** | ❌ **미해결, 신규 발견** — 코드 수정 필요(위 "권장 수정" 참고) |

---

## 다음 단계 (권장)

1. `lib/vercel/client.ts`/`lib/deployment/pipeline.ts`에 위 "권장 수정"을 적용
2. 회귀 테스트 추가: `createDeployment()`가 `repoId`를 요청 본문에 정확히 포함하는지 단위 테스트로
   검증(`tests/vercel/client.test.ts`), `runDeploymentPipeline()`이 `repository.id`를
   `createDeployment()`에 전달하는지 파이프라인 테스트로 검증(`tests/deployment/pipeline.test.ts`)
3. 수정 후 동일한 절차로 재검증 — 이번엔 Production Deploy까지 통과해 실제 Deployment URL이
   `WebsiteRecord`에 저장되는 것까지 확인 가능할 것으로 예상됨(그 외 6단계는 이번 회차에서 이미
   전부 실 계정으로 검증 완료)

---

## 테스트 환경 정리

- 삭제 확인된 실제 외부 리소스: GitHub 저장소 `panksooungman-dot/portfolio-25dd6208`(롤백),
  Vercel 프로젝트 `prj_J7cNuXR8ckAZlew5gOSbhCzo3YGG`(롤백) — 둘 다 API로 404 재확인
  완료(수동 정리 불필요)
  - Vercel Production Deploy 자체는 실패했으므로 실제 배포된 프로덕션 리소스는 존재하지 않음
- 로컬 `outDir`(`.generated-websites/ai-job-38478542-1e8e-45f3-840e-13437b9af896`)는 삭제하지
  않고 보존 — 실제 push된 커밋(`0ff8533`)의 로컬 증거로 남겨둠(용량 작음, machine-local)
- `ai-web-master` 루트 저장소는 이번 실행 전후로 커밋 이력·추적 파일 상태 모두 변경 없음(Git
  Scope 수정이 실 운영에서 정확히 작동함을 최종 확인)
- `ai website create` 실행의 알려진 부수 효과(`agents/*`·`workflows/*` 스캐폴딩 재생성)는 검증 후
  삭제
- 테스트용 dev 서버(포트 3400)는 검증 종료 후 정상 종료
- 최종 `git status`: `PHASE3_REPORT.md`(수정)·`apps/cnbiz-web/lib/git/client.ts`(수정)·
  `apps/cnbiz-web/tests/git/client.test.ts`(수정)·`E2E_TEST_REPORT.md`·`GIT_SCOPE_FIX_REPORT.md`·
  `FINAL_E2E_REPORT.md`(신규, 본 파일)만 존재 — 커밋은 하지 않음(사용자 승인 대기)
