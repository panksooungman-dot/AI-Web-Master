# P3 Phase 2 설계 검토 — Prompt → Skill(N:M) Migration 실행 전략 확정

> 작성일: 2026-07-19
> 근거: 이번 세션 재실측(`prompts/*.md` 6개 전체 재독, `skills/experts/*/SKILL.md` 헤더
> 재확인, 저장소 전체 참조 경로 재검색) + `P3_PHASE2_PLAN.md`·`P3_PHASE1_COMPLETION.md`·
> `AI_CONTENT_MAPPING.md`·`CHANGESET.md` 대조
> **이 문서는 설계 검토서입니다. `prompts/*.md`·`skills/*.md`·`agents/*.md`·
> `AI_CONTENT_MAPPING.md` 중 어느 것도 이번 세션에서 수정하지 않았습니다.**

---

## 핵심 발견 (요약)

`P3_PHASE2_PLAN.md`를 재검증하는 과정에서 **그 계획의 핵심 전제 하나가 실제와 다름을
발견했다**: 5개 prompt(`planner`·`coder`·`reviewer`·`tester`·`documenter`)의
`# Expected Output Structure`가 "이름은 같지만 내용은 동일한 제네릭 템플릿"이라고
가정했으나, 실제로 재독한 결과 **5개 전부 서로 다른 실제 내용**(하위 섹션 구성·표
포함 여부·분량)을 가지고 있다. 이 발견이 아래 전체 분석·난이도·위험 요소·권장
순서·Pilot 추천에 직접 영향을 준다.

---

## 1. Prompt 6개 재계산 — 참조 Skill / fan-out / fan-in

`prompts/*.md` 각 파일의 `# Related Agents` 각주를 다시 읽어 재계산했다(기존
`AI_CONTENT_MAPPING.md`의 수치와 대조 결과 fan-out 자체는 일치, 내용 복잡도만 새로
추가 측정).

| Prompt | 참조 Skill (fan-out 대상) | fan-out | 실측 콘텐츠 복잡도 |
|---|---|---:|---|
| `planner.md` | `business-analyst`, `product-manager` | 2 | 11개 하위 섹션, **표 2개**(Stakeholders·Risks), 108줄 — **5개 중 최대 분량** |
| `coder.md` | `backend-engineer`, `frontend-engineer`, `ai-engineer` | 3 | 8개 하위 섹션, **표 0개**, 59줄 — **5개 중 유일하게 표 없음** |
| `reviewer.md` | `solution-architect`, `devops-engineer`, `qa-engineer` | 3 | 7개 하위 섹션, 표 1개(Issues Found), 56줄 |
| `tester.md` | `qa-engineer`, `backend-engineer`, `frontend-engineer`, `ai-engineer`, `devops-engineer` | **5**(최대) | 6개 하위 섹션, **표 2개**(Test Coverage·Defects), 57줄 |
| `documenter.md` | `technical-writer`, `product-manager`, `qa-engineer` | 3 | 8개 하위 섹션, 표 1개(Common Issues), 56줄 |
| `system.md` | (전역, `# Related Agents` 없음) | 15(각주만) | 병합 아님 — 각 SKILL.md에 1줄 각주만 추가 |

대상 직군별 fan-in(몇 개 prompt로부터 동시에 병합받는지) — `AI_CONTENT_MAPPING.md`
수치와 일치 재확인:

| 대상 직군 | 병합해 오는 prompt | fan-in |
|---|---|---:|
| `qa-engineer` | `reviewer`·`tester`·`documenter` | **3**(최대) |
| `product-manager` | `planner`·`documenter` | 2 |
| `backend-engineer` | `coder`·`tester` | 2 |
| `frontend-engineer` | `coder`·`tester` | 2 |
| `ai-engineer` | `coder`·`tester` | 2 |
| `devops-engineer` | `reviewer`·`tester` | 2 |
| `business-analyst` | `planner` | 1 |
| `solution-architect` | `reviewer` | 1 |
| `technical-writer` | `documenter` | 1 |

**참조(Legacy 유지 근거) 재확인**: 저장소 전체에서 `prompts/<file>.md` 경로를 참조하는
파일을 다시 grep한 결과, 6개 전부 `agents/*.md`(Phase 1 Legacy Stub 포함)·`mcp/*.md`·
`memory/*.md`·`tests/*.md`·서로(`prompts/*.md` 상호 참조)에서 최소 2건 이상 참조되고
있음을 확인했다 — 6개 전부 삭제 불가, Legacy Stub 유지가 유일한 선택지.

---

## 2. 실제 병합 순서 평가 — `planner → coder → documenter → reviewer → tester → system`가 맞는가

**결론: 이 순서의 "틀"(단순한 것부터, tester를 후반에, system을 마지막에)은 타당하지만,
정확히는 잘못된 전제 위에 서 있다.** `P3_PHASE2_PLAN.md`가 `coder.md`를 원래
1순위로 뒀다가 "Phase 1이 끝나 대상이 이미 merged인지가 더 이상 변수가 아니다"라는
이유로 fan-out만 남은 기준이라 판단해 `planner.md`(fan-out 2, 최소)를 1순위로
바꿨다. **그런데 위 1번 표에서 보듯 `planner.md`는 fan-out이 가장 작을 뿐 콘텐츠는
5개 중 가장 복잡하다**(표 2개, 11개 하위 섹션). 이 계획은 "fan-out만" 보고
"콘텐츠 복잡도"를 보지 않은 채 세워졌다.

반대로 **`coder.md`는 5개 중 유일하게 표가 0개**인, 순수 텍스트 콘텐츠라 병합
메커니즘(원문 그대로 복사 + 형제 대상 각주) 자체를 검증하기에 가장 안전하다.

### 재평가 결론

| 항목 | 원래 계획 순서상 위치 | 재평가 결과 |
|---|---|---|
| `planner.md` 1순위 배치 | 1번(최우선) | **재고 필요** — fan-out은 작지만 콘텐츠(표 2개)가 가장 복잡해 "가장 단순한 첫 시도"로 부적합 |
| `coder.md` 2순위 배치 | 2번 | **1순위로 승격 권장** — 표 0개, N:M 메커니즘 자체를 검증하기 가장 안전한 콘텐츠 |
| `tester.md`를 후반 배치 | 5번(마지막 병합) | **타당함, 유지** — fan-out 최대(5) + qa-engineer 세 번째 접촉이라 가장 늦게 배치하는 것이 맞음 |
| `system.md`를 최종 배치 | 6번(최종) | **타당함, 유지** — 병합이 아닌 각주 추가라 순서 제약이 없고, 정리 성격상 마지막이 자연스러움 |
| `documenter → reviewer` 순서 | 3→4번 | **경미하게 재고 권장** — 아래 3번 위험 요소 참고, qa-engineer 최초 접촉을 어느 쪽으로 할지는 근소한 차이 |

### 더 안전한 순서 제안

```
1. coder.md       (기존 2번 → 1번) — 표 0개, fan-out 3, qa-engineer 미접촉.
                   N:M 복사 메커니즘 + 형제 각주 방식을 가장 안전한 콘텐츠로 검증
2. planner.md     (기존 1번 → 2번) — fan-out 최소(2)라 블라스트 반경이 가장 작음.
                   메커니즘이 1번에서 이미 검증된 상태이므로, 표 2개 삽입이라는
                   콘텐츠 리스크를 가장 작은 반경(대상 2개)에서 시험
3. reviewer.md    (기존 4번 → 3번) — qa-engineer 최초 접촉. 표 1개로 documenter와
                   거의 동급이지만 근소하게 더 단순(7 섹션 vs 8, 56줄)해 먼저 배치.
                   여기서 qa-engineer의 다중 소스 표제 충돌 규칙(3번 위험 요소 참고)을
                   확정
4. documenter.md  (기존 3번 → 4번) — qa-engineer 두 번째 접촉(3번에서 정한 규칙 재사용
                   검증) + product-manager 두 번째 접촉(2번에서 이미 병합된 파일을
                   다시 여는 첫 사례)
5. tester.md      (동일, 5번) — fan-out 최대(5) + qa-engineer 세 번째 접촉 + 표 2개.
                   메커니즘·표 처리·다중소스 규칙이 전부 검증된 뒤 가장 마지막에 진행
6. system.md      (동일, 6번) — 병합이 아닌 각주 추가, 순서 제약 없음, 마지막 정리
```

**변경 요지**: `coder`↔`planner` 순서를 바꾸고, `reviewer`↔`documenter` 순서를
바꾼다. `tester`·`system`의 위치는 원안 그대로 유지한다.

---

## 3. 난이도 분류 (Low / Medium / High)

| Prompt | 난이도 | 근거 |
|---|---|---|
| `coder.md` | **Low** | fan-out 3(중간)이지만 표 0개로 콘텐츠가 가장 단순, qa-engineer 미접촉(다중소스 충돌 위험 없음) |
| `system.md` | **Low** | fan-out은 15로 최대지만 병합이 아닌 동일한 한 줄 각주 추가뿐이라 파일당 작업이 기계적 |
| `planner.md` | **Medium** | fan-out은 최소(2)지만 표 2개·11개 하위 섹션으로 콘텐츠가 5개 중 최대 — 작은 반경이 복잡한 콘텐츠를 상쇄 |
| `reviewer.md` | **Medium** | fan-out 3, 표 1개, **qa-engineer 최초 접촉**(다중소스 표제 규칙을 여기서 처음 확정해야 함) |
| `documenter.md` | **Medium** | fan-out 3, 표 1개, qa-engineer 두 번째 접촉 + product-manager 재접촉(반복 대상 검증 필요) |
| `tester.md` | **High** | fan-out **5로 최대**, 표 2개, qa-engineer **세 번째** 접촉(다중소스 충돌이 가장 붐비는 지점), backend/frontend/ai-engineer·devops-engineer도 전부 재접촉(2번째) — fan-out·콘텐츠·반복접촉 위험이 동시에 최고치로 겹치는 유일한 사례 |

---

## 4. Prompt별 매핑 표

| Prompt | 대상 Skill | Legacy Prompt 유지 여부 | Stub 가능 여부 | 병합 방식 |
|---|---|---|---|---|
| `planner.md` | `business-analyst`, `product-manager` | 유지(참조 5건 확인 — `agents/business-analyst.md`·`agents/product-manager.md`·`agents/solution-architect.md`·`mcp/browser.md`·`mcp/sequential-thinking.md`) | 가능(요약+DEPRECATED+대상 2개 링크) | 1:N (N=2) |
| `coder.md` | `backend-engineer`, `frontend-engineer`, `ai-engineer` | 유지(참조 8건 — `agents/*.md` 2건·`CHANGESET.md`·`mcp/*.md` 4건·`memory/coding-memory.md`) | 가능(대상 3개 링크) | 1:N (N=3) |
| `reviewer.md` | `solution-architect`, `devops-engineer`, `qa-engineer` | 유지(참조 3건 — `agents/devops-engineer.md`·`mcp/github.md`·`prompts/tester.md`) | 가능(대상 3개 링크) | 1:N (N=3) |
| `tester.md` | `qa-engineer`(주 대상), `backend-engineer`, `frontend-engineer`, `ai-engineer`, `devops-engineer` | 유지(참조 5건 — `agents/qa-engineer.md`·`mcp/playwright.md`·`prompts/documenter.md`·`tests/README.md`·`tests/unit/README.md`) | 가능(대상 5개 링크) | 1:N (N=5) |
| `documenter.md` | `technical-writer`, `product-manager`, `qa-engineer` | 유지(참조 2건 — `agents/technical-writer.md`·`mcp/filesystem.md`) | 가능(대상 3개 링크) | 1:N (N=3) |
| `system.md` | 15개 전체(각주만, 병합 아님) | 유지(참조 8건 — `agents/ai-engineer.md`·`memory/*.md` 2건·`prompts/*.md` 5건) | **불필요** — system.md 자신은 축소하지 않음(전역 규칙 문서 역할이 그대로 유효). 대신 15개 SKILL.md 쪽에 1줄 각주만 추가 | 1:N (N=15, 비병합) |

**표기 정정**: 문제에서 예시로 든 "1:1 / 1:N / N:1 / N:M" 중, `prompts/*.md` 개별
파일 기준으로는 전부 **1:N**이다(파일 1개 → 대상 N개). "N:M"은 개별 prompt가 아니라
**prompts 6개 전체와 skills 9개 전체 사이의 집계 관계**를 가리키는 표현이다 — 예를
들어 `qa-engineer` 하나가 3개 prompt로부터 동시에 병합받는 것처럼, 여러 소스가
여러 대상에 걸쳐 교차하는 전체 그림이 N:M이다. 개별 파일 단위 병합 방식을 N:M으로
표기하면 부정확하다.

**Expected Output Structure 삽입 지점(신규 확정)**: `# Outputs` 섹션 직후,
`# Validation Checklist` 직전. 이 인접 관계는 Phase 1이 다룬 9개 + 나머지 6개
포함 15개 `SKILL.md` 전체에서 예외 없이 확인된 유일한 앵커다(Decision Authority가
`# Collaboration` 유무로 갈렸던 것과 달리, `# Outputs → # Validation Checklist`는
전부 동일).

---

## 5. 위험 요소 — 다중 참조 Skill(특히 `qa-engineer`)의 병합 순서 오류 시나리오

### 발견된 문제의 실제 성격

`P3_PHASE2_PLAN.md`는 이 위험을 "같은 내용이 중복 삽입될 수 있다"는 관점으로만
서술했으나, 재검토 결과 **실제로는 더 심각하다** — `qa-engineer`에 병합될 3개 소스
(`reviewer`·`tester`·`documenter`)의 `# Expected Output Structure`는 **내용이
전혀 다르다**:

- `reviewer.md` 소스: Summary / Strengths / Issues Found(표) / Security Findings /
  Performance Findings / Maintainability Assessment
- `tester.md` 소스: Test Summary / Test Coverage(표) / Defects(표) / Risks /
  Release Assessment / Recommended Actions
- `documenter.md` 소스: Overview / Purpose / Prerequisites / Instructions /
  Examples / Best Practices / Common Issues(표) / Related Resources

세 소스를 원칙대로 "원문 그대로" 복사하면 `qa-engineer/SKILL.md` 한 파일 안에
`# Expected Output Structure`라는 **동일한 이름의 H1 헤딩이 세 번** 생긴다 —
"중복 콘텐츠"가 아니라 "이름은 같은데 내용이 다른 섹션이 충돌"하는 문제다.

### 순서를 잘못 고르면 생기는 구체적 문제

1. **먼저 병합한 소스가 이름을 선점** — 예를 들어 `documenter.md`를 가장 먼저
   병합하면서 표제 구분 없이 `# Expected Output Structure`로 삽입하면, 나중에
   `reviewer.md`·`tester.md`를 병합할 때 똑같은 표제를 또 쓸 수 없어 그제서야
   구분 규칙(예: `# Expected Output Structure (Review)`)을 급하게 정하게 된다 —
   **첫 병합 시점에 이미 표제 구분 없이 커밋이 확정되어 있으면, 그 커밋을 되돌리고
   재작업해야 하는 상황**이 생긴다.
2. **검증 스크립트가 특정 헤딩을 grep으로 찾을 때 여러 개가 잡혀 혼동** — Phase 1의
   검증 절차(예: `grep -n "^# "`로 헤딩 목록 확인)를 그대로 쓰면, 서로 다른 소스의
   섹션이 전부 같은 텍스트로 나와 "어느 소스에서 온 것인지" 구분이 안 된다.
3. **`product-manager`도 유사하지만 낮은 강도로 동일 문제를 겪는다** — `planner`·
   `documenter` 2개 소스로부터 병합받으므로, 두 소스의 `# Expected Output Structure`
   순서를 잘못 고르면 같은 문제가 fan-in 2 규모로 재현된다.

### 대응 방안(이번 검토에서 확정하는 실행 전략)

- `# Collaboration` vs `# Workflow` 삽입 지점 예외를 Phase 1에서 사전에 정했던 것과
  같은 원칙으로, Phase 2는 **"fan-in ≥ 2인 대상에는 소스명을 헤딩에 포함시킨다"**는
  규칙을 **첫 병합(권장 순서 3번, `reviewer.md`) 이전에 확정**한다:
  `# Expected Output Structure (Review)` / `# Expected Output Structure (Testing)` /
  `# Expected Output Structure (Documentation)` 형식.
- fan-in 1인 대상(`business-analyst`·`solution-architect`·`technical-writer`)은
  헤딩에 소스명을 붙이지 않고 원래 이름 그대로(`# Expected Output Structure`)
  사용해도 충돌이 없다 — 규칙은 fan-in ≥ 2인 대상에만 적용한다.
- 각 삽입 섹션 상단 인용구에 "Also applied to: ..." 형제 목록을 반드시 남긴다
  (`P3_PHASE2_PLAN.md`가 이미 제안한 방식, 이번 검토로 유지 확정).

---

## 6. Phase 2 Pilot 추천

**추천: `prompts/coder.md`**

선정 이유:

1. **콘텐츠 복잡도가 5개 중 최소** — 표 0개, 순수 프로즈 8개 하위 섹션. Phase 1의
   Pilot 선정 원칙("가장 단순한 1개 항목만 선택")과 동일한 기준을 Phase 2에도
   일관되게 적용한 것이다.
2. **qa-engineer를 건드리지 않는다** — 5번에서 분석한 다중소스 표제 충돌 문제를
   Pilot 단계에서 마주치지 않아, "N:M 복사 메커니즘 자체가 동작하는지"라는 단일
   질문에 집중할 수 있다. 표제 충돌 규칙은 별도로(3번 순서에서, `reviewer.md`
   병합 전) 먼저 확정한 뒤 시작하는 것이 더 안전하다.
3. **대상 3개(`backend-engineer`·`frontend-engineer`·`ai-engineer`) 전부 Phase 1에서
   이미 동일한 절차로 병합 완료된 상태**라 `# Collaboration`·`# Outputs`·
   `# Validation Checklist` 앵커 구조가 3개 전부 검증된 동일 패턴이다 — Batch 1
   때처럼 "예외 없이 반복 가능"한 조건이 이미 갖춰져 있다.
4. **fan-out 3은 N:M 메커니즘(형제 각주 상호 참조 포함)을 실제로 검증하기에 충분한
   규모**다 — `planner.md`(fan-out 2)로는 "3개 이상으로 확장 시" 문제가 드러나지
   않을 수 있고, `tester.md`(fan-out 5)로 시작하면 실패 시 되돌릴 범위가 너무 크다.

`planner.md`는 근소한 차이의 대안이다 — fan-out은 더 작지만(2) 콘텐츠가 가장
복잡해(표 2개) Pilot의 목적("메커니즘 자체를 가장 낮은 위험으로 검증")에는
`coder.md`가 더 부합한다고 판단했다.

---

## 7. 성공 기준

Phase 2 착수(Pilot `coder.md` 실행) 전 확정해야 할 것과, 완료 후 확인해야 할 것을
분리해 정의한다.

### 착수 전 확정 사항 (Go 조건)

- [ ] fan-in ≥ 2 대상에 대한 헤딩 구분 규칙(`# Expected Output Structure (소스명)`)을
      문서로 확정 — 이 검토서 5번에서 제안한 규칙을 채택할지 사용자 승인 필요
- [ ] `# Expected Output Structure` 삽입 지점(`# Outputs` 직후, `# Validation
      Checklist` 직전)을 표준으로 확정 — 이 검토서 4번에서 제안, 15개 파일 전체
      실측으로 예외 없음 확인 완료
- [ ] 권장 순서(`coder → planner → reviewer → documenter → tester → system`) 채택
      여부 확인

### Pilot(`coder.md`) 완료 후 확인 사항

- [ ] 대상 3개(`backend-engineer`·`frontend-engineer`·`ai-engineer`) `SKILL.md`
      전부에 `# Expected Output Structure` 8개 하위 섹션이 **문자 그대로 동일하게**
      삽입되었는지 diff로 대조
- [ ] 3개 파일 전부 상단 인용구에 형제 대상 목록("Also applied to: ...")이 정확히
      기재되었는지 확인
- [ ] YAML frontmatter 파싱(3개 파일), Markdown 표 정합성(해당 없음 — `coder.md`
      콘텐츠엔 표가 없으므로 이번 Pilot에서는 표 검증이 실질적으로 스킵됨 — 표
      검증은 다음 순서인 `planner.md`에서 처음 이뤄짐)
- [ ] `agents/backend-engineer.md`·`agents/frontend-engineer.md`(참조 각주 보유)와
      `prompts/coder.md` 자신의 Legacy Stub 전환 후 참조 경로 재확인
- [ ] `git status`로 의도한 파일(소스 1 + 대상 3 + README 2종 + 매핑표)만 변경됐는지
      확인, 코드 파일 변경 없음 확인

### Phase 2 전체 완료 기준(참고, 이번 Pilot 범위 밖)

- `prompts/*.md` 6개 전부 Legacy Stub 전환(단, `system.md`는 축소하지 않음)
- `qa-engineer/SKILL.md`에 3개 소스(`reviewer`·`tester`·`documenter`)의 구분된
  섹션이 충돌 없이 공존
- `prompts/README.md`에 "상세는 `skills/experts/` 기준" 안내 문구 반영
- `AI_CONTENT_MAPPING.md`·`CHANGESET.md`의 CS-08 항목이 Phase 2까지 포함해
  전체 Complete로 갱신

---

*본 문서는 설계 검토서입니다. 실제 병합·삽입·문서 갱신은 사용자 승인 후 별도
세션에서 Pilot(`coder.md`)부터 진행합니다.*
