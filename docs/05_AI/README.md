# agents

AI **에이전트 역할·구성·오케스트레이션** 정의를 보관합니다.

## 포함할 내용

- 에이전트 역할 정의 (Planner, Builder, Reviewer, Ops 등)
- 에이전트별 책임·입력·출력·제약
- 에이전트 간 handoff 규칙
- Cursor Agent, SDK, Automations 연동 설정

## AI Team Structure (요약)

| 에이전트 | 모드 | 책임 |
|---------|------|------|
| Planner | Plan | 설계·명세·트레이드오프 |
| Builder | Build | 구현·리팩터·테스트 |
| Reviewer | — | 품질·보안 리뷰 |
| Ops | — | CI/CD·배포·모니터링 |
| Human Lead | — | 비전·승인·우선순위 |

## 원칙

에이전트는 보조 도구가 아니라 개발 운영 체계의 **기본 작업 단위**입니다 (AI First).
