# FINAL_E2E_REPORT_v2 — Vercel `repoId` 버그 수정 이후 최종 운영 검증

> 작성일: 2026-07-24
> 선행 조건: `FINAL_E2E_REPORT.md`에서 발견된 `gitSource.repoId` 누락 버그를
> `lib/vercel/client.ts`/`lib/deployment/pipeline.ts`에서 수정 완료, 회귀 테스트 추가,
> Build/Lint/Tests 전부 통과 후 재검증

---

## 최종 판정: **FAIL**

`repoId` 버그는 **완전히 해결되어 실 운영에서 검증됨** — GitHub Repository 생성부터 Vercel
Project 생성·GitHub 연결까지 이번에도 전부 성공했고, 이번엔 `gitSource.repoId` 관련 오류가 전혀
발생하지 않았다(요청된 수정 사항 1~4 전부 실제 API 응답으로 확인). 하지만 Production Deploy에서
**또 다른 새로운 Vercel API 요구사항(코드에 반영되지 않은 것)**에 부딪혀 최종 배포까지는 여전히
도달하지 못했다. 롤백은 이번에도 정상 실행되어 두 리소스 모두 정확히 정리됐다.

---

## 결과 요약표

| 항목 | 값 |
|---|---|
| Repository URL | `https://github.com/panksooungman-dot/portfolio-e9a07469` — 롤백으로 삭제됨(404 재확인) |
| Commit SHA | `2c299457d4524b669ae9960f47ef80668c4edc7d`("Initial deployment via AI Business OS", 54개 파일, 전부 사이트 자신의 파일) |
| Push 성공 여부 | ✅ 성공 |
| Vercel Project URL | Project ID `prj_uvkJAFVlYIR9Fu5ffK4j8S0GXAmp`(이름 `portfolio-e9a07469`) — 롤백으로 삭제됨(404 재확인) |
| Production URL | 없음(Deploy 실패로 생성되지 않음) |
| Website Record 저장 | `deploymentStatus: "Failed"` + `deploymentError` 정확히 기록. `repository`/`deployment` 필드는 저장 안 됨(설계대로, 8단계 전부 성공해야 저장) |
| Audit Log | ✅ 5단계까지 정확히 기록(아래 상세) |
| Rollback | ✅ 실행, GitHub/Vercel API로 직접 삭제 재확인 완료 |

---

## Vercel `repoId` 수정 사항 검증 (요청 항목 1~4)

### 1~2. `repository.id`가 Deployment Pipeline 전체에서 유지되고 Step 7까지 전달됨 — ✅ 확인

`lib/deployment/pipeline.ts` Step 7:
```ts
const deployment = await deps.createDeployment({
  name: repoName,
  projectId: vercelProject.id,
  repoId: repository.id,   // Step 2에서 받은 값을 그대로 전달
  gitBranch: repository.defaultBranch,
});
```
`lib/vercel/client.ts`의 `CreateDeploymentInput`에 `repoId: number` 필드 추가, JSDoc으로 출처 명시.

### 3. `gitSource` 객체를 Vercel 공식 스펙과 일치하도록 수정 — ✅ 확인

```ts
gitSource: { type: "github", repoId: input.repoId, ref: input.gitBranch ?? "main" },
```
이번 실행에서 **`gitSource missing required property repoId` 오류가 전혀 발생하지 않았다** — 이전
회차(`FINAL_E2E_REPORT.md`)에서 막혔던 지점을 이번엔 완전히 통과했다.

### 4. Deployment 요청 Body 검증 — ✅ 확인(단위 테스트로 검증, 이번 실행에서는 정상 값이라 트리거 안 됨)

`assertValidDeploymentInput()`(`lib/vercel/client.ts`)가 `createDeployment()` 진입 시 `name`·
`projectId`·`repoId`(양의 정수)를 검증하고, 하나라도 유효하지 않으면 fetch 자체를 호출하지 않고
`VercelApiError`를 즉시 throw한다. 이번 실행에서는 모든 값이 유효했으므로 이 경로는 트리거되지
않았고(정상), `tests/vercel/client.test.ts`의 신규 회귀 테스트 4개(repoId 누락/0/음수/비정수,
name·projectId 빈 값)로 별도 검증 완료.

---

## 5~6. 회귀 테스트 및 Build/Lint/Tests — 전부 통과

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run`(전체) | ✅ **73 files / 579 tests 전부 통과**(직전 574 + 신규 5, 회귀 없음) |
| `npm run build` | ✅ 정상 생성 |
| `npx eslint .` | ✅ 0 errors/warnings |

신규 테스트(5개):
- `tests/vercel/client.test.ts` — `gitSource`에 `repoId`가 정확히 포함되는지(성공 케이스),
  `repoId`가 없거나(undefined)/0/음수/비정수일 때 `VercelApiError`를 던지고 **fetch 자체를 호출하지
  않는지**(검증 실패 시 네트워크 요청이 전혀 나가지 않음을 보장), `name`/`projectId`가 빈 값일 때도
  동일하게 차단되는지
- `tests/deployment/pipeline.test.ts` — `runDeploymentPipeline()`이 Step 2에서 받은
  `repository.id`를 Step 7의 `createDeployment()` 호출에 정확히 `repoId`로 전달하는지(직접 캡처해
  값 일치 확인)
- 기존 Rollback 테스트 3개(Push 실패 시 GitHub만 롤백·Deploy 실패 시 둘 다 롤백·롤백 자체 실패 시
  `rolledBack:false`)는 무변경으로 계속 통과 — `repoId` 추가가 롤백 경로에 영향을 주지 않음을 확인

---

## 7. 최종 End-to-End 테스트 (실제 GitHub/Vercel 계정)

### GitHub Repository 생성 — ✅ 성공
- 이름: `portfolio-e9a07469`, Owner: `panksooungman-dot`
- URL: `https://github.com/panksooungman-dot/portfolio-e9a07469`

### Git Init(outDir) — ✅ 성공, 모노레포 오염 없음
실행 전후 `ai-web-master` 루트 `git log --oneline -3`이 완전히 동일(`f41dcef` HEAD 그대로) — Git
Scope 수정이 이번 회차에서도 여전히 정확히 작동함을 재확인.

### Commit — ✅ 성공
- 로컬 커밋: `2c29945` "Initial deployment via AI Business OS", 54개 파일 전부 생성된 사이트
  자신의 파일

### Push — ✅ 성공

### Vercel Project 생성 — ✅ 성공
- Project ID: `prj_uvkJAFVlYIR9Fu5ffK4j8S0GXAmp`

### GitHub Repository 연결 — ✅ 성공

### Production Deploy — ❌ 실패 (신규 이슈 — repoId와는 무관한 별개 사유)

**API 응답**:
```json
HTTP 400
{
  "error": {
    "code": "missing_project_settings",
    "message": "The `projectSettings` object is required for new projects, but is missing in the deployment payload. If you want to use automatic framework detection, you can use the `skipAutoDetectionConfirmation=1` query parameter.",
    "framework": { "name": "Next..." }
  }
}
```
(원문은 300자에서 절단되어 저장됨 — `lib/vercel/client.ts`의 `readErrorBody()`가 에러 본문을
300자로 자르도록 되어 있음, 이번 조사에서 발견된 기존 동작)

**원인**: 이번에 막힌 지점은 `repoId`와 무관하다 — Vercel API가 "**한 번도 배포된 적 없는 새
Project**"에 첫 배포를 생성할 때는 `projectSettings`(프레임워크 지정 등)를 명시하거나,
`skipAutoDetectionConfirmation=1` 쿼리 파라미터로 자동 프레임워크 감지를 명시적으로 허용해야
한다는 요구사항이다. `createProject()`로 막 생성된 Project는 정확히 이 "배포 이력이 없는 새
Project" 상태이므로, 매번 이 오류에 부딪힌다. `PHASE3_REPORT.md`가 처음부터 명시했던 한계("실제
계정으로 왕복 검증하지 못했다")가 배포 파이프라인의 진짜 마지막 단계에서 또 한 번 현실화된
사례다 — `repoId` 버그를 완전히 해결하고 나서야 비로소 도달할 수 있었던, 그보다 한 단계 더 안쪽의
결함이었다.

**이번 요청 범위(“최종 판정 PASS/FAIL 보고”)를 벗어나므로 코드 수정은 진행하지 않았다.** 참고용
권장 방향(적용하지 않음): `createDeployment()` 호출 URL에 `?skipAutoDetectionConfirmation=1`
쿼리를 추가하거나(가장 단순), `CreateDeploymentInput`에 `projectSettings: { framework: "nextjs" }`
같은 필드를 추가해 명시적으로 지정하는 방법 중 하나를 선택해야 한다.

### Deployment URL — 없음(Deploy 실패)

### Website Record 저장 — ✅ 정확(설계대로)
```json
{
  "deploymentStatus": "Failed",
  "deploymentError": "Vercel 배포 실패 (400): {\"error\":{\"code\":\"missing_project_settings\", ...}"
}
```
`repository`/`deployment` 필드는 저장되지 않음(8단계 전부 성공해야 저장되는 설계 그대로 유지).

### Audit Log — ✅ 정확 (도달한 5단계까지 전부 기록)

```json
[
  { "action": "deployment.github.create_repo",  "success": true },
  { "action": "deployment.git.commit_push",      "success": true },
  { "action": "deployment.vercel.create_project","success": true, "projectId": "prj_uvkJAFVlYIR9Fu5ffK4j8S0GXAmp" },
  { "action": "deployment.vercel.link_repo",     "success": true },
  { "action": "deployment.pipeline.failed",      "success": false, "detail": "Vercel 배포 실패 (400): missing_project_settings ..." },
  { "action": "deployment.pipeline.rollback",    "success": true,  "detail": "롤백 완료" }
]
```

### Rollback — ✅ 실행 및 외부 검증 완료
```
GET /repos/panksooungman-dot/portfolio-e9a07469        → 404
GET /v10/projects/prj_uvkJAFVlYIR9Fu5ffK4j8S0GXAmp      → 404 {"error":{"code":"not_found"}}
```

---

## 발견된 문제 누적 이력 (v1 → v2)

| # | 문제 | 상태 |
|---|---|---|
| 1 | `GITHUB_OWNER` 오설정 | ✅ 해결 |
| 2 | GitHub PAT 저장소 생성 권한 부족 | ✅ 해결 |
| 3 | Git Scope 치명적 버그(모노레포 전체 커밋) | ✅ 해결, 2회 연속 실 운영 검증 완료 |
| 4 | GitHub PAT `workflow` 권한 부족 | ✅ 해결 |
| 5 | Vercel `createDeployment()`의 `gitSource.repoId` 누락 | ✅ 해결, 이번 회차 실 운영 검증 완료 |
| 6 | **Vercel 신규 Project 첫 배포 시 `projectSettings`/`skipAutoDetectionConfirmation` 누락** | ❌ **미해결, 신규 발견**(이번 회차) |

---

## 다음 단계 (권장)

1. `createDeployment()` 요청 URL에 `skipAutoDetectionConfirmation=1` 쿼리 파라미터 추가(가장
   단순한 해결책 — Next.js는 Vercel의 자동 프레임워크 감지가 안정적으로 지원하는 프레임워크이므로
   `projectSettings`를 직접 구성하는 것보다 낮은 위험)
2. 회귀 테스트 추가: 요청 URL에 해당 쿼리가 포함되는지 검증
3. Build/Lint/Tests 재확인 후 동일한 절차로 최종 재검증(`FINAL_E2E_REPORT_v3.md`) — 이번엔
   Production Deploy까지 통과해 실제 Deployment URL이 `WebsiteRecord`에 저장되는 순간까지 확인할
   수 있을 것으로 예상됨(이번 회차까지 나머지 7단계는 전부 실 계정으로 검증 완료)

---

## 테스트 환경 정리

- 삭제 확인된 실제 외부 리소스: GitHub 저장소 `panksooungman-dot/portfolio-e9a07469`(롤백),
  Vercel 프로젝트 `prj_uvkJAFVlYIR9Fu5ffK4j8S0GXAmp`(롤백) — 둘 다 API로 404 재확인 완료
- 로컬 `outDir`(`.generated-websites/ai-job-eec7ceb0-b6b4-4957-8cf6-457299bd2bad`)는 보존(push된
  커밋 `2c29945`의 로컬 증거)
- `ai-web-master` 루트 저장소는 이번 실행 전후로 커밋 이력·추적 파일 상태 모두 변경 없음
- `ai website create` 부수 효과(`agents/*`·`workflows/*`)는 검증 후 삭제
- 테스트용 dev 서버(포트 3400)는 검증 종료 후 정상 종료
- 최종 `git status`: `PHASE3_REPORT.md`(무관한 이전 변경)·`lib/deployment/pipeline.ts`·
  `lib/git/client.ts`·`lib/vercel/client.ts`(전부 수정)·관련 테스트 3개 파일(수정)·
  `E2E_TEST_REPORT.md`·`FINAL_E2E_REPORT.md`·`GIT_SCOPE_FIX_REPORT.md`·
  `FINAL_E2E_REPORT_v2.md`(신규, 본 파일)만 존재 — 커밋은 하지 않음(사용자 승인 대기)
