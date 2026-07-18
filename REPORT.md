# REPORT — 프로젝트 구조 분석

> 작성일: 2026-07-18 (Claude Code, 실제 파일/코드 확인 기준)
> 이 문서는 추측이 아닌 실측 결과만 반영합니다. `PROJECT_STATUS.md`(기능 구현 현황)와는 별개로, 이 문서는 **저장소 구조 자체**(중복·정리 대상·개선점)를 다룹니다.

---

## 1. `app`와 `apps`의 역할 비교

| 구분 | 경로 | 역할 | 상태 |
|---|---|---|---|
| `app/` (루트) | `D:\ai-web-master\app` | **CNBIZ Website v1(레거시)** — 정적 마케팅 사이트. `/`·`/about`·`/services`·`/portfolio`·`/contact` 5페이지만 존재, API 라우트 0개 | 2026-07-01 기준 동결, 더 이상 개발 안 함 |
| `apps/cnbiz-web/` | `D:\ai-web-master\apps\cnbiz-web` | **실제 프로덕션 전체** — CNBIZ Website v2(공개 사이트) + Development OS 대시보드(`/developer/**`) + API 84개 | 활성 개발 중, Vercel 배포 대상(`.vercel/project.json`의 `projectName: "ai-web-master-cnbiz-web"`이 이 폴더를 루트로 배포함을 확인) |

**핵심 사실**: 2026-07-15 커밋 `526831e`("WIP: AI Business OS integration checkpoint")에서 원래 루트에 있던 Development OS 전체(대시보드·에이전트·워크플로·인증·Design Automation 9 Phase)가 `apps/cnbiz-web`으로 이동했습니다. 이 이관은 CHANGELOG에 별도로 기록되지 않았습니다. 그 결과:

- 루트 `app/`·`lib/`·`components/`는 이제 **거의 죽은 코드**입니다(빌드는 되지만 실서비스와 무관).
- `apps/cnbiz-web`이 사실상 "진짜 저장소"이고, 루트는 이관 이전의 스냅샷으로 남아 있습니다.
- 이 구조를 모르는 사람이 "app 폴더에 페이지를 추가"하면 실제로는 아무 효과가 없는 v1 레거시에 작업하게 되는 함정이 있습니다.

---

## 2. `components`와 `packages`의 중복 여부

**중복이 있습니다.** 다만 성격이 다른 두 종류입니다.

### 2-1. 원자 컴포넌트 — 루트 `components/`에 추출 자체가 없음
루트 `components/sections/*.tsx`(16개 파일)는 Button·Card 같은 공용 UI를 컴포넌트로 추출하지 않고 **각 섹션 안에 인라인 스타일로 직접 작성**되어 있습니다(2026-07-04 CHANGELOG에 이미 기록된 사실: "v1의 UI 원자 컴포넌트는 각 섹션에 인라인으로만 존재해 추출된 적이 없었음"). 반면 `packages/ui`(`Button`·`Input`·`Textarea`·`Select`·`Card`)·`packages/design-system`(토큰)·`packages/layout-primitives`(`Container`·`Section`·`MobileDrawer`)는 v2 전환 시점(2026-07-04)에 신규로 만들어져 `apps/cnbiz-web`만 사용합니다. 즉 "같은 종류의 컴포넌트가 두 벌 존재"하는 게 아니라, **v1은 추출이 안 됐고 v2만 제대로 분리된** 상태입니다.

### 2-2. 페이지 섹션 — 루트 vs `apps/cnbiz-web` 동일 이름/역할 컴포넌트 중복

| 루트 `components/` | `apps/cnbiz-web/components/` | 비고 |
|---|---|---|
| `sections/AboutHeroSection.tsx` | `sections/AboutHeroSection.tsx` | 같은 이름, 독립 구현 |
| `sections/ContactForm.tsx` | `sections/ContactForm.tsx` | 같은 이름, 필드까지 유사 |
| `sections/CTASection.tsx` | `sections/CTASection.tsx` | 같은 이름 |
| `sections/HeroSection.tsx` | `sections/HeroSection.tsx` | 같은 이름 |
| `sections/ServiceProcessSection.tsx` | `sections/ServiceProcessSection.tsx` | 같은 이름 |
| `sections/ServicesDetailSection.tsx` | `sections/ServicesDetailSection.tsx` | 같은 이름 |
| `sections/ServicesHeroSection.tsx` | `sections/ServicesHeroSection.tsx` | 같은 이름 |
| `sections/ServicesOverviewSection.tsx` | `sections/ServicesOverviewSection.tsx` | 같은 이름 |
| `layout/Header.tsx`, `Footer.tsx`, `MobileMenu.tsx` | `layout/Header.tsx`, `Footer.tsx`, `MobileMenu.tsx` | 같은 이름, 독립 구현 |

**이유**: v1→v2 전환 시 기존 코드를 재사용하지 않고 새로 작성(CHANGELOG 2026-07-04: "기존 v1 코드 재사용 아님, 신규 작성"). 의도된 재작성이라 "실수"는 아니지만, 8개+ 파일이 이름·목적이 동일한 채 두 벌로 남아 있어 유지보수 시 "어느 쪽을 고쳐야 하나" 혼동 위험이 있습니다.

### 2-3. `apps/cnbiz-web/components/{layout,sections}` vs `packages/*` — 중복 아님
이건 정상적인 계층 분리입니다. `packages/*`가 원자 단위(Button 등)를 제공하고 `apps/cnbiz-web/components`가 그걸 조합해 페이지 섹션을 만드는 구조라 중복이 아닙니다.

---

## 3. `lib`와 `utils`의 중복 여부

**중복이 거의 없습니다.** 저장소에 최상위 `utils/` 폴더 자체가 없고, "utils"라는 이름은 아래 3곳에만 존재하며 서로 역할이 겹치지 않습니다.

| 경로 | 역할 | `lib`와 중복? |
|---|---|---|
| `packages/utils/src/cn.ts` | Tailwind 클래스 병합 헬퍼(`cn()`) 하나만 export. `packages/ui` 컴포넌트들이 씀 | 아니오 — UI 전용 |
| `packages/cli/src/utils/` | CLI 내부 전용 유틸(파일 시스템·문자열 처리 등) | 아니오 — CLI 스코프 한정, 웹 앱에서 import 안 됨 |
| `apps/cnbiz-web/lib/` (28개 모듈) | auth·contact·design·projects 등 **비즈니스 로직**. "utils"라는 이름의 하위 폴더 자체가 없음 | 해당 없음 |
| 루트 `lib/` (3개 파일: `dev/component-marker.ts`, `site-config.ts`, `supabase.ts`) | v1 레거시용. 이 중 `supabase.ts`는 루트 `app/`·`components/` 어디서도 import되지 않는 **죽은 코드**로 확인됨(6번 항목 참고) | 아니오 |

즉 "lib와 utils"는 중복 문제가 아니라, **패키지별로 명확히 분리되어 있어 문제 없음**이 결론입니다.

---

## 4. `docs`의 오래된 문서와 최신 문서

`docs/`는 `00_COMPANY`~`99_ARCHIVE` 11개 폴더 체계입니다. 실제 수정 시각(파일시스템 mtime) 기준:

### 최신(2026-07-14~15, 이번 주 내 갱신)
- `docs/01_PMO/CHANGELOG.md` (07-15) — 실질적으로 이 저장소에서 **가장 신뢰할 수 있는 최신 문서**. 다만 이번 세션(07-18)의 작업(테스트 이관, 릴리스 점검, 의뢰 접수 시스템)은 아직 반영 안 됨.
- `docs/03_DESIGN/{DESIGN_AUTOMATION_MASTER,CLAUDE_DESIGN_INTEGRATION,FIGMA_INTEGRATION,DESIGN_SYNC,DESIGN_WORKFLOW}.md` (07-14~15) — Design Automation 9 Phase 스펙, 실제 구현과 대체로 일치.

### 오래됨 / 실제와 어긋남
- **`docs/01_PMO/WBS.md` (07-05, 13일 전)** — 문서 최상단에 스스로 "2026-07-05 기준으로 동결" 명시. 이후의 대규모 이관(`app/`→`apps/cnbiz-web`), Design Automation 9 Phase, 인증/RBAC, Marketplace, 의뢰 접수 시스템을 전혀 반영 못 함. **PROJECT_STATUS.md가 이미 사실상 WBS.md를 대체**하고 있는 상태.
- **`docs/09_WORK_HISTORY/CURRENT_CONTEXT.md` (07-06, 12일 전)** — `/startday` 세션 시작 시 참조하는 "현재 상태" 문서인데 12일간 갱신 안 됨. `sessions/` 폴더도 최신 파일이 `2026-07-07.md`로 멈춰 있음(11일 공백).
- **`docs/00_COMPANY/DOCUMENT_INDEX.md` (07-06)** — "전체 문서의 단일 마스터 인덱스"를 표방하지만, 실제 `docs/03_DESIGN/`에 8개 파일이 있는데 인덱스에는 3개(`DESIGN_SYSTEM.md`·`UI_GUIDE.md`·`UX_GUIDE.md`)만 등록되어 있어 **5개 최신 문서(DESIGN_AUTOMATION_MASTER 등)가 누락**됨. 인덱스 문서 자체가 스스로의 존재 목적("신규 문서 생성 시 이 인덱스에 등록")을 못 지키고 있음.
- `docs/04_OPERATIONS/*.md`(`DEPLOYMENT.md`·`QA.md`·`SEO.md`·`ANALYTICS.md`) — 인덱스에 "빈 문서/Placeholder"로 명시. Phase 2 이후 예정으로 방치 중.
- `docs/07_KNOWLEDGE/`, `docs/99_ARCHIVE/` — 07-05~07-06 이후 갱신 없음, Archive는 이름대로 방치 목적이라 문제 아님.

### 성격이 다른 항목 — 무관한 클라이언트 프로젝트 문서 혼입
- **`docs/08_PLANS/상가분양센터/`** (7개 파일: HTML 와이어프레임 4개·PDF 1개·PDF·MD 스토리보드) — "상가분양센터"(상업용 부동산 분양 센터)는 CNBIZ 자체 프로젝트나 AI Business OS와 무관한 **완전히 다른 업종의 별도 클라이언트 산출물**로 보입니다. `docs/08_PLANS/README.md`나 `001-phase1-mvp.md`(AI Business OS 자체 계획)와 성격이 다름. 이 저장소에 있어야 할 근거가 불분명 — 실수로 들어왔거나 별도 클라이언트 작업 저장 위치로 임시 사용된 것으로 추정됩니다. **사용자 확인이 필요합니다** (삭제/이동 여부는 임의 판단하지 않음).

---

## 5. `agents`와 `skills`의 역할 비교

이 저장소에는 "AI 에이전트/역할 정의"가 **정확히 겹치는 4개 체계**로 흩어져 있습니다.

| 체계 | 위치 | 대상 | 형식 |
|---|---|---|---|
| ① 워크플로 단계 역할 | `docs/05_AI/{Planner,Builder,Reviewer,Documenter,Architect}.md` | Plan→Build→Review→Document 진행 단계 | 순수 Markdown |
| ② 엔지니어링 직군 역할 | 루트 `agents/*.md` (9개: ai-engineer·backend-engineer·business-analyst·devops-engineer·frontend-engineer·product-manager·qa-engineer·solution-architect·technical-writer) | 직군별 책임(Mission/Objectives) | 순수 Markdown |
| ③ 프롬프트 템플릿 | 루트 `prompts/{coder,planner,reviewer,documenter,tester,system}.md` | ②와 동일 직군을 "실행 시 사용할 프롬프트" 관점으로 재서술 | 순수 Markdown |
| ④ Claude Code Skill | `skills/experts/*/SKILL.md` (15개: ②의 9개 + data-engineer·fullstack-engineer·scrum-master·security-engineer·ui-designer·ux-designer) | ②와 사실상 동일 직군, 더 많음 | YAML frontmatter + Markdown, Claude Code가 실제로 로드 가능한 형식 |

**실제 내용 비교**: `agents/ai-engineer.md`(247줄)와 `skills/experts/ai-engineer/SKILL.md`(301줄)를 직접 대조한 결과, Mission/Purpose·Objectives 등 **구조와 내용이 사실상 같은 역할을 두 번 기술**하고 있습니다. 차이는 ④가 YAML frontmatter(`name`/`description`/`version`/`category`)를 갖춰 Claude Code Skill 시스템에 실제로 로드될 수 있는 유일한 형식이라는 점입니다.

**결론**: ②(`agents/*.md`)는 ④(`skills/experts/*/SKILL.md`)의 **완전한 부분집합이자 구식 버전**입니다(9개 role ⊂ 15개 role, 덜 구조화된 형식). ③(`prompts/*.md`)도 같은 직군을 세 번째 각도로 재서술합니다. 2026-07-10 CHANGELOG에서 이미 "agents/*.md가 skills/experts/*와 이름 중복"이라 지적했지만, 그때는 0바이트 파일만 정리하고 **내용이 있는 이 중복은 그대로 남겨뒀습니다**(의도적 보류, 미해결 상태 그대로).

역할 정의 외에, `agents/README.md`·`prompts/README.md`·`skills/README.md`(→ 없음, `skills/`는 하위 폴더별 README만 있음)·`orchestration/README.md`·`memory/README.md`는 2026-07-10에 "이 폴더는 실 콘텐츠가 아니라 안내이며 실제 문서는 `docs/05_AI/`·`docs/09_WORK_HISTORY/`에 있다"고 이미 스스로 명시해 둔 상태입니다.

---

## 6. 삭제 가능한 파일

실측으로 확인된, 근거가 명확한 항목만 나열합니다(추측 배제).

| 경로 | 근거 |
|---|---|
| `scripts/create-agent.ps1`, `create-domain.ps1`, `create-expert.ps1`, `create-project.ps1`, `create-shared.ps1`, `create-skills.ps1`, `create-template.ps1`, `create-v1.1.ps1`, `create-workflow.ps1`, `init-ai-business-os.ps1` (10개) | **전부 0바이트**로 실측 확인. 2026-07-10 CHANGELOG에 "스캐폴딩 재현성 격차"로 이미 지적되었고 8일째 방치. 어떤 코드도 이 파일들을 실행하지 않음(내용이 없으므로 실행해도 아무 일 없음) |
| `lib/supabase.ts` (루트) | `grep`으로 루트 `app/`·`components/` 전체에서 import하는 곳이 하나도 없음을 확인한 **죽은 코드**. `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`를 참조하지만 이 값을 쓰는 화면 자체가 없음 |
| 루트 `tree.txt` (4.46MB) | Git 미추적(untracked), `.gitignore`에도 없음. UTF-16 인코딩이 깨진 채로 저장된 Windows `tree` 명령 출력으로 보이며, 저장소 루트에 있어야 할 이유가 없는 임시 산출물 |
| `.claude/worktrees/ai-provider-v1.1/` | 과거 세션이 만든 git worktree(브랜치 `worktree-ai-provider-v1.1`)의 전체 복사본. `eslint.config.mjs`가 최근 이 폴더를 스캔해 무관한 lint 오류 14건을 내던 것이 실제로 확인됨(이번 세션에서 ignore 패턴 추가로 우회했으나, worktree 자체는 여전히 존재). 그 브랜치 작업이 끝났다면 `git worktree remove`로 정리 대상 — **단, 진행 중인 작업일 수 있으니 삭제 전 사용자 확인 필요** |
| `docs/04_OPERATIONS/{DEPLOYMENT,QA,SEO,ANALYTICS}.md` | `DOCUMENT_INDEX.md`가 스스로 "빈 문서(Placeholder)"라고 명시. 내용이 없다면 폴더 존재 자체는 유지하되(Phase 2 계획된 자리), 빈 파일들은 실제 착수 시점에 만들어도 되는 후보 |
| `apps/cnbiz-web/lib/data/*.json`, 루트 `test-project/` | 로컬 테스트 산출물(`.gitignore` 대상 확인됨, `lib/data/`는 `.gitignore`에 명시). Git에는 영향 없으나 로컬 디스크 정리 대상. `test-project/`는 CLI 스캐폴딩 테스트용 스크래치 결과물로 보이며 Git 미추적 여부 확인 후 삭제 권장 |

**삭제 보류(사용자 확인 필요, 임의 판단 안 함)**:
- `docs/08_PLANS/상가분양센터/`(4번 항목 참고) — 다른 클라이언트 프로젝트로 보이는 문서. 이 저장소 소관이 맞는지 사용자 확인 필요.
- `agents/*.md` 9개, `prompts/*.md` 6개 — `skills/experts/*`와 내용 중복(5번 항목)이지만, 실제 콘텐츠가 있는 파일을 삭제하는 것이라 사용자 승인 필요.

---

## 7. 통합 가능한 폴더

| 통합 대상 | 통합 방향 | 이유 |
|---|---|---|
| `agents/*.md`(직군 9개) + `prompts/*.md`(프롬프트 6개) → `skills/experts/*/SKILL.md` | `skills/experts/`로 일원화 | 5번 항목의 중복을 실제로 해소하는 유일한 방법. `skills/experts/*`가 이미 상위 호환(더 많은 역할, 구조화된 frontmatter, Claude Code가 실제로 로드 가능) |
| `docs/05_AI/{Planner,Builder,Reviewer,Documenter,Architect}.md` | 위 통합과는 별도로 유지 권장 | 이건 "직군"이 아니라 "워크플로 단계"라 통합 대상이 다름 — 다만 `docs/05_AI/AGENTS.md`(에이전트 레지스트리)가 이 5개+`agents/*.md`+`skills/experts/*`를 한 곳에서 상호 참조하도록 정리할 필요는 있음 |
| 루트 `components/`, `app/`, `lib/`(v1) | 아카이브 폴더(예: `_archive/v1-legacy/`)로 이동 또는 명시적 README로 "읽기 전용 레거시" 표시 | 현재는 살아있는 최상위 폴더처럼 보여 신규 기여자가 v2(`apps/cnbiz-web`) 대신 이곳에 작업할 위험이 있음. 완전 삭제보다는 격리 이동이 안전 |
| `packages/agents`, `packages/skills`, `packages/templates`, `packages/prompts`, `packages/workflows` (각 README.md 1개뿐, 실제 코드 없음) | 계획대로 유지하되 `docs/01_PMO/PROJECT_ROADMAP.md`의 "Phase 5: AI Business OS Productization"과 명시적으로 연결 | 이미 로드맵에 "폴더만 존재, 착수 시점 미정"으로 문서화되어 있어 삭제 대상은 아님(2026-07-10 결정 사항). 다만 루트 `agents/`·`skills/`·`prompts/`·`orchestration/`(실 콘텐츠)와 이름이 겹쳐 신규 기여자가 헷갈리기 쉬움 — 최소한 각 `README.md`에 "이 패키지는 배포용 스타터킷 자리이며, 실제 콘텐츠는 루트 `agents/`·`skills/`에 있다"는 상호 참조 링크 추가 권장 |
| `docs/00_COMPANY/DOCUMENT_INDEX.md` 03_DESIGN 섹션 | 실제 `docs/03_DESIGN/` 8개 파일과 동기화 | 통합이라기보다 "최신화" — 인덱스가 스스로의 존재 이유를 못 지키고 있음(4번 항목) |

---

## 8. 개선이 필요한 구조

1. **루트/`apps` 이원 구조의 진입장벽** — `app/`이 살아있는 폴더처럼 보이지만 실제로는 배포되지 않는 레거시입니다. README.md 최상단이나 루트 `app/`·`lib/`·`components/`에 눈에 띄는 안내(예: 각 폴더 최상단에 `README.md`로 "⚠️ 레거시, apps/cnbiz-web을 보세요")가 없으면 반복적으로 혼동을 유발합니다.
2. **역할 정의 4중 체계(5·7번 항목)** — 같은 정보를 4곳에서 유지보수해야 해서, 한쪽만 갱신되고 나머지가 stale해지는 구조적 위험이 있습니다(실제로 이미 그렇게 되어 있음 — `agents/*.md`는 `skills/experts/*`보다 역할 수도 적고 오래됨).
3. **문서 인덱스의 자기 불일치** — `DOCUMENT_INDEX.md`가 "신규 문서는 여기 등록" 원칙을 표방하지만 실제로는 최근 5개 문서가 누락되어 원칙이 지켜지지 않고 있습니다. 인덱스 갱신을 문서 작성 워크플로에 강제하는 절차(예: PR 체크리스트)가 없으면 계속 벌어질 문제입니다.
4. **`.gitignore`의 비재귀 사각지대** — `/.runtime/`(루트 전용 앵커)이 `apps/cnbiz-web/.runtime/`은 잡지 못해 실제로 그 폴더가 untracked 상태로 남아 있음(이번 조사에서 확인). `eslint.config.mjs`도 최근까지 `.claude/**`를 제외하지 않아 다른 세션의 worktree를 스캔하는 문제가 있었습니다(이번 세션에서 수정). 같은 유형의 문제가 다른 도구 설정에도 남아 있을 수 있어, "루트 기준 앵커 vs 재귀 패턴"을 프로젝트 전체에서 한 번 점검할 필요가 있습니다.
5. **WBS.md의 역할 상실** — WBS.md는 스스로 "동결"을 선언했고 `PROJECT_STATUS.md`가 사실상 그 역할을 대체하고 있습니다. 두 문서가 공존하면서 어느 쪽이 "현재 상태의 출처"인지 불명확한 상태이므로, WBS.md에 "본 문서는 더 이상 갱신되지 않으며 최신 상태는 PROJECT_STATUS.md를 참고하라"는 안내를 명시하거나, WBS.md 자체를 폐기하는 결정이 필요합니다.
6. **무관한 콘텐츠 혼입(`docs/08_PLANS/상가분양센터/`)** — 이 저장소가 "CNBIZ 자사 홈페이지 + AI Business OS"라는 스코프를 갖고 있는데, 성격이 전혀 다른 클라이언트 산출물이 섞여 있는 것은 저장소 스코프 관리 원칙이 지켜지지 않은 사례입니다. 재발 방지를 위해 "이 저장소에 커밋 가능한 콘텐츠 범위"를 문서화할 필요가 있습니다.
7. **`test-project/`, `tree.txt` 등 루트에 흩어진 임시 산출물** — 검증/테스트 세션이 끝난 뒤 정리하는 관례(CHANGELOG에 여러 번 명시된 원칙)가 이번엔 지켜지지 않은 것으로 보입니다. 세션 종료 체크리스트에 "루트에 새로 생긴 미추적 파일 확인"을 명시적으로 포함하면 재발을 줄일 수 있습니다.

---

## 요약

| 항목 | 결론 |
|---|---|
| 1. app vs apps | 완전히 다른 두 세대(v1 동결·v2 실서비스), 혼동 위험 큼 |
| 2. components vs packages | 부분 중복(같은 이름 섹션 8개+ v1/v2 병존), 원자 컴포넌트는 v2만 존재 |
| 3. lib vs utils | 중복 없음(스코프 명확히 분리됨) |
| 4. docs 최신/오래됨 | CHANGELOG·03_DESIGN 최신, WBS·CURRENT_CONTEXT·DOCUMENT_INDEX 정체, 무관 클라이언트 문서 혼입 발견 |
| 5. agents vs skills | 4중 중복 체계, `skills/experts/*`가 사실상 상위 호환 |
| 6. 삭제 가능 | 0바이트 스크립트 10개, 죽은 코드 1개, 임시 산출물 다수(확인됨) |
| 7. 통합 가능 | agents+prompts → skills/experts, v1 레거시 격리 |
| 8. 구조 개선 | 이원 구조 안내 부재, 역할 정의 중복 관리 부담, 문서 인덱스 불일치, gitignore 사각지대 |
