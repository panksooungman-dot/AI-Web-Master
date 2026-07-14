# TOKEN_POLICY

> AI Business OS - Token Management Policy

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | TOKEN_POLICY.md |
| Department | 05_AI |
| Version | 1.0 |
| Status | Active |
| Owner | AI Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 토큰 사용을 최적화하고, AI가 필요한 정보만 효율적으로 참조하도록 하는 표준 정책을 정의한다.

목표는 다음과 같다.

- 토큰 사용량 최소화
- 응답 속도 향상
- 문서 중복 방지
- 컨텍스트 관리 표준화
- AI 협업 효율 향상

---

# 적용 범위 (Scope)

본 정책은 다음 AI에 적용한다.

- PM AI
- Development AI
- Design AI
- Operations AI
- Documentation AI
- QA AI

---

# 핵심 원칙

## 1. Read Only What You Need

작업과 관련된 문서만 읽는다.

불필요한 문서는 읽지 않는다.

---

## 2. Single Source of Truth

동일한 내용은 하나의 문서에서만 관리한다.

다른 문서는 링크로 참조한다.

---

## 3. Document First

필요한 정보는 먼저 문서에서 찾는다.

추측하여 작성하지 않는다.

---

## 4. Reuse Context

이미 확인한 정보는 반복해서 다시 요청하지 않는다.

가능한 기존 컨텍스트를 활용한다.

---

# 문서 참조 우선순위

모든 AI는 아래 순서를 따른다.

1. DOCUMENT_INDEX.md
2. COMPANY_POLICY.md
3. REQUEST.md
4. WBS.md
5. 부서별 SOP 문서
6. 프로젝트 문서

---

# 문서 참조 규칙

## 항상 읽는 문서

- DOCUMENT_INDEX.md
- COMPANY_POLICY.md

---

## 필요 시 읽는 문서

Development 작업

- CODING_RULES.md
- TECH_STACK.md
- ARCHITECTURE.md

Design 작업

- DESIGN_SYSTEM.md
- UI_GUIDE.md
- UX_GUIDE.md

Operations 작업

- DEPLOYMENT.md
- QA.md
- SEO.md
- ANALYTICS.md

---

# 토큰 절약 규칙

AI는 다음을 준수한다.

- 같은 문서를 반복해서 읽지 않는다.
- 필요한 범위만 참조한다.
- 긴 문서를 모두 출력하지 않는다.
- 요약 가능한 내용은 요약한다.
- 중복 설명을 피한다.

---

# 문서 작성 규칙

문서 작성 시

- 중복 내용 금지
- 하나의 목적만 가진다.
- 다른 문서는 링크로 참조한다.
- 공통 내용은 중앙 문서에서 관리한다.

---

# 컨텍스트 관리

새 작업 시작 시

- 현재 작업과 관련 없는 내용은 제외한다.
- 필요한 문서만 컨텍스트에 포함한다.

긴 프로젝트에서는

- 작업 단위로 컨텍스트를 분리한다.
- 완료된 작업은 요약 후 종료한다.

---

# AI 응답 원칙

응답은 다음 기준을 따른다.

- 간결하게 작성
- 핵심 내용 우선
- 필요한 경우만 상세 설명
- 불필요한 예시 최소화

---

# 금지 사항

다음 행동을 금지한다.

- 전체 문서를 반복 출력
- 동일한 설명 반복
- 중복 문서 생성
- 관련 없는 문서 참조
- 추측 기반 답변

---

# 체크리스트

작업 시작

- [ ] 필요한 문서만 확인
- [ ] 관련 없는 문서 제외
- [ ] DOCUMENT_INDEX 확인

작업 중

- [ ] 중복 설명 제거
- [ ] 문서 참조 최소화
- [ ] 필요한 정보만 사용

작업 완료

- [ ] 문서 업데이트 확인
- [ ] 중복 내용 여부 확인

---

# 관련 문서

- AI_RULES.md
- AGENTS.md
- WORKFLOW.md
- DOCUMENT_INDEX.md
- COMPANY_POLICY.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |