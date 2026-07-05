# docs/07_KNOWLEDGE

AI와 사람이 작업할 때 필요한 **배경 맥락(Context)** 을 보관합니다.

---

## Purpose

- 프로젝트·도메인·기술적 **배경 지식**을 한곳에 모읍니다.
- Plan·Build 단계에서 동일한 가정과 제약을 공유합니다.
- 코드에 흩어진 암묵적 지식을 **명시적 문서**로 전환합니다.

---

## When to Use

| 시점 | 행동 |
|------|------|
| **새 기능 착수 전** | 관련 Context 문서 작성 또는 갱신 |
| **Plan 모드 진입 전** | `@docs/07_KNOWLEDGE` 로 맥락 첨부 |
| **온보딩** | 신규 에이전트·팀원이 먼저 읽을 문서 |
| **의사결정 후** | ADR 요약을 Context 또는 Plan에 반영 |

---

## Required Sections

`docs/06_TEMPLATES/context-template.md` 기준:

| 섹션 | 필수 | 설명 |
|------|------|------|
| Summary | ✅ | 문서 목적 한 문단 |
| Background | ✅ | 왜 필요한가 |
| Stakeholders | 권장 | 이해관계자 |
| Glossary | 권장 | 도메인 용어 |
| Constraints | ✅ | 기술·비즈니스 제약 |
| Related Decisions | 권장 | 과거 ADR 링크 |
| External Systems | 해당 시 | 외부 연동 개요 |
| Open Questions | 권장 | 미해결 질문 |

---

## Examples

### 파일 명명

```
docs/07_KNOWLEDGE/
├── README.md
├── glossary.md              # 전역 용어집
├── ai-chat-domain.md        # AI 채팅 도메인 맥락
└── adr-summary.md           # 의사결정 요약
```

### 사용 예 (Cursor)

```
@docs/07_KNOWLEDGE/ai-chat-domain.md
@docs/00_COMPANY/PROJECT_VISION.md
Plan 모드: AI 채팅 기능의 Context를 바탕으로 Plan 초안 작성
```

### 최소 Context 예시

```markdown
# Context: 사용자 인증

## Background
Phase 3에서 인증이 필요함. B2B SaaS, 이메일+OAuth.

## Constraints
- Next.js 16 App Router
- HttpOnly Cookie 선호
- GDPR 준수
```

---

## Workflow

```
요청 → Context 작성 → docs/08_PLANS/ → Build
```

**원칙**: 맥락 없이 Plan을 시작하지 않습니다 (Documentation First).
