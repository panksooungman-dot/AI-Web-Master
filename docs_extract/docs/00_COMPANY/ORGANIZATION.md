# Organization

AI Dev OS를 하나의 **회사(Company)** 로 보았을 때의 조직 구조, 역할 체계, 의사결정 권한을 정의하는 문서입니다.

---

## 1. Overview

이 저장소가 운영하는 조직은 **Human Lead 1인 + AI Agent 다수**로 구성된 최소 조직입니다.

- **Human Lead**: 비전, 우선순위, 최종 승인을 담당하는 유일한 사람 역할
- **AI Agents**: Context → Plan → Build → Review → Document 전 단계를 수행하는 실행 단위

조직의 목적은 사람 1인이 여러 AI 에이전트를 지휘하여, 팀 단위 개발 조직과 동등한 산출물·품질·문서화 수준을 만들어내는 것입니다.

---

## 2. Org Chart

```
                    ┌───────────────┐
                    │  Human Lead   │
                    │ (비전·승인)    │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │   Architect   │
                    │ (아키텍처 거버넌스) │
                    └───────┬───────┘
                            │
        ┌──────────┬────────┼────────┬───────────┐
        ▼          ▼        ▼        ▼           ▼
   ┌─────────┐┌─────────┐┌────────┐┌───────────┐┌──────────┐
   │ Planner ││ Builder ││Reviewer││ Documenter ││ (Planned) │
   │  Plan   ││  Build  ││ Review ││  Document  ││ Ops / Sec │
   └─────────┘└─────────┘└────────┘└───────────┘└──────────┘
```

Architect는 Human Lead와 실행 에이전트(Planner/Builder/Reviewer/Documenter) 사이에서 아키텍처 정합성을 감독하는 중간 계층입니다.

---

## 3. Role Directory

| 역할 | 미션(1줄) | 상태 | 상세 문서 |
|------|-----------|------|-----------|
| Human Lead | 비전·우선순위·최종 승인 | Active | — |
| Architect | 아키텍처 거버넌스·에이전트 간 중재 | Active | `docs/05_AI/Architect.md` |
| Planner | 요구사항 분석·설계·명세 문서화 | Active | `docs/05_AI/Planner.md` |
| Builder | 승인된 Plan에 따른 구현 | Active | `docs/05_AI/Builder.md` |
| Reviewer | 품질·보안·아키텍처 검토 | Active | `docs/05_AI/Reviewer.md` |
| Documenter | 구현·운영 지식 문서화 | Active | `docs/05_AI/Documenter.md` |
| Ops | CI/CD·배포·모니터링 자동화 | Planned | — |
| Security | 보안 감사·의존성 스캔 | Planned | — |

역할별 세부 책임(Responsibilities/Inputs/Outputs/Rules)은 상세 문서를 기준으로 하며, 본 문서는 조직 구조 관점의 요약만 다룹니다.

---

## 4. Decision Rights (RACI)

| 의사결정 유형 | Responsible | Accountable | Consulted | Informed |
|---------------|-------------|-------------|-----------|----------|
| 아키텍처 변경 (계층 경계·기술 스택) | Architect | Human Lead | Planner, Builder | Reviewer, Documenter |
| 기능 설계 (Plan 승인) | Planner | Human Lead | Architect | Builder |
| 코드 구현 | Builder | Architect | Planner | Reviewer |
| 품질·보안 리뷰 | Reviewer | Human Lead | Architect | Builder, Documenter |
| 문서화 방식·구조 | Documenter | Human Lead | Architect | All |
| 프로덕션 배포 | Human Lead | Human Lead | Architect, Ops | All |
| 조직·정책 변경 | Human Lead | Human Lead | Architect | All |

---

## 5. Escalation Path

```
Agent 간 이견 발생
      │
      ▼
  Architect 조정
      │
      ▼ (해결 안 될 경우)
  Human Lead 최종 결정
```

- 승인이 필요한 작업(정책 문서 기준)을 에이전트가 발견하면, 즉시 Human Lead에게 보고하고 승인 전까지 실행하지 않습니다.
- 아키텍처 원칙과 충돌하는 요청은 Architect가 1차로 검토한 뒤 Human Lead에게 트레이드오프를 보고합니다.

---

## 6. Growth Model

신규 역할(Ops, Security 등)을 조직에 편입하는 절차:

1. Architect가 필요성과 범위를 제안
2. Human Lead가 편입 여부 승인
3. 신규 역할의 상세 정의 문서를 `docs/05_AI/`에 작성
4. 본 문서의 Role Directory와 Org Chart를 갱신

역할 편입 시점의 기준은 `PROJECT_ROADMAP.md`의 Phase 진입 조건을 따릅니다.

---

*관리: Human Lead*
