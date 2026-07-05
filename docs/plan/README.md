# docs/plan

**Plan 단계** 산출물을 저장합니다. 구현 전 설계·명세·트레이드오프 분석이 여기에 해당합니다.

---

## Purpose

- Build 전 **승인 가능한 설계 문서**를 제공합니다.
- 대안 비교, 리스크, 구현 체크리스트를 기록합니다.
- Builder Agent의 handoff 기준점이 됩니다.

---

## When to Use

| 시점 | 행동 |
|------|------|
| **Context 완료 후** | Plan 문서 작성 |
| **Human Lead 승인 전** | Build 시작 금지 |
| **아키텍처 변경 시** | Architect Agent 리뷰 요청 |
| **기술 선택 시** | Alternatives Considered 섹션 필수 |

---

## Required Sections

`templates/plan-template.md` 기준:

| 섹션 | 필수 | 설명 |
|------|------|------|
| Summary | ✅ | 변경 요약 |
| Goals / Non-Goals | ✅ | 범위 명확화 |
| User Stories | 기능 시 ✅ | 사용자 관점 |
| Proposed Solution | ✅ | 설계·계층 영향 |
| API / Data Model | 해당 시 | 인터페이스 초안 |
| Alternatives Considered | ✅ | ADR 성격 |
| Risks & Mitigations | 권장 | 리스크 관리 |
| Implementation Checklist | ✅ | Builder용 작업 목록 |
| Handoff to Builder | ✅ | 승인·우선순위·범위 |

---

## Examples

### 파일 명명

```
docs/plan/
├── README.md
├── phase1-ai-chat-ui.md
├── phase1-api-routes.md
└── auth-adr-001.md
```

### 사용 예 (Cursor Plan 모드)

```
@docs/context/
@docs/02_DEVELOPMENT/ARCHITECTURE.md
@docs/06_TEMPLATES/plan-template.md
AI 채팅 UI Phase 1 Plan 작성. Non-goals에 API 연동 제외.
```

### Handoff 예시

```markdown
## Handoff to Builder
**승인자**: Human Lead  
**우선순위**: P1  
**예상 범위**: src/presentation/chat/, app/(chat)/
```

---

## Workflow

```
docs/context/ → docs/plan/ (승인) → src/ + app/ → Review
```

**원칙**: Plan 문서가 없으면 Build를 시작하지 않습니다.
