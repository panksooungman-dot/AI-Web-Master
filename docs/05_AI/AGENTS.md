# AI Agents Registry

이 문서는 AI Dev OS에서 실제로 실행되는 **AI 에이전트의 기술적 레지스트리**입니다.

> ⚠️ 루트의 `AGENTS.md`(Claude Code 세션 운영 규칙)와는 다른 문서입니다. 이 문서는 "어떤 에이전트가 존재하고, 어떻게 호출되는가"를 다루며, 조직·의사결정 권한은 `docs/00_COMPANY/ORGANIZATION.md`를, 각 역할의 상세 책임은 개별 역할 문서를 따릅니다.

---

## 1. Purpose & Scope

| 다루는 것 | 다루지 않는 것 (참조로 대체) |
|-----------|-------------------------------|
| 에이전트 목록·모드·호출 방식·상태 | 역할별 Mission/Responsibilities 상세 → 개별 역할 문서 |
| 에이전트 간 참조 구조 | 조직도·RACI·승인 권한 → `ORGANIZATION.md`, `COMPANY_POLICY.md` |
| 호출 시 사용하는 프롬프트 표준 위치 안내 | 프롬프트 원문·템플릿 → `PROMPTS.md` |
| 실행 순서·위임 시점 안내 | 오케스트레이션 상세 → `WORKFLOW.md` |

---

## 2. Agent Roster

| 에이전트 | 모드 | 정의 문서 | 호출 방식 | 상태 |
|----------|------|-----------|-----------|------|
| Architect | Plan/Build 전반 자문 | `Architect.md` | 상시 자문, 아키텍처 변경 시 필수 검토 | Active |
| Planner | Plan | `Planner.md` | Plan 모드 진입, `docs/plan/` 산출 | Active |
| Builder | Build | `Builder.md` | 승인된 Plan 기반 구현 | Active |
| Reviewer | Review | `Reviewer.md` | PR/변경분 리뷰 요청 시 | Active |
| Documenter | Document | `Documenter.md` | 구현 완료 후 `docs/build/` 기록 | Active |
| Ops | — | (미정) | CI/CD·배포·모니터링 자동화 | Planned |
| Security | — | (미정) | 보안 감사·의존성 스캔 | Planned |

---

## 3. Invocation Standards

- 에이전트 호출 시 어떤 컨텍스트(`@docs/...`)를 먼저 첨부할지는 `PROMPTS.md`의 역할별 템플릿을 따른다.
- 동일 요청에 여러 에이전트가 필요한 경우, 호출 순서는 `WORKFLOW.md`의 Execution Flow를 따른다.
- 탐색·조사성 작업으로 메인 대화 컨텍스트를 소모하고 싶지 않을 때는 `TOKEN_POLICY.md`의 위임 기준에 따라 서브 에이전트에 위임한다.

---

## 4. Handoff Map (요약)

```
Planner → (Human Lead 승인) → Builder → Reviewer → Documenter
             ▲                                        │
             └──────────── Architect (전 단계 자문) ────┘
```

상세 트리거 조건·예외 처리는 `WORKFLOW.md` 참고.

---

## 5. References

| 문서 | 관계 |
|------|------|
| `docs/00_COMPANY/ORGANIZATION.md` | 조직 구조·RACI — 이 문서의 상위 개념 |
| `docs/00_COMPANY/COMPANY_POLICY.md` | 승인 권한 매트릭스 |
| `Planner.md` / `Builder.md` / `Reviewer.md` / `Architect.md` / `Documenter.md` | 역할별 상세 정의 |
| `WORKFLOW.md` | 에이전트 실행·오케스트레이션 메커니즘 |
| `TOKEN_POLICY.md` | 위임·토큰 최적화 기준 |
| `PROMPTS.md` | 역할별 호출 프롬프트 템플릿 |

---

*관리: Architect Agent*
