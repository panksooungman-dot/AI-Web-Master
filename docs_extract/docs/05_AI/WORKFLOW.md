# WORKFLOW

> AI Business OS - Standard Workflow

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | WORKFLOW.md |
| Department | 05_AI |
| Version | 1.0 |
| Status | Active |
| Owner | AI Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 모든 AI와 개발자가 따라야 하는 표준 업무 절차(Standard Operating Procedure, SOP)를 정의한다.

목표는 다음과 같다.

- 업무 표준화
- 품질 향상
- 중복 작업 방지
- 문서 기반 협업
- AI 간 역할 명확화

---

# 적용 범위 (Scope)

본 워크플로우는 다음 업무에 적용한다.

- 프로젝트 기획
- 기능 개발
- UI/UX 설계
- 테스트
- 운영 및 배포
- 문서 관리

---

# 표준 업무 흐름

```text
요청(Request)
      │
      ▼
요구사항 분석
      │
      ▼
관련 문서 확인
      │
      ▼
작업 계획 수립
      │
      ▼
CEO 승인(필요 시)
      │
      ▼
개발 및 작업 수행
      │
      ▼
테스트
      │
      ▼
문서 업데이트
      │
      ▼
최종 보고
      │
      ▼
완료
```

---

# Step 1. 요청 접수

입력 문서

- REQUEST.md
- PROJECT_VISION.md

확인 사항

- 작업 목적
- 요구사항
- 우선순위
- 완료 조건

---

# Step 2. 요구사항 분석

확인 문서

- DOCUMENT_INDEX.md
- COMPANY_POLICY.md
- WBS.md

확인 내용

- 영향 범위
- 기존 기능
- 중복 여부
- 위험 요소

---

# Step 3. 작업 계획

작업 시작 전 작성

- 작업 목표
- 작업 범위
- 예상 결과
- 필요한 문서
- 담당 AI

---

# Step 4. 승인

다음 작업은 CEO 승인이 필요하다.

- Architecture 변경
- Tech Stack 변경
- Database 변경
- 배포 정책 변경
- 회사 정책 변경

---

# Step 5. 작업 수행

Development AI

- 기능 개발
- 버그 수정
- 리팩토링

Design AI

- UI
- UX
- 디자인 시스템

Operations AI

- 배포
- 운영
- SEO

Documentation AI

- 문서 작성
- 문서 수정
- INDEX 관리

---

# Step 6. 테스트

확인 항목

- Build 성공
- Type Error 없음
- Console Error 없음
- 기능 정상
- 문서 최신 상태

---

# Step 7. 문서 업데이트

필요 시 업데이트

- CHANGELOG.md
- DOCUMENT_INDEX.md
- 관련 SOP 문서
- WBS.md

---

# Step 8. 완료 보고

보고 형식

## Summary

작업 요약

## Files

변경된 파일

## Test

테스트 결과

## Risk

남은 위험 요소

## Next

다음 작업

---

# AI 협업 원칙

모든 AI는 다음을 준수한다.

- 자신의 역할만 수행
- 필요한 경우 다른 AI와 협업
- 중복 작업 금지
- 모든 변경 사항 문서화

---

# 체크리스트

## 작업 시작

- [ ] REQUEST 확인
- [ ] DOCUMENT_INDEX 확인
- [ ] WBS 확인
- [ ] 관련 문서 확인

## 작업 중

- [ ] AI_RULES 준수
- [ ] CODING_RULES 준수
- [ ] 중복 확인
- [ ] 테스트 수행

## 작업 완료

- [ ] 문서 업데이트
- [ ] CHANGELOG 기록
- [ ] 결과 보고

---

# 예외 처리

다음 상황에서는 즉시 작업을 중단하고 CEO에게 보고한다.

- 요구사항 불명확
- 구조 충돌
- 보안 문제
- 데이터 손상 위험
- 승인되지 않은 변경 요청

---

# 관련 문서

- AI_RULES.md
- AGENTS.md
- TOKEN_POLICY.md
- COMPANY_POLICY.md
- DOCUMENT_INDEX.md
- REQUEST.md
- WBS.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |