# Document Index

저장소 전체 문서의 단일 마스터 인덱스입니다. 각 폴더의 상세 안내는 폴더별 `README.md`를 따르고, 본 문서는 전체 지도 역할만 합니다.

---

## 1. Purpose

- 저장소에 어떤 문서가 어디에 있는지 한 곳에서 확인한다.
- 신규 문서 생성 시 이 인덱스에 등록해 문서 자산이 누락되지 않도록 한다.

---

## 2. Company Documents (`docs/00_COMPANY/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `PROJECT_VISION.md` | AI Dev OS 비전·핵심 원칙·팀 구조 | Active |
| `ORGANIZATION.md` | 조직 구조·역할·의사결정 권한(RACI) | Active |
| `COMPANY_POLICY.md` | 회사 운영 정책·승인 권한 매트릭스 | Active |
| `DOCUMENT_INDEX.md` | 본 문서 — 전체 문서 인덱스 | Active |

## 3. PMO Documents (`docs/01_PMO/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `PROJECT_ROADMAP.md` | 단계별 로드맵 | Active |
| `WBS.md` | 작업 분해 구조·진행률·현재 작업 | Active |
| `CHANGELOG.md` | 변경 이력 | Active |
| `REQUEST.md` | 의뢰자 요구사항(v1) | Active |

## 4. Development Documents (`docs/02_DEVELOPMENT/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `ARCHITECTURE.md` | 시스템 아키텍처 | Active |
| `TECH_STACK.md` | 기술 스택 정의 | Active |
| `CNBIZ_RULES.md` | 개발 표준(컴포넌트·스타일·Git) | Active |
| `AI_COMPONENT_GUIDDE.md` | Component ID 협업 표준 | Active |

## 5. Design Documents (`docs/03_DESIGN/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `DESIGN_SYSTEM.md` | 컬러·타이포·레이아웃·컴포넌트 디자인 기준 | Active |
| `UI_GUIDE.md` | UI 가이드 (빈 문서) | Placeholder |
| `UX_GUIDE.md` | UX 가이드 (빈 문서) | Placeholder |
| `DESIGN_AUTOMATION_MASTER.md` | Design Automation 전체 시스템 마스터 인덱스(4개 세부 스펙과 실제 구현 상태 연결) | Phase 1-9 Implemented |
| `CLAUDE_DESIGN_INTEGRATION.md` | Claude Code-Claude Design 연동 스펙(요구사항→기획→디자인 자동 생성) | Planned |
| `FIGMA_INTEGRATION.md` | Figma Import/Export 연동 스펙 | Planned |
| `DESIGN_SYNC.md` | 디자인-코드 양방향 동기화 스펙 | Planned |
| `DESIGN_WORKFLOW.md` | 요구사항부터 배포까지 전체 프로세스를 하나의 Workflow로 관리하는 스펙 | Planned |

## 6. Operations Documents (`docs/04_OPERATIONS/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `README.md` | 폴더 안내(빈 placeholder, Phase 2 이후 CI/CD·배포·모니터링 문서 예정) | Placeholder |
| `DEPLOYMENT.md` | 배포 가이드 (빈 문서) | Placeholder |
| `QA.md` | QA 가이드 (빈 문서) | Placeholder |
| `SEO.md` | SEO 가이드 (빈 문서) | Placeholder |
| `ANALYTICS.md` | 분석·모니터링 가이드 (빈 문서) | Placeholder |

## 7. AI Documents (`docs/05_AI/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `AI_RULES.md` | AI 에이전트 운영 규칙 | Active |
| `AGENTS.md` | AI 에이전트 실행 레지스트리(호출 방식·상태) | Active |
| `TOKEN_POLICY.md` | 토큰·컨텍스트 최적화 정책 | Active |
| `WORKFLOW.md` | 에이전트 실행·오케스트레이션 메커니즘 | Active |
| `PROMPTS.md` | 역할별 호출 프롬프트 템플릿 | Active |
| `Architect.md` | Architect Agent 정의 | Active |
| `Planner.md` | Planner Agent 정의 | Active |
| `Builder.md` | Builder Agent 정의 | Active |
| `Reviewer.md` | Reviewer Agent 정의 | Active |
| `Documenter.md` | Documenter Agent 정의 | Active |
| `README.md` | 폴더 안내 | Active |
| `skills/README.md` | 에이전트 스킬·반복 워크플로 가이드 | Active |

## 8. Templates (`docs/06_TEMPLATES/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `context-template.md` | Context 문서 템플릿 | Active |
| `plan-template.md` | Plan 문서 템플릿 | Active |
| `feature-template.md` | 기능 명세 템플릿 | Active |
| `review-template.md` | 리뷰 문서 템플릿 | Active |
| `bug-template.md` | 버그 리포트 템플릿 | Active |
| `request-template.md` | 프로젝트/기능 개발 요청 템플릿 | Active |
| `wbs-template.md` | 작업 분해 구조(WBS) 템플릿 | Active |
| `project-roadmap-template.md` | 프로젝트 로드맵 템플릿 | Active |
| `changelog-template.md` | 변경 이력(CHANGELOG) 템플릿 | Active |
| `README.md` | 폴더 안내 | Active |

## 9. Knowledge Base (`docs/07_KNOWLEDGE/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `001-project-foundation.md` | 프로젝트 배경·목표·제약 Context | Active |
| `README.md` | Context 작성 가이드 | Active |

## 10. Plans (`docs/08_PLANS/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `001-phase1-mvp.md` | Phase 1 MVP Plan | Draft |
| `README.md` | Plan 작성 가이드 | Active |

## 11. Work History (`docs/09_WORK_HISTORY/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `README.md` | Work History 시스템 안내 | Active |
| `CURRENT_CONTEXT.md` | 현재 프로젝트 상태 스냅샷(항상 최신으로 덮어쓰기) | Active |
| `WORK_HISTORY.md` | 날짜별 작업 이력(append, 삭제 없음) | Active |
| `sessions/MM-DD.md` | 일일 세션 상세 기록 | Active |

## 12. Archive (`docs/99_ARCHIVE/`)

| 문서 | 설명 | 상태 |
|------|------|------|
| `README.md` | 폴더 안내(빈 placeholder) | Placeholder |

## 13. Docs Root

| 문서 | 설명 | 상태 |
|------|------|------|
| `docs/README.md` | docs 폴더 전체 안내 | Active |

## 14. Root Documents

| 문서 | 설명 | 상태 |
|------|------|------|
| `README.md` | 프로젝트 개요 | Active |
| `CLAUDE.md` | Claude Code 자동 인식 규칙 | Active |
| `AGENTS.md` | Claude Code 프로젝트 운영 규칙 | Active |

---

## 15. Index Maintenance Rule

- 신규 문서를 생성하면 해당 폴더 섹션에 행을 추가한다.
- 문서 상태가 바뀌면(Draft → Active, Active → Archived 등) 이 표를 갱신한다.
- 문서를 이동·삭제하는 경우 이 인덱스도 함께 갱신한다.

---

*관리: Human Lead*
