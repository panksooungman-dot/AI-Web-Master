@AGENTS.md

# CNBIZ 홈페이지 프로젝트

이 프로젝트는 CNBIZ 회사 홈페이지 리뉴얼 프로젝트입니다.

## Active Application

현재 개발은 `apps/cnbiz-web`에서 진행됩니다.

루트의 `app/`은 레거시(v1)이며 유지보수 목적 외에는 수정하지 않습니다.

반드시 아래 문서를 먼저 참고하세요.

@docs/02_DEVELOPMENT/CNBIZ_RULES.md
@docs/00_COMPANY/PROJECT_VISION.md
@docs/01_PMO/PROJECT_ROADMAP.md
@docs/02_DEVELOPMENT/ARCHITECTURE.md
@docs/02_DEVELOPMENT/TECH_STACK.md
@docs/01_PMO/WBS.md
@docs/01_PMO/CHANGELOG.md
@docs/03_DESIGN/DESIGN_SYSTEM.md
@docs/02_DEVELOPMENT/AI_COMPONENT_GUIDDE.md

## Playwright 사용 원칙

- 기본적으로 browser_snapshot을 사용하여 UI를 확인한다.http://localhost:3000/services#cloud
- screenshot은 디자인 검토나 최종 QA가 필요한 경우에만 사용한다.
- 불필요한 스크린샷 생성은 지양하여 토큰 사용을 최소화한다.

---

# AI Business OS Rules

## Core Principles
- 구현을 우선한다.
- 불필요한 분석을 하지 않는다.
- 사용자의 시간을 아낀다.
- 작업이 완료되면 즉시 종료한다.

## Development Rules
- 요구사항을 먼저 구현한다.
- 구현보다 테스트 시간이 길어지면 안 된다.
- 동일한 문제를 반복 조사하지 않는다.
- 원인을 찾았으면 즉시 수정한다.

## Testing Policy
- 통합 테스트는 1회만 수행한다.
- 동일한 테스트를 반복하지 않는다.
- 사용자가 요청하지 않으면 추가 테스트를 하지 않는다.
- Parser 검사, CRLF 조사, 환경 조사를 반복하지 않는다.
- 진단보다 실제 동작을 우선한다.

## Stop Condition
- 구현 완료
- 테스트 성공
- 결과 보고

이후에는 대기한다.
추가 작업은 사용자가 요청할 때만 수행한다.

## Terminal Policy
- PowerShell 명령은 필요한 경우에만 실행한다.
- exit 기능은 실제 PowerShell에서 1회만 테스트한다.
- 자동 테스트를 위해 임시 스크립트를 반복 생성하지 않는다.
- 환경 조사보다 실제 동작 확인을 우선한다.

## Git Policy
작업 종료 순서:
1. 변경사항 확인
2. Commit 여부 확인
3. Commit
4. Push 여부 확인
5. Push
6. 종료

- Git 출력은 요약만 표시한다.
- pager(less, more)는 사용하지 않는다.

## Response Style
- 간결하게 답변한다.
- 결과를 먼저 말한다.
- 같은 내용을 반복하지 않는다.
- 구현 후에는 대기한다.

## Approval Policy
- 파일 수정이 필요한 경우에만 승인을 요청한다.
- 읽기 전용 작업은 최소화한다.
- 동일한 승인 요청을 반복하지 않는다.

## Anti Loop Rule
- 같은 원인을 2회 이상 조사하지 않는다.
- 같은 테스트를 2회 이상 수행하지 않는다.
- 해결되지 않으면 추가 진단 대신 수정안을 제시한다.

## Goal
- 자동화 > 반복 작업
- 구현 > 분석
- 결과 > 과정
