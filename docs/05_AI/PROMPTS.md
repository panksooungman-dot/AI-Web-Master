# Prompts

에이전트를 호출할 때 사용하는 **표준 프롬프트 구조와 역할별 템플릿**을 정의합니다.

---

## 1. Purpose

- 동일한 요청이 항상 동일한 품질의 결과로 이어지도록 프롬프트 구조를 표준화한다.
- 추측 기반 지시("왼쪽 버튼 바꿔줘")를 방지하고, 구체적 참조 기반 지시를 유도한다.

---

## 2. Prompt Structure Standard

권장 순서:

```
1. 컨텍스트 참조 (@docs/...)
2. 작업 목표 (한 문장)
3. 범위 제약 (Non-goals, 건드리지 말아야 할 것)
4. 완료 조건 (무엇이 되면 끝인가)
```

---

## 3. Role Invocation Templates

### Planner 호출

```
@docs/00_COMPANY/PROJECT_VISION.md
@docs/02_DEVELOPMENT/ARCHITECTURE.md
@docs/06_TEMPLATES/plan-template.md

[기능명]에 대한 Plan을 docs/plan/에 작성해줘.
Non-goals: [제외 범위]
```

### Builder 호출

```
@docs/plan/[승인된 Plan 문서]
@docs/02_DEVELOPMENT/ARCHITECTURE.md

위 Plan 범위 내에서만 구현해줘. Plan에 없는 리팩터링은 하지 마.
```

### Reviewer 호출

```
@docs/05_AI/Reviewer.md

현재 변경분을 품질·보안 관점에서 검토해줘.
```

### Documenter 호출

```
@docs/build/README.md

방금 구현 내용을 docs/build/에 Summary·Changes·Testing 형식으로 기록해줘.
```

### Architect 자문 요청

```
@docs/02_DEVELOPMENT/ARCHITECTURE.md
@docs/02_DEVELOPMENT/TECH_STACK.md

[변경 사항]이 아키텍처 계층 경계·기술 스택과 정합하는지 검토해줘.
```

---

## 4. Component-Level Prompting (UI 수정)

UI 요소를 지시할 때는 Component ID를 기준으로 한다 (참조: `docs/02_DEVELOPMENT/AI_COMPONENT_GUIDDE.md`의 Copy Prompt 규칙).

```
❌ "왼쪽 버튼 바꿔줘"
⭕ "hero-btn-primary 아이콘을 변경해줘"
```

---

## 5. Token-Efficient Prompting Guidelines

- 필요한 문서만 `@`로 첨부한다. 관련 없는 문서를 습관적으로 붙이지 않는다.
- 큰 파일은 전체가 아닌 구체적 위치(파일 경로 + 섹션/라인)를 지정해 참조한다.
- 이미 합의된 방향은 프롬프트에서 재설명하지 않고 전제로 둔다.

상세 원칙은 `TOKEN_POLICY.md` 참고.

---

## 6. Prohibited Prompt Patterns

- 범위가 불명확한 지시("적당히 개선해줘")
- 승인되지 않은 Plan 없이 구현을 바로 요청하는 지시
- Component ID 없이 위치를 추측하게 하는 UI 수정 지시

---

## 7. References

| 문서 | 관계 |
|------|------|
| `AGENTS.md` (본 폴더) | 호출 대상 에이전트 목록 |
| `WORKFLOW.md` | 프롬프트가 사용되는 실행 단계 |
| `TOKEN_POLICY.md` | 토큰 효율적 프롬프트 기준 |
| `docs/02_DEVELOPMENT/AI_COMPONENT_GUIDDE.md` | Component ID 기반 UI 프롬프트 규칙 |
| `docs/06_TEMPLATES/` | 문서 템플릿(프롬프트 템플릿과는 별개) |

---

*관리: Architect Agent*
