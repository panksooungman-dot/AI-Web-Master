# P3 Phase 2 계획서 — prompts/*.md → skills/experts/*/SKILL.md Migration (N:M)

> 작성일: 2026-07-19
> 근거: `AI_CONTENT_MAPPING.md` 2번·3번, `CHECKPOINT_REVIEW.md` 6번, `P3_PHASE1_COMPLETION.md`
> **이 문서는 계획서입니다. 어떤 파일도 이번 세션에서 실행(병합·축소)하지 않았습니다.**
> Phase 1(`agents/*.md` 9/9)이 완료된 시점 기준으로 재계산한 계획이며, Phase 1의
> `CHECKPOINT_REVIEW.md`가 제시했던 "대상이 이미 merged 상태인지" 기준은 이제 9개
> 전부 merged이므로 더 이상 우선순위를 가르는 변수가 아니다 — 아래 순서는 fan-out
> (하나의 prompt가 건드리는 대상 파일 수) 기준으로 새로 계산했다.

---

# 목적

`prompts/*.md` 6개(`planner`·`coder`·`reviewer`·`tester`·`documenter`·`system`)를
`skills/experts/*/SKILL.md`로 통합해 Phase 1과 동일한 목표 — 참고문서 중복 제거,
SKILL.md를 유일한 상세 정의처로 확정 — 를 마무리한다.

`agents/*.md`와의 근본적 차이: `agents/*.md`는 직군 1개당 파일 1개(1:1)였지만,
`prompts/*.md`는 워크플로 단계(Planning/Coding/Review/Testing/Documentation) 기준으로
작성되어 **파일 1개가 여러 직군에 매핑되는 N:M 구조**다. 이 차이 때문에 Phase 1의
절차를 그대로 복사할 수 없고 별도 전략이 필요하다.

---

# 현재 상태

- `prompts/*.md` 6개, 전부 미착수(Pending) — 크기: `planner.md` 3,140B·`coder.md`
  3,125B·`reviewer.md` 3,329B·`tester.md` 3,281B·`documenter.md` 3,146B·`system.md`
  2,859B
- `agents/*.md` 9개 — **전부 완료**(Phase 1). 즉 Phase 2가 건드릴 모든 대상
  `skills/experts/*/SKILL.md`는 이미 `status: merged`이며 Decision Authority/Handoff를
  보유한 상태에서 출발한다 — Phase 1 도중에 있었던 "일부는 merged, 일부는 pending"
  혼재 문제가 없다.
- `skills/experts/*/SKILL.md`가 기준 문서(SSOT)라는 원칙은 Phase 1에서 이미 확정됨 —
  Phase 2는 이 원칙을 `prompts/*.md`에도 동일하게 적용하는 연장선이다.
- `prompts/README.md`는 아직 `skills/experts/` 관련 언급이 0건(미반영) — Phase 2
  완료 시 함께 갱신 예정.

---

# 대상 Prompt 목록

| Prompt | 관련 Skill (대상) | 예상 Mapping | 예상 복잡도 |
|---|---|---|---|
| `planner.md` | `business-analyst`, `product-manager` | 1:2 | **낮음** — 대상 2개, 각 대상의 fan-in(다른 prompt로부터 받는 병합 수)도 낮음(`business-analyst` 1건, `product-manager` 2건) |
| `coder.md` | `backend-engineer`, `frontend-engineer`, `ai-engineer` | 1:3 | **낮음~중간** — 대상 3개, 전부 fan-in 2건 이하 |
| `reviewer.md` | `solution-architect`, `devops-engineer`, `qa-engineer` | 1:3 | **중간** — 대상 3개 중 `qa-engineer`가 fan-in 3건(아래 위험 요소 참고)으로 가장 붐비는 대상 |
| `documenter.md` | `technical-writer`, `product-manager`, `qa-engineer` | 1:3 | **중간** — 상동, `qa-engineer`·`product-manager` 둘 다 다중 fan-in 대상 |
| `tester.md` | `qa-engineer`(주 대상) + `backend-engineer`·`frontend-engineer`·`ai-engineer`·`devops-engineer` | 1:5 | **높음** — 대상 5개로 6개 중 최대 fan-out, `qa-engineer`는 fan-in 3건 대상과 겹침 |
| `system.md` | 15개 전체 공통 | 1:전체(각주만) | **낮음(기계적)** — 병합이 아니라 각 SKILL.md 상단에 동일한 한 줄 각주만 추가(`AI_CONTENT_MAPPING.md` 4번에 이미 확정된 방침). 파일 수는 가장 많지만(15) 내용 판단이 필요 없어 위험도는 가장 낮음 |

---

# Migration 전략

## N:M Mapping

`agents/*.md`처럼 "고유 섹션을 골라 이전"하는 것이 아니라, `prompts/*.md` 5개
(`system.md` 제외)는 **고유 콘텐츠가 사실상 하나뿐**이다 — `# Expected Output
Structure`(응답 포맷 템플릿: Objective/Approach/Implementation/Error Handling/
Security Considerations/Performance Considerations/Testing Recommendations/
Documentation Notes 8개 하위 섹션, 5개 파일 전부 동일한 이름의 섹션 보유). 이 섹션을
소스 1개당 대상 N개 SKILL.md 전부에 **동일한 내용으로 복제**한다 — Phase 1에서
Decision Authority/Handoff를 역할별로 다르게(각 `agents/<role>.md`의 고유 내용)
이전한 것과 달리, Phase 2는 "같은 템플릿을 여러 파일에 복제"하는 방식이 된다.

각 대상에 삽입할 때 인용구에 **소스와 형제 대상 목록을 함께** 남긴다. 예:

```
> Merged from `prompts/coder.md` (YYYY-MM-DD). Also applied to: backend-engineer,
> frontend-engineer, ai-engineer.
```

이렇게 하면 한 파일만 열어도 "이 섹션이 어디서 왔고 어느 형제 파일들과 내용이
같은지"를 바로 알 수 있다(Phase 1에는 이 문제가 없었다 — 그때는 항상 1:1이라
"형제 파일"이 없었음).

## Legacy Prompt 유지 여부

**유지한다.** `prompts/*.md`도 `agents/*.md`와 동일한 이유(다른 파일이 경로를
각주로 참조 — 예: `agents/*.md` 9개 전부 자신의 Related Documents에 관련
`prompts/<file>.md`를 이미 참조 중, `mcp/*.md` 등도 참조)로 삭제하지 않고 Legacy
Stub으로 축소한다.

## Deprecated 정책

Phase 1과 동일한 5줄 인용구 패턴을 쓰되, **대상이 여러 개이므로 링크도 여러 개**
명시한다:

```
> **⚠️ DEPRECATED (YYYY-MM-DD):** 이 문서의 상세 정의는 아래 SKILL.md들로
> 통합되었습니다 — skills/experts/<role1>/SKILL.md, skills/experts/<role2>/SKILL.md,
> ... (CS-08 Phase 2). 신규 작업은 해당 SKILL.md들을 기준으로 진행하세요.
```

`system.md`는 예외 — 병합이 아니라 15개 전체에 각주만 추가하는 것이므로,
`system.md` 자신은 축소하지 않고 그대로 유지한다(이미 "모든 Agent·Workflow·Prompt가
상속하는 전역 규칙"이라는 자기 자신의 역할이 축소 없이도 유효함).

## 검증 방법

Phase 1의 5단계 절차를 그대로 적용하되, N:M 특성에 맞게 1개 확장한다:

1. 참조 경로 확인(병합 전) — 동일
2. YAML frontmatter 파싱 — **대상 N개 전부**에 대해 반복(Phase 1은 파일 1개, Phase 2는
   파일 2~5개)
3. Markdown 표 정합성 — 동일
4. 참조 경로 재확인(병합 후) — 동일
5. git status / 코드 변경 여부 — 동일
6. **(신규) 형제 파일 간 내용 일치 확인** — 같은 소스에서 복제된 섹션이 대상 N개
   파일에서 문자 그대로 동일한지 diff로 대조(복사 과정에서 한 곳만 다르게 수정되는
   실수 방지)

---

# 위험 요소

## 여러 Skill 참조

Phase 1은 커밋 1건당 파일 4개(소스 1 + 대상 1 + README + 매핑표) 변경이 고정
패턴이었지만, Phase 2는 대상 수에 따라 커밋 1건당 최대 5(대상) + 1(소스) + 2(README·
매핑표) = 8개 파일까지 늘어난다(`tester.md` 사례). 리뷰·롤백 단위가 커진다.

## 중복 내용

동일한 `# Expected Output Structure` 내용이 최대 5개 파일에 문자 그대로 복제된다.
코드가 이 파일들을 로드하지 않으므로 런타임 리스크는 없지만(Phase 1과 동일한 이유),
**5곳 중 하나만 나중에 갱신되고 나머지가 갱신되지 않는 문서 드리프트** 위험은
Phase 1보다 커진다 — Phase 1은 애초에 형제 파일이 없어 이 위험 자체가 없었다.

## 순환 참조 가능성 — 다중 소스가 겹치는 대상

Phase 2에서 실제로 계산한 결과, 아래 3개 직군은 **2개 이상의 prompts 소스로부터
동시에 병합 대상**이 된다(fan-in):

| 대상 직군 | 병합해 오는 prompts 소스 | fan-in |
|---|---|---|
| `qa-engineer` | `reviewer`·`tester`·`documenter` | **3** |
| `product-manager` | `planner`·`documenter` | 2 |
| `backend-engineer` | `coder`·`tester` | 2 |
| `frontend-engineer` | `coder`·`tester` | 2 |
| `ai-engineer` | `coder`·`tester` | 2 |
| `devops-engineer` | `reviewer`·`tester` | 2 |

**`qa-engineer/SKILL.md`가 가장 위험한 대상이다** — `reviewer.md`·`tester.md`·
`documenter.md` 3개 소스 각각의 `# Expected Output Structure`를 전부 받게 되는데,
셋 다 같은 헤더 이름을 쓴다면 한 파일 안에 `# Expected Output Structure` 섹션이
3번 중복 생성되는 충돌이 발생한다. **이 문제는 Phase 1에 없던 새로운 유형의
충돌이며, 실제 병합 착수 전에 명명 규칙을 정해야 한다**(예: 소스별로
`# Expected Output Structure (Review)`처럼 소스명을 헤더에 포함시키거나, 하나의
`# Expected Output Structure` 섹션 아래 소스별 하위 헤딩으로 통합).

## 순환 참조 가능성 — Deprecated 안내 문구 자체의 상호 참조

`agents/<role>.md`(Phase 1에서 이미 Legacy Stub이 됨)의 Related Documents가
`prompts/<file>.md`를 참조하고, `prompts/<file>.md`(Phase 2에서 Legacy Stub이 될
예정)도 자신의 Related Documents에서 `agents/<role>.md`를 역참조하는 경우가 이미
존재한다(예: `agents/ai-engineer.md` ↔ `prompts/coder.md`가 서로 참조). 두 파일
모두 Deprecated 상태가 되면 "Deprecated가 Deprecated를 가리키는" 안내 루프가
생긴다 — 기능적 문제는 아니지만(경로만 유지되므로 링크 자체는 깨지지 않음),
읽는 사람이 "그래서 진짜 기준 문서가 뭔지" 헷갈릴 수 있다. Phase 2 실행 시 두
Legacy Stub 모두 최종 목적지(`skills/experts/*/SKILL.md`)를 명시적으로 가리키게
해 이 혼동을 줄여야 한다.

---

# 권장 실행 순서

Phase 1 종료 시점(`CHECKPOINT_REVIEW.md` 작성 당시)에는 "대상이 이미 merged인지"가
`coder.md`를 1순위로 미는 근거였다. 이제 9개 전부 merged라 그 근거는 사라졌고,
대신 **fan-out(대상 수)과 fan-in 충돌 위험**을 기준으로 재계산했다.

```
1. planner.md      — 대상 2개(business-analyst·product-manager), 전부 fan-in 낮음
                      (N:M 메커니즘을 검증할 가장 단순한 사례)
2. coder.md        — 대상 3개(backend/frontend/ai-engineer), 전부 fan-in 2 이하
3. reviewer.md     — 대상 3개(solution-architect·devops-engineer·qa-engineer),
                      qa-engineer가 fan-in 3인 첫 접촉 — 명명 규칙을 여기서 확정
4. documenter.md   — 대상 3개(technical-writer·product-manager·qa-engineer),
                      qa-engineer 재접촉 — 3번에서 정한 명명 규칙 재사용 확인
5. tester.md       — 대상 5개(최대 fan-out), qa-engineer 세 번째 접촉 — 가장 복잡하므로
                      명명 규칙·검증 절차가 안정된 뒤 마지막에 진행
6. system.md       — 병합이 아닌 15개 전체 각주 추가(기계적), 순서 제약 없음 —
                      아무 때나 가능하지만 정리 성격이라 마지막에 배치
```

**1번(`planner.md`)을 새 Phase 2 Pilot으로 제안한다** — 사용자의 예시(`coder.md`
1순위)와 다른 점은, `coder.md`의 이전 우선순위 근거(대상이 이미 merged)가 Phase 1
완료로 무효화되었고 남은 유일한 차별 요인은 fan-out 크기이기 때문이다. `planner.md`가
`coder.md`보다 대상이 1개 적어(2 vs 3) 더 단순하다. 다만 이 판단은 근소한 차이이므로,
`coder.md`를 먼저 진행해도 실질적 위험 차이는 크지 않다 — 확정은 사용자 결정에 맡긴다.

`qa-engineer/SKILL.md`의 명명 충돌 규칙은 **3번(`reviewer.md`) 착수 전에 반드시
확정**해야 한다(3번이 fan-in 3인 qa-engineer를 처음 건드리는 지점이므로).
