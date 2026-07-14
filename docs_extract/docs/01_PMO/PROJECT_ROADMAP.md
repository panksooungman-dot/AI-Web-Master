# Project Roadmap

`ai-web-master` — AI Development Operating System 로드맵

---

## Current Phase

**Phase 0: Foundation (진행 중)**

운영 체계의 기반 문서·폴더·에이전트·템플릿을 구축하는 단계입니다.

| 항목 | 상태 |
|------|------|
| `PROJECT_VISION.md` | ✅ 완료 |
| `AI_RULES.md` | ✅ 완료 |
| `ARCHITECTURE.md` | ✅ 완료 |
| `TECH_STACK.md` | ✅ 완료 |
| `docs/` 워크플로 | ✅ 완료 |
| `agents/` 정의 | ✅ 완료 |
| `templates/` | ✅ 완료 |
| `src/` 계층 구조 | 🔲 문서만, 코드 미작성 |
| Next.js 앱 (`app/`) | 🔲 기본 템플릿만 존재 |
| CI/CD 파이프라인 | 🔲 미구축 |
| 테스트 프레임워크 | 🔲 미구축 |

---

## Future Milestones

### Phase 1: Core Platform (MVP)

- `src/` Clean Architecture 계층 스캐폴딩
- AI 채팅 UI (presentation 계층)
- 기본 API 라우트 및 application 유스케이스
- ESLint + 기본 테스트 (Vitest/Jest)
- GitHub Actions: lint, build

### Phase 2: AI Orchestration

- 에이전트 handoff 자동화 (Planner → Builder → Reviewer)
- `docs/skills/` → Cursor Skills 연동
- `scripts/` 스캐폴딩·문서 생성 자동화
- PR 템플릿 및 리뷰 워크플로

### Phase 3: Production Readiness

- 인증·권한 (Auth)
- 데이터베이스 연동 (Infrastructure)
- 모니터링·로깅
- 스테이징·프로덕션 배포 파이프라인

### Phase 4: Ecosystem

- 재사용 가능한 스킬·템플릿 라이브러리
- 다중 프로젝트 이식 패턴
- Cursor SDK / Automations 통합

### Phase 5: AI Business OS Productization (Planned)

> 2026-07-10 구조 리팩터링 세션에서 GO 결정. AI Business OS(스킬·에이전트 체계)를
> CNBIZ Website 납품과 별도로 독립 배포 가능한 제품/스타터킷으로 패키징하는 단계.
> 아래 항목은 현재 폴더만 존재하고 콘텐츠는 비어 있는 상태 — 착수 시점 미정.

| 항목 | 목적 | 오너 | 상태 |
|------|------|------|------|
| `marketplace/` | 배포용 매니페스트(`manifest.json`)·에셋·릴리스 노트 | Human Lead(최종 승인), 세부 담당 추후 지정 | 🔲 Planned |
| `mcp/` | MCP(Model Context Protocol) 서버·툴 구현 | Human Lead(최종 승인), 세부 담당 추후 지정 | 🔲 Planned |
| `examples/` | 데모·스타터 프로젝트(`ai-project`·`api-project`·`web-project`) | Human Lead(최종 승인), 세부 담당 추후 지정 | 🔲 Planned |
| `docs/getting-started.md` | 배포 대상 사용자용 온보딩 문서 | Human Lead(최종 승인), 세부 담당 추후 지정 | 🔲 Planned |
| `docs/installation.md` | 배포 대상 사용자용 설치 문서 | Human Lead(최종 승인), 세부 담당 추후 지정 | 🔲 Planned |
| `docs/faq.md` | 배포 대상 사용자용 FAQ | Human Lead(최종 승인), 세부 담당 추후 지정 | 🔲 Planned |

이 6개 항목은 2026-07-10 구조 분석에서 "중복 문서"가 아닌 "별도 계획된 제품 인프라"로
재분류되었으며, 폴더·파일은 삭제하지 않고 유지한다. 착수 승인·담당자 지정 전까지는
Phase 4 완료 이후 순번으로 대기한다.

---

## Architecture Evolution

```
Phase 0   문서·폴더·에이전트 정의
    ↓
Phase 1   src/ 4계층 + app/ 연동
    ↓
Phase 2   에이전트·스킬·스크립트 자동화
    ↓
Phase 3   Auth, DB, CI/CD, Observability
    ↓
Phase 4   멀티 프로젝트 AI OS 템플릿
```

아키텍처 원칙은 `ARCHITECTURE.md`를 기준으로 유지하며, 계층 경계는 Phase 간에도 변경하지 않습니다.

---

## AI Automation Plan

| 영역 | 자동화 목표 | 도구 |
|------|-------------|------|
| 문서 생성 | Context/Plan/Review 템플릿 기반 스캐폴딩 | `templates/`, `scripts/` |
| 코드 생성 | Plan 승인 후 Builder Agent 구현 | Cursor Build 모드 |
| 품질 검증 | Lint, build, test, Bugbot | CI, `/review-bugbot` |
| 배포 | main 머지 시 스테이징 배포 | GitHub Actions, Vercel |
| 지식 축적 | 결정·패턴을 docs에 자동 반영 | Documenter Agent |

---

## Agent Expansion

| 에이전트 | Phase | 역할 |
|---------|-------|------|
| Planner | 0 ✅ | 설계·명세 |
| Builder | 0 ✅ | 구현 |
| Reviewer | 0 ✅ | 품질·보안 리뷰 |
| Architect | 0 ✅ | 아키텍처 거버넌스 |
| Documenter | 0 ✅ | 문서화·ADR |
| Ops | 2 | CI/CD·배포·모니터링 |
| Security | 3 | 보안 감사·의존성 스캔 |

---

## Release Strategy

| 유형 | 기준 | 채널 |
|------|------|------|
| **Docs Release** | 문서·템플릿·에이전트 정의 변경 | main 직접 머지 |
| **Alpha** | `src/` 기능 MVP, 내부 테스트 | `develop` 브랜치 |
| **Beta** | 테스트·CI 통과, 스테이징 검증 | 스테이징 환경 |
| **Stable** | Human Lead 승인, 프로덕션 배포 | `main` + 태그 |

버전: [Semantic Versioning](https://semver.org/) (`package.json` 기준)

---

## Long-term Vision

> AI가 개발 팀의 일상 업무를 대부분 수행하고, 사람은 제품 방향과 품질 기준을 정의하는 운영 체계를 완성한다.

- **End-to-end**: Context → Plan → Build → Review → Document → Deploy
- **Reusable**: 스킬·템플릿·에이전트를 다른 프로젝트에 이식
- **Documented**: 모든 결정이 저장소에 남아 다음 세대 에이전트가 학습
- **Automated**: 반복 작업은 사람 개입 없이 실행 가능

상세 비전: `PROJECT_VISION.md`
