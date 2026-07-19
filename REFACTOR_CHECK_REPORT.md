# Refactoring Check Report

> 작성일: 2026-07-19 (검증 전용 — 코드/문서 수정 없음, 신규 기능 없음)
> 근거: `git log`/`git status` 실측, `REPORT.md`·`REFACTOR_PLAN.md`·`CHECKPOINT_REVIEW.md`·
> `docs/architecture/{AI_CONTENT_MAPPING,P3_PHASE1_COMPLETION,P3_PHASE2_PLAN,P3_PHASE2_REVIEW}.md`·
> `CHANGESET.md` 대조, `npm run lint`/`npm run build`/`npx tsc --noEmit` 실제 실행 결과
> **이 문서는 검증 보고서입니다. 파일 삭제·이동·병합·코드 수정을 전혀 수행하지 않았습니다.**

---

## 완료

- **P1 삭제 후보 4종 전부 실행 완료** — `REFACTOR_PLAN.md`가 "참조 0건"으로 실증한 항목이 모두 커밋으로 반영됨. `git log`에서 확인: `c28ba33 chore: remove dead lib/supabase.ts`, `c89981a chore: remove dead components/sections/PortfolioSection.tsx`, `ffc03bd chore: remove 10 empty placeholder scripts`. `tree.txt`(4.46MB)도 저장소 루트에서 확인 결과 더 이상 존재하지 않음. 디스크 재확인 결과 네 항목 전부 실물 삭제됨.
- **P2 문서 동기화 2건 실행 완료** — `docs/01_PMO/WBS.md` 최상단에 "2026-07-05 기준 동결, 최신 상태는 `PROJECT_STATUS.md` 참고" 안내 문구 삽입 확인(`205de2d`). `docs/00_COMPANY/DOCUMENT_INDEX.md`에 `DESIGN_AUTOMATION_MASTER.md`·`CLAUDE_DESIGN_INTEGRATION.md`·`FIGMA_INTEGRATION.md`·`DESIGN_SYNC.md`·`DESIGN_WORKFLOW.md` 5개 항목이 실제로 등록되어 있음을 확인(`34a8d27`, `DOCUMENT_INDEX.md:48-52`).
- **Agent → Skill 마이그레이션 Phase 1(`agents/*.md` 9개) 완료** — `agents/{ai-engineer,backend-engineer,business-analyst,devops-engineer,frontend-engineer,product-manager,qa-engineer,solution-architect,technical-writer}.md` 9개 전부 실측 확인:
  - 전부 1,423~1,554B로 축소된 Legacy Stub(원본 대비 약 93~94% 축소)이며, 최상단에 `⚠️ DEPRECATED (2026-07-19)` 인용구 + 대상 `skills/experts/<role>/SKILL.md` 링크 보유.
  - 대응하는 `skills/experts/<role>/SKILL.md` 9개 전부 frontmatter에 `status: merged` 확인(3개 Pilot은 `sources:` 배열 형식, 나머지 6개는 `source: agents/<role>.md (merged 2026-07-19)` 단일 필드 — 형식은 다르지만 9개 전부 병합 완료 상태로 일관됨).
  - `agents/README.md`의 "Available Agents" 표 9/9 Merged로 갱신 확인, 이전 `CHECKPOINT_REVIEW.md`가 지적했던 "Standard Agent Template" 섹션의 자기모순도 이후 커밋에서 "9/9 Merged 상태라 이 템플릿을 따르는 문서는 없다"는 안내로 해소됨(`agents/README.md:125-140`).
  - `docs/architecture/P3_PHASE1_COMPLETION.md`에 완료 보고서로 별도 기록됨.
- **Agent → Skill 마이그레이션 Phase 2 Pilot(`prompts/coder.md`) 실행 완료** — `ea03bfc refactor: migrate coder prompt to skills` 커밋으로 `prompts/coder.md`(3,146B→1,742B 축소, DEPRECATED 안내 확인)의 `# Expected Output Structure`가 대상 3개(`backend-engineer`·`frontend-engineer`·`ai-engineer`) `SKILL.md`에 `# Expected Output Structure (Coding)` 섹션으로 삽입되고, `sources:` 배열로 다중 출처(agent+prompt) 표기가 반영됨(`skills/experts/ai-engineer/SKILL.md:1-15` 등). 최신 커밋 `37cac24 docs: support multi-source skill metadata`로 후속 정리까지 마무리됨.
- **Supabase 단일 테이블 설계 유지 확인** — 저장소 전체에 `supabase/` 마이그레이션 디렉터리가 존재하지 않음(검색 결과 0건). `apps/cnbiz-web/lib/db/`의 `CollectionStore` 추상화(fs/Supabase 겸용, `getDefaultStore()`)가 모든 registry(inquiries 대응물인 `project-requests`, `projects`, `users`, `sessions`, Design Automation 9개 등)를 단일 `app_collections`(collection/id/data JSONB) 테이블로 처리 — 구조상 "중복 테이블"이 발생할 수 없는 설계이며 이 원칙이 그대로 유지되고 있음.
- **빌드/린트/타입체크 전부 통과** — 이번 세션에서 직접 실행해 재확인(캐시된 과거 결과 아님):
  - `apps/cnbiz-web`: `npm run lint` 0 errors, `npm run build` 성공(84개 API route 포함 정상 생성), `npx tsc --noEmit` exit 0.
  - 루트(레거시 v1): `npm run lint` 0 errors, `npm run build` 성공(9개 라우트 정상 생성).
- **Git 작업 트리 깨끗함** — `git status` 결과 `nothing to commit, working tree clean`. 이전 세션들이 반복 지적했던 "세션 종료 후 미정리 산출물" 문제가 이번 시점에는 없음(단, `test-project/`는 예외 — 아래 참고).

---

## 발견된 문제

1. **`CHANGESET.md`의 CS-08 진행 상태 서술이 실제보다 뒤처져 있음(문서 드리프트 재발)** — `CHANGESET.md:217`은 "Phase 2 `prompts/*.md`는 계획서 수립, 미착수"라고 기술하지만, 실제로는 `prompts/coder.md` Pilot이 이미 실행·커밋(`ea03bfc`, `37cac24`)되어 3개 SKILL.md에 반영된 상태다. `CHECKPOINT_REVIEW.md`가 이미 한 차례 "표는 갱신되는데 서술 문장이 누락되는 패턴이 3회 연속 반복된다"고 지적했던 것과 동일한 유형의 드리프트가 이번에도 재현됨 — 구조적으로 반복되는 취약점으로 보인다.
2. **Agent → Skill 마이그레이션 Phase 2(`prompts/*.md` 6개)가 1/6만 완료** — `coder.md`만 Legacy Stub으로 전환됨. 나머지 5개(`planner`·`reviewer`·`tester`·`documenter`·`system`) 중 `planner.md`(3,140B)·`reviewer.md`(3,329B)·`tester.md`(3,281B)·`documenter.md`(3,146B)는 원본 그대로이며 DEPRECATED 안내가 없음(직접 확인). `system.md`(2,859B)는 계획상 "축소하지 않고 15개 SKILL.md에 각주만 추가"하는 별도 방식이라 성격이 다르지만, 이 역시 아직 미착수 상태.
3. **P3 범위의 "컴포넌트 중복" 항목은 전혀 손대지 않음** — `REPORT.md`가 지적한 루트 `components/` vs `apps/cnbiz-web/components/`의 동일 이름 파일 11개(`AboutHeroSection.tsx`, `ContactForm.tsx`, `CTASection.tsx`, `Footer.tsx`, `Header.tsx`, `HeroSection.tsx`, `MobileMenu.tsx`, `ServiceProcessSection.tsx`, `ServicesDetailSection.tsx`, `ServicesHeroSection.tsx`, `ServicesOverviewSection.tsx`)가 이번 검증 시점에도 grep으로 그대로 확인됨 — 하나도 정리되지 않았다.
4. **루트 `app/`·`components/`·`lib/`(v1 레거시)에 "레거시" 안내 표시가 여전히 없음** — `REPORT.md` 8.1이 지적한 문제가 그대로 남아 있음. `app/README.md`·`components/README.md` 둘 다 존재하지 않음(확인됨). 신규 기여자가 루트를 실제 서비스 코드로 오인할 위험이 그대로 유지되고 있다.
5. **`lib/contact/store.ts`가 여전히 `CollectionStore`를 우회해 `fs.readFileSync`/`writeFileSync`를 직접 호출** — `apps/cnbiz-web/lib/contact/store.ts:15,23,41`에서 확인. 다른 모든 registry(`requests`, `projects` 등)는 `getDefaultStore()`를 거치는데 이 파일만 예외로 남아 있어, 프로덕션(Vercel)에서 Contact 제출 내역이 Supabase가 아닌 휘발성 로컬 파일에만 저장될 가능성이 있다 — `PROJECT_STATUS.md`가 이미 인지하고 있는 기존 이슈이며, 이번 리팩터링 범위에서도 손대지 않았다.
6. **`.claude/worktrees/ai-provider-v1.1/` 별도 git worktree가 여전히 존재** — `git worktree list` 결과 `worktree-ai-provider-v1.1` 브랜치가 그대로 남아 있음. `REPORT.md`·`REFACTOR_PLAN.md` 둘 다 "사용자 확인 필요"로 보류했고 이번에도 해소되지 않았다.
7. **`test-project/`가 디스크에 남아 있음(단, Git 미추적)** — `git ls-files test-project/` 결과 0건으로 저장소에는 영향 없으나, `REFACTOR_PLAN.md`가 "확인 후 삭제 권장"으로 표시한 로컬 스크래치 산출물이 정리되지 않고 그대로 남아 있다.
8. **P4 항목(구조적 의사결정 필요) 전부 미착수** — `marketplace/{prompts,templates}` 카테고리 정리, `skills/{core,domains,shared,templates,workflows}` 존치 여부, `docs/08_PLANS/상가분양센터/` 처리, `docs/04_OPERATIONS/*` 착수 시점 — 전부 `REFACTOR_PLAN.md` 작성 시점(07-18) 그대로다. 이 항목들은 애초에 "제품 오너 승인 선행" 전제였으므로 미착수 자체는 예상된 상태이지만, 완료율 산정에는 반영해야 한다.

---

## 수정 권장

1. **`CHANGESET.md`의 CS-08 행을 `prompts/coder.md` Pilot 완료 반영해 갱신** — "계획서 수립, 미착수" → "Phase 2 Pilot(`coder.md`) 완료, 나머지 5개 대기"로 정정. 서술형 진행 상태 문장이 반복적으로 stale해지는 패턴을 근본적으로 줄이려면, `CHANGESET.md` 최상단에 "표만 보고도 최신 상태를 알 수 있는 단일 진행률 표"를 두고 서술 문장은 그 표를 참조하도록 구조를 바꾸는 편을 권장(`CHECKPOINT_REVIEW.md`가 이미 제안했던 것과 동일한 처방).
2. **Phase 2 나머지 5개(`planner`·`reviewer`·`tester`·`documenter`·`system`)는 `P3_PHASE2_REVIEW.md`가 이미 확정해 둔 순서(`coder → planner → reviewer → documenter → tester → system`)대로 이어서 진행** — 착수 전 Go 조건(fan-in ≥2 대상의 헤딩 구분 규칙 등)이 이미 문서화되어 있으므로 재설계 없이 바로 실행 가능한 상태.
3. **컴포넌트 중복(11개 파일) 정리 여부를 사용자에게 명시적으로 물어볼 것** — `REFACTOR_PLAN.md` P3가 "레거시 트리 안내 표시"만 제안하고 실제 파일 삭제/이동은 제안하지 않았다. 루트 v1을 완전히 걷어낼지, 안내만 추가할지 방향을 정하지 않으면 이 항목은 계속 보류 상태로 남는다.
4. **`.claude/worktrees/ai-provider-v1.1`과 `docs/08_PLANS/상가분양센터/`는 다음 세션에서 가장 먼저 사용자에게 직접 질문할 것** — 둘 다 이미 두 번(REPORT.md, REFACTOR_PLAN.md) 보류 표시가 반복되고 있어, 답을 받지 못하면 계속 다음 리포트에도 미해결 항목으로 이월될 것이다.
5. **`test-project/`는 Git에 영향이 없으므로 로컬 정리(삭제)는 사용자 승인만 받으면 바로 실행 가능** — 별도 조사 불필요.

---

## 리팩터링 완료 여부

⚠ NEEDS ADDITIONAL REFACTORING

**리팩터링 완료율: 약 58%**

| 구간 | 세부 항목 | 상태 | 가중 근거 |
|---|---|---:|---|
| P1 (삭제 후보 4종) | supabase.ts·PortfolioSection.tsx·스크립트 10개·tree.txt | **100%** | 전부 커밋으로 실행 확인 |
| P2 (문서 동기화) | DOCUMENT_INDEX 갱신·WBS 동결 안내 | **100%** | 2건 모두 실행 확인(`test-project/` 정리는 별도 항목으로 아래 반영) |
| Agent→Skill Phase 1 | `agents/*.md` 9개 | **100%** | 9/9 `status: merged`, Stub 전환 확인 |
| Agent→Skill Phase 2 | `prompts/*.md` 6개(N:M) | **17%** | 1/6(`coder.md`)만 완료, 5개 미착수 |
| P3 (컴포넌트/레거시 표시) | 컴포넌트 중복 11개·레거시 README 표시·component-marker.ts 공유화 | **0%** | 전부 REPORT.md 시점 그대로 |
| P4 (구조적 결정) | marketplace 카테고리·skills 존치·상가분양센터·worktree | **0%** | 제품 결정 선행 대기, 전부 미착수(예정된 보류) |
| 빌드 품질 게이트 | lint/build/tsc | **100%** | 이번 세션 실행 재확인, 회귀 없음 |

가중 평균은 "Agent→Skill 마이그레이션(이번 세션의 명명된 리팩터링 대상)"과 "P1 즉시 실행 항목"에 가장 큰 비중을 둔 값이며(코어 지표), 여기에 P3·P4(구조적으로 아직 손대지 않은 범위)의 미착수 비중을 반영해 전체를 낮춘 값이다. Agent→Skill만 놓고 보면 (9+1)/(9+6) = 10/15 ≈ **67%**, 전체 저장소 리팩터링 범위(P1~P4)로 넓히면 **약 58%**로, 코어 지표 자체도 완료가 아니고 저장소 전체로는 더 낮다.

**결론**: P1(삭제)·P2(문서 동기화)·Agent 마이그레이션(Phase 1)은 실행 및 검증이 끝났고 빌드/린트/타입체크도 회귀 없이 통과하지만, 이번 세션이 다루는 리팩터링 전체 범위 기준으로는 (1) Phase 2(prompts) 5/6 미완료, (2) 컴포넌트 중복 미해결, (3) `CHANGESET.md` 진행 상태 문서 드리프트 재발, (4) P4 구조적 결정 전부 대기 중이라 **완료로 판단할 수 없다.**
