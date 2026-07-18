# CHANGESET — REFACTOR_PLAN.md 실행 계획서

> 작성일: 2026-07-18
> 근거: `REFACTOR_PLAN.md`(분류·우선순위) + `REPORT.md`(구조 분석) + 이번 세션 grep 실측 결과
> **이 문서는 계획서입니다. 어떤 항목도 이번 세션에서 실행(삭제·이동·수정)하지 않았습니다.**
> 항목 번호는 `REFACTOR_PLAN.md`의 우선순위(P1~P4) 순서를 그대로 따릅니다.

---

## P1 — 삭제 후보 (즉시 실행 가능, 저위험)

### CS-01. `lib/supabase.ts` 삭제

- **변경 이유**: 루트 `app/`·`components/` 전체에서 import하는 곳이 0건으로 확인된 죽은 코드. `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`를 참조하지만 이 값을 쓰는 화면 자체가 없음.
- **영향 범위**: 파일 1개(`lib/supabase.ts`). 다른 파일이 이 파일을 import하지 않으므로 연쇄 영향 없음. `apps/cnbiz-web`은 별도 Supabase 클라이언트(`lib/db/supabaseStore.ts`)를 쓰므로 무관.
- **위험도**: **Low** — 참조 0건이 grep으로 실증됨, 빌드에 영향 없음.
- **롤백 방법**: git 이력에서 파일이 살아있으므로(삭제는 커밋으로 기록됨) `git revert <commit>` 또는 `git checkout <commit>^ -- lib/supabase.ts`로 즉시 복원 가능.
- **실행 순서**:
  1. 삭제 직전 `grep -r "lib/supabase" app components --include="*.tsx" --include="*.ts"`로 재확인(결과 0건이어야 진행)
  2. 파일 삭제, `npx tsc --noEmit`·`npm run build`(루트)로 회귀 없음 확인
  3. 커밋(단독 커밋, 다른 변경과 섞지 않음)

### CS-02. `components/sections/PortfolioSection.tsx` 삭제

- **변경 이유**: `Grep pattern="PortfolioSection" glob="*.{ts,tsx}"` 결과 자기 자신 1건만 매치 — 어디서도 import되지 않는 죽은 컴포넌트.
- **영향 범위**: 파일 1개. `app/portfolio/page.tsx`는 이미 `PortfolioComingSoonSection`을 쓰고 있어(별개 컴포넌트) 이 파일 삭제와 무관.
- **위험도**: **Low** — 참조 0건 실증, 화면 렌더링에 영향 없음.
- **롤백 방법**: `git revert` 또는 이전 커밋에서 파일 복원.
- **실행 순서**:
  1. `grep -rl "PortfolioSection" app components --include="*.tsx"`로 재확인(0건)
  2. 파일 삭제 후 `npm run build`(루트)로 `/portfolio` 페이지 정상 렌더 확인
  3. 커밋

### CS-03. `scripts/create-{agent,domain,expert,project,shared,skills,template,v1.1,workflow}.ps1`, `scripts/init-ai-business-os.ps1` (10개) 삭제

- **변경 이유**: 전부 0바이트로 확인됨, 어떤 코드·문서도 파일명을 실행 참조하지 않음, `scripts/README.md`가 스스로 "현재 스크립트 파일은 없습니다"라고 명시해 존재 자체가 자기 문서와 모순.
- **영향 범위**: 파일 10개, 전부 `scripts/` 폴더 내. 다른 스크립트(`ai-business-os.ps1`·`setup.ps1`·`test-login.ps1`)는 이 파일들을 호출하지 않으므로 영향 없음.
- **위험도**: **Low** — 0바이트 파일이라 삭제해도 동작 변화가 물리적으로 불가능.
- **롤백 방법**: `git revert`. 애초에 내용이 없는 파일이라 복원해도 실질적 가치는 없음(참고용 이력 복원 목적).
- **실행 순서**:
  1. 10개 파일 모두 `-size 0` 재확인
  2. 일괄 삭제(단일 커밋)
  3. `scripts/README.md`의 "Planned Automation Scripts" 표와 실제 상태가 이제 일치하는지 확인(표는 `.mjs` 기준 다른 계획이라 별도 수정 불필요)

### CS-04. 루트 `tree.txt`(4.46MB) 삭제

- **변경 이유**: Git 미추적(untracked), `.gitignore` 미포함, UTF-16 인코딩 손상 상태로 저장된 Windows `tree` 명령 출력 추정, 어떤 문서·코드도 참조하지 않음.
- **영향 범위**: 파일 1개, 저장소 루트. Git에 커밋된 적이 없으므로(untracked) **삭제해도 커밋 이력에 남지 않음**.
- **위험도**: **Low** — 미추적 파일이라 삭제는 로컬 디스크 정리에 불과.
- **롤백 방법**: **불가/불필요** — Git 이력에 없어 `git revert`로 복원 안 됨. 필요 시 Windows `tree /F > tree.txt` 재실행으로 재생성 가능(단, 인코딩 문제 재발 방지 위해 `tree /F | Out-File -Encoding utf8 tree.txt` 권장).
- **실행 순서**:
  1. `git status --short tree.txt`로 미추적 상태 재확인
  2. 로컬 파일 삭제(`rm`), 커밋 불필요(애초에 추적 안 됨)

---

## P2 — 문서 동기화 (삭제·이동 아님, 안전하게 즉시 진행 가능)

### CS-05. `docs/00_COMPANY/DOCUMENT_INDEX.md`에 `docs/03_DESIGN/` 누락 문서 5개 등록

- **변경 이유**: 실제 `docs/03_DESIGN/`에 8개 파일이 있는데 인덱스에는 3개(`DESIGN_SYSTEM.md`·`UI_GUIDE.md`·`UX_GUIDE.md`)만 등록되어 5개(`DESIGN_AUTOMATION_MASTER.md`·`CLAUDE_DESIGN_INTEGRATION.md`·`FIGMA_INTEGRATION.md`·`DESIGN_SYNC.md`·`DESIGN_WORKFLOW.md`)가 누락됨. 인덱스가 "신규 문서는 여기 등록" 원칙을 스스로 못 지키고 있음.
- **영향 범위**: `DOCUMENT_INDEX.md` 한 파일의 "5. Design Documents" 표에 5개 행 추가. 다른 파일에 영향 없음(순수 문서 추가, 코드 무관).
- **위험도**: **Low** — 표에 행을 추가하는 것뿐, 기존 내용 삭제·변경 없음.
- **롤백 방법**: `git revert`(문서 커밋이므로 즉시 원복 가능).
- **실행 순서**:
  1. `docs/03_DESIGN/` 실제 파일 목록 재확인(이미 8개 확인됨, 재조사 불필요)
  2. 5개 행 추가(문서 설명·상태 컬럼은 각 문서 상단 요약 참고해 작성)
  3. 커밋

### CS-06. `docs/01_PMO/WBS.md` 상단에 동결 안내 추가

- **변경 이유**: WBS.md는 이미 스스로 "2026-07-05 기준 동결" 문구를 갖고 있으나, 최상단(문서를 처음 여는 시점)에서 바로 "최신 상태는 `PROJECT_STATUS.md` 참고"로 안내하지 않아 신규 독자가 혼동할 수 있음.
- **영향 범위**: `WBS.md` 최상단 1~2줄 추가. 본문 내용은 변경하지 않음(레거시로서의 이력 가치 보존).
- **위험도**: **Low** — 순수 안내 문구 추가.
- **롤백 방법**: `git revert`.
- **실행 순서**:
  1. 파일 최상단(제목 바로 아래)에 "⚠️ 본 문서는 2026-07-05 기준으로 동결되었습니다. 최신 진행 상황은 `PROJECT_STATUS.md`를 참고하세요." 1줄 추가
  2. 커밋

### CS-07. `test-project/` Git 추적 여부 확인 후 처리 방향 결정

- **변경 이유**: CLI 스캐폴딩 테스트의 스크래치 산출물로 추정되나, 삭제 후보로 확정하기 전에 Git 추적 여부(실수로 커밋된 것인지, 애초에 untracked인지)를 먼저 확인해야 함.
- **영향 범위**: 확인 단계에서는 영향 없음(읽기 전용 조회). 이후 삭제 여부는 별도 변경 항목으로 분리.
- **위험도**: **Low**(확인 단계) / 삭제 시 위험도는 추적 여부에 따라 재평가 필요.
- **롤백 방법**: 해당 없음(조회만 수행).
- **실행 순서**:
  1. `git ls-files test-project/`로 추적 파일 존재 여부 확인
  2. 추적 파일이 0건이면 CS-04와 동일한 절차로 삭제 후보에 편입
  3. 추적 파일이 있다면 별도로 그 내용을 검토해 삭제 여부 재결정(임의 삭제 금지)

---

## P3 — 통합 작업 (여러 파일에 걸침, 중간 위험)

### CS-08. `agents/*.md`(9개) + `prompts/*.md`(6개) → `skills/experts/*/SKILL.md`(15개)로 통합

- **변경 이유**: `agents/ai-engineer.md`와 `skills/experts/ai-engineer/SKILL.md`를 대조한 결과 Mission/Objectives 구조가 사실상 동일한 내용의 반복. `agents/*.md`(9개 직군)는 `skills/experts/*`(15개 직군)의 부분집합이며, 로더가 인식하는 디렉터리 구조(`agents/<name>/system.md`)가 아닌 flat `.md`라 실행 도구에서 전혀 로드되지 않는 순수 참고문서. `prompts/*.md`도 같은 9개 직군을 세 번째 각도로 재서술.
- **영향 범위**: `agents/*.md` 9개, `prompts/*.md` 6개 파일의 **본문 내용 변경**(삭제 아님 — 본문을 축소하고 "이 역할의 상세 정의는 `skills/experts/<role>/SKILL.md` 참고"로 안내하는 방식). `skills/experts/*` 15개 파일은 두 출처의 세부 내용 중 빠진 게 있으면 보완(내용 추가만, 구조 변경 없음). 이 파일들을 참조하는 33개 문서(각주 링크)는 대상 경로가 유지되므로 영향 없음.
- **위험도**: **Medium** — 파일 수가 많고(15개 대상 + 15개 출처) 내용 병합 시 실수로 세부 정보가 누락될 수 있음. 다만 코드가 이 파일들을 로드하지 않으므로 **빌드·런타임에는 영향 없음**(순수 문서 리스크).
- **롤백 방법**: 각 파일을 개별 커밋으로 분리해 진행하면 문제 발생 시 해당 파일만 `git revert`로 원복 가능. 병합 전 원본을 별도 브랜치에 보존 권장.
- **실행 순서**:
  1. 직군 1개(예: `ai-engineer`)를 시범 사례로 선정해 `agents/ai-engineer.md`·`prompts/coder.md`(관련 부분)·`skills/experts/ai-engineer/SKILL.md` 3개를 나란히 놓고 실제 내용 차이(빠진 항목) 확인
  2. `skills/experts/ai-engineer/SKILL.md`에 누락된 세부 보완
  3. `agents/ai-engineer.md` 본문을 요약 + 링크 안내로 축소(전체 삭제 아님)
  4. 시범 사례 검토 후 나머지 8개 직군에 동일 절차 반복
  5. `prompts/*.md` 6개도 동일 원칙으로 축소
  6. 전체 완료 후 `agents/README.md`·`prompts/README.md`에 "역할 상세는 `skills/experts/`가 기준"이라는 안내 추가

- **Status: Complete (Phase 1 — `agents/*.md` 9/9)** · `prompts/*.md` 6개는 **Phase 2로 분리**되어 아직 미착수(계획서: `docs/architecture/P3_PHASE2_PLAN.md`)
  - **Completed**: 2026-07-18 ~ 2026-07-19
  - **상세 완료 보고**: `docs/architecture/P3_PHASE1_COMPLETION.md`, 매핑표: `docs/architecture/AI_CONTENT_MAPPING.md`, 중간 점검: `CHECKPOINT_REVIEW.md`
  - **Commit SHA / Date**:
    | 단계 | 커밋 | 날짜 | 내용 |
    |---|---|---|---|
    | 매핑 작성 | `87e9706` | 2026-07-18 | `AI_CONTENT_MAPPING.md` 신규 작성 |
    | Pilot #1 | `dfe4b11` | 2026-07-18 | `ai-engineer` 병합 |
    | 표준 정의 | `062dddc` | 2026-07-19 | `status`/`source` frontmatter 표준 정의 |
    | Pilot #2 | `78aa65d` | 2026-07-19 | `backend-engineer` 병합 |
    | Pilot #3 | `f35c2d9` | 2026-07-19 | `frontend-engineer` 병합 |
    | 체크포인트 | `bed7f19` | 2026-07-19 | `CHECKPOINT_REVIEW.md` 작성 |
    | Batch 1 | `8094007` | 2026-07-19 | `devops-engineer`·`qa-engineer`·`technical-writer` 병합 |
    | Batch 2 | `98a454a` | 2026-07-19 | `business-analyst`·`solution-architect`·`product-manager` 병합, Phase 1 종료 |

### CS-09. `lib/dev/component-marker.ts` 공유 패키지화

- **변경 이유**: `diff` 결과 루트 `lib/dev/component-marker.ts`와 `apps/cnbiz-web/lib/dev/component-marker.ts`가 **byte 단위로 완전히 동일**. 같은 파일이 두 프로젝트에 독립적으로 존재.
- **영향 범위**: 루트 컴포넌트 19곳 + `apps/cnbiz-web` 컴포넌트 다수(정확한 개수는 통합 착수 시 재확인)에서 import 경로가 `@/lib/dev/component-marker`에서 신규 공유 패키지(예: `@cnbiz/dev-utils`) 경로로 바뀜. **양쪽 프로젝트의 import 문 전체를 수정**해야 하므로 파일 수가 많음.
- **위험도**: **Medium** — 두 독립 프로젝트(root, apps/cnbiz-web)의 다수 파일 import 경로를 동시에 바꿔야 해서 빠뜨리면 빌드 실패로 바로 드러남(발견은 쉬우나 손댈 파일이 많음).
- **롤백 방법**: 새 패키지 추가 + import 경로 변경은 하나의 커밋으로 묶고, 문제 시 해당 커밋 전체를 `git revert`하면 원래 두 파일 구조로 즉시 복원됨.
- **실행 순서**:
  1. 신규 공유 패키지 생성(예: `packages/dev-utils`, `package.json`+`tsconfig.json`+`src/component-marker.ts`)
  2. 루트 `tsconfig.json`·`apps/cnbiz-web/tsconfig.json`(또는 workspace 설정)에 새 패키지 경로 인식 추가
  3. 루트 19곳 + `apps/cnbiz-web` 전체의 `@/lib/dev/component-marker` import를 신규 패키지 경로로 일괄 치환
  4. 기존 두 `lib/dev/component-marker.ts`는 즉시 삭제하지 않고 **재-export 파일**로 축소(하위호환) 후, 빌드·테스트 통과 확인되면 별도 변경으로 완전 제거 검토
  5. 루트·`apps/cnbiz-web` 양쪽 `npm run build`·`npm test` 재확인

### CS-10. 루트 레거시 트리(`app/`·`components/`·`lib/`)에 안내 표시 추가

- **변경 이유**: `app/`이 살아있는 활성 폴더처럼 보이지만 실제로는 배포되지 않는 레거시라, 신규 기여자가 여기에 작업할 위험이 있음(REPORT.md 8번 항목).
- **영향 범위**: 신규 `README.md` 파일을 `app/`·`components/`·`lib/` 최상단에 각 1개씩 추가(기존 파일 수정 아님, 순수 추가).
- **위험도**: **Low** — 신규 파일 추가만 발생, 기존 코드·빌드에 영향 없음.
- **롤백 방법**: 추가한 3개 README 파일만 삭제하면 원상복구(`git revert`).
- **실행 순서**:
  1. `app/README.md`(없다면 신규 작성): "⚠️ 이 폴더는 CNBIZ Website v1(레거시)입니다. 실제 프로덕션은 `apps/cnbiz-web`입니다."
  2. `components/README.md`, `lib/README.md`에도 동일 취지 안내 추가
  3. 커밋

---

## P4 — 구조적 결정 필요 (제품/담당자 승인 선행)

### CS-11. `marketplace/prompts/`, `marketplace/templates/` 카테고리 정리

- **변경 이유**: `lib/marketplace/registry.ts`의 `PackageType = "agent" | "workflow" | "skill"`에 `"prompt"`·`"template"`가 없어, 이 두 폴더는 현재 Marketplace v1 구현이 지원하지 않는 카테고리로 실제 시스템과 구조가 어긋남.
- **영향 범위**: 결정 방향에 따라 다름 — (A) `PackageType`을 4~5종으로 확장하면 `lib/marketplace/registry.ts`·관련 API·CLI 커맨드·대시보드 UI(타입 유니온을 쓰는 모든 곳)에 영향. (B) 카테고리를 폐기하면 `marketplace/{prompts,templates}/` 폴더 자체의 존치 여부를 다시 논의해야 함.
- **위험도**: **High** — 타입 유니온 확장은 마켓플레이스 전체(CLI 5개 명령·API 4개 라우트·대시보드 3개 화면)에 영향을 줄 수 있는 구조 변경.
- **롤백 방법**: 타입 확장 시 단일 커밋으로 묶어 `git revert`로 원복 가능하나, 확장 이후 실제로 prompt/template 패키지가 발행되면(마켓플레이스 데이터 생성) 데이터 롤백은 별도로 필요.
- **실행 순서**:
  1. 제품 결정: prompt/template을 실제 마켓플레이스 카테고리로 만들 것인지, 폐기할 것인지 사용자·담당자 확인
  2. (확장 결정 시) `PackageType` 유니온 확장 → 관련 코드 전수 검색 후 타입 체크 통과 확인
  3. (폐기 결정 시) `marketplace/{prompts,templates}/README.md`에 "이 카테고리는 사용하지 않음" 명시(폴더 삭제는 별도 승인 필요 항목으로 재분류)

### CS-12. `skills/{core,domains,shared,templates,workflows}/*`(약 60개 파일) 존치 여부 결정

- **변경 이유**: 이번 세션 시작 시 제공된 "사용 가능한 skills" 목록에 이 파일들이 하나도 없어, Claude Code가 실제로 로드하는 스킬이 아님이 확인됨. `PROJECT_ROADMAP.md` Phase 5(AI Business OS Productization)의 제품화 대상 콘텐츠로 추정되나 착수 시점 미정 상태로 방치 중.
- **영향 범위**: 결정에 따라 다름 — 존치 시 영향 없음(현재도 비활성 상태 유지). 정리/재구성 시 60개 파일 전체 검토 필요.
- **위험도**: **High**(정리 착수 시) / **없음**(현행 유지 시).
- **롤백 방법**: 정리 작업은 단계별 커밋으로 분리해 언제든 특정 단계까지 `git revert` 가능하도록 진행.
- **실행 순서**:
  1. Phase 5 착수 여부를 사용자·제품 오너에게 확인(REFACTOR_PLAN.md P4와 동일 절차)
  2. 착수 결정 시 별도 프로젝트/이슈로 분리해 진행(이번 CHANGESET 범위 밖)
  3. 미착수 결정 시 "Phase 5 착수 전까지 보류"라는 안내만 각 폴더 README에 추가(삭제·이동 없음)

### CS-13. `docs/08_PLANS/상가분양센터/` 처리

- **변경 이유**: AI Business OS·CNBIZ와 무관한 타 업종(상업용 부동산 분양) 클라이언트 산출물로 추정되나, 이 저장소 소관이 맞는지 실측만으로는 확정할 수 없음(임의 판단 금지 원칙).
- **영향 범위**: 처리 방향에 따라 다름(이동/삭제/그대로 유지 중 결정 필요). 다른 코드·문서가 이 폴더를 참조하지 않아(REPORT.md 확인) 어떤 결정을 내려도 코드 영향은 없음.
- **위험도**: **Medium**(내용이 삭제되면 클라이언트 산출물 손실 위험이 있으므로) / 결정 전까지는 **없음**.
- **롤백 방법**: 삭제 대신 다른 저장소로 이동하는 경우, 이동 전 반드시 백업 확인. 이 CHANGESET에서는 실행하지 않으므로 해당 없음.
- **실행 순서**:
  1. 사용자에게 "이 폴더가 어떤 프로젝트의 산출물이며, 이 저장소에 있어야 하는지" 직접 확인
  2. 확인 결과에 따라 별도 변경 항목으로 재분류(유지/타 저장소 이동/삭제)

### CS-14. `.claude/worktrees/ai-provider-v1.1/` 정리

- **변경 이유**: 다른 세션이 만든 별도 git worktree(브랜치 `worktree-ai-provider-v1.1`)의 전체 복사본. 최근 `eslint.config.mjs`가 이 폴더를 스캔해 무관한 lint 오류 14건을 낸 사례가 실제로 발생(이번 세션에서 ignore 패턴 추가로 우회 처리함).
- **영향 범위**: 해당 브랜치의 작업이 아직 진행 중이라면 그 작업 전체에 영향(파일 삭제가 아니라 `git worktree remove`이므로 브랜치 자체는 보존되지만, 로컬 작업 디렉터리는 사라짐).
- **위험도**: **High**(진행 중인 작업일 가능성 배제 못 함) — 다른 세션·다른 에이전트의 미완료 작업일 수 있음.
- **롤백 방법**: `git worktree remove`는 브랜치 자체(`worktree-ai-provider-v1.1`)를 삭제하지 않으므로, 필요 시 `git worktree add .claude/worktrees/ai-provider-v1.1 worktree-ai-provider-v1.1`로 동일 위치에 재생성 가능(단, 커밋되지 않은 변경사항은 복원 안 됨).
- **실행 순서**:
  1. 브랜치 `worktree-ai-provider-v1.1`의 최근 커밋 이력 확인(`git log worktree-ai-provider-v1.1 -5`)으로 활성 작업 여부 정황 파악
  2. 사용자에게 "이 worktree 작업이 끝났는지" 직접 확인
  3. 완료 확인 시에만 `git worktree remove .claude/worktrees/ai-provider-v1.1` 실행(파일 직접 삭제 금지, 반드시 이 명령 사용)

---

## 전체 실행 순서 요약

```
1. CS-01 ~ CS-04 (P1, 삭제 후보) — 사용자 승인 후 순차 실행, 각각 단독 커밋
2. CS-05 ~ CS-07 (P2, 문서 동기화) — 승인 없이 바로 진행 가능(삭제 아님)
3. CS-08 ~ CS-10 (P3, 통합) — 시범 사례 검증 후 단계적 확대, 각 단계 커밋 분리
4. CS-11 ~ CS-14 (P4, 구조적 결정) — 담당자 확인·결정 선행, 결정 전에는 어떤 실행도 하지 않음
```

## 위험도 총괄표

| ID | 항목 | 위험도 | 우선순위 |
|---|---|---|---|
| CS-01 | `lib/supabase.ts` 삭제 | Low | P1 |
| CS-02 | `PortfolioSection.tsx` 삭제 | Low | P1 |
| CS-03 | `scripts/create-*.ps1` 10개 삭제 | Low | P1 |
| CS-04 | `tree.txt` 삭제 | Low | P1 |
| CS-05 | `DOCUMENT_INDEX.md` 동기화 | Low | P2 |
| CS-06 | `WBS.md` 안내 추가 | Low | P2 |
| CS-07 | `test-project/` 확인 | Low | P2 |
| CS-08 | agents+prompts → skills 통합 (Phase 1 `agents/*.md` 9/9 **Complete** — 2026-07-19, Phase 2 `prompts/*.md`는 계획서 수립, 미착수) | Medium | P3 |
| CS-09 | `component-marker.ts` 공유화 | Medium | P3 |
| CS-10 | 레거시 트리 안내 표시 | Low | P3 |
| CS-11 | marketplace 카테고리 정리 | High | P4 |
| CS-12 | `skills/*` 존치 결정 | High(착수 시) | P4 |
| CS-13 | `상가분양센터` 처리 | Medium | P4 |
| CS-14 | `.claude/worktrees` 정리 | High | P4 |
