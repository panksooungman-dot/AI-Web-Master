# E2E_TEST_REPORT — 고객별 GitHub/Vercel 자동 배포 파이프라인 실계정 검증

> 최종 수정: 2026-07-24 (2회차, 새 GitHub Fine-grained PAT 교체 이후)
> 대상: `lib/deployment/pipeline.ts`(AI Business OS Rewiring Phase 3, `PHASE3_REPORT.md` 참고)
> 실행 계정: `GITHUB_TOKEN`(신규 발급)/`VERCEL_TOKEN`, 앱: `apps/cnbiz-web`(dev 서버, 포트 3400)

---

## 🚨 치명적 버그 (발견·조치 완료) — 배포 파이프라인이 고객 저장소로 모노레포 전체를 push 시도

**이번 회차에서 GitHub Repository 생성까지는 처음으로 성공했고, 그 직후 Git Commit 단계에서 심각한
버그가 실제로 발현되어 로컬 `main` 브랜치에 잘못된 커밋이 만들어졌다.** 다행히 다음 단계인 Push가
별도 사유(워크플로우 스코프 부족)로 실패해 GitHub 원격에는 아무것도 올라가지 않았지만, **워크플로우
스코프 문제만 없었다면 `ai-web-master` 모노레포 전체(소스 코드 포함)가 고객 소유 GitHub 저장소로
그대로 push될 뻔했다.**

### 원인

`lib/git/client.ts`의 `ensureRepoInitialized(cwd)`:
```ts
const check = await runner(["rev-parse", "--is-inside-work-tree"], cwd);
if (check.success) return { success: true };   // ← "이미 초기화됨"으로 오판
return runner(["init"], cwd);
```
`git rev-parse --is-inside-work-tree`는 `cwd`가 **어떤 저장소든** 작업 트리 내부에 있으면 성공을
반환한다. `outDir`(`.generated-websites/{jobId}`)는 그 자체로 독립된 `.git`을 가진 적이 없으므로,
이 명령은 상위 디렉터리를 계속 거슬러 올라가 **`D:\ai-web-master`의 `.git`을 찾아내고 성공을
반환한다.** 그 결과 `ensureRepoInitialized()`는 "이미 git 저장소"라고 잘못 판단하고 `git init`을
건너뛴다 — `outDir`는 여전히 모노레포의 일부일 뿐, 독립 저장소가 아니다.

이어지는 `commitAll(outDir, message)`가 실행하는 `git add -A`(pathspec 없음)는 Git 2.0+ 기준으로
**현재 디렉터리가 아니라 저장소 최상위 전체**를 기준으로 동작한다 — 그 "최상위"가 위 오판으로 인해
`D:\ai-web-master` 자체가 되어버렸으므로, `git add -A`는 모노레포 전체의 미추적/변경 파일을
스테이징했고 그 뒤의 `git commit`이 로컬 `main` 브랜치 위에 새 커밋을 만들었다.

### 실제 벌어진 일 (재현 로그)

- 생성된 커밋: `e448784 "Initial deployment via AI Business OS"`, 부모 커밋: 이 세션 시작 시점의
  실제 `main` HEAD(`f41dcef`)
- 포함된 내용: `git diff --stat f41dcef e448784` → **70개 파일, 1554줄 추가, 삭제 0** — 이번
  세션에서 아직 커밋되지 않은 상태로 남아있던 파일들(`E2E_TEST_REPORT.md`, `PHASE3_REPORT.md` 수정,
  `ai website create`의 알려진 부수 효과로 재생성된 `agents/*`·`workflows/*` 스캐폴딩)이 그대로
  스테이징·커밋됨
- `git status` 결과: `Your branch is ahead of 'origin/main' by 1 commit` — **다행히 origin에는
  push되지 않은 상태**(아래 Step 3에서 별도 사유로 push 자체가 실패했기 때문)
- 이번 세션에서 이 버그가 트리거된 것은 이번 1회뿐이었다 — 이전 3회 시도는 전부 GitHub Repository
  생성(Step 2) 자체가 실패해 Git Commit 단계(`ensureRepoInitialized`/`commitAll`)에 도달하지 못했기
  때문에 버그가 발현되지 않았다.

### 조치 (사용자 확인 후 실행 완료)

로컬 `main`이 아직 `origin`에 push되지 않은 상태임을 확인한 뒤, 사용자에게 처리 방법을 확인하고
**`git reset f41dcef`(mixed reset)**를 실행해 문제의 커밋을 로컬 히스토리에서 제거했다. `--hard`가
아닌 mixed reset을 사용해 디스크의 파일 내용(`E2E_TEST_REPORT.md`·`PHASE3_REPORT.md` 등)은 그대로
보존되고, 커밋 이력만 원래대로 되돌아갔다. 조치 후 확인:
```
$ git status
On branch main
Your branch is up to date with 'origin/main'.
$ git log --oneline -3
f41dcef docs: manually sync PROJECT_STATUS.md after AI Business OS Rewiring + Phase 3
726c3eb feat: rewire customer inquiry pipeline internally and add per-customer GitHub/Vercel deployment
34fbf43 fix: stabilize registries and finish CollectionStore migration
```
로컬 `main`이 정확히 원래 상태로 복구됨을 확인. GitHub 원격에는 애초에 아무것도 push되지 않았으므로
원격 정리는 불필요.

### 권장 코드 수정 (아직 적용하지 않음 — 별도 승인 필요)

`lib/git/client.ts`의 `ensureRepoInitialized()`가 "cwd가 **어떤** 작업 트리 안에 있는가"가 아니라
"cwd **자신이** 저장소 최상위인가"를 확인하도록 고쳐야 한다. 예:
```ts
import fs from "fs";
import path from "path";

export async function ensureRepoInitialized(cwd: string, runner = defaultRunner) {
  if (fs.existsSync(path.join(cwd, ".git"))) return { success: true };
  return runner(["init"], cwd);
}
```
(`git rev-parse --show-toplevel`로 비교하는 방법도 가능하지만, 상위 디렉터리 결과와 정확히 비교하려면
경로 정규화가 추가로 필요해 `fs.existsSync`가 더 단순하고 확실하다.) 이 수정 하나로 `commitAll()`의
`git add -A`도 올바르게 `outDir`만의 새 저장소를 기준으로 스코프된다. **이 수정 없이는 GitHub 토큰에
`workflow` 권한을 추가해 Push를 통과시키는 순간, 모노레포 전체가 고객 저장소로 실제 push된다 —
아래 "다음 단계" 참고.**

---

## 결과 요약 (이번 회차 — 새 토큰)

| 항목 | 값 |
|---|---|
| **테스트 성공/실패** | **실패** — Git Push 단계(Step 3)에서 GitHub 워크플로우 스코프 부족으로 차단 |
| 1. GitHub Repository 생성 | ✅ 성공 — `panksooungman-dot/portfolio-7e32795f` (아래 상세) |
| 2. Git Commit | ⚠️ "성공"으로 기록되었으나 **치명적 버그로 스코프가 잘못됨**(위 섹션 참고) |
| 3. Git Push | ❌ 실패 — `refusing to allow a Personal Access Token to create or update workflow ".github/workflows/docs.yml" without workflow scope` |
| 4. Vercel Project 생성 | 미도달 |
| 5. Production Deploy | 미도달 |
| 6. Deployment URL 저장 | 저장 안 됨(`deploymentStatus: "Failed"`로 정확히 기록) |
| 7. Audit Log 확인 | ✅ 정확 — 성공한 단계(`create_repo`)까지만 기록, 실패·롤백 정확히 기록 |
| 롤백 실행 여부 | ✅ 실행됨, 성공 — GitHub Repository 삭제 확인(아래) |

---

## 단계별 상세

### 1. GitHub Repository 생성 — ✅ 성공

- **Repository 이름**: `portfolio-7e32795f`
- **Owner**: `panksooungman-dot` (개인 계정 — `GITHUB_OWNER` 미설정 상태 유지, 이전 회차에서 확정한
  대로)
- **URL**: `https://github.com/panksooungman-dot/portfolio-7e32795f` (private) — **이후 Push 실패로
  롤백되어 삭제됨**, 현재는 존재하지 않음(`GET /repos/panksooungman-dot/portfolio-7e32795f` → 404로
  재확인)
- Audit Log: `deployment.github.create_repo`(success: true, detail: `panksooungman-dot/portfolio-7e32795f`)

이전 회차의 403(`Resource not accessible by personal access token`)이 새 토큰으로 해결됨을 확인 —
앱 밖에서 직접 `curl -X POST .../user/repos`로도 재현·확인(별도 프로브 저장소를
`e2e-perm-probe-3-delete-me`로 생성 후 즉시 삭제해 확인, 실제 파이프라인 테스트와는 무관).

### 2. Git Commit — ⚠️ "성공"이나 스코프 오류(치명적 버그)

`commitAll()`은 실패 없이 커밋을 만들었으나(그래서 파이프라인상 이 Step은 "성공"으로 넘어감),
커밋 대상이 `outDir`가 아니라 **모노레포 전체**였다. 상세는 위 "치명적 버그" 섹션 참고.

### 3. Git Push — ❌ 실패

```
git push https://x-access-token:***@github.com/panksooungman-dot/portfolio-7e32795f HEAD:main
```
응답(stderr):
```
To https://github.com/panksooungman-dot/portfolio-7e32795f
 ! [remote rejected] HEAD -> main (refusing to allow a Personal Access Token to
   create or update workflow `.github/workflows/docs.yml` without `workflow` scope)
error: failed to push some refs to 'https://github.com/panksooungman-dot/portfolio-7e32795f'
```
- **원인**: 위 버그로 인해 커밋 대상에 `ai-web-master` 모노레포의 실제 `.github/workflows/docs.yml`
  이 포함됐고, GitHub는 `.github/workflows/**` 파일을 담은 push를 받으려면 토큰에 별도의
  `workflow` 권한(fine-grained PAT 기준 "Workflows: Read and write")을 요구한다. 지금 토큰에는 이
  권한이 없어 GitHub 서버 측에서 push 전체를 거부했다.
- **이것은 이번엔 "고쳐야 할 문제"가 아니라 오히려 다행이었다** — 위 Git Commit 버그가 아직 고쳐지지
  않은 상태에서 이 권한까지 부여하면, 다음 시도에서 모노레포 전체가 실제로 고객 GitHub 저장소에
  push된다. **`lib/git/client.ts` 수정 전까지는 토큰에 `workflow` 권한을 추가하지 말 것을
  권장한다.**

### 4~6. Vercel Project 생성 / Production Deploy / Deployment URL — 미도달

Step 3(Push) 실패로 파이프라인이 여기서 catch 블록에 진입, `createProject()`/`linkGitRepository()`/
`createDeployment()`는 호출되지 않음. 사후 확인(`GET /v10/projects?search=portfolio`)으로 Vercel
쪽에도 이번 테스트로 생성된 프로젝트가 없음을 재확인.

### 7. Audit Log 확인 — ✅ 정확

```json
[
  {
    "action": "deployment.github.create_repo",
    "success": true,
    "detail": "panksooungman-dot/portfolio-7e32795f",
    "timestamp": "2026-07-24T12:53:37.661Z"
  },
  {
    "action": "deployment.pipeline.failed",
    "success": false,
    "detail": "git push 실패: To https://github.com/panksooungman-dot/portfolio-7e32795f\n ! [remote rejected] HEAD -> main (refusing to allow a Personal Access Token to create or update workflow `.github/workflows/docs.yml` without `workflow` scope)\nerror: failed to push some refs to 'https://github.com/panksooungman-dot/portfolio-7e32795f'",
    "timestamp": "2026-07-24T12:53:51.761Z"
  },
  {
    "action": "deployment.pipeline.rollback",
    "success": true,
    "detail": "롤백 완료",
    "metadata": { "repository": "panksooungman-dot/portfolio-7e32795f" },
    "timestamp": "2026-07-24T12:53:52.505Z"
  }
]
```

**롤백 확인**: `repository`가 생성된 뒤 실패했으므로 `deleteRepository()`가 실제로 호출됨 —
`GET /repos/panksooungman-dot/portfolio-7e32795f` → 404로 실제 삭제됨을 외부에서 재확인.
`vercelProject`는 애초에 생성되지 않아 `deleteProject()`는 호출되지 않음(코드 조건
`if (vercelProject)`가 거짓이므로 정상 스킵).

---

## Website 레코드

```json
{
  "id": "website-9adc5b77-cb32-48f1-865d-c0c67e32795f",
  "name": "E2E Full Deploy Co 홈페이지 제작",
  "status": "Success",
  "deploymentStatus": "Failed",
  "deploymentError": "git push 실패: To https://github.com/panksooungman-dot/portfolio-7e32795f\n ! [remote rejected] HEAD -> main (refusing to allow a Personal Access Token to create or update workflow `.github/workflows/docs.yml` without `workflow` scope)\nerror: failed to push some refs to 'https://github.com/panksooungman-dot/portfolio-7e32795f'"
}
```
`repository`/`deployment` 필드는 저장되지 않음(설계대로 — 8단계 전부 성공해야 저장됨).

---

## 발견된 문제 요약

| # | 문제 | 심각도 | 원인 | 상태 |
|---|---|---|---|---|
| 1 | `GITHUB_OWNER` 오설정(개인 계정을 org로 취급) | 낮음 | 환경 변수 설정 오류 | ✅ 이전 회차에 해결 |
| 2 | GitHub PAT 저장소 생성 권한 부족 | 중간 | 토큰 권한 설정 | ✅ 새 토큰 발급으로 해결 확인 |
| 3 | **`ensureRepoInitialized()`가 outDir를 독립 저장소로 만들지 않고 모노레포 전체를 커밋 대상으로 삼음** | **치명적** | `lib/git/client.ts` 코드 결함 | ⚠️ **미수정** — 로컬 잘못된 커밋은 제거했으나 코드 자체는 그대로 |
| 4 | GitHub PAT에 `workflow` 권한 없음(`.github/workflows/**` push 거부) | 낮음(현재는 오히려 안전판 역할) | 토큰 권한 설정 | 의도적으로 미조치 — 아래 "다음 단계" 참고 |

---

## 다음 단계 (권장 순서)

1. **`lib/git/client.ts`의 `ensureRepoInitialized()` 수정을 먼저 진행할 것을 강력히 권장한다** —
   위에 제시한 `fs.existsSync(path.join(cwd, ".git"))` 방식으로 교체. 이 수정 없이 재시도하면 다음
   두 경우 모두 위험하다:
   - 워크플로우 스코프를 그대로 두면 → 매번 Push가 실패해 기능 검증이 막힌다(현재 상태)
   - 워크플로우 스코프를 추가하면 → Push가 성공해 **모노레포 전체가 고객 GitHub 저장소로 올라간다**
2. 코드 수정 후 **로컬 단위 테스트로 먼저 검증**: 임시 디렉터리에서 `ensureRepoInitialized()`가
   실제로 그 디렉터리 안에 `.git`을 만드는지, 상위에 별도 저장소가 있어도(이 저장소 자체를 상위
   디렉터리로 둔 스크래치 폴더 등) 오판하지 않는지 확인
3. 수정 확인 후 이번과 동일한 절차(Inquiry 생성 → 승인 → 실행)로 재검증 — 이번엔 `outDir`만
   커밋·push되는지 `git -C <outDir> show --name-only HEAD`로 반드시 확인할 것
4. 그 이후에만 GitHub 토큰에 `workflow` 권한 추가 여부를 검토(생성되는 사이트 템플릿이
   `.github/workflows/docs.yml`을 포함하는 한 필요) — 또는 대안으로 Website Builder 템플릿에서
   `.github/workflows/**`를 제외하는 방법도 검토 가능(권한을 넓히지 않는 대신 템플릿을 좁히는 접근)
5. Git Push까지 통과하면 이어서 Vercel Project 생성 → Production Deploy까지 재검증

---

## 테스트 환경 정리

- 문제의 로컬 커밋(`e448784`)은 사용자 확인 후 `git reset f41dcef`(mixed)로 제거, 원격에는 애초에
  push되지 않아 추가 조치 불필요
- 프로브용으로 생성했던 GitHub 저장소 2개(`e2e-perm-probe-3-delete-me`, 파이프라인이 만든
  `portfolio-7e32795f`)는 각각 수동 삭제/자동 롤백으로 제거 확인(둘 다 404 재확인)
- Vercel에는 이번 테스트로 생성된 리소스 없음(API 조회로 확인)
- `ai website create` 실행의 알려진 부수 효과(`agents/*`·`workflows/*` 스캐폴딩이 저장소 루트에
  재생성됨, `CHANGELOG.md` 2026-07-14 (3)/(4) 기존 문서화)로 발생한 미추적 파일은 검증 후 삭제
- 테스트용 dev 서버(포트 3400)는 검증 종료 후 정상 종료
- 최종 `git status`: `PHASE3_REPORT.md`(수정)·`E2E_TEST_REPORT.md`(신규, 본 파일)만 남음 — 커밋은
  하지 않음(사용자 승인 대기)

---

## 이전 회차 기록 (구 토큰, 2026-07-24 1회차 — 참고용)

이전 토큰으로는 GitHub Repository 생성 자체가 403(`Resource not accessible by personal access
token`)으로 매번 차단되어 이번 회차의 버그가 발현될 기회 자체가 없었다. 상세 재현 로그는 이 문서의
이전 버전(git 이력 또는 직전 대화 기록)에 있던 내용과 동일 — 요약하면:
- `GITHUB_OWNER` 오설정(404) → 해결
- GitHub PAT 저장소 생성 권한 부족(403) → 새 토큰 발급으로 해결
