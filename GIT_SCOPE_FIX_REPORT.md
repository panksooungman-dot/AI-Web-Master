# GIT_SCOPE_FIX_REPORT — 배포 파이프라인 Git 스코프 치명적 버그 수정

> 작성일: 2026-07-24
> 대상 파일: `apps/cnbiz-web/lib/git/client.ts`
> 관련 문서: `PHASE3_REPORT.md`(원래 구현), `E2E_TEST_REPORT.md`(버그 최초 발견 경위)
> workflow 권한은 이 수정과 별개로 **아직 추가하지 않았다** — 아래 "다음 단계" 참고.

---

## 문제 요약

`E2E_TEST_REPORT.md`(2026-07-24, 새 GitHub PAT로 재검증 중)에서 실제로 재현된 사고: 배포
파이프라인의 Git Commit 단계가 생성된 사이트 폴더(`outDir` = `.generated-websites/{jobId}`)가
아니라 **`ai-web-master` 모노레포 전체**를 커밋 대상으로 삼아, 로컬 `main` 브랜치에 70개 파일·
1554줄을 담은 잘못된 커밋(`e448784`)을 실제로 만들었다. 다음 단계인 Git Push가 별개 사유
(GitHub 토큰의 `workflow` 권한 부족)로 실패해 원격에는 올라가지 않았지만, 그 사유가 없었다면
**모노레포 전체(소스 코드 포함)가 고객 소유 GitHub 저장소로 그대로 push될 뻔했다.**

## 근본 원인

`ensureRepoInitialized(cwd)`가 `git rev-parse --is-inside-work-tree`로 "이미 초기화됐는지"를
판단했다. 이 명령은 `cwd`가 **어떤** 저장소든 작업 트리 내부에 있으면 성공을 반환한다. `outDir`가
독립된 `.git`을 가진 적이 없었기 때문에, 이 명령은 상위 디렉터리를 계속 거슬러 올라가
`D:\ai-web-master\.git`을 찾아내고 성공을 반환했다 — `ensureRepoInitialized()`는 이를 "이미 git
저장소"로 오판하고 `git init`을 건너뛰었다. 이어지는 `commitAll()`의 `git add -A`(pathspec 없음)는
Git 2.0+ 기준으로 현재 디렉터리가 아니라 **저장소 최상위 전체**를 기준으로 동작하는데, 그 "최상위"가
위 오판으로 `D:\ai-web-master` 자체가 되어버려 모노레포 전체가 스테이징·커밋됐다.

---

## 수정 내용 (요구사항 1~5, 전부 적용)

### 1~2. `ensureRepoInitialized()` — `fs.existsSync`만으로 판단, 없으면 `cwd`에서 `git init`

```ts
export async function ensureRepoInitialized(
  cwd: string,
  runner: GitCommandRunner = defaultRunner
): Promise<GitStepResult> {
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    const init = await runner(["init"], cwd);
    if (!init.success) return init;
  }

  await assertOwnRepoScope(cwd, runner);

  return { success: true };
}
```

더 이상 `git rev-parse --is-inside-work-tree`(상위 저장소까지 인정하는 판정)를 사용하지 않는다.
`cwd` 바로 아래 `.git`이 있는지만 실제 파일시스템으로 확인하고, 없으면 무조건 `cwd`에서
`git init`을 실행한다 — 상위에 다른 저장소가 있는지는 이 판단에 전혀 관여하지 않는다.

### 3. `git rev-parse --show-toplevel`이 `cwd`와 다르면 즉시 예외 발생

```ts
async function assertOwnRepoScope(cwd: string, runner: GitCommandRunner): Promise<void> {
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    throw new GitScopeError(`... "${cwd}"에 독립된 .git이 없습니다 ...`);
  }

  const toplevel = await runner(["rev-parse", "--show-toplevel"], cwd);
  if (!toplevel.success) {
    throw new GitScopeError(`... "git rev-parse --show-toplevel" 실행에 실패 ...`);
  }

  const actualToplevel = (toplevel.stdout ?? "").trim();
  if (normalizeForComparison(actualToplevel) !== normalizeForComparison(cwd)) {
    throw new GitScopeError(
      `... "${cwd}"의 저장소 최상위가 "${actualToplevel}"입니다(기대값: "${cwd}") ...`
    );
  }
}
```

새 클래스 `GitScopeError`(export)를 신설했다. 이 검사는 `{success:false}`를 **반환**하지 않고
**throw**한다 — 호출자가 실수로 반환값 검사를 빠뜨려도 안전하도록, 그리고 요구사항 3의 "즉시
예외를 발생시킨다"를 문자 그대로 만족하도록 의도적으로 선택했다. `normalizeForComparison()`은
Windows(`\`)/POSIX(`/`) 구분자·대소문자·trailing slash 차이를 흡수한 뒤 절대 경로로 비교한다.

`lib/deployment/pipeline.ts`는 이미 8단계 전체를 하나의 `try/catch`로 감싸고 있으므로(수정하지
않음), 이 `throw`는 파이프라인의 기존 에러 처리·롤백 로직에 자연스럽게 흡수된다 — 어느 단계에서
`GitScopeError`가 발생하든 지금까지 만들어진 외부 리소스(GitHub repo 등)만 역순으로 롤백된다.

### 4. 모든 git 명령은 `cwd = outDir`에서만 실행

기존에도 `ensureRepoInitialized`/`commitAll`/`pushToRemote`는 전부 `runner(args, cwd)` 형태로
호출자가 넘긴 `cwd`만 사용했고(모듈 스코프의 다른 경로를 참조하지 않음), 이 구조는 그대로 유지했다.
`lib/deployment/pipeline.ts`가 세 함수 모두에 정확히 `input.outDir`를 전달하는 것도 무변경 —
문제는 "어떤 cwd를 넘기는가"가 아니라 "그 cwd가 실제로 독립 저장소로 인식되는가"였고, 이는 위
1~3번 수정으로 해결됐다.

### 5. 루트 저장소 대상 `git add`/`git commit`(+`push`) 방지 — 3중 독립 안전장치

`assertOwnRepoScope()`를 `ensureRepoInitialized()`뿐 아니라 **`commitAll()`과 `pushToRemote()`
자신의 진입점에서도 각각 독립적으로 호출**하도록 했다:

```ts
export async function commitAll(cwd, message, runner = defaultRunner) {
  await assertOwnRepoScope(cwd, runner); // ← 독립 안전장치
  const add = await runner(["add", "-A"], cwd);
  ...
}

export async function pushToRemote(cwd, repositoryHtmlUrl, token, branch, runner = defaultRunner) {
  await assertOwnRepoScope(cwd, runner); // ← 독립 안전장치
  ...
  return runner(["push", authenticatedUrl, `HEAD:${branch}`], cwd);
}
```

`ensureRepoInitialized()` 호출을 빠뜨리거나(예: 향후 리팩터링 실수), 파이프라인 순서가 바뀌거나,
누군가 `commitAll()`/`pushToRemote()`를 다른 경로에서 직접 호출해도 — 이 세 함수 각각이 "지금 내가
받은 `cwd`가 정말 자신의 저장소인가"를 매번 처음부터 다시 확인한다. 하나의 검사 지점에만 의존하지
않는다는 것이 이번 수정의 핵심 설계 원칙이다.

---

## 6. 회귀 테스트 (`apps/cnbiz-web/tests/git/client.test.ts`, +10개, 총 20개)

### 기존 단위 테스트(fake runner) — 새 스코프 검사에 맞게 갱신

`.git`이 이미 있는 임시 디렉터리(`mkTempDirWithFakeGit()`)를 만들고, fake runner가
`rev-parse --show-toplevel`에 그 디렉터리 자신을 응답하도록 해 기존 동작(add→commit 순서,
"nothing to commit" 처리, push URL 토큰 임베드 등)이 그대로 유지됨을 확인.

### 신규 — Git Scope 안전장치 자체를 겨냥한 단위 테스트 (fake runner)

- `ensureRepoInitialized()`가 `.git`이 없을 때만 `init`을 호출하고, 있으면 호출하지 않는지
- `init`이 "성공"을 보고했지만 실제로 `.git`을 만들지 않은 경우(방어적 시나리오) `GitScopeError`가
  발생하는지
- `git rev-parse --show-toplevel`이 `cwd`가 아닌 다른(상위 같은) 경로를 반환하면
  `ensureRepoInitialized()`/`commitAll()`이 `GitScopeError`를 throw하고, **어떤 git 명령도
  추가로 실행되지 않는지**(`commitAll()`의 경우 `add`/`commit` 자체가 호출되지 않음을 호출 로그로
  검증)
- `commitAll()`/`pushToRemote()`가 `cwd`에 `.git`이 전혀 없을 때 각각 독립적으로 `GitScopeError`를
  throw하고 **fs 체크 단계에서 멈춰 git 명령을 한 번도 spawn하지 않는지**(요구사항 5 — "절대
  실행되지 않도록")

### 신규 — 실제 git 서브프로세스 회귀 테스트 (사고 시나리오 재현)

새 describe 블록 `"Git Scope regression — outDir stays independent even when nested inside a
real parent repository"`가 사고와 **동일한 디렉터리 구조**(상위에 커밋 이력이 있는 실제 git
저장소, 그 안의 `.generated-websites/{jobId}`가 아직 독립 저장소가 아닌 상태)를 실제 `git`
바이너리로 재현한다:

1. **"outDir가 독립 저장소인지 검증"**(요구사항 6-1) — `ensureRepoInitialized(outDir)` 이후
   `outDir` 자신에 `.git`이 생기고, `git rev-parse --show-toplevel`이 상위가 아닌 `outDir` 자신을
   가리키는지 확인
2. **"상위 저장소가 존재해도 모노레포를 commit하지 않는지 검증"**(요구사항 6-2) — `outDir`에 파일을
   하나 만들고 `commitAll(outDir, ...)`을 실행한 뒤, `git show --name-only HEAD`(outDir 기준)가
   **그 파일 하나만** 포함하고 상위 저장소의 `root-file.txt`는 절대 포함하지 않는지, 그리고 상위
   저장소 자신의 `git log`(커밋 개수)·`git status`(working tree)가 **전혀 변경되지 않았는지** 확인
3. 위 시나리오를 한 단계 더 강화해, 상위 저장소에 **실제 사고에서 있었던 것과 동일한 형태의 미추적
   파일들**(리포트 파일·`agents/` 스캐폴딩)을 추가로 둔 상태에서도 `outDir`의 커밋에는 여전히
   `outDir` 자신의 파일만 포함되고 상위의 미추적 파일은 전혀 섞이지 않는지 확인 — 사고에서 실제로
   벌어졌던 것과 정반대의 결과(격리됨)를 직접 증명

---

## 7. 검증 결과

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run`(전체) | ✅ **73 files / 574 tests 전부 통과**(기존 564 + 신규 10, 회귀 없음) |
| `npm run build` | ✅ 정상 생성(라우트 수·구조 변경 없음) |
| `npx eslint .` | ✅ 0 errors/warnings |
| `git status` | `PHASE3_REPORT.md`(무관한 이전 변경, 그대로 유지)·`lib/git/client.ts`(수정)·
  `tests/git/client.test.ts`(수정)만 존재. 커밋하지 않음(사용자 승인 대기) |

`tests/git/client.test.ts` 신규 회귀 테스트(위 6번) 3개 모두 실제 git 서브프로세스로 통과 —
`outDir`가 상위 저장소와 완전히 격리된 독립 저장소가 되고, 상위 저장소는 커밋 이력·working tree
어느 쪽도 건드려지지 않음을 실증했다.

---

## 다음 단계

- **GitHub 토큰에 `workflow` 권한은 아직 추가하지 않았다** — 지시받은 대로, Git Scope 버그가
  완전히 해결된 지금 이 시점에서만 안전하게 다음 단계로 진행할 수 있다.
- 이 수정 이후 재검증 절차(권장): Inquiry 생성 → 승인 → 실행까지 동일하게 진행하되, `outDir`가
  실제로 자신만의 `.git`을 갖는지, `commitAll()` 이후 `git -C <outDir> show --name-only HEAD`가
  생성된 사이트 파일들만 포함하는지 **먼저 육안으로 재확인**한 뒤에 GitHub 토큰에 `workflow` 권한을
  추가하고 Git Push → Vercel Project 생성 → Production Deploy까지 이어서 E2E 재검증할 것을
  권장한다.
