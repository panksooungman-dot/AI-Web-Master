# docs/05_AI/skills

에이전트 **스킬(Skills)** 및 반복 워크플로 문서를 정의합니다. Cursor의 `/` 스킬과 연계하여 사용합니다.

---

## Purpose

- 반복 작업을 **재사용 가능한 워크플로**로 정의합니다.
- 에이전트·사람 모두 동일한 단계로 작업합니다.
- `docs/06_TEMPLATES/` 와 연동하여 스캐폴딩·문서 생성을 표준화합니다.

---

## When to Use

| 시점 | 행동 |
|------|------|
| **동일 작업 2회 이상** | 스킬 문서화 검토 |
| **온보딩** | 필수 스킬 목록 공유 |
| **Cursor `/` 호출** | 등록된 스킬 실행 |
| **자동화 확장** | `scripts/` 와 스킬 연동 (Phase 2) |

---

## Required Sections

스킬 문서 권장 구조:

| 섹션 | 필수 | 설명 |
|------|------|------|
| Name | ✅ | 스킬 식별자 |
| Purpose | ✅ | 해결하는 문제 |
| When to Use | ✅ | 호출 조건 |
| Inputs | ✅ | 필요한 `@` 컨텍스트·문서 |
| Steps | ✅ | 단계별 절차 |
| Outputs | ✅ | 산출물 위치 |
| Rules | ✅ | `AI_RULES.md` 정합 |
| Example Prompt | 권장 | 호출 예시 |

---

## Examples

### 파일 명명

```
docs/05_AI/skills/
├── README.md
├── add-feature-page.md
├── add-api-route.md
├── run-review-workflow.md
└── scaffold-from-plan.md
```

### 스킬 문서 예시

```markdown
# Skill: add-feature-page

## Purpose
Plan 승인 후 presentation + app 라우트 스캐폴딩

## Inputs
- docs/08_PLANS/[feature].md
- docs/06_TEMPLATES/feature-template.md
- ARCHITECTURE.md

## Steps
1. Plan에서 Affected Layers 확인
2. docs/06_TEMPLATES/ 기반 파일 생성
3. lint + build 실행
4. docs/09_BUILD_LOG/ 에 기록

## Example Prompt
/add-feature-page @docs/08_PLANS/phase1-ai-chat-ui.md
```

### Cursor 연동

1. `docs/05_AI/skills/` 에 스킬 명세 작성
2. 필요 시 `.cursor/skills` 또는 Cursor Skill로 등록
3. 채팅에서 `/스킬명` 호출

---

## Workflow

```
반복 작업 식별 → docs/05_AI/skills/ 문서화 → (선택) Cursor 등록 → 재사용
```

**원칙**: 한 번 정의한 워크플로는 스킬로 축적합니다 (Reuse Before Rewrite).
