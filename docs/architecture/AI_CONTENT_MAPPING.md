# AI Content Mapping — agents/·prompts/ → skills/experts/*

> 작성일: 2026-07-18
> 근거: `CHANGESET.md` CS-08 실행 준비, 이번 세션 실측(파일 크기·헤더 구조·"Related Agents/Documents" 각주 대조)
> **이 문서는 매핑표입니다. 실제 파일 이동·삭제·병합은 이 문서에서 수행하지 않았습니다.**

---

## 0. 범위와 전제

- 대상: 루트 `agents/*.md`(9개 직군 문서 + README) ↔ 루트 `prompts/*.md`(6개 워크플로 문서 + README) ↔ `skills/experts/*/SKILL.md`(15개 직군 문서 + 빈 최상위 인덱스 1개)
- **범위 밖**(혼동 방지를 위해 명시):
  - `docs/05_AI/AGENTS.md` — Planner/Builder/Reviewer/Architect/Documenter 5개 실행 에이전트 레지스트리. `PROJECT_VISION.md`의 "AI Team Structure"에 대응하는 **별개 체계**이며 이번 매핑과 무관.
  - `skills/{core,domains,shared,templates,workflows}/*` — `skills/experts/` 외 다른 카테고리. `PROJECT_ROADMAP.md` Phase 5(Productization) 대상으로 별도 논의 중(`REFACTOR_PLAN.md` P4, CS-12).
  - `memory/*.md`, `orchestration/*.md` — 실제 콘텐츠가 존재함을 확인(2026-07-10 정리 이후 같은 날 재작성됨). `agents/*.md`의 "Related Documents"가 가리키는 대상이 살아있어 dangling link 아님. 이번 병합의 직접 대상은 아니나 각주 링크 유지 여부에 영향을 줌.
- 실행 로딩 여부: 세 디렉터리 중 어느 것도 이번 세션 시작 시 제공된 "사용 가능한 skills" 목록에 없음 — 즉 `agents/*.md`·`prompts/*.md`·`skills/experts/*`는 현재 전부 Claude Code가 자동 로드하는 실행 스킬이 아니라 **참고 문서**로만 존재. 병합 실패해도 런타임 영향 없음(순수 문서 리스크).

---

## 1. `agents/*.md` → `skills/experts/*` 매핑 (1:1, 직군 기준)

`agents/*.md`는 9개 직군 모두 `skills/experts/`에 동일 이름의 대상이 존재한다(부분집합 관계, CHANGESET CS-08 실측과 일치).

| 소스 (`agents/`) | 대상 (`skills/experts/`) | 소스 크기 | 대상 크기 | 매핑 |
|---|---|---:|---:|---|
| `ai-engineer.md` | `ai-engineer/SKILL.md` | 4,029B | 4,305B | 1:1 |
| `backend-engineer.md` | `backend-engineer/SKILL.md` | 3,826B | 4,035B | 1:1 |
| `business-analyst.md` | `business-analyst/SKILL.md` | 3,858B | 4,096B | 1:1 |
| `devops-engineer.md` | `devops-engineer/SKILL.md` | 4,072B | 4,163B | 1:1 |
| `frontend-engineer.md` | `frontend-engineer/SKILL.md` | 3,859B | 3,870B | 1:1 |
| `product-manager.md` | `product-manager/SKILL.md` | 3,566B | 4,043B | 1:1 |
| `qa-engineer.md` | `qa-engineer/SKILL.md` | 3,784B | 3,977B | 1:1 |
| `solution-architect.md` | `solution-architect/SKILL.md` | 4,032B | 3,973B | 1:1 |
| `technical-writer.md` | `technical-writer/SKILL.md` | 4,159B | 3,870B | 1:1 |
| `README.md` | (해당 없음, 인덱스 문서) | 2,101B | — | 유지 |

---

## 2. `prompts/*.md` → `skills/experts/*` 매핑 (N:M, 워크플로 단계 기준)

`prompts/*.md`는 직군이 아닌 **워크플로 단계**(Planning/Coding/Review/Testing/Documentation) 기준으로 작성되어, 각 파일이 여러 직군에 걸쳐 매핑된다(각 파일의 "Related Agents" 각주로 실측 확인).

| 소스 (`prompts/`) | 관련 직군 (Related Agents 각주 기준) | 대상 (`skills/experts/`) | 매핑 |
|---|---|---|---|
| `planner.md` | Business Analyst, Product Manager | `business-analyst/`, `product-manager/` | 1:N (2) |
| `coder.md` | Backend Engineer, Frontend Engineer, AI Engineer | `backend-engineer/`, `frontend-engineer/`, `ai-engineer/` | 1:N (3) |
| `reviewer.md` | Solution Architect, DevOps Engineer, QA Engineer | `solution-architect/`, `devops-engineer/`, `qa-engineer/` | 1:N (3) |
| `tester.md` | QA Engineer, Backend Engineer, Frontend Engineer, AI Engineer, DevOps Engineer | `qa-engineer/` 외 4개 | 1:N (5) |
| `documenter.md` | Technical Writer, Product Manager, QA Engineer | `technical-writer/`, `product-manager/`, `qa-engineer/` | 1:N (3) |
| `system.md` | (전역, 특정 직군 없음) | 15개 전체에 공통 적용 | 1:전체 |
| `README.md` | (해당 없음, 인덱스 문서) | — | 유지 |

**참고**: `system.md`는 "모든 Agent·Workflow·Prompt가 실행 전에 상속하는 전역 규칙"을 정의하므로 특정 `skills/experts/<role>`로 흡수되지 않는다 — 병합 대상이 아니라 각 SKILL.md의 공통 전제로만 참고되어야 함.

---

## 3. 중복되는 내용

`agents/*.md` 9개와 대응하는 `skills/experts/*/SKILL.md`를 대조한 결과(예: `ai-engineer`, `backend-engineer` 헤더 구조 실측), 아래 섹션이 실질적으로 같은 내용을 다른 표현으로 반복한다.

| 개념 | `agents/*.md` 섹션명 | `skills/experts/*/SKILL.md` 섹션명 |
|---|---|---|
| 역할 개요 | `## Overview` | `## Purpose` |
| 목표 | `# Primary Objectives` | `# Objectives` |
| 입력 | `# Inputs` | `# Inputs` |
| 핵심 업무 | `# Responsibilities` | `# Core Responsibilities` |
| 협업 관계 | `# Collaboration` | `# Collaboration` |
| 진행 순서 | `# Workflow` (화살표 다이어그램) | `# Workflow` (코드 블록 다이어그램) |
| 산출물 | `# Outputs` | `# Outputs` |
| 성공 기준 | `# Success Criteria` | `# Success Criteria` |
| 버전 | `# Version` | `# Version History` |

`prompts/*.md`는 위 개념 중 "Responsibilities/Workflow/Constraints/Related Agents"를 세 번째 각도(작업 지시문 형태)로 다시 서술한다 — 예: `prompts/coder.md`의 "Coding Standards/Quality Guidelines"는 `skills/experts/backend-engineer/SKILL.md`의 "API Development/Security/Performance/Testing"과 실질적으로 같은 실무 기준을 가리킨다.

**중복이 아닌 부분** (각 출처의 고유 가치, 병합 시 보존 필요):

- `agents/*.md`만 있음: `# Decision Authority`(Can/Cannot decide), `# Handoff`(다음 직군으로의 인계), 조직도형 `# Collaboration`(Works closely with / Provides outputs to / Receives feedback from 3단 구조)
- `skills/experts/*/SKILL.md`만 있음: YAML frontmatter(`name`/`description`/`version`/`category`/`priority` — Claude Code Skill 로더 규격), `# Validation Checklist`, `# Failure Conditions`, `# Rules`(실행 시 즉시 참조할 체크리스트형 규칙)
- `prompts/*.md`만 있음: `# Expected Output Structure`(응답 포맷 템플릿), 특정 워크플로 단계에 최적화된 `# Prompt Instructions`(번호 매긴 절차)

---

## 4. 병합 대상

CS-08 계획대로 **파일 삭제가 아닌 내용 병합**이 대상이다. 아래 15개 소스 파일의 "중복 아닌 부분"(3번 참고)만 대응하는 `skills/experts/*/SKILL.md`에 보완하고, 소스 파일 자체는 요약 + 링크로 축소한다(파일 경로는 유지 — 아래 5번 참고).

| 소스 | 대상 | 보완할 고유 내용 | 상태 |
|---|---|---|---|
| `agents/ai-engineer.md` | `skills/experts/ai-engineer/SKILL.md` | Decision Authority, Handoff | ✅ Merged (Pilot, 2026-07-19) |
| `agents/backend-engineer.md` | `skills/experts/backend-engineer/SKILL.md` | Decision Authority, Handoff | Pending |
| `agents/business-analyst.md` | `skills/experts/business-analyst/SKILL.md` | Decision Authority, Handoff | Pending |
| `agents/devops-engineer.md` | `skills/experts/devops-engineer/SKILL.md` | Decision Authority, Handoff | Pending |
| `agents/frontend-engineer.md` | `skills/experts/frontend-engineer/SKILL.md` | Decision Authority, Handoff | Pending |
| `agents/product-manager.md` | `skills/experts/product-manager/SKILL.md` | Decision Authority, Handoff | Pending |
| `agents/qa-engineer.md` | `skills/experts/qa-engineer/SKILL.md` | Decision Authority, Handoff | Pending |
| `agents/solution-architect.md` | `skills/experts/solution-architect/SKILL.md` | Decision Authority, Handoff | Pending |
| `agents/technical-writer.md` | `skills/experts/technical-writer/SKILL.md` | Decision Authority, Handoff | Pending |
| `prompts/planner.md` | `business-analyst/`, `product-manager/` | Expected Output Structure(있다면), 워크플로 단계별 절차 | Pending |
| `prompts/coder.md` | `backend-engineer/`, `frontend-engineer/`, `ai-engineer/` | Expected Output Structure | Pending |
| `prompts/reviewer.md` | `solution-architect/`, `devops-engineer/`, `qa-engineer/` | Expected Output Structure | Pending |
| `prompts/tester.md` | `qa-engineer/` (주 대상) 외 4개 | Expected Output Structure | Pending |
| `prompts/documenter.md` | `technical-writer/`, `product-manager/`, `qa-engineer/` | Expected Output Structure | Pending |
| `prompts/system.md` | 15개 전체 공통 | 병합 대신 각 SKILL.md 상단에 "전역 규칙은 prompts/system.md 참고" 각주만 추가(내용 복제 금지 — 이미 전역이므로) | Pending |

**실행 순서 원칙**(CS-08과 동일): 1개 직군(`ai-engineer`)을 시범 사례로 먼저 진행 후 나머지 8개 + `prompts/*.md` 6개로 확대.

---

## 5. 그대로 유지할 대상

| 대상 | 이유 |
|---|---|
| `agents/*.md` 9개 파일 자체(경로) | 저장소 내 29개 파일이 `agents/<role>.md` 경로를 각주로 참조(실측: `mcp/*.md` 7개, `memory/*.md` 3개, `prompts/*.md` 5개, `agents/*.md` 상호 참조 9개 등). 파일을 삭제하면 이 링크가 전부 깨짐 — 본문만 요약+링크로 축소하고 파일·경로는 보존. |
| `prompts/*.md` 6개 파일 자체(경로) | 위와 동일한 이유로 경로 보존 필요. |
| `agents/README.md`, `prompts/README.md` | 각 디렉터리의 인덱스 문서. 병합 대상 콘텐츠가 아니라 "상세 정의는 `skills/experts/` 참고"로 안내 문구만 추가(CS-08 6번 절차). |
| `skills/experts/data-engineer/SKILL.md` | `agents/`·`prompts/`에 대응 소스가 없음(직군 자체가 root agents 목록엔 없음) — 병합할 원본이 없어 그대로 유지. |
| `skills/experts/fullstack-engineer/SKILL.md` | 위와 동일. |
| `skills/experts/scrum-master/SKILL.md` | 위와 동일. |
| `skills/experts/security-engineer/SKILL.md` | 위와 동일. |
| `skills/experts/ui-designer/SKILL.md` | 위와 동일. |
| `skills/experts/ux-designer/SKILL.md` | 위와 동일. |
| `memory/*.md`, `orchestration/*.md` | 실제 콘텐츠 존재 확인(dangling 아님). 이번 병합 범위 밖 — `agents/*.md`가 참조하는 대상일 뿐 병합 소스/타겟이 아님. |

---

## 6. 삭제 가능한 대상

**CS-08 계획상 "완전 삭제" 대상은 없다.** `agents/*.md`·`prompts/*.md` 15개 파일 모두 다른 파일이 경로로 참조하고 있어(5번 참고), 병합 후에도 파일 자체는 남기고 본문만 축소하는 것이 CHANGESET의 명시적 방침이다. 아래는 이번 실측 중 발견했으나 CS-08 범위 밖인 별도 항목이다(참고용, 이번 매핑의 실행 대상 아님).

| 항목 | 상태 | 비고 |
|---|---|---|
| `skills/experts/SKILL.md` (최상위) | 0바이트, 저장소 전체에서 참조 0건(실측) | CS-08 범위 밖. `PROJECT_ROADMAP.md`가 언급한 "카테고리 인덱스 stub" 중 하나로 추정되나 별도 확인 필요 — 이번 문서에서 삭제 결정하지 않음. |

---

## 7. 변경 후 최종 디렉터리 구조 (계획, 미실행)

```
agents/
├── README.md                      # 유지 — "직군 상세는 skills/experts/ 참고" 안내 추가
├── ai-engineer.md                  # 축소 — 요약 + Decision Authority/Handoff + 링크
├── backend-engineer.md             # 축소 — 상동
├── business-analyst.md             # 축소 — 상동
├── devops-engineer.md              # 축소 — 상동
├── frontend-engineer.md            # 축소 — 상동
├── product-manager.md              # 축소 — 상동
├── qa-engineer.md                  # 축소 — 상동
├── solution-architect.md           # 축소 — 상동
└── technical-writer.md             # 축소 — 상동

prompts/
├── README.md                       # 유지 — "직군 상세는 skills/experts/ 참고" 안내 추가
├── system.md                       # 유지(전역 규칙, 병합 대상 아님)
├── planner.md                      # 축소 — 요약 + Expected Output Structure + 링크
├── coder.md                        # 축소 — 상동
├── reviewer.md                     # 축소 — 상동
├── tester.md                       # 축소 — 상동
└── documenter.md                   # 축소 — 상동

skills/experts/
├── SKILL.md                        # 변경 없음(0바이트, 별도 항목으로 재분류 대기)
├── ai-engineer/SKILL.md            # 보완 — Decision Authority, Handoff, Output Structure 추가
├── backend-engineer/SKILL.md       # 보완 — 상동
├── business-analyst/SKILL.md       # 보완 — 상동
├── data-engineer/SKILL.md          # 변경 없음(대응 소스 없음)
├── devops-engineer/SKILL.md        # 보완
├── frontend-engineer/SKILL.md      # 보완
├── fullstack-engineer/SKILL.md     # 변경 없음(대응 소스 없음)
├── product-manager/SKILL.md        # 보완
├── qa-engineer/SKILL.md            # 보완
├── scrum-master/SKILL.md           # 변경 없음(대응 소스 없음)
├── security-engineer/SKILL.md      # 변경 없음(대응 소스 없음)
├── solution-architect/SKILL.md     # 보완
├── technical-writer/SKILL.md       # 보완
├── ui-designer/SKILL.md            # 변경 없음(대응 소스 없음)
└── ux-designer/SKILL.md            # 변경 없음(대응 소스 없음)
```

파일 개수는 병합 전후로 변하지 않는다(9 + 6 + 15 = 30개 파일 그대로, 삭제 0건). 변경되는 것은 `agents/*.md`·`prompts/*.md`의 본문 분량뿐이다.

---

## 8. 실행 전 재확인 체크리스트 (CS-08 착수 시)

- [x] 시범 사례(`ai-engineer`) 병합 후 `skills/experts/ai-engineer/SKILL.md`가 여전히 유효한 YAML frontmatter를 유지하는지 확인 — 2026-07-19 완료(`version: 1.1.0`으로 갱신, frontmatter 유효)
- [x] `agents/ai-engineer.md` 축소본이 기존 참조 경로를 깨지 않는지 확인 — 2026-07-19 완료(경로 유지, `memory/coding-memory.md`·`agents/devops-engineer.md`·`prompts/coder.md` 3건 재확인, 전부 파일 경로만 참조하므로 영향 없음)
- [ ] 시범 사례 검토 후 나머지 8개 직군 + `prompts/*.md` 6개로 확대
- [ ] 전체 완료 후 `agents/README.md`·`prompts/README.md`에 안내 문구 추가(`agents/README.md`는 이번 Pilot에서 "Status" 열로 부분 반영 완료, `prompts/README.md`는 아직 미반영)
- [ ] 각 단계 개별 커밋(CS-08 롤백 방침과 동일)

---

## 9. `skills/experts/*/SKILL.md` 공통 운영 표준 (Additive Standard)

> 이 표준은 새 템플릿 파일이 아니다. 15개 `SKILL.md`가 이미 공유하는 기존 구조
> (`When to Use`/`Objectives`/`Model Management` 류 직군별 고유 섹션, `Validation
> Checklist`/`Failure Conditions`/`Rules` 등)를 **대체·단순화하지 않고 그대로 둔 채**,
> 모든 파일이 최소한으로 갖춰야 할 메타데이터·운영 섹션을 확인하는 체크리스트다.
> 실제 개념이 이미 다른 이름의 섹션으로 존재하면 그 섹션을 그대로 인정하고, 개념 자체가
> 없을 때만 새 섹션을 추가한다(제목을 강제로 통일하지 않는다).

### 9.1 Frontmatter (추가형)

15개 파일 전부 현재 `name`/`description`/`version`/`author`/`license`/`category`/`priority` 7개
키로 동일하다(실측 확인, 2026-07-19). 아래 2개 키는 15개 전부에 없음 — 추가 대상.

| 키 | 현재 상태(15개 전부) | 제안 값 규칙 |
|---|---|---|
| `name` | 존재 | 변경 없음 |
| `version` | 존재 | 변경 없음(병합 시 minor 증가 — `ai-engineer` 선례: 1.0.0→1.1.0) |
| `status` | **없음** | `active`(대응하는 `agents/*.md` 없음, 병합 불필요) · `pending-merge`(대응 소스 있으나 미병합) · `merged`(병합 완료) 중 하나 |
| `source` | **없음** | 병합 대상 없으면 `none`, 대기 중이면 대상 경로 명시, 완료되면 `<경로> (merged YYYY-MM-DD)` |

### 9.2 섹션 커버리지 (기존 헤더로 이미 충족되는 개념은 그대로 인정)

15개 파일 전체 헤더를 실측 대조한 결과:

| 표준 개념 | 15개 파일의 실제 헤더 | 충족 여부 |
|---|---|---|
| Purpose | `## Purpose` | ✅ 15/15 이미 충족 |
| Responsibilities | `# Core Responsibilities` | ✅ 15/15 이미 충족(헤더명 유지, 개념 동일) |
| Inputs | `# Inputs` | ✅ 15/15 이미 충족 |
| Outputs | `# Outputs` | ✅ 15/15 이미 충족 |
| References | `# Related Skills` | ✅ 15/15 이미 충족(헤더명 유지, 개념 동일) |
| Change History | `# Version History` | ✅ 15/15 이미 충족(헤더명 유지, 개념 동일) |
| Decision Authority | 없음(`agents/*.md`에만 존재) | ⚠️ `ai-engineer` 1/15만 충족(CS-08 Pilot으로 병합됨), 나머지 14/15는 대응 `agents/*.md`가 있는 8개는 병합 시 자연히 채워짐, 대응 소스가 없는 6개(`data-engineer`·`fullstack-engineer`·`scrum-master`·`security-engineer`·`ui-designer`·`ux-designer`)는 신규 작성 필요 |
| Handoff | 없음(`agents/*.md`에만 존재) | ⚠️ 상동 |

**결론**: `Purpose`/`Responsibilities`/`Inputs`/`Outputs`/`References`/`Change History` 6개는 이름만 다를 뿐 이미 15개 전부 충족 상태라 추가 작업이 필요 없다. 실제로 채워야 할 것은 (1) 15개 전부의 frontmatter에 `status`/`source` 2개 키 추가, (2) 대응 `agents/*.md`가 있는 8개 직군은 CS-08 병합 시 `Decision Authority`/`Handoff` 자동 반영, (3) 대응 소스가 없는 6개 직군은 `Decision Authority`/`Handoff`를 신규 작성해야 한다는 점이다.

### 9.3 준수 현황 (2026-07-19 기준)

| 직군 | status | source | Decision Authority / Handoff |
|---|---|---|---|
| `ai-engineer` | `merged` (반영 완료) | `agents/ai-engineer.md (merged 2026-07-19)` | ✅ 있음 |
| `backend-engineer` 외 7개(`business-analyst`·`devops-engineer`·`frontend-engineer`·`product-manager`·`qa-engineer`·`solution-architect`·`technical-writer`) | 미반영 | 미반영(대상: 각 `agents/<role>.md`) | 없음(대응 소스 있음, CS-08 병합 대기) |
| `data-engineer`·`fullstack-engineer`·`scrum-master`·`security-engineer`·`ui-designer`·`ux-designer` | 미반영 | 미반영(값: `none`) | 없음(대응 소스 없음, 신규 작성 필요) |

**아직 실행하지 않음**: `status`/`source` frontmatter 추가는 이 표준 정의 시점(2026-07-19)에는 `ai-engineer` 1개 파일에만 반영했다(9.4 참고). 나머지 14개는 사용자 확인 후 일괄 반영할지, CS-08 개별 Pilot 진행 시마다 함께 반영할지 결정 필요.

### 9.4 이번에 실행한 것

`skills/experts/ai-engineer/SKILL.md`의 frontmatter에 `status: merged`, `source: agents/ai-engineer.md (merged 2026-07-19)`를 추가해 이 표준의 기준 사례(reference implementation)로 삼았다(아래 diff 참고). 기존 7개 키·본문 섹션은 전혀 건드리지 않았다.

---

*본 문서는 계획서입니다. Pilot 1건(`ai-engineer`, 2026-07-19)만 실행 완료 — 나머지 항목은 사용자 승인 후 별도 세션에서 진행합니다.*
