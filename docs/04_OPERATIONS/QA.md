# QA

> AI Business OS - Quality Assurance Standard Operating Procedure

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | QA.md |
| Department | 04_OPERATIONS |
| Version | 1.0 |
| Status | Active |
| Owner | QA Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS의 품질 보증(QA) 표준과 테스트 절차를 정의한다.

목표

- 안정적인 서비스 제공
- 버그 최소화
- 테스트 표준화
- 릴리즈 품질 향상
- 사용자 만족도 향상

---

# 적용 범위 (Scope)

본 문서는 다음에 적용한다.

- Web Application
- Admin Dashboard
- API
- Database
- AI 기능
- 운영 환경

---

# QA 원칙

## 1. Quality First

속도보다 품질을 우선한다.

---

## 2. Test Before Release

테스트가 완료되지 않은 기능은 배포하지 않는다.

---

## 3. Repeatable

모든 테스트는 반복 가능해야 한다.

---

## 4. Documentation

테스트 결과는 반드시 기록한다.

---

# 테스트 종류

## Unit Test

개별 함수와 컴포넌트를 검증한다.

---

## Integration Test

기능 간 연동을 검증한다.

---

## End-to-End Test

사용자 시나리오를 검증한다.

---

## Regression Test

기존 기능이 정상 동작하는지 확인한다.

---

## Manual Test

사용자가 직접 사용하는 방식으로 검증한다.

---

# 테스트 절차

```text
기능 개발 완료
        │
        ▼
Unit Test
        │
        ▼
Integration Test
        │
        ▼
Manual Test
        │
        ▼
Regression Test
        │
        ▼
QA 승인
        │
        ▼
배포
```

---

# 테스트 체크리스트

## 기능

- [ ] 정상 동작
- [ ] 예외 처리
- [ ] 오류 메시지
- [ ] 권한 확인

---

## UI

- [ ] 반응형
- [ ] 버튼 동작
- [ ] 입력 검증
- [ ] 레이아웃

---

## API

- [ ] 응답 코드
- [ ] 응답 시간
- [ ] 오류 처리
- [ ] 인증 확인

---

## Database

- [ ] CRUD 정상
- [ ] 데이터 무결성
- [ ] 권한 확인

---

# 버그 관리

버그는 다음 정보를 기록한다.

- 제목
- 설명
- 재현 방법
- 예상 결과
- 실제 결과
- 심각도
- 담당자
- 상태

---

# 우선순위

| Level | 설명 |
|--------|------|
| Critical | 서비스 중단 |
| High | 핵심 기능 오류 |
| Medium | 일반 기능 오류 |
| Low | 경미한 UI 문제 |

---

# 완료 기준 (Definition of Done)

다음을 모두 만족해야 완료로 인정한다.

- 기능 구현 완료
- 테스트 완료
- 버그 수정 완료
- 문서 업데이트 완료
- 코드 리뷰 완료

---

# QA 보고서

## Summary

작업 요약

## Test Scope

테스트 범위

## Result

성공 / 실패

## Bugs

발견된 버그

## Recommendation

배포 가능 여부

---

# 금지 사항

다음을 금지한다.

- 테스트 없이 배포
- Critical 버그 무시
- 테스트 결과 미기록
- 재현되지 않은 버그 종료

---

# 체크리스트

## 테스트 전

- [ ] 요구사항 확인
- [ ] 테스트 환경 준비
- [ ] 테스트 데이터 준비

## 테스트 중

- [ ] 테스트 기록
- [ ] 버그 등록
- [ ] 재현 여부 확인

## 테스트 후

- [ ] 결과 보고
- [ ] CHANGELOG 확인
- [ ] 배포 승인 여부 확인

---

# 관련 문서

- DEPLOYMENT.md
- ARCHITECTURE.md
- TECH_STACK.md
- COMPANY_POLICY.md
- CHANGELOG.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |