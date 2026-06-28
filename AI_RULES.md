# AI Rules

이 문서는 이 저장소에서 작업하는 **모든 AI 에이전트**가 따라야 하는 운영 규칙을 정의합니다.

---

## Purpose

이 저장소는 **AI Development Operating System** 입니다. AI 에이전트는 단순 코드 생성기가 아니라, 문서화·설계·구현·검토를 일관되게 수행하는 **개발 운영 체계의 일원**입니다.

이 규칙의 목적:

- `PROJECT_VISION.md`, `ARCHITECTURE.md`, `docs/` 와 정렬된 방식으로 작업
- 예측 가능하고 재현 가능한 개발 워크플로 유지
- 아키텍처 품질과 장기 유지보수성 보호
- Human Lead가 검토·승인하기 쉬운 산출물 생성

---

## AI Philosophy

### AI First

AI 에이전트는 개발 프로세스의 **기본 작업 단위**입니다. 기획, 설계, 구현, 테스트, 리뷰, 문서화에 AI를 포함하고, 사람은 목표·우선순위·최종 승인에 집중합니다.

### Automation First

반복 작업은 스크립트, CI, 에이전트 워크플로로 자동화합니다. 사람 개입은 검토·판단·예외 처리에 한정합니다.

### Documentation First

코드보다 **의도와 맥락**을 먼저 문서로 남깁니다. Plan 없이 Build를 시작하지 않습니다.

### Reuse Before Rewrite

`templates/`, `docs/skills/`, 기존 `src/` 모듈을 우선 재사용합니다. 동일 패턴을 매번 새로 작성하지 않습니다.

### Explain Before Coding

구현 전에 접근 방식, 대안, 영향 범위를 설명합니다. 대량 수정·삭제는 사전에 근거를 제시합니다.

### Think Before Coding

요구사항, 제약, 기존 문서·코드를 이해한 뒤에만 코드를 작성합니다.

---

## Development Workflow

모든 작업은 다음 순서를 따릅니다.

| 단계 | 위치 | 설명 |
|------|------|------|
| **Context** | `docs/context/` | 배경, 용어, 제약, 의사결정 맥락 수집 |
| **Plan** | `docs/plan/` | 설계, 명세, 트레이드오프 문서화 |
| **Build** | `src/`, `app/` | 승인된 설계에 따른 최소 범위 구현 |
| **Review** | PR, `agents/Reviewer.md` | 품질·보안·아키텍처 검토 |
| **Document** | `docs/build/`, 관련 README | 구현·배포·운영 지식 기록 |

```
Context → Plan → Build → Review → Document
```

---

## Coding Standards

| 원칙 | 설명 |
|------|------|
| **Readable** | 읽기 쉬운 코드를 우선. 과도한 추상화 지양 |
| **Reusable** | 공통 로직은 모듈·컴포넌트·유틸로 추출 |
| **Small Modules** | 단일 책임, 작은 파일·함수 단위 |
| **Clean Architecture** | Presentation → Application → Domain → Infrastructure |
| **Strong Typing** | TypeScript 사용 시 명시적 타입, `any` 남용 금지 |
| **No Duplicated Logic** | 중복은 공통 계층으로 통합 |

추가 준수:

- Next.js 16 작업 시 `node_modules/next/dist/docs/` 참조, deprecated API 금지
- 요청 범위 외 리팩터링·의존성 추가 금지
- 파일 덮어쓰기 시 변경 이유 명시

---

## Documentation Rules

모든 기능·수정은 다음 문서 흐름을 갖춥니다.

| 단계 | 필수 내용 |
|------|-----------|
| **Context** | 왜 필요한가, 제약, 관련 맥락 |
| **Plan** | 무엇을 만들 것인가, 설계, API·데이터 모델 |
| **Implementation** | 무엇을 구현했는가, `docs/build/` 기록 |
| **Review** | 검토 결과, 미해결 이슈, 승인 여부 |

템플릿: `templates/context-template.md`, `templates/plan-template.md`, `templates/review-template.md`

---

## Communication

모든 주요 응답·변경 설명에 다음을 포함합니다.

| 항목 | 설명 |
|------|------|
| **Why** | 왜 이 접근을 선택했는가 |
| **What** | 무엇을 변경·추가했는가 |
| **Impact** | 모듈, 배포, 사용자, 문서에 미치는 영향 |

불확실한 사항은 추측 구현 대신 가정을 명시하거나 Human Lead에게 확인을 요청합니다.

---

Every AI working inside this repository must follow these rules.
