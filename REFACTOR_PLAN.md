# REFACTOR PLAN — REPORT.md 기반 리팩터링 계획

> 작성일: 2026-07-18
> 근거: `REPORT.md`(구조 분석) + 이번 세션에서 수행한 실제 import/참조 grep 검증
> **이 문서는 계획 문서입니다. 파일을 삭제하거나 폴더를 이동하는 실행은 포함하지 않습니다.**

---

## 0. 원칙

1. **파일을 삭제하지 않는다** — "삭제 후보"는 목록·근거만 제시하고 실행하지 않음.
2. **폴더를 이동하지 않는다** — "통합"·"레거시"는 물리적 이동 없이 표시·문서화로만 처리하는 방안을 제시.
3. **실제 import/참조 관계만 근거로 사용** — 이번 세션에서 `Grep`으로 실측한 결과만 인용(추측 금지). 재조사하지 않음.
4. **분류는 4가지**: 유지 / 통합 / 레거시 / 삭제 후보.
5. **우선순위 P1(가장 시급·저위험) ~ P4(구조적 의사결정 필요·고위험)**.

---

## 1. 분류 기준 정의

| 분류 | 정의 |
|---|---|
| **유지** | 실제 import/참조로 사용이 확인됨, 또는 `PROJECT_ROADMAP.md` 등에 공식적으로 존치 결정된 것 |
| **통합** | 기능·내용이 실질적으로 중복되어 하나의 소스로 합칠 수 있는 것(내용이 있는 파일들의 합병) |
| **레거시** | 더 이상 활성 개발 대상은 아니지만, 그 자체로는 내부적으로 일관되게 동작/참조되고 있어 삭제 대상은 아닌 이전 세대 자산 |
| **삭제 후보** | 실제 참조가 **0건**으로 확인됨(grep으로 검증됨). 삭제는 사용자 승인 후 별도 세션에서 실행 |

---

## 2. 영역별 분류표 (근거: 이번 세션 grep 결과)

### A. 루트 `app/` · `components/` · `lib/` (v1 레거시 트리)

| 항목 | 분류 | 근거(실측) | 우선순위 |
|---|---|---|---|
| `app/{page,about,services,portfolio,contact}.tsx`, `layout.tsx`, `sitemap.ts`, `robots.ts` | 레거시 | 루트 5페이지가 서로를 정상 참조, 빌드 성공하나 Vercel 배포 대상은 `apps/cnbiz-web`(`.vercel/project.json` 확인) | P3 |
| `components/layout/{Header,Footer,MobileMenu}.tsx` | 레거시 | 루트 `app/layout.tsx`에서 실사용 확인 | P3 |
| `components/sections/*.tsx` 중 14개(AboutHeroSection·CompanyIntroSection·ContactSection·CTASection·HeroSection·HistorySection·PortfolioComingSoonSection·ServiceProcessSection·ServicesDetailSection·ServicesHeroSection·ServicesOverviewSection·ServicesSection·TeamSection·VisionMissionSection) | 레거시 | `grep -rhoE "from \"@/components/[^\"]+\""  app` 결과에 전부 포함 확인 | P3 |
| `components/sections/ContactForm.tsx` | 레거시 | 직접 import는 없지만 `ContactSection.tsx`가 `import ContactForm from "@/components/sections/ContactForm"`로 사용(중첩 참조 확인) | P3 |
| **`components/sections/PortfolioSection.tsx`** | **삭제 후보** | `Grep pattern="PortfolioSection" glob="*.{ts,tsx}"` 결과 **자기 자신 1건만 매치** — 어디서도 import되지 않음 | **P1** |
| `lib/site-config.ts` | 레거시 | `Grep pattern="site-config"` 결과 루트 `app/layout.tsx`·`contact`·`portfolio`·`services`·`about`·`robots.ts`·`sitemap.ts` 7곳에서 실사용 확인 | P3 |
| **`lib/supabase.ts`** | **삭제 후보** | 루트 `app/`·`components/` 전체에서 import하는 곳 0건(이전 세션 및 이번 세션 grep 재확인) | **P1** |
| `lib/dev/component-marker.ts` | **통합 후보** (레거시이기도 함) | `diff lib/dev/component-marker.ts apps/cnbiz-web/lib/dev/component-marker.ts` → **`IDENTICAL`** 확인. 루트 컴포넌트 19곳에서 사용 중이라 레거시 트리 내에서는 살아있으나, `apps/cnbiz-web`과 **byte 단위로 완전히 같은 파일**이 두 곳에 존재 | P3 |

### B. `packages/*`

| 항목 | 분류 | 근거 | 우선순위 |
|---|---|---|---|
| `packages/cli`, `packages/ui`, `packages/design-system`, `packages/layout-primitives`, `packages/utils`, `packages/dev-inspector` | 유지 | `apps/cnbiz-web`이 `transpilePackages`로 실사용(이번 세션 `Select` 추가·검증 포함), `cli`는 독립 실행 도구로 확인됨 | — |
| `packages/{agents,skills,templates,prompts,workflows}`(각 `README.md` 1개, `package.json` 없음) | 유지 | `package.json` 부재로 npm workspaces에 미포함(`workspaces: ["apps/*","packages/*"]`이지만 실제로는 로드 안 됨) 확인. `PROJECT_ROADMAP.md` "Phase 5"에서 **"폴더·파일은 삭제하지 않고 유지"**로 이미 공식 결정된 사안 | — |

### C. 역할 정의 4중 체계 (`agents/`, `prompts/`, `skills/`, `docs/05_AI/`)

| 항목 | 분류 | 근거 | 우선순위 |
|---|---|---|---|
| `agents/changelog-writer/`(디렉터리, `system.md`·`agent.json`·`config.json` 등 포함) | 유지 | `packages/cli/src/*/loader.ts`가 실제로 `agents/<name>/`(디렉터리 형식)를 찾는 로더 코드로 확인됨. `marketplace/agents/changelog-writer/`가 발행된 짝 | — |
| `agents/{ai-engineer,backend-engineer,business-analyst,devops-engineer,frontend-engineer,product-manager,qa-engineer,solution-architect,technical-writer}.md`(9개, flat 파일) | **통합 후보** | 로더는 `agents/<name>/시스템.md` **디렉터리 구조**만 인식 — 이 9개는 flat `.md`라 어떤 로더도 인식 못 함(순수 참고문서). `skills/experts/*/SKILL.md`(15개, 9개를 포함하는 상위집합)와 내용 대조 결과(`ai-engineer` 사례) Mission/Objectives 구조가 사실상 동일 | P3 |
| `prompts/{coder,planner,reviewer,documenter,tester,system}.md`(6개) | **통합 후보** | 같은 9개 직군을 "프롬프트" 관점으로 3번째 서술. 어떤 코드도 이 경로를 로드하지 않음(참조는 문서 간 각주뿐) | P3 |
| `skills/experts/*/SKILL.md`(15개) | 유지(통합 목표지) | 가장 구조화된 형식(YAML frontmatter)이며 9개+6개 위 항목의 통합 대상 | — |
| `skills/{core,domains,shared,templates,workflows}/*`(약 60개 `SKILL.md`) | 레거시 | 이번 세션 시작 시 시스템이 제공한 "사용 가능한 skills" 목록(`endday`·`dataviz`·`code-review` 등)에 이 파일들이 **하나도 없음** — Claude Code가 실제로 로드하는 스킬이 아니라, 향후 제품화(Phase 5)를 위한 콘텐츠 자산으로 존재 | P4 |
| `docs/05_AI/{Planner,Builder,Reviewer,Documenter,Architect,AGENTS,PROMPTS,WORKFLOW,TOKEN_POLICY}.md` | 레거시 | `CLAUDE.md`의 실제 `@`-import 목록(9개 파일)에 **포함되지 않음** — 즉 세션에 자동 로드되지 않음. 다만 `agents/*.md`·`prompts/*.md`·`WBS.md` 등 33개 파일이 "관련 문서"로 각주 참조(`Grep pattern="docs/05_AI"` 결과) | P3 |
| `orchestration/*.md`, `memory/*.md` | 레거시 | 2026-07-10 CHANGELOG에서 이미 "실 콘텐츠 아님, 실제 문서는 `docs/05_AI`·`docs/09_WORK_HISTORY`에 있다"고 자체 명시된 안내용 스텁 | P4 |

### D. `marketplace/*`

| 항목 | 분류 | 근거 | 우선순위 |
|---|---|---|---|
| `marketplace/agents/`, `marketplace/index.json`, `marketplace/manifest.json` | 유지 | `changelog-writer` 실제 발행·설치 라이프사이클로 검증됨(CHANGELOG "Marketplace v1") | — |
| `marketplace/workflows/` | 유지 | `packages/cli/src/*/loader.ts`가 `workflows/<name>` 다음 폴백으로 `marketplace/workflows/<name>`을 실제로 조회하는 코드 확인(현재 발행된 패키지는 없음) | — |
| `marketplace/skills/`(README만) | 유지 | `lib/marketplace/registry.ts`의 `PackageType = "agent" \| "workflow" \| "skill"`에 포함된 **유효 카테고리** — 아직 발행물만 없음 | — |
| **`marketplace/prompts/`, `marketplace/templates/`**(README만) | **삭제 후보 (조건부)** | 위 `PackageType` 유니온에 `"prompt"`·`"template"`가 **존재하지 않음** — 현재 Marketplace v1 구현이 지원하지 않는 카테고리로, 실제 시스템과 구조가 어긋남. 삭제보다는 "카테고리를 실제 구현에 맞출지, `PackageType`을 확장할지" **제품 결정이 먼저 필요** | P4 |

### E. `docs/*`

| 항목 | 분류 | 근거 | 우선순위 |
|---|---|---|---|
| `docs/{00_COMPANY/PROJECT_VISION,01_PMO/PROJECT_ROADMAP,01_PMO/CHANGELOG,02_DEVELOPMENT/{ARCHITECTURE,TECH_STACK,CNBIZ_RULES,AI_COMPONENT_GUIDDE},03_DESIGN/DESIGN_SYSTEM}.md` | 유지 | `CLAUDE.md`의 실제 `@`-import 대상(세션에 자동 로드됨) | — |
| `docs/03_DESIGN/{DESIGN_AUTOMATION_MASTER,CLAUDE_DESIGN_INTEGRATION,FIGMA_INTEGRATION,DESIGN_SYNC,DESIGN_WORKFLOW}.md` | 유지 | 2026-07-14~15 최신 수정, 실제 구현(Design Automation 9 Phase)과 내용 일치 | — |
| `docs/01_PMO/WBS.md` | 레거시 | `@`-import는 되지만 문서 스스로 "2026-07-05 기준 동결" 선언. `PROJECT_STATUS.md`가 실질적 대체 문서로 이미 기능 중 | P2 |
| `docs/09_WORK_HISTORY/CURRENT_CONTEXT.md`, `sessions/*.md` | 레거시 | 마지막 갱신 2026-07-06/07(11~12일 정체), `/startday` 메커니즘 자체는 유효하나 방치 상태 | P2 |
| **`docs/00_COMPANY/DOCUMENT_INDEX.md`** | **통합/수정 필요** | 실제 `docs/03_DESIGN/` 8개 파일 중 인덱스에는 3개만 등록 — 5개(최신 Design Automation 문서) 누락 확인. "신규 문서는 인덱스에 등록" 원칙을 스스로 못 지키는 상태 | **P2** |
| `docs/04_OPERATIONS/{DEPLOYMENT,QA,SEO,ANALYTICS}.md` | 레거시(placeholder) | `DOCUMENT_INDEX.md`가 스스로 "빈 문서"로 명시 | P4 |
| `docs/08_PLANS/상가분양센터/`(7개 파일) | **보류 — 별도 확인 필요** | AI Business OS·CNBIZ와 무관한 타 업종 클라이언트 산출물로 추정되나 확인되지 않음. 유지/레거시/삭제 어디에도 임의 분류하지 않음 | **사용자 확인 우선(순위 부여 보류)** |

### F. `scripts/*`

| 항목 | 분류 | 근거 | 우선순위 |
|---|---|---|---|
| `scripts/{ai-business-os.ps1,setup.ps1,test-login.ps1}` | 유지 | 이번 세션에서 `test-login.ps1` 실제 실행·검증. `ai-business-os.ps1`·`setup.ps1`은 PowerShell 프로필 연결에 실사용(CHANGELOG 다수 기록) | — |
| **`scripts/create-{agent,domain,expert,project,shared,skills,template,v1.1,workflow}.ps1`, `scripts/init-ai-business-os.ps1`**(10개) | **삭제 후보** | 전부 0바이트(재확인), `Grep`으로 어떤 코드·문서도 파일명을 참조하지 않음(REPORT.md·CHANGELOG의 "언급"만 있음, 실행 참조 아님), **`scripts/README.md`가 스스로 "현재 스크립트 파일은 없습니다"라고 명시** — 존재 자체가 자기 문서와 모순 | **P1** |

### G. 루트의 정체불명 파일/디렉터리

| 항목 | 분류 | 근거 | 우선순위 |
|---|---|---|---|
| **`tree.txt`**(4.46MB) | **삭제 후보** | Git 미추적, `.gitignore` 미포함, 인코딩 손상, 어떤 문서·코드도 참조하지 않음 | **P1** |
| `test-project/`(agents/prompts/skills/templates/workflows 하위 구조) | 삭제 후보(확인 후) | CLI 스캐폴딩 테스트의 스크래치 산출물로 추정 — Git 추적 여부 최종 확인 필요 | P2 |
| `.claude/worktrees/ai-provider-v1.1/` | **보류** | 별도 git worktree(브랜치 `worktree-ai-provider-v1.1`)의 전체 복사본. 다른 세션의 진행 중 작업일 수 있어 삭제 판단 불가 — 삭제 시에도 파일 삭제가 아닌 `git worktree remove` 절차 필요 | **사용자 확인 우선** |

---

## 3. 우선순위별 요약

| 우선순위 | 성격 | 항목 수 | 특징 |
|---|---|---|---|
| **P1** | 즉시 실행 가능, 리스크 최소(참조 0건 실증됨) | `lib/supabase.ts`, `PortfolioSection.tsx`, `scripts/create-*.ps1` 10개, `tree.txt` = **13개 항목** | 삭제 승인만 받으면 되는 단계, 로직 영향 없음(참조 없음이 grep으로 증명됨) |
| **P2** | 저비용 문서 수정/확인 | `DOCUMENT_INDEX.md` 최신화, `WBS.md`에 대체 안내 추가, `test-project/` 추적 여부 확인 | 삭제가 아닌 "추가/수정"이라 즉시 실행 가능(파일 삭제 원칙과 무관) |
| **P3** | 통합 작업(여러 파일에 걸침, 중간 리스크) | `agents/*.md`+`prompts/*.md` → `skills/experts/*` 통합, `component-marker.ts` 공유화 검토, 루트 레거시 트리 안내 표시 | 콘텐츠 병합·재작성 필요, 회귀 확인 필요 |
| **P4** | 구조적 의사결정 필요(제품 결정 선행) | `marketplace/{prompts,templates}` 카테고리 정리, `skills/{core,domains,shared,templates,workflows}` 존치 여부, `docs/04_OPERATIONS` 착수 시점, `.claude/worktrees` 정리, `docs/08_PLANS/상가분양센터` 처리 | 담당자 승인·제품 방향 결정이 선행돼야 실행 가능 |

---

## 4. 실행 순서 (권장)

```
1단계 (P1) — 삭제 후보 사용자 승인 요청
   └─ lib/supabase.ts, PortfolioSection.tsx, scripts/create-*.ps1(10개), tree.txt
   └─ 근거 재확인 없이 이번 세션 grep 결과로 바로 승인 요청 가능

2단계 (P2) — 문서 동기화 (삭제 아님, 안전하게 바로 진행 가능)
   └─ DOCUMENT_INDEX.md에 03_DESIGN 5개 문서 등록
   └─ WBS.md 상단에 "본 문서는 동결됨, 최신 상태는 PROJECT_STATUS.md 참고" 안내 추가
   └─ test-project/ git 추적 여부 확인(git ls-files)

3단계 (P3) — 통합 작업
   └─ agents/*.md·prompts/*.md 9+6개 내용을 skills/experts/*로 흡수
      (skills/experts/*에 없는 세부가 있다면 보완, 있으면 agents/prompts는
       "이 내용은 skills/experts/<role>로 이동됨" 안내만 남기고 본문 축소)
   └─ lib/dev/component-marker.ts 공유 패키지화 여부 결정(신규 패키지 or packages/utils 편입)
   └─ 루트 app/·components/·lib/ 최상단에 "레거시, apps/cnbiz-web을 보라"는
      안내 주석/README 추가(이동 없이 표시만)

4단계 (P4) — 구조적 결정(사용자·제품 오너 승인 선행)
   └─ marketplace/{prompts,templates}: PackageType 확장 or 카테고리 폐기 결정
   └─ skills/{core,domains,shared,templates,workflows}: Phase 5 제품화 착수 여부와 연동해 존치/정리 결정
   └─ docs/08_PLANS/상가분양센터: 이 저장소 소관 여부 확인
   └─ .claude/worktrees/ai-provider-v1.1: 해당 브랜치 작업 완료 여부 확인 후 git worktree remove 여부 결정
```

---

## 5. 즉시 실행 가능한 작업 체크리스트

> 아래는 **삭제·이동 없이** 바로 진행하거나, 삭제는 사용자 승인만 받으면 되는 항목입니다.

- [ ] `lib/supabase.ts` 삭제 승인 요청 (근거: 루트 어디서도 import 0건)
- [ ] `components/sections/PortfolioSection.tsx` 삭제 승인 요청 (근거: 참조 0건)
- [ ] `scripts/create-{agent,domain,expert,project,shared,skills,template,v1.1,workflow}.ps1`, `scripts/init-ai-business-os.ps1` (10개) 삭제 승인 요청 (근거: 0바이트 + 0참조 + README 자기모순)
- [ ] 루트 `tree.txt`(4.46MB) 삭제 승인 요청 (근거: 미추적·손상된 인코딩·무참조)
- [ ] `test-project/`가 `git ls-files`에 잡히는지 확인 후 삭제 여부 재판단
- [ ] `docs/00_COMPANY/DOCUMENT_INDEX.md`의 "5. Design Documents" 표에 `DESIGN_AUTOMATION_MASTER.md`·`CLAUDE_DESIGN_INTEGRATION.md`·`FIGMA_INTEGRATION.md`·`DESIGN_SYNC.md`·`DESIGN_WORKFLOW.md` 5개 행 추가 (삭제·이동 아님, 안전)
- [ ] `docs/01_PMO/WBS.md` 최상단에 "이 문서는 2026-07-05 기준 동결됨. 최신 진행 상황은 `PROJECT_STATUS.md` 참고" 안내 문구 추가 (삭제·이동 아님, 안전)
- [ ] `docs/08_PLANS/상가분양센터/`가 이 저장소 소관이 맞는지 사용자에게 직접 질문
- [ ] `.claude/worktrees/ai-provider-v1.1/` 브랜치 작업이 끝난 것인지 사용자에게 직접 질문

---

## 6. 사용 중 vs 미사용 최종 요약

| 상태 | 항목 |
|---|---|
| **실사용 확인(코드가 import)** | `apps/cnbiz-web/**` 전체, `packages/{cli,ui,design-system,layout-primitives,utils,dev-inspector}`, 루트 `app/`·`components/`(2개 파일 제외)·`lib/site-config.ts`·`lib/dev/component-marker.ts`, `agents/changelog-writer/`, `marketplace/{agents,workflows,skills}/` |
| **참조 0건 확인(코드·문서 어디서도 안 씀)** | `lib/supabase.ts`, `components/sections/PortfolioSection.tsx`, `scripts/create-*.ps1`(10개), `tree.txt` |
| **문서 간 각주 참조만 있고 실행 도구엔 미연결** | `docs/05_AI/*`, `agents/*.md`(9개), `prompts/*.md`(6개), `orchestration/*`, `memory/*`, `skills/{core,domains,shared,templates,workflows}/*` |
| **npm workspaces에 포함조차 안 됨(package.json 없음)** | `packages/{agents,skills,templates,prompts,workflows}` |
