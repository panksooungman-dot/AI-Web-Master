# P3 Phase 1 완료 보고 — agents/*.md → skills/experts/*/SKILL.md Migration

> 작성일: 2026-07-19
> 근거: `CHANGESET.md` CS-08, `docs/architecture/AI_CONTENT_MAPPING.md`, `CHECKPOINT_REVIEW.md`,
> 커밋 `87e9706`·`dfe4b11`·`062dddc`·`78aa65d`·`f35c2d9`·`bed7f19`·`8094007`·`98a454a`
> **Phase 1은 `agents/*.md` 9개만 다룬다. `prompts/*.md` 6개는 Phase 2(별도 계획서
> `P3_PHASE2_PLAN.md`)로 분리되어 이번 완료 범위에 포함되지 않는다.**

---

# 개요

## Phase 1 목적

`REPORT.md`가 지적한 구조적 중복 — `agents/*.md`(9개 직군)와 `skills/experts/*/SKILL.md`
(15개 직군)가 같은 역할 정의를 서로 다른 형식으로 반복 서술하고 있으며, `agents/*.md`는
Claude Code Skill 로더가 인식하는 디렉터리 구조(`<name>/SKILL.md`)가 아닌 flat `.md`라
실행 도구에 전혀 로드되지 않는 순수 참고문서라는 문제 — 를 해소하는 것이 목적이다.

`skills/experts/*/SKILL.md`를 **단일 진실 공급원(Single Source of Truth)**으로 확정하고,
`agents/*.md`가 가진 고유 정보(Decision Authority, Handoff)만 SKILL.md로 이전한 뒤
`agents/*.md`는 삭제하지 않고 요약 + 링크로 축소한다 — 이 저장소 내 다른 파일들이
`agents/<role>.md` 경로를 각주로 참조하고 있어 파일 자체를 지우면 그 링크들이 깨지기
때문이다.

## 수행 범위

- 대상: `agents/*.md` 9개 직군 문서(`ai-engineer`·`backend-engineer`·`frontend-engineer`·
  `devops-engineer`·`qa-engineer`·`technical-writer`·`business-analyst`·`solution-architect`·
  `product-manager`) + 그 대응 `skills/experts/*/SKILL.md` 9개
- 범위 밖(Phase 2로 이연): `prompts/*.md` 6개(`planner`·`coder`·`reviewer`·`tester`·
  `documenter`·`system`) — 직군이 아닌 워크플로 단계 기준이라 여러 직군에 N:M으로
  매핑되는 별개 유형(`AI_CONTENT_MAPPING.md` 2번 참고)
- 방식: 실제 파일 삭제 없이 CS-08 순서(계획서 → 매핑표 → 시범 사례 → 단계적 확대 →
  체크포인트 → 배치 실행)를 그대로 따름

---

# 완료 결과

- **Agent 9개 Migration 완료** — `agents/*.md` 9개 전부 `skills/experts/*/SKILL.md`로
  고유 콘텐츠(Decision Authority·Handoff)를 이전하고, `status`/`source` frontmatter로
  이전 이력을 기록했다.
- **Legacy Stub 유지** — 9개 `agents/*.md` 전부 파일을 삭제하지 않고 요약 + Deprecated
  안내 + 링크로만 축소했다(경로 100% 보존).
- **Skill이 Single Source of Truth가 됨** — 9개 직군 전부 `status: merged`로
  표시되어 있으며, 상세 정의는 이제 `agents/*.md`가 아니라 `skills/experts/*/SKILL.md`
  하나만 보면 된다. `agents/README.md`의 "Available Agents" 표도 9/9 `Merged`로
  갱신되어 이 사실을 반영한다.

## 완료된 9개 직군 최종 크기

| 직군 | `agents/<role>.md` (Legacy Stub) | `skills/experts/<role>/SKILL.md` (SSOT) |
|---|---:|---:|
| `ai-engineer` | 1,551B | 5,062B |
| `backend-engineer` | 1,454B | 4,830B |
| `frontend-engineer` | 1,503B | 4,658B |
| `devops-engineer` | 1,554B | 4,951B |
| `qa-engineer` | 1,423B | 4,725B |
| `technical-writer` | 1,487B | 4,682B |
| `business-analyst` | 1,486B | 5,110B |
| `solution-architect` | 1,492B | 5,025B |
| `product-manager` | 1,506B | 5,528B |

---

# 확정된 Migration 표준

9개 사례(Pilot 3건 + Batch 1 3건 + Batch 2 3건)를 거치며 아래 규칙이 실측을 통해
검증되고 확정되었다.

## Legacy Stub 정책

`agents/<role>.md`는 삭제하지 않고 아래 고정 구조로 축소한다:

1. `# <역할명>` 제목(원본 그대로 유지)
2. `> **⚠️ DEPRECATED (YYYY-MM-DD):**` 인용구 — 통합 대상 SKILL.md 경로, 관련 CHANGESET
   항목, "이 파일은 각주 링크 호환을 위해 경로만 유지" 안내를 5줄 내외로 명시
3. `## Overview` — 원본의 2문단 개요는 그대로 보존(이 파일만 단독으로 읽어도 역할을
   파악할 수 있도록)
4. "상세 정의는 `skills/experts/<role>/SKILL.md`를 참고하세요" 안내 문장
5. `# Related Documents` — 기존 각주 목록을 그대로 유지하되 `skills/experts/<role>/SKILL.md`
   (기준 문서)를 최상단에 추가, `docs/architecture/AI_CONTENT_MAPPING.md`도 각주에 추가
6. `# Version` — "AI Business OS v1.1 (content merged into skills/experts/<role>/SKILL.md
   vX.X.X, YYYY-MM-DD)" 형식으로 갱신

## `status`/`source` frontmatter

`skills/experts/*/SKILL.md`의 기존 7개 frontmatter 키(`name`/`description`/`version`/
`author`/`license`/`category`/`priority`)는 그대로 두고 2개 키를 **추가**한다(대체 아님):

```yaml
status: merged
source: agents/<role>.md (merged YYYY-MM-DD)
```

값 규칙(`docs/architecture/AI_CONTENT_MAPPING.md` 9.1 참고): `merged`(병합 완료) ·
`pending-merge`(대응 소스 있으나 미병합) · `active`(대응 소스 없음, 병합 불필요) 중 하나.
Phase 1 완료 시점 기준 9개 전부 `merged`.

> **추록(2026-07-19, Phase 2 Pilot 이후)**: 위 단일 `source:` 문자열 설계는 SKILL.md
> 하나가 출처 하나(`agents/*.md`)만 가진다는 Phase 1 시점의 전제 위에 서 있었다.
> Phase 2 Pilot(`prompts/coder.md` → `backend-engineer`/`frontend-engineer`/
> `ai-engineer`)을 실행하며 이 전제가 깨졌다 — 같은 SKILL.md가 `agents/*`와
> `prompts/*` 양쪽에서 병합받는 사례가 실제로 발생했다. 이에 따라 **두 번째 이상의
> 출처를 갖게 된 파일에 한해** 단일 `source:`를 `sources:` 배열(`type`/`path`/
> `merged` 3개 필드)로 교체했다 — 나머지 6개(아직 출처가 하나뿐인 파일)는 기존
> `source:` 문자열 그대로 유지한다. 상세 스펙과 값 규칙은
> `docs/architecture/AI_CONTENT_MAPPING.md` 9.1.1을 기준 문서로 삼는다. 이 문서의
> 나머지 서술(Decision Authority/Handoff/버전 증가/YAML 규칙/검증 절차)은 Phase 1
> 완료 시점 기록이므로 수정하지 않았다.

## Decision Authority

`agents/<role>.md`의 `# Decision Authority`(Can decide / Cannot decide 목록)를
**원문 그대로** SKILL.md에 이전한다. 삽입 위치는 두 갈래로 갈린다(아래 "예외" 참고):

- `# Collaboration` 헤더가 있는 파일(6개): 그 섹션 직후에 삽입
- `# Collaboration` 헤더가 없는 파일(3개): `# Workflow` 직전에 삽입

삽입한 섹션 맨 위에 `> Merged from \`agents/<role>.md\` (YYYY-MM-DD).` 각주를 반드시 남겨
출처를 추적 가능하게 한다.

## Handoff

`agents/<role>.md`의 `# Handoff` 섹션을 **원문 그대로**(문체·서식 포함 — 예: 일부는
불릿 목록, 일부는 `**볼드**` 강조 문구를 그대로 보존) `# Success Criteria` 직후,
`# Related Skills` 직전에 삽입한다. 이 위치는 `# Collaboration` 유무와 무관하게
9개 전부 동일하다 — Success Criteria → Related Skills 인접 구조는 15개 SKILL.md 전체가
공유하는 유일하게 예외 없는 앵커였다.

## 버전 증가 규칙

`version`을 frontmatter와 `# Version History` 표 양쪽에서 `1.0.0` → `1.1.0`으로
갱신한다(minor 증가). Version History 표에는 새 행을 추가한다:

```
| 1.1.0 | YYYY-MM-DD | Merged Decision Authority + Handoff from `agents/<role>.md` (CS-08 ...) |
```

기존 `1.0.0` 행은 삭제하지 않는다(append-only).

## YAML 규칙

frontmatter는 순수 key: value 평문(quoted string 불필요)으로 작성한다. `source` 값에
괄호와 공백이 포함되어도(`agents/ai-engineer.md (merged 2026-07-19)`) YAML 콜론(`:`)이
값 안에 없는 한 파싱에 문제가 없음을 9건 전부 Node.js 스크립트로 직접 파싱해 검증했다.

> **추록(2026-07-19)**: `sources:` 배열 도입 후 실제 `js-yaml` 파서로 재검증하는 과정에서,
> 따옴표 없는 `merged: 2026-07-19`가 YAML 1.1 스펙상 날짜 스칼라로 자동 해석되어
> 문자열이 아닌 `Date` 객체(타임존 포함 ISO 문자열)로 파싱됨을 실측으로 발견했다.
> Phase 1의 `source:` 문자열 안에 있던 날짜는 괄호 안 텍스트 일부라 이 문제가
> 없었지만, `merged:` 필드처럼 날짜가 **단독 YAML 값**이 되는 경우에는 반드시
> `merged: "YYYY-MM-DD"`처럼 따옴표로 감싸 문자열 타입을 강제해야 한다.

## 검증 절차

각 병합마다 다음 5단계를 빠짐없이 수행했다(9건 전부 동일 절차 반복):

1. **참조 경로 확인**: 병합 전, 저장소 전체에서 `agents/<role>.md` 문자열을 grep해
   어떤 파일이 이 경로를 각주로 참조하는지 재확인
2. **YAML frontmatter 파싱**: Node.js로 frontmatter 블록을 직접 파싱해 키-값이
   깨지지 않았는지 확인
3. **Markdown 표 정합성**: 변경된 문서의 모든 표 블록에서 `|` 개수(컬럼 수)가
   행마다 일치하는지 awk 스크립트로 전수 검사
4. **참조 경로 재확인**: 병합 후 동일한 grep을 재실행해 경로가 여전히 유효한지 확인
   (파일을 삭제하지 않으므로 항상 통과하지만, 절차로 고정해 실수를 방지)
5. **git status / 코드 변경 여부**: 의도한 파일만 변경되었는지, `.md`가 아닌 코드
   파일이 실수로 건드려지지 않았는지 확인

---

# Checkpoint에서 발견된 예외

`CHECKPOINT_REVIEW.md`(Pilot 3건 완료 시점 작성)가 예측하고, Batch 2 실행에서 실측으로
확인된 예외 3가지.

## `# Collaboration` 없는 문서 처리 규칙

15개 `skills/experts/*/SKILL.md` 중 **`business-analyst`·`solution-architect`·
`product-manager` 3개는 `# Collaboration` 헤더 자체가 없다**(나머지 12개는 전부 있음).
`CHECKPOINT_REVIEW.md` 5번에서 이 사실을 먼저 실측으로 발견했고, Batch 2 실행 시
아래 대체 규칙을 그대로 적용해 검증했다:

> `# Collaboration`이 없는 파일은 Decision Authority/Handoff를 `# Workflow` 직전에
> 삽입한다.

## `# Workflow` 직전 삽입 규칙

위 3개 파일은 공통적으로 `# Workflow` 바로 앞에 직군별 고유 섹션이 위치하는 동일한
패턴을 가지고 있었다 — `business-analyst`의 `# Validation`, `solution-architect`의
`# Architecture Governance`, `product-manager`의 `# Decision Framework`. 이 패턴
덕분에 "Workflow 직전"이라는 단일 규칙만으로 3개 파일 모두 예외 없이 처리할 수 있었다.

## `product-manager` — `# Decision Framework` 예외

`product-manager/SKILL.md`에는 이미 `# Decision Framework`(의사결정 시 고려할 평가
기준 — Customer Value/Business Impact/Feasibility/Strategic Alignment/Risk/Cost)라는
섹션이 있었다. 새로 삽입하는 `# Decision Authority`(무엇을 결정할 권한이 있는지/없는지의
범위)와 이름이 비슷해 혼동 우려가 있었으나, 실제 내용을 대조한 결과 **중복이 아니라
상호 보완 관계**임을 확인했다 — Decision Framework는 "어떻게 평가할지", Decision
Authority는 "무엇을 결정할 수 있는지"를 다룬다. 두 섹션을 모두 보존하고, `# Decision
Authority` 섹션 도입부에 다음 각주를 추가해 관계를 명시했다:

> **`# Decision Framework` vs `# Decision Authority`**: these are complementary, not
> duplicates. ... Apply the Framework's criteria only within the scope this section
> grants.

---

# Lessons Learned

- **표는 갱신했지만 서술은 놓치는 드리프트가 실제로 3회 반복됐다.** Pilot 이후
  `AI_CONTENT_MAPPING.md`의 진행률 표(섹션 4·9.3)는 매번 정확히 갱신했지만, 서술형
  요약 문장(실행 순서 원칙, 9.2 결론, 9.4, 최하단 요약)은 후속 Batch 작업 때마다
  최신화가 누락되어 `CHECKPOINT_REVIEW.md`에서 5곳을 한 번에 발견·정정해야 했다.
  → 표 갱신과 서술 갱신을 같은 커밋의 같은 체크리스트 항목으로 강제하는 편이
  드리프트를 줄인다.
- **예외를 사전에 예측하면 실제 처리 시간이 거의 들지 않는다.** `CHECKPOINT_REVIEW.md`가
  Pilot 3건만으로 "남은 6개 중 3개는 Collaboration이 없다"는 예외를 미리 찾아냈고,
  Batch 2에서는 정확히 그 예측대로 처리해 추가 조사 없이 곧바로 반영할 수 있었다.
  실측 기반 체크포인트가 다음 배치의 리스크를 실질적으로 줄였다.
- **이름이 비슷한 기존 섹션(Decision Framework)을 만났을 때, 삭제·통합하지 않고
  "관계를 명시하는 각주"로 해결하는 편이 안전하다.** 두 섹션을 억지로 합치면 원본
  정보가 유실될 위험이 있었지만, 각주 하나로 관계만 밝혀도 혼동은 충분히 해소됐다.
- **파일 경로를 보존하는 전략이 실제로 효과가 있었다.** 9개 파일 전체에서 총 29건
  이상의 각주 참조를 확인했고, 매 병합 후 재확인에서 단 한 건도 깨지지 않았다 —
  "삭제 대신 축소" 원칙이 문서화된 계획을 실행 단계에서도 그대로 지켰다는 뜻이다.

---

# 최종 결과

## 완료된 Agent 목록 (9/9)

| # | 직군 | 방식 | 예외 처리 |
|---|---|---|---|
| 1 | `ai-engineer` | Pilot | 없음 |
| 2 | `backend-engineer` | Pilot #2 | 없음 |
| 3 | `frontend-engineer` | Pilot #3 | 없음 |
| 4 | `devops-engineer` | Batch 1 | 없음 |
| 5 | `qa-engineer` | Batch 1 | 없음 |
| 6 | `technical-writer` | Batch 1 | 없음 |
| 7 | `business-analyst` | Batch 2 | `# Workflow` 직전 삽입 |
| 8 | `solution-architect` | Batch 2 | `# Workflow` 직전 삽입 |
| 9 | `product-manager` | Batch 2 | `# Workflow` 직전 삽입 + Decision Framework 각주 |

## 남은 작업

- `prompts/*.md` 6개(`planner`·`coder`·`reviewer`·`tester`·`documenter`·`system`) →
  `skills/experts/*/SKILL.md` N:M 병합 — **Phase 2, 미착수**(`P3_PHASE2_PLAN.md` 참고)
- `prompts/README.md`에 "상세는 `skills/experts/` 기준" 안내 문구 추가 — Phase 2와
  함께 진행 예정
- `agents/*.md` 대응 소스가 없는 6개 직군(`data-engineer`·`fullstack-engineer`·
  `scrum-master`·`security-engineer`·`ui-designer`·`ux-designer`)의 Decision
  Authority/Handoff 신규 작성 — CS-08 범위 밖(대응 소스가 없어 "병합"이 아닌 "신규
  작성"이 필요한 별개 작업, 이번 Phase 1/2 계획에 포함되지 않음)

---

# 다음 단계

**P3 Phase 2 — Prompt → Skill Migration (N:M)**

상세 계획은 `docs/architecture/P3_PHASE2_PLAN.md`를 참고. `agents/*.md`(1:1 매핑)와
달리 `prompts/*.md`는 하나의 소스가 여러 직군 SKILL.md에 매핑되는 N:M 구조라 별도
전략이 필요하다.
