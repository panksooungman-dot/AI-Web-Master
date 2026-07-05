# WBS

> AI Business OS - Work Breakdown Structure Standard

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | WBS.md |
| Department | 01_PMO |
| Version | 1.0 |
| Status | Active |
| Owner | PM Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 프로젝트를 관리 가능한 작업(Task) 단위로 분해하고 일정, 우선순위, 담당자 및 진행 상태를 체계적으로 관리하기 위한 표준 문서이다.

목표

- 작업 범위 명확화
- 일정 관리
- 책임 분담
- 진행 상황 추적
- 프로젝트 리스크 감소

---

# 적용 범위 (Scope)

본 문서는 다음 프로젝트에 적용한다.

- 신규 프로젝트
- 기능 개발
- 리팩토링
- 유지보수
- 운영 개선

---

# WBS 작성 원칙

## 1. 작은 작업으로 분해

각 작업은 가능한 한 하루~3일 이내에 완료 가능한 크기로 분해한다.

---

## 2. 명확한 결과물 정의

모든 작업은 완료 여부를 판단할 수 있는 산출물을 가진다.

---

## 3. 담당자 지정

모든 작업에는 책임 담당자를 지정한다.

---

## 4. 진행 상태 관리

작업은 아래 상태 중 하나를 가진다.

- Not Started
- In Progress
- Review
- Done
- Blocked

---

# 프로젝트 정보

| 항목 | 내용 |
|------|------|
| Project | |
| Version | |
| Start Date | |
| Target Date | |
| PM | |

---

# WBS 표준

| ID | 작업 | 담당 | 우선순위 | 상태 | 산출물 |
|----|------|------|----------|------|--------|
| 1.0 | 프로젝트 기획 | PM | High | Done | REQUEST |
| 2.0 | UI/UX 설계 | Design | High | In Progress | Design Docs |
| 3.0 | Backend 개발 | Development | High | Not Started | API |
| 4.0 | Frontend 개발 | Development | High | Not Started | UI |
| 5.0 | QA | QA | Medium | Not Started | Test Report |
| 6.0 | 배포 | Operations | Medium | Not Started | Release |

---

# 작업 상세 템플릿

## 작업 ID

```
1.1
```

### 작업명

-

### 목적

-

### 담당자

-

### 우선순위

- High
- Medium
- Low

### 예상 기간

-

### 선행 작업

-

### 산출물

-

### 완료 기준

- [ ]
- [ ]
- [ ]

---

# 마일스톤

| Milestone | 목표일 | 상태 |
|------------|--------|------|
| 요구사항 완료 | | |
| 설계 완료 | | |
| 개발 완료 | | |
| QA 완료 | | |
| 배포 완료 | | |

---

# 우선순위 기준

## High

- 핵심 기능
- 일정 영향
- 고객 요구사항

## Medium

- 일반 기능
- 운영 개선

## Low

- 개선 사항
- 최적화

---

# 진행률 계산

```
진행률 = 완료 작업 수 ÷ 전체 작업 수 × 100
```

예시

```
전체 작업 : 20

완료 : 12

진행률 : 60%
```

---

# 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| 일정 지연 | High | 우선순위 조정 |
| 요구사항 변경 | Medium | 변경 관리 |
| 기술 이슈 | High | 기술 검토 |

---

# 변경 관리

다음 변경은 반드시 기록한다.

- 작업 추가
- 작업 삭제
- 일정 변경
- 담당자 변경
- 우선순위 변경

---

# 완료 기준 (Definition of Done)

다음 조건을 모두 만족해야 작업 완료로 인정한다.

- 기능 구현 완료
- 테스트 완료
- 코드 리뷰 완료
- 문서 업데이트 완료
- 승인 완료

---

# 체크리스트

## 프로젝트 시작

- [ ] REQUEST 작성
- [ ] WBS 작성
- [ ] 담당자 지정
- [ ] 일정 수립

## 프로젝트 진행

- [ ] 진행률 업데이트
- [ ] 위험 요소 확인
- [ ] 일정 점검

## 프로젝트 종료

- [ ] 모든 작업 완료
- [ ] CHANGELOG 업데이트
- [ ] 산출물 검토
- [ ] 프로젝트 종료 승인

---

# 관련 문서

- REQUEST.md
- PROJECT_ROADMAP.md
- CHANGELOG.md
- AI_RULES.md
- COMPANY_POLICY.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |