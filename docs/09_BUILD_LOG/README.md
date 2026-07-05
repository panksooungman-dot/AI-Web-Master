# docs/09_BUILD_LOG

**Build 단계** 구현·검증·배포와 관련된 문서를 보관합니다.

---

## Purpose

- 승인된 Plan의 **실제 구현 결과**를 기록합니다.
- 배포·환경·릴리스 지식을 코드 외부에 보존합니다.
- Documenter Agent의 주요 산출물 위치입니다.

---

## When to Use

| 시점 | 행동 |
|------|------|
| **구현 완료 후** | 구현 요약·변경 파일 목록 기록 |
| **배포 전/후** | 환경 변수 가이드, 릴리스 노트 |
| **Review 승인 후** | 최종 Build 기록 + Review 링크 |
| **Hotfix 후** | `docs/06_TEMPLATES/bug-template.md` 기반 기록 |

---

## Required Sections

Build 기록 문서 권장 구조:

| 섹션 | 필수 | 설명 |
|------|------|------|
| Summary | ✅ | 무엇을 구현했는가 |
| Plan Reference | ✅ | `docs/08_PLANS/` 링크 |
| Changes | ✅ | 파일·모듈 변경 목록 |
| Why / What / Impact | ✅ | `AI_RULES.md` 통신 규칙 |
| Testing | ✅ | 실행한 검증 (lint, build, test) |
| Deployment | 해당 시 | 배포 절차·환경 |
| Known Issues | 권장 | 미해결 이슈 |
| Review | ✅ | Reviewer 승인 링크 |

---

## Examples

### 파일 명명

```
docs/09_BUILD_LOG/
├── README.md
├── phase1-ai-chat-ui-implementation.md
├── release-v0.1.0.md
└── env-setup.md
```

### 구현 기록 예시

```markdown
# Build: AI Chat UI (Phase 1)

## Plan Reference
docs/08_PLANS/phase1-ai-chat-ui.md

## Changes
- src/presentation/chat/ChatPanel.tsx (new)
- app/(chat)/page.tsx (new)

## Testing
- npm run lint ✅
- npm run build ✅

## Review
PR #12 — Approved by Reviewer Agent
```

### 환경 가이드 예시

```markdown
# Environment Setup

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_APP_URL | Yes | App base URL |

⚠️ 시크릿 값은 이 문서에 기록하지 않습니다.
```

---

## Workflow

```
docs/08_PLANS/ (승인) → Build (src/) → Review → docs/09_BUILD_LOG/ (기록)
```

**원칙**: 코드만으로 전달되지 않는 운영·배포 지식은 반드시 문서로 남깁니다.
