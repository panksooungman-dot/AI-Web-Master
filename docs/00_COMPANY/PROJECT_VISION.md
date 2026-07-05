# AI Development Operating System

## Vision

이 프로젝트는 단순한 웹 애플리케이션이 아니라, **AI가 주도하고 사람이 감독하는 개발 운영 체계(AI Development Operating System)** 를 구축하는 것을 목표로 합니다.

소프트웨어 개발의 반복 작업, 의사결정, 문서화, 자동화를 하나의 일관된 시스템으로 통합하여, 팀이 더 빠르고 안정적으로 제품을 만들 수 있는 환경을 제공합니다.

---

## Core Principles

| 원칙 | 설명 |
|------|------|
| **AI First** | AI를 보조 도구가 아닌 개발 프로세스의 핵심 주체로 설계 |
| **Automation First** | 수동 반복 작업을 자동화하고, 사람은 검토·판단에 집중 |
| **Documentation First** | 코드보다 먼저 의도와 맥락을 문서로 남김 |
| **Reusable System** | 한 번 만든 패턴·스킬·워크플로를 재사용 가능하게 설계 |
| **Clean Architecture** | 관심사 분리와 명확한 경계로 장기 유지보수를 보장 |

---

## AI First

- 모든 개발 단계(기획, 설계, 구현, 테스트, 리뷰, 배포)에 AI 에이전트를 기본 단위로 포함합니다.
- 사람은 **목표 설정, 우선순위 결정, 최종 승인**에 집중합니다.
- AI는 코드 생성, 리팩터링, 문서 작성, 테스트 보조, CI/CD 트리거 등 실행 가능한 작업을 담당합니다.
- 프롬프트, 스킬, 규칙(rules)을 코드베이스에 버전 관리하여 AI 동작을 예측 가능하게 만듭니다.

---

## Automation First

- 반복되는 개발·운영 작업은 스크립트, 훅(hooks), CI 파이프라인, 에이전트 워크플로로 자동화합니다.
- 린트, 빌드, 테스트, 배포, PR 리뷰, 이슈 트리아지 등을 **사람 개입 최소화** 원칙으로 설계합니다.
- 자동화 실패 시 명확한 로그와 복구 경로를 제공하여, 무인 운영이 가능한 수준을 지향합니다.

---

## Documentation First

- 기능·아키텍처·결정 사항은 구현 전후로 문서에 반영합니다.
- `AGENTS.md`, `PROJECT_VISION.md`, 스킬(SKILL.md), 규칙(rules)을 AI와 사람이 공유하는 **단일 진실 공급원(Single Source of Truth)** 으로 활용합니다.
- 코드만으로는 전달되지 않는 **의도, 제약, 트레이드오프**를 문서로 남깁니다.

---

## Reusable System

- 페이지 추가, API 라우트 생성, 컴포넌트 스캐폴딩 등 공통 작업은 **템플릿·스킬·보일러플레이트**로 추상화합니다.
- 프로젝트 간 이식 가능한 패턴(에이전트 구조, 자동화 스크립트, 문서 형식)을 유지합니다.
- 한 번 해결한 문제는 다음 프로젝트에서 다시 풀지 않도록 시스템 자산으로 축적합니다.

---

## Clean Architecture

- **Presentation → Application → Domain → Infrastructure** 계층을 명확히 구분합니다.
- UI, 비즈니스 로직, 외부 API·DB 연동을 분리하여 테스트와 교체가 용이하도록 합니다.
- Next.js App Router, 서버/클라이언트 경계, API 라우트를 일관된 규칙으로 운영합니다.
- 의존성은 안쪽(도메인)을 향하게 하여, 프레임워크·라이브러리 변경에 유연하게 대응합니다.

---

## Long-Term Goal

**AI가 개발 팀의 일상 업무를 대부분 수행하고, 사람은 제품 방향과 품질 기준을 정의하는 운영 체계**를 완성하는 것입니다.

- 신규 기능: Plan(설계) → Build(구현) → 자동 검증 → 배포까지 end-to-end 파이프라인
- 레거시 개선: 문서화 → 리팩터 계획 → 점진적 마이그레이션
- 지식 축적: 모든 결정과 패턴이 저장소와 스킬 라이브러리에 남아 다음 세대 에이전트가 학습

---

## AI Team Structure

| 역할 | 책임 |
|------|------|
| **Planner Agent** | 요구사항 분석, 아키텍처 제안, 트레이드오프 문서화 (Plan 모드) |
| **Builder Agent** | 코드 구현, 리팩터링, 테스트 작성 (Build/Agent 모드) |
| **Reviewer Agent** | Bugbot·Security Review 등 품질·보안 검토 |
| **Ops Agent** | CI/CD, 배포, 모니터링, 인시던트 대응 자동화 |
| **Human Lead** | 비전·우선순위·최종 승인·윤리·비즈니스 판단 |

에이전트 간 handoff는 문서(`PROJECT_VISION.md`, PR 설명, 스킬)와 Git 이력으로 추적합니다.

---

## Technology Stack

| 영역 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4 |
| **Language** | TypeScript |
| **AI / Agents** | Cursor Agents, Skills, Rules, Automations |
| **Quality** | ESLint, (확장) 테스트·CI 파이프라인 |
| **Docs** | Markdown (`AGENTS.md`, `PROJECT_VISION.md`, `.cursor/rules`) |

Next.js 16은 기존 버전과 API·관례가 다를 수 있으므로, 구현 전 `node_modules/next/dist/docs/` 를 참조합니다.

---

## Project Goal

`ai-web-master`는 위 비전을 **실행 가능한 최소 제품(MVP)** 으로 구현하는 저장소입니다.

1. AI 친화적 프로젝트 구조와 문서 체계 확립  
2. Plan / Build / Skills / Context(`@`) 워크플로 실증  
3. 재사용 가능한 스킬·규칙·자동화 템플릿 제공  
4. 확장 가능한 클린 아키텍처 기반 위에 실제 AI 기능(채팅, 에이전트 오케스트레이션 등) 추가  

---

## Final Mission

> **개발을 “사람이 코드를 치는 일”에서 “사람과 AI가 함께 시스템을 운영하는 일”로 전환한다.**

우리는 도구를 모으는 것이 아니라, **반복 가능하고 문서화되고 자동화된 AI 개발 운영 체계**를 만듭니다.  
그 결과로 더 빠른 배포, 더 높은 품질, 더 적은 기술 부채, 그리고 팀이 제품 가치에 집중할 수 있는 환경을 제공합니다.
