# UX_GUIDE

> AI Business OS - User Experience Guide

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | UX_GUIDE.md |
| Department | 03_DESIGN |
| Version | 1.0 |
| Status | Active |
| Owner | Design Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS의 사용자 경험(UX) 설계 기준을 정의한다.

목표

- 직관적인 사용자 경험 제공
- 사용자의 작업 효율 향상
- 일관된 UX 패턴 유지
- 접근성과 사용성 향상
- 사용자 중심의 서비스 구축

---

# 적용 범위 (Scope)

본 문서는 다음에 적용한다.

- Web Application
- Admin Dashboard
- Mobile Web
- AI 서비스
- 내부 업무 시스템

---

# UX 핵심 원칙

## 1. User First

모든 기능은 사용자의 목적을 우선으로 설계한다.

---

## 2. Simplicity

복잡한 절차보다 단순하고 이해하기 쉬운 흐름을 제공한다.

---

## 3. Consistency

동일한 기능은 동일한 인터랙션과 UI를 사용한다.

---

## 4. Efficiency

최소한의 클릭으로 원하는 작업을 완료할 수 있어야 한다.

---

## 5. Feedback

사용자의 모든 행동에는 즉시 피드백을 제공한다.

---

# 사용자 중심 설계

항상 다음 질문을 기준으로 설계한다.

- 사용자는 무엇을 하려는가?
- 가장 빠른 방법은 무엇인가?
- 실수할 가능성은 없는가?
- 초보자도 이해할 수 있는가?

---

# User Journey

기본 흐름

```text
진입

↓

정보 확인

↓

작업 수행

↓

결과 확인

↓

완료
```

모든 단계는 자연스럽게 연결되어야 한다.

---

# Information Architecture (IA)

정보 구조는 다음 원칙을 따른다.

- 단순한 계층 구조
- 명확한 메뉴명
- 최대 3단계 깊이 권장
- 관련 기능끼리 그룹화

---

# Navigation

메뉴는 다음을 제공한다.

- 현재 위치 표시
- Breadcrumb
- 이전 화면 이동
- 홈으로 이동

---

# 사용성 (Usability)

다음을 항상 고려한다.

- 배우기 쉬운가?
- 기억하기 쉬운가?
- 빠르게 사용할 수 있는가?
- 오류를 쉽게 복구할 수 있는가?

---

# 접근성 (Accessibility)

다음을 준수한다.

- 키보드만으로 사용 가능
- 충분한 색상 대비
- Focus 표시
- Alt Text 제공
- Semantic HTML 사용

---

# 피드백 (Feedback)

사용자 행동에는 즉시 피드백을 제공한다.

예시

- 저장 완료
- 삭제 완료
- 업로드 진행률
- 오류 안내
- 성공 메시지

---

# Error UX

오류 발생 시

- 원인을 이해하기 쉽게 설명한다.
- 해결 방법을 함께 제공한다.
- 재시도 기능을 제공한다.
- 시스템 오류는 사용자에게 노출하지 않는다.

---

# Empty State

데이터가 없는 경우

- 이유 설명
- 다음 행동 안내
- 생성 버튼 제공

---

# Loading UX

로딩 상태에서는

- Skeleton UI
- Progress Bar
- Spinner

중 상황에 맞는 방식을 사용한다.

---

# Form UX

모든 입력 폼은

- Label 제공
- Placeholder 제공
- 실시간 Validation
- 오류 메시지 표시
- 저장 여부 안내

를 포함한다.

---

# 사용자 실수 방지

다음을 적용한다.

- 삭제 확인
- 자동 저장
- 실행 취소(Undo)
- 입력값 검증
- 위험 작업 경고

---

# 반응형 UX

Mobile First를 기본으로 설계한다.

반응형에서도

- 동일한 기능
- 동일한 정보
- 동일한 경험

을 제공해야 한다.

---

# UX 체크리스트

설계 전

- [ ] 사용자 목표 정의
- [ ] User Journey 작성
- [ ] IA 검토

설계 중

- [ ] 불필요한 단계 제거
- [ ] 오류 상황 고려
- [ ] 접근성 확인

완료 후

- [ ] 사용자 테스트
- [ ] 피드백 반영
- [ ] UX 일관성 확인

---

# 사용자 테스트

다음을 확인한다.

- 작업 성공률
- 완료 시간
- 오류 발생률
- 사용자 만족도
- 개선 의견

---

# 관련 문서

- DESIGN_SYSTEM.md
- UI_GUIDE.md
- AI_COMPONENT_GUIDE.md
- ARCHITECTURE.md
- COMPANY_POLICY.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |