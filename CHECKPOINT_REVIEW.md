# CHECKPOINT_REVIEW — CS-08 Pilot 3건 완료 시점 점검

> 작성일: 2026-07-19
> 근거: `CHANGESET.md` CS-08, `docs/architecture/AI_CONTENT_MAPPING.md`, 커밋 `dfe4b11`·`062dddc`·`78aa65d`·`f35c2d9` 실측 재확인
> **이 문서는 평가서입니다. 실제 파일 이동·병합은 이번 세션에서 수행하지 않았습니다.**
> 완료 Pilot: `ai-engineer`(#1) · `backend-engineer`(#2) · `frontend-engineer`(#3)

---

## 1. Pilot 3건 비교

### 공통 변경 패턴 (3건 전부 동일)

| 항목 | 내용 |
|---|---|
| 커밋 파일 세트 | `skills/experts/<role>/SKILL.md` + `agents/<role>.md` + `agents/README.md` + `docs/architecture/AI_CONTENT_MAPPING.md`, 정확히 4개 |
| `Decision Authority` 삽입 위치 | `# Collaboration` 섹션 직후 |
| `Handoff` 삽입 위치 | `# Success Criteria` 직후, `# Related Skills` 직전 |
| 삽입 문구 | `> Merged from \`agents/<role>.md\` (2026-07-19).` 인용구 동일 패턴 |
| `version` 변경 | `1.0.0` → `1.1.0` (frontmatter + Version History 표 양쪽) |
| Legacy Stub 구조 | `# 제목` → DEPRECATED 인용구(5줄) → `## Overview`(원문 2문단 유지) → 안내 문장 → `# Related Documents`(SKILL.md을 최상단에 추가) → `# Version` |
| Stub 크기 | 1,454B~1,551B로 균일(원본 대비 약 93~94% 축소) |
| 참조 경로 | 3건 전부 삭제 없이 경로만 보존 — 재확인 결과 깨진 링크 0건 |

### 차이점

| 항목 | ai-engineer(#1) | backend-engineer(#2) | frontend-engineer(#3) |
|---|---|---|---|
| `status`/`source` frontmatter 반영 시점 | **별도 커밋**(`062dddc`, 병합 커밋 `dfe4b11` 이후 — 이 시점엔 표준이 아직 정의되지 않았음) | 병합과 **동일 커밋**(`78aa65d`) | 병합과 **동일 커밋**(`f35c2d9`) |
| 참조 파일 수(재확인 시점 기준) | 3건 | 5건 | 4건 |

### 예외 사항

- 없음 — 3건 모두 구조·삽입 위치·크기가 실측상 완전히 균일하다. 유일한 차이는 위 표의 "표준 반영 시점" 뿐이며, 이는 표준이 Pilot #1 진행 중간에 정의되었기 때문에 생긴 순서상의 차이일 뿐 내용상 문제는 아니다.

---

## 2. SKILL.md 표준 검토

**현재 구조가 충분한가**: 3건에 한해 **충분함**. `# Collaboration` 직후·`# Related Skills` 직전이라는 두 앵커가 15개 파일 대부분에서 안정적으로 존재해 반복 가능한 절차로 검증되었다.

**추가 표준이 필요한가**: 부분적으로 필요하다. 실측 결과 **남은 6개 중 3개(`business-analyst`·`product-manager`·`solution-architect`)에는 `# Collaboration` 헤더 자체가 없다**(아래 5번 참고). 현재 표준(9.1~9.2)은 이 예외를 문서화하지 않았다 — "Collaboration이 없을 때의 대체 삽입 지점"을 표준에 추가해야 한다(제안: `# Workflow` 직전).

**status/source 방식의 적절성**: 적절하다. 3건 모두 YAML 파싱 정상, 값 규칙(`merged`/`agents/<role>.md (merged 2026-07-19)`)이 일관되게 적용되어 grep 한 줄로 진행 상황을 추적할 수 있음을 이번 점검에서 실제로 활용해 확인했다. 다만 `active`/`pending-merge` 값은 아직 실제 적용된 사례가 없어(전부 `merged` 또는 미반영) 검증되지 않은 상태로 남아있다.

---

## 3. Legacy Stub 검토

**현재 Stub 패턴이 적절한가**: 적절하다. 3건 모두 "왜 축소되었는지 + 어디로 가야 하는지"를 최상단 인용구 한 번으로 명확히 전달하고, 원본의 `## Overview` 2문단은 그대로 보존해 이 파일만 단독으로 봐도 역할을 파악할 수 있게 유지했다.

**README와의 연계**: `agents/README.md`의 "Available Agents" 표는 3건 모두 정확히 `Merged → skills/experts/<role>/SKILL.md`로 반영되어 있어 표와 실제 파일 상태가 일치한다. **다만 같은 파일 내 "## Standard Agent Template" 섹션(126~140행)이 여전히 "Every Agent document must contain: Role/Mission/Responsibilities/.../Constraints" 10개 항목을 요구한다고 기술하고 있어, 이미 축소된 3개 파일의 실제 구조와 모순된다.** 이 섹션은 아직 갱신되지 않았다 — 사소하지만 실제 발견된 불일치다.

**Deprecated 안내 방식**: 명확하고 실행 지향적("신규 작업은 `skills/experts/<role>/SKILL.md`를 기준으로 진행하세요")이라 향후 세션이 실수로 Stub을 편집할 위험을 낮춘다. 3건 문구가 역할명만 바뀐 완전 동일 템플릿이라 재사용성도 검증됨.

---

## 4. AI_CONTENT_MAPPING 검토

**실제 상태와 일치 여부**: 표 형태 데이터(섹션 4, 9.3)는 갱신될 때마다 정확히 반영되어 있으나(각 Pilot 커밋에서 매번 갱신 확인), **서술형 문장 여러 곳이 갱신 누락으로 최신 상태를 반영하지 못하고 있다**:

| 위치 | 현재 문구 | 문제 |
|---|---|---|
| 섹션 4, "실행 순서 원칙" (105행) | "1개 직군(`ai-engineer`)을 시범 사례로 먼저 진행 후 나머지 8개로 확대" | Pilot #1 이전 시점 문구 그대로, 3건 완료를 반영 못함 |
| 섹션 9.2 결론 표 (228행) | "`ai-engineer` 1/15만 충족" | 3/15가 맞음 |
| 섹션 9.3 종결 문장 (243행) | "`backend-engineer`가 이 방식으로 반영된 두 번째 사례다" | `frontend-engineer`(세 번째 사례) 누락 |
| 섹션 9.4 (245~247행) | "`ai-engineer` ... 기준 사례로 삼았다"만 언급 | backend/frontend에도 동일 표준이 적용됐다는 갱신 없음 |
| 최하단 (251행) | "Pilot 1건(`ai-engineer`)만 실행 완료" | 3건으로 갱신 필요 |
| 섹션 1 표 (26·27·30행) | `ai-engineer.md`/`backend-engineer.md`/`frontend-engineer.md` 소스 크기가 병합 전 값(4,029B/3,826B/3,859B) | 현재 실제 크기(1,551B/1,454B/1,503B)와 다름 — "병합 전 기준선" 임을 명시하는 라벨이 없어 현재값으로 오독 가능 |

이 문제들은 전부 **내용의 오류가 아니라 진행 상황을 매 Pilot마다 표는 갱신하면서 서술 문장은 놓친 것**이다 — 표 기반 추적(4번, 9.3)은 신뢰할 수 있고, 서술형 요약 문장만 후속 정리가 필요하다.

**남은 작업 수**: 실측 결과 정확히 **12건** — `agents/*.md` 6개(`business-analyst`·`devops-engineer`·`product-manager`·`qa-engineer`·`solution-architect`·`technical-writer`) + `prompts/*.md` 6개(`planner`·`coder`·`reviewer`·`tester`·`documenter`·`system`). 섹션 4 표의 Pending 행 수와 정확히 일치.

**Mapping 품질**: 구조적 타당성은 이번 재검토로 반박되지 않았다(9.1~9.2의 커버리지 분석, 5번 그대로 유지 대상 분류 전부 실측과 일치). 유일한 품질 저하 요인은 위에 정리한 "표는 최신, 서술은 stale"인 진행 상황 드리프트이며, 남은 Pilot이 늘어날수록 이 드리프트가 누적될 위험이 있다.

---

## 5. Remaining 6개 평가

### 동일 절차로 일괄 적용 가능한지

| 직군 | `agents/*.md` 구조 | 대응 SKILL.md `# Collaboration` 존재 | 동일 절차 적용 |
|---|---|---|---|
| `devops-engineer` | 3건과 완전 동일(17개 헤더) | ✅ 존재 | **그대로 가능** |
| `qa-engineer` | 3건과 완전 동일 | ✅ 존재 | **그대로 가능** |
| `technical-writer` | 3건과 완전 동일 | ✅ 존재 | **그대로 가능** |
| `business-analyst` | 3건과 완전 동일 | ❌ **없음** | 삽입 지점 수정 필요 |
| `solution-architect` | 3건과 완전 동일 | ❌ **없음** | 삽입 지점 수정 필요 |
| `product-manager` | 3건과 완전 동일 | ❌ **없음** | 삽입 지점 수정 필요 + 아래 참고 |

### 예외가 예상되는 파일

- **`business-analyst`·`solution-architect`·`product-manager`**: `# Collaboration` 헤더 자체가 없다(실측 확인). 3건 Pilot에서 쓴 "Collaboration 직후 삽입" 규칙이 그대로 적용되지 않는다. 대체 지점으로 `# Workflow` 직전을 제안한다 — 세 파일 모두 그 직전에 직군별 고유 섹션(예: `business-analyst`의 `# Validation`, `product-manager`의 `# Decision Framework`, `solution-architect`의 `# Architecture Governance`)이 있고 바로 뒤에 `# Workflow`가 이어지는 동일한 패턴을 확인했다.
- **`product-manager`만의 추가 예외**: 이미 `# Decision Framework`(의사결정 시 고려할 기준 — Customer Value/Business Impact/Feasibility 등, "어떻게 결정할지")라는 섹션이 있다. `agents/product-manager.md`의 `# Decision Authority`(무엇을 결정할 수 있는지/없는지의 권한 범위)와 이름이 비슷하지만 실제 내용을 대조한 결과 **중복이 아니라 상호 보완 관계**임을 확인했다. 병합 시 두 섹션을 모두 남기되, 혼동 방지를 위해 "Decision Framework"와의 관계를 한 줄 각주로 구분해주는 것을 권장한다.

### 위험도

- `devops-engineer`·`qa-engineer`·`technical-writer`: **Low** — 3건 Pilot과 100% 동일한 반복 작업.
- `business-analyst`·`solution-architect`: **Low~Medium** — 삽입 지점만 다르고 내용 충돌은 없음.
- `product-manager`: **Medium** — 삽입 지점 변경 + 기존 섹션과의 네이밍 근접성 설명이 함께 필요해 나머지 5건보다 주의가 더 필요함.

---

## 6. prompts/*.md(N:M) 착수 준비도

**현재 진입 가능한지**: **부분적으로 가능**하다. 5개 워크플로 문서(`planner`·`coder`·`reviewer`·`tester`·`documenter`)는 전부 동일한 12개 헤더 구조를 가지며 고유 콘텐츠(`# Expected Output Structure`)도 5건 전부 동일한 이름으로 존재함을 확인했다 — 구조적으로는 병합 준비가 되어 있다.

다만 **대상 파일들의 병합 상태가 서로 다르다는 점이 실질적 진입 장벽**이다:

| 소스 | 대상 3개 직군의 현재 상태 |
|---|---|
| `prompts/coder.md` | `backend-engineer`✅ `frontend-engineer`✅ `ai-engineer`✅ — **셋 다 완료** |
| `prompts/reviewer.md` | `solution-architect`⏳ `devops-engineer`⏳ `qa-engineer`⏳ — 셋 다 미완료 |
| `prompts/planner.md` | `business-analyst`⏳ `product-manager`⏳ — 둘 다 미완료 |
| `prompts/documenter.md` | `technical-writer`⏳ `product-manager`⏳ `qa-engineer`⏳ — 셋 다 미완료 |
| `prompts/tester.md` | `qa-engineer`⏳(주 대상) `backend`✅`frontend`✅`ai-engineer`✅ `devops-engineer`⏳ — **혼재** |
| `prompts/system.md` | 15개 전체 공통, 병합이 아닌 각주 추가만 — 순서 무관 |

**선행 조건이 남아 있는지**: `prompts/coder.md`는 선행 조건이 이미 전부 충족되어 있다(대상 3개 전부 `merged`). 나머지 4개(`planner`/`reviewer`/`documenter`/`tester`)는 대상 직군의 1:1 병합이 먼저 끝나야 "한 파일에 서로 다른 진행 상태가 섞이는" 상황을 피할 수 있다. `system.md`는 병합이 아니라 각주 추가라 순서 제약이 없다.

---

## 7. 권장 실행 순서

```
1단계 (즉시 가능, Low 위험)
   devops-engineer → qa-engineer → technical-writer
   (3건 Pilot과 완전히 동일한 절차 반복)

2단계 (Low~Medium 위험, 삽입 지점 수정 필요)
   business-analyst → solution-architect → product-manager
   ("# Workflow 직전" 삽입, product-manager는 Decision Framework와의
    관계 각주 추가)

   ※ 1·2단계가 끝나면 agents/*.md 9개 전부 완료 상태가 된다.

3단계 (N:M 최초 시도, 선행 조건 충족된 유일한 사례)
   prompts/coder.md → (backend-engineer, frontend-engineer, ai-engineer)
   대상 3개 전부 이미 merged 상태이므로 지금 진행해도 되나,
   9개 agents/*.md를 먼저 끝내 절차를 안정화한 뒤 진행하는 편을 권장.

4단계 (2단계 완료 후에만 진행)
   prompts/reviewer.md / planner.md / documenter.md / tester.md
   (각각의 대상 직군이 전부 merged 상태가 된 뒤)

5단계 (순서 무관, 아무 때나 가능)
   prompts/system.md — 15개 SKILL.md에 "전역 규칙은 prompts/system.md 참고"
   각주 1줄씩 추가(병합 아님)

병행 권장 (문서 정합성 유지, 다음 커밋에 끼워 넣기)
   - AI_CONTENT_MAPPING.md 서술 문장 5곳(105·228·243·245-247·251행) 갱신
   - agents/README.md "Standard Agent Template" 섹션에 마이그레이션 각주 추가
```

**위험 요소**:
- `product-manager`의 Decision Framework/Decision Authority 네이밍 근접 — 병합 시 설명 없이 진행하면 향후 독자가 두 섹션을 같은 것으로 오해할 수 있음.
- N:M 소스(`reviewer`/`planner`/`documenter`/`tester`)를 대상 직군 병합이 끝나기 전에 건드리면, 한 SKILL.md 파일에 "prompts발 병합"과 "agents발 병합 대기 중"이 동시에 섞여 어떤 변경이 어느 소스에서 왔는지 추적이 어려워짐 — 순서를 지키는 것이 곧 위험 관리.
- 서술형 진행 상황 문장(AI_CONTENT_MAPPING.md)이 이번처럼 표 갱신과 별도로 누락되는 패턴이 3회 연속 반복됨 — 근본적으로 "표만 보고 서술은 안 봐도 되는" 단일 진행률 카운터를 문서 최상단에 두는 구조 개선을 고려할 만함(이번 문서에서 실행하지 않음, 제안만).

**Go / Hold 판단**:

| 항목 | 판단 |
|---|---|
| 1단계(devops/qa/technical-writer) | **GO** — 예외 없음, 즉시 진행 가능 |
| 2단계(business-analyst/solution-architect/product-manager) | **GO (조건부)** — 삽입 지점 수정 사항을 절차에 반영한 뒤 진행 |
| 3단계(prompts/coder.md) | **HOLD** — 기술적으로는 가능하나, 9개 agents/*.md를 먼저 끝내 절차를 검증한 뒤 N:M 최초 시도를 하는 편이 안전 |
| 4단계(나머지 prompts) | **HOLD** — 대상 직군 병합 완료가 선행 조건 |
| 5단계(prompts/system.md 각주) | **GO (아무 때나)** — 병합이 아닌 단순 각주라 위험 없음 |
| 문서 정합성 정리(AI_CONTENT_MAPPING·agents/README) | **GO (권장)** — 다음 Pilot 커밋에 함께 포함해 드리프트 누적 방지 |

---

*본 문서는 평가서입니다. 실제 병합·삽입·문서 갱신은 사용자 승인 후 별도 세션에서 진행합니다.*
