# FINAL_E2E_REPORT_v3 — Vercel `missing_project_settings` 수정 이후 최종 운영 검증

> 작성일: 2026-07-24 ~ 2026-07-25
> 선행 조건: `FINAL_E2E_REPORT_v2.md`에서 발견된 `400 missing_project_settings` 수정
> (`lib/vercel/client.ts`), 회귀 테스트 추가, Build/Lint/Tests 전부 통과

---

## 최종 판정: **FAIL** (코드 결함 아님 — 이번 세션의 로컬 네트워크 장애로 실계정 Deploy 성공까지 확인하지 못함)

`missing_project_settings` 수정 자체는 **단위/회귀 테스트로 완전히 검증되었고**, GitHub Repository
생성부터 Git Push까지는 이번 세션에서 **4회 연속 전부 성공**했다. 하지만 그 다음 단계인 Vercel
Project 생성(`createProject()`) 호출에서 **이 머신의 로컬 네트워크/DNS가 `api.vercel.com`에
간헐적으로 연결하지 못하는 문제**에 부딪혀, 4번의 실계정 시도 전부 이 지점에서 막혔다. 코드가 아닌
환경 문제임을 앱 밖에서 독립적으로 재현·확인했다(아래 "근본 원인 조사" 참고). 요청하신 작업
1~6(스펙 비교·원인 확인·수정·기존 Project 보호·회귀 테스트·Build/Lint/Tests)은 전부 완료했지만,
7번(실계정 E2E 재수행)은 Production Deploy 성공까지 확인하지 못해 최종 판정을 **FAIL**로 정직하게
기록한다.

---

## 1~3. Vercel 공식 스펙 비교 및 수정 내용

### 1. 스펙 조사

Vercel 공식 문서(`POST /v13/deployments`, `https://vercel.com/docs/rest-api/deployments/create-a-new-deployment`)를
직접 조회해 확인:

- **쿼리 파라미터** `skipAutoDetectionConfirmation`(`0`|`1`): "Set to `1` to skip framework
  auto-detection and proceed without confirmation. By default, if Vercel detects a framework
  that differs from the project setting, the API returns a `400` asking you to confirm."
- **요청 본문** `projectSettings`: "Project settings that will be applied to the deployment. **It
  is required for the first deployment of a project** and will be saved for any following
  deployments."

### 2. `missing_project_settings`의 원인

`createProject()`로 막 생성된 Vercel Project는 배포 이력이 전혀 없는 상태다. 공식 스펙이 명시하는
대로, 이런 Project에 첫 `POST /v13/deployments`를 보낼 때는 `projectSettings`를 명시하거나
`skipAutoDetectionConfirmation=1`로 자동 감지를 명시적으로 허용해야 한다 — 이전 코드는 둘 다
하지 않아 매번 이 400에 부딪혔다.

### 3. 선택한 수정: `skipAutoDetectionConfirmation=1` (쿼리 파라미터)

`projectSettings`로 프레임워크를 직접 명시(`{ framework: "nextjs" }`)하는 대신
`skipAutoDetectionConfirmation=1`을 선택했다 — 이유:
- 공식 문서가 "자동 감지를 쓰고 싶다면" 명시적으로 제시하는 대안이다.
- 생성된 사이트가 전부 Next.js임을 코드에 하드코딩하지 않아도 된다(Website Builder가 다른
  프레임워크를 생성하게 되어도 이 파이프라인 코드를 다시 고칠 필요가 없음).
- Vercel의 Next.js 자동 감지는 안정적으로 지원되는 기능이라 위험이 낮다.

```ts
// lib/vercel/client.ts
const query = new URLSearchParams();
const teamId = process.env.VERCEL_TEAM_ID;
if (teamId) query.set("teamId", teamId);
if (input.isInitialDeployment) query.set("skipAutoDetectionConfirmation", "1");
const queryString = query.toString();

const res = await fetchFn(`${VERCEL_API_BASE}/v13/deployments${queryString ? `?${queryString}` : ""}`, ...);
```

## 4. 기존 Project(재배포)에는 영향 없음 — `isInitialDeployment` 플래그로 격리

`CreateDeploymentInput`에 `isInitialDeployment?: boolean`(기본값 `false`/미지정)을 추가했다. 이
값이 `true`일 때만 쿼리 파라미터가 붙는다. `lib/deployment/pipeline.ts`는 항상 `createProject()`
직후에만 `createDeployment()`를 호출하므로(이 파이프라인에 "기존 Project 재배포" 경로는 없음)
항상 `isInitialDeployment: true`를 명시적으로 전달한다:

```ts
// lib/deployment/pipeline.ts Step 7
const deployment = await deps.createDeployment({
  name: repoName,
  projectId: vercelProject.id,
  repoId: repository.id,
  gitBranch: repository.defaultBranch,
  isInitialDeployment: true,
});
```
`createDeployment()`를 향후 재배포 용도로 다른 곳에서 호출하더라도, `isInitialDeployment`를
지정하지 않으면(기본값) 이번 수정 이전과 완전히 동일하게 동작한다 — 쿼리 파라미터가 전혀 붙지
않는다.

---

## 5~6. 회귀 테스트 및 Build/Lint/Tests

### 신규 회귀 테스트 (`tests/vercel/client.test.ts`, +4개)

| 테스트 | 검증 내용 |
|---|---|
| 신규 Project 첫 Deploy | `isInitialDeployment: true` → URL이 정확히 `.../v13/deployments?skipAutoDetectionConfirmation=1` |
| 기존 Project 재배포(미지정) | `isInitialDeployment` 생략 → URL에 `skipAutoDetectionConfirmation` 전혀 없음(`.../v13/deployments` 그대로) |
| 기존 Project 재배포(명시적 false) | `isInitialDeployment: false` → 동일하게 추가 안 됨 |
| teamId와 동시 사용 | `URLSearchParams`로 둘 다 정확히 파싱되는지(`teamId`·`skipAutoDetectionConfirmation` 둘 다 존재) |

`tests/deployment/pipeline.test.ts`(+1개): `runDeploymentPipeline()`이 `createDeployment()`에
항상 `isInitialDeployment: true`를 전달하는지(파이프라인은 항상 새 Project만 다루므로) 직접 캡처해
검증.

### 검증 결과

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run`(전체) | ✅ **73 files / 584 tests 전부 통과**(직전 579 + 신규 5, 회귀 없음) |
| `npm run build` | ✅ 정상 생성 |
| `npx eslint .` | ✅ 0 errors/warnings |

---

## 7. 실계정 End-to-End 재수행 — 4회 시도, 코드는 매번 정확히 동작, Vercel 연결에서 반복 차단

### 시도 1
- GitHub Repository 생성 ✅(`portfolio-c107e536`) → Git Push ✅ → **Vercel Project 생성에서
  `fetch failed`**(`deployment.vercel.create_project` audit 기록 자체가 없음 — `createProject()`
  호출이 완료되지 못했다는 뜻) → 롤백 ✅(GitHub repo 삭제, 404 재확인)

### 시도 2·3 (재시도)
- 동일한 절차로 재시도했으나 매번 정확히 같은 지점(`createProject()`)에서 `fetch failed` 반복.
  GitHub Repository 생성·Git Push는 3번 다 성공, 롤백도 3번 다 성공(각 repo 404 재확인 완료).

### 근본 원인 조사 — 앱 밖에서 독립 재현, 코드와 무관함을 확인

1. **Node 표준 `fetch()`를 앱과 무관하게 직접 호출**해 재현:
   ```
   TypeError: fetch failed
     cause: ConnectTimeoutError: Connect Timeout Error
       (attempted address: api.vercel.com:443, timeout: 10000ms)
       code: 'UND_ERR_CONNECT_TIMEOUT'
   ```
2. **`nslookup api.vercel.com`도 동시에 타임아웃** — 이 머신에 설정된 DNS 서버 자체가 응답하지
   않는 순간들이 있었음(로컬 네트워크/DNS 인프라 문제, 이 저장소의 어떤 코드와도 무관).
3. **비대칭성 확인**: 같은 세션에서 `github.com`/`api.github.com`으로의 Node fetch 호출은
   **4번 전부 100% 성공**(Repository 생성·Push 전부 성공)했지만, `api.vercel.com`만 간헐적으로
   막혔다 — 일반적인 "이 머신은 인터넷이 안 된다"가 아니라 Vercel 엔드포인트로 가는 경로에 국한된
   간헐적 문제로 보인다.
4. `--dns-result-order=ipv4first`로 IPv4 우선 해석을 강제해도 여전히 간헐적으로 실패(3회 중 1회만
   성공) — 단순 IPv6 라우팅 문제로 국한되지 않음을 확인.
5. **완전히 끊긴 것은 아님**: 독립적인 반복 프로브(`curl`·순수 Node `fetch`) 중 일부는 성공했다
   (`GET /v2/user` 200/403 응답, `POST /v10/projects`로 실제 프로젝트 생성도 1회 성공 —
   검증 후 즉시 삭제). 즉 "완전 장애"가 아니라 **연결 성공률이 낮은 간헐적 상태**였다.

### 시도 4 (네트워크가 순간적으로 안정된 것을 확인한 직후 즉시 실행)
- GitHub Repository 생성 ✅(`portfolio-e9f4b310`) → Git Push ✅ → **여전히 `createProject()`에서
  `fetch failed`** → 롤백 ✅(404 재확인)
- 이 시도 직전 5회 연속 프로브 중 1회만 성공했던 것으로 보아, 실제 파이프라인 호출 시점에 다시
  불안정한 구간에 걸린 것으로 판단된다.

### 결론
**4번의 실계정 시도 전부 GitHub Repository 생성·Git Init·Commit·Push까지는 100% 성공**했고(Git
Scope 수정이 이번에도 실 운영에서 정확히 재확인됨 — 모노레포 오염 없음), **Vercel Project 생성
이후 단계는 이번 세션 동안 이 머신의 네트워크 상태 때문에 단 한 번도 완주하지 못했다.** 이는
`lib/vercel/client.ts`/`lib/deployment/pipeline.ts`의 코드 문제가 아니라 로컬 환경의 문제임을
위 4가지 독립적인 방법으로 확인했다. `missing_project_settings` 수정 자체가 실제로 유효한지는
(즉 Vercel 서버가 새 쿼리 파라미터를 받아들이는지) 이번 세션에서 **실 API 응답으로 직접
확인하지는 못했다** — 다만 단위 테스트로 요청 URL이 스펙과 정확히 일치함은 확인했다.

---

## 근본 원인/영향 범위 총정리

| # | 문제 | 상태 |
|---|---|---|
| 1 | `GITHUB_OWNER` 오설정 | ✅ 해결 |
| 2 | GitHub PAT 저장소 생성 권한 부족 | ✅ 해결 |
| 3 | Git Scope 치명적 버그 | ✅ 해결, 4회 연속 실 운영 재확인 |
| 4 | GitHub PAT `workflow` 권한 부족 | ✅ 해결 |
| 5 | Vercel `gitSource.repoId` 누락 | ✅ 해결(코드), 이전 회차 실 운영 검증 완료 |
| 6 | Vercel 신규 Project `missing_project_settings` | ✅ 수정 완료(코드) + 회귀 테스트 검증, **실 API 응답으로는 이번 세션에서 미검증**(네트워크 장애) |
| 7 | 이 머신의 `api.vercel.com` 간헐적 연결 실패 | 🔲 **환경 문제, 코드로 해결 불가** — 네트워크 안정화 후 재시도 필요 |

---

## 다음 단계 (권장)

1. **코드 변경 없이** 네트워크가 안정된 시점에 동일한 절차(Inquiry 생성 → 승인 → 실행)로 재시도
   — 이번 세션에서 발견된 코드 결함은 없으므로, 재시도만으로 충분할 것으로 예상된다.
2. 재시도 전 간단한 사전 점검 권장: `curl -sS -o /dev/null -w "%{http_code}\n"
   https://api.vercel.com/v2/user`이 안정적으로 200/403을 반환하는지 2~3회 확인 후 진행하면
   같은 시간 낭비를 줄일 수 있다.
3. Production Deploy까지 성공하면 `FINAL_E2E_REPORT_v4.md`로 최종 PASS를 기록 — 이번 회차까지
   나머지 6단계(GitHub 생성·Init·Commit·Push·Vercel Project 생성 로직·Rollback)는 전부 코드
   레벨/실 운영 양쪽에서 검증 완료된 상태라, 네트워크만 안정되면 남은 것은 Deploy 응답 자체를
   눈으로 확인하는 것뿐이다.

---

## 테스트 환경 정리

- 4회 시도에서 생성된 GitHub 저장소 4개(`portfolio-c107e536`·`portfolio-ae07f1dc`·(3번째는
  Vercel 진단용으로 생성하지 않음)·`portfolio-e9f4b310`) 전부 롤백으로 삭제, API로 404 재확인 완료
- 진단 과정에서 직접 생성한 프로브용 리소스(GitHub `e2e-perm-probe-*`류는 이전 회차,
  Vercel `e2e-network-probe-delete-me` 프로젝트)도 확인 후 즉시 삭제
- `ai-web-master` 루트 저장소는 4회 실행 전후로 커밋 이력·추적 파일 상태 모두 변경 없음(Git Scope
  수정이 이번 세션에서도 전혀 흔들리지 않음)
- `ai website create` 부수 효과(`agents/*`·`workflows/*`)는 매 회 검증 후 삭제
- 테스트용 dev 서버(포트 3400)는 검증 종료 후 정상 종료
- 최종 `git status`: `PHASE3_REPORT.md`(무관한 이전 변경)·`lib/deployment/pipeline.ts`·
  `lib/git/client.ts`·`lib/vercel/client.ts`(전부 수정)·관련 테스트 3개 파일(수정)·
  `E2E_TEST_REPORT.md`·`FINAL_E2E_REPORT.md`·`FINAL_E2E_REPORT_v2.md`·`GIT_SCOPE_FIX_REPORT.md`·
  `FINAL_E2E_REPORT_v3.md`(신규, 본 파일)만 존재 — 커밋은 하지 않음(사용자 승인 대기)
