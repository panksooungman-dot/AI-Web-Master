# Context: Project Foundation

> 작성일: 2026-06-28  
> 작성자: Lead AI Architect  
> 상태: Active  
> 관련: `PROJECT_VISION.md`, `PROJECT_ROADMAP.md`, `ARCHITECTURE.md`

---

## Summary

`ai-web-master`는 단순 웹 앱이 아니라 **AI Development Operating System (AI Dev OS)** 을 구축하는 프로젝트입니다. AI 에이전트와 사람이 문서·재사용 워크플로·모듈형 아키텍처로 협업하여, 반복 가능하고 예측 가능한 소프트웨어 개발 환경을 만드는 것이 본 문서의 맥락입니다.

---

## Project Background

소프트웨어 팀은 AI 도구(Cursor, Copilot 등)를 개별적으로 사용하지만, **팀 차원의 일관된 운영 체계**는 대부분 갖추지 못했습니다. 프롬프트·규칙·워크플로가 사람마다 다르고, AI가 생성한 코드와 문서가 저장소에 체계적으로 축적되지 않습니다.

이 프로젝트는 Next.js 16 기반 웹 애플리케이션 저장소를 **실험장이자 실행 가능한 MVP**로 사용하여, AI 우선 개발 운영 체계를 설계·검증·문서화합니다.

현재 **Phase 0 (Foundation)** 단계로, 비전 문서·에이전트 정의·템플릿·Cursor Rules·폴더 구조가 구축되었으며, 애플리케이션 코드와 CI/CD는 아직 미구현 상태입니다.

---

## Problem Statement

| 문제 | 설명 |
|------|------|
| **비일관성** | AI 사용 방식이 개인·세션마다 달라 결과물 품질이 들쭉날쭉함 |
| **맥락 손실** | 의도·제약·결정 사유가 코드에만 남거나 소실됨 |
| **재사용 부재** | 동일 작업(페이지 추가, API 스캐폴딩 등)을 매번 처음부터 수행 |
| **아키텍처 침식** | AI가 빠르게 코드를 생성하지만 계층 경계가 무너지기 쉬움 |
| **자동화 공백** | 문서·리뷰·배포 파이프라인이 AI 워크플로와 연결되지 않음 |

**핵심 문제**: AI는 강력한 도구이지만, **운영 체계 없이는 팀 자산으로 축적되지 않는다.**

---

## Goals

### Primary Goals

1. **AI Dev OS 골격 완성** — 문서, 에이전트, 템플릿, 규칙, 폴더 구조
2. **문서 우선 워크플로 실증** — Context → Plan → Build → Review → Document
3. **클린 아키텍처 기반** — `src/` 4계층 + Next.js `app/` 분리
4. **재사용 자산 축적** — 스킬, 템플릿, 스크립트를 버전 관리

### Secondary Goals

5. 첫 기능 MVP (예: AI 채팅 UI)로 end-to-end 사이클 검증
6. CI/CD 및 테스트 자동화 도입
7. 다른 프로젝트에 이식 가능한 패턴 정립

---

## Target Users

| 사용자 | 역할 | 이 프로젝트에서 얻는 가치 |
|--------|------|---------------------------|
| **Human Lead** | 비전·우선순위·최종 승인 | 예측 가능한 AI 산출물, 검토 부담 감소 |
| **개발자 (사람)** | 구현·아키텍처·코드 리뷰 | 문서화된 맥락, 재사용 템플릿·스킬 |
| **AI 에이전트** | Planner, Builder, Reviewer 등 | 명확한 규칙·handoff·입출력 정의 |
| **향후 팀원** | 온보딩 대상 | `docs/07_KNOWLEDGE/`, `docs/05_AI/`, `docs/06_TEMPLATES/` 로 빠른 적응 |
| **다른 프로젝트** | OS 패턴 이식 | 템플릿·스킬·폴더 구조 재사용 |

---

## Expected Outcome

### Phase 0 (현재 목표)

- ✅ 비전·규칙·아키텍처·로드맵 문서
- ✅ `docs/`, `docs/05_AI/`, `docs/06_TEMPLATES/` 구조
- ✅ `.cursor/rules/` (development, documentation, architecture)
- ✅ 첫 Context 문서 (본 문서)
- 🔲 첫 Plan 문서 → Build → Review → Document 사이클

### Phase 1+ (후속)

- `src/` 4계층 스캐폴딩 및 첫 MVP 기능
- GitHub Actions (lint, build)
- `docs/05_AI/skills/` 실제 스킬 + Cursor 연동
- `scripts/` 자동화 스크립트

### 최종 상태

> AI가 일상 개발 업무를 대부분 수행하고, 사람은 제품 방향과 품질 기준을 정의하는 운영 체계.

---

## Constraints

### Technical

| 제약 | 설명 |
|------|------|
| **Next.js 16** | API·관례가 이전 버전과 다름 — `node_modules/next/dist/docs/` 필수 참조 |
| **App Router only** | Pages Router 패턴 사용 금지 |
| **Clean Architecture** | `app/` = 라우팅·조합, 비즈니스 로직 = `src/` |
| **No premature code** | Plan 승인 없이 `src/` 코드 생성 금지 |
| **TypeScript** | 강타입 우선, `any` 남용 금지 |

### Process

| 제약 | 설명 |
|------|------|
| **Documentation First** | Context·Plan 선행 |
| **Minimal scope** | 요청 범위 외 변경·리팩터링 금지 |
| **No secrets in docs** | 자격 증명 값은 문서에 기록하지 않음 |
| **Human Lead approval** | Plan·프로덕션 배포는 승인 필요 |

### Current Limitations

- Database, Authentication: 미선정 (`TECH_STACK.md` TBD)
- CI/CD, 테스트 프레임워크: 미구축
- `scripts/` 실행 파일: 없음 (README만 존재)

---

## Success Criteria

### Phase 0 완료 기준

| # | 기준 | 측정 |
|---|------|------|
| 1 | OS 문서 세트 완비 | `PROJECT_VISION`, `AI_RULES`, `ARCHITECTURE`, `TECH_STACK`, `ROADMAP` 존재 |
| 2 | 워크플로 인프라 | `docs/`, `docs/05_AI/`, `docs/06_TEMPLATES/`, `.cursor/rules/` 존재 |
| 3 | 첫 Context 문서 | `docs/07_KNOWLEDGE/001-project-foundation.md` (본 문서) |
| 4 | Cursor Rules 연동 | 3개 `.mdc` 규칙 활성 |
| 5 | 기존 파일 무결성 | 앱 코드·설정 의도치 않은 변경 없음 |

### Phase 1 진입 기준

| # | 기준 | 측정 |
|---|------|------|
| 6 | 첫 Plan 승인 | `docs/08_PLANS/` 에 Approved 문서 1건 이상 |
| 7 | `src/` 스캐폴딩 | 4계층 폴더 생성 |
| 8 | CI 최소 파이프라인 | lint + build 통과 |
| 9 | End-to-end 사이클 | Context → Plan → Build → Review → Document 1회 완료 |

### Long-term Metrics

- Plan 없이 머지된 `src/` 변경: **0건**
- 기능당 Context + Plan + Build 문서: **100%**
- 재사용 템플릿/스킬 사용률: **≥ 50%** (Phase 2)

---

## References

- [`PROJECT_VISION.md`](../00_COMPANY/PROJECT_VISION.md)
- [`PROJECT_ROADMAP.md`](../01_PMO/PROJECT_ROADMAP.md)
- [`ARCHITECTURE.md`](../02_DEVELOPMENT/ARCHITECTURE.md)
- [`AI_RULES.md`](../05_AI/AI_RULES.md)
- [`docs/06_TEMPLATES/context-template.md`](../06_TEMPLATES/context-template.md)
