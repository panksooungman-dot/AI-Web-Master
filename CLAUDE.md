@AGENTS.md

# CNBIZ 홈페이지 프로젝트

이 프로젝트는 CNBIZ 회사 홈페이지 리뉴얼 프로젝트입니다.

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

