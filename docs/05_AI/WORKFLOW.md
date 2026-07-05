# AI Workflow (Execution & Orchestration)

AI 에이전트가 실제로 실행·협업하는 **오케스트레이션 메커니즘**을 정의합니다.

> `AI_RULES.md`의 Development Workflow(Context→Plan→Build→Review→Document)는 **문서 라이프사이클**을 다룹니다. 본 문서는 그 위에서 "어떤 조건에 어떤 에이전트가 실행되고, 언제 다음 에이전트로 넘기는가"라는 **실행 메커니즘**만 다루며, 문서 라이프사이클 자체는 반복 기술하지 않습니다.

---

## 1. Relationship to Existing Workflow Docs

| 기존 문서 | 다루는 범위 | 본 문서와의 차이 |
|-----------|-------------|------------------|
| `AI_RULES.md` (Development Workflow) | 문서 산출물 흐름(Context→Plan→Build→Review→Document) | 본 문서는 "누가 언제 실행되는가"의 실행 조건만 다룸 |
| `docs/02_DEVELOPMENT/ARCHITECTURE.md` (AI Workflow) | 에이전트-문서 산출물 매핑도 | 본 문서는 실행 트리거·위임 규칙을 추가 |
| `docs/00_COMPANY/ORGANIZATION.md` (RACI, Escalation) | 의사결정 권한·에스컬레이션 | 본 문서는 그 권한이 실행 중 어느 시점에 적용되는지 연결 |

---

## 2. Execution Flow

```
요청 발생
   │
   ▼
Planner 실행 ── Plan 문서 초안 (docs/plan/)
   │
   ▼
Human Lead 승인 (COMPANY_POLICY.md 승인 매트릭스 기준)
   │
   ▼
Builder 실행 ── 구현 (src/, app/)
   │
   ▼
Reviewer 실행 ── 품질·보안 검토
   │
   ▼
Documenter 실행 ── 구현 기록 (docs/build/)

(Architect는 위 전 단계에 걸쳐 아키텍처 정합성을 상시 자문)
```

---

## 3. Trigger Conditions

| 단계 전환 | 조건 |
|-----------|------|
| Planner → Builder | Plan 문서가 Human Lead 승인 상태(Approved)일 때만 |
| Builder → Reviewer | 구현이 Plan 범위 내에서 완료되고 lint/build 통과 시 |
| Reviewer → Documenter | 리뷰에서 치명적 결함이 없을 때 |
| 모든 단계 → Architect 개입 | 아키텍처 경계·기술 스택 변경이 감지될 때 |
| 모든 단계 → Human Lead 에스컬레이션 | `COMPANY_POLICY.md` 승인 필요 행위 발견 시 |

Plan 승인 없이 Build를 시작하지 않는 원칙은 그대로 유지합니다(참조: `AI_RULES.md`).

---

## 4. Delegation Rules

- 하나의 요청 안에서 독립적인 조사·검색이 필요할 때는 `TOKEN_POLICY.md`의 위임 기준에 따라 서브 에이전트로 분리한다.
- 서브 에이전트에게 위임한 뒤에는 중간 과정을 재확인하지 않고 완료 보고만을 근거로 다음 단계로 진행한다.
- 단순 작업(단일 파일 수정 등)은 위임 없이 즉시 처리한다.

---

## 5. Handoff Protocol

| 전달 시점 | 전달 산출물 |
|-----------|-------------|
| Planner → Builder | 승인된 Plan 문서 경로, 범위(Scope), 우선순위 |
| Builder → Reviewer | 변경 파일 목록, 테스트/빌드 결과 |
| Reviewer → Documenter | 리뷰 결과, 미해결 이슈 |
| 모든 단계 → Architect | 아키텍처 영향 범위 요약 |

---

## 6. Escalation & Exception Handling

이견·블로커·승인 필요 상황이 발생하면 `docs/00_COMPANY/ORGANIZATION.md` §5 Escalation Path를 따릅니다(Agent → Architect → Human Lead). 본 문서는 그 에스컬레이션이 실행 흐름의 어느 단계에서 발생할 수 있는지만 위 표(§3)로 연결합니다.

---

## 7. References

| 문서 | 관계 |
|------|------|
| `AI_RULES.md` | 문서 라이프사이클(상위 개념) |
| `docs/02_DEVELOPMENT/ARCHITECTURE.md` | AI Workflow 다이어그램(상위 개념) |
| `docs/00_COMPANY/ORGANIZATION.md` | RACI·에스컬레이션 경로 |
| `docs/00_COMPANY/COMPANY_POLICY.md` | 승인 권한 매트릭스 |
| `TOKEN_POLICY.md` | 위임 기준 |
| `AGENTS.md` (본 폴더) | 실행 대상 에이전트 목록 |
| `PROMPTS.md` | 단계별 호출 프롬프트 |

---

*관리: Architect Agent*
