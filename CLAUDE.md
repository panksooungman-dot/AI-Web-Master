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

## 신규 프로젝트 추가 규칙

AI Business OS 아래 여러 프로젝트(홈페이지·쇼핑몰·챗봇·CRM·ERP 등)가 계속 추가되는 것을 전제로 한 규칙입니다.

1. 모든 신규 프로젝트는 `apps/<project-name>/` 아래에 생성한다.
2. 신규 프로젝트는 `apps/cnbiz-web/lib`를 직접 import하지 않는다.
3. 공통 코드가 2개 이상의 프로젝트에서 필요해지는 시점에만 `packages/`로 승격한다.
4. `packages/` 승격은 실제 중복이 확인된 이후에만 수행한다(가정만으로 미리 추출하지 않는다).
5. Legacy(루트 `app/`, 루트 `components/`)는 신규 기능 개발에 사용하지 않는다.
6. **Packages Responsibility** — `packages/`는 프로젝트에 독립적인 코드만 포함한다.
   - 허용: UI, Design System, Layout, Authentication, Database, CollectionStore, Shared Types, Shared Utils, CLI, Templates, Build Tool, AI Infrastructure
   - 금지: CNBIZ·ShoppingMall·CRM·ERP 등 프로젝트 전용 Business Logic, Website Builder 전용 화면, 프로젝트 전용 API/UI
   - 기준: "여러 프로젝트에서 그대로 사용할 수 있는 코드"만 `packages/`에 둔다.
7. **Dependency Direction** — 의존성은 `apps → packages`, `packages → packages`만 허용한다. `apps → apps`(예: `apps/shoppingmall`이 `apps/cnbiz-web`을 직접 import) 및 `packages → apps`는 금지한다. 프로젝트 간 공유는 반드시 `packages/`를 통한다.

**Repository Philosophy**: "필요할 때 공통화"를 따른다. "앞으로 필요할 것 같아서" 미리 `packages/`를 만들지 않는다(Rule of Two — 최소 2곳에서 실제로 필요해지기 전까지는 추상화하지 않는다).

### Packages Promotion Checklist

`packages/`로 승격하려면 아래 4가지 조건을 **모두** 만족해야 한다.

- [ ] **Rule 1 — 실사용 2곳 이상**: 최소 두 개 이상의 프로젝트(예: `apps/cnbiz-web`, `apps/shoppingmall`)에서 **실제로** 사용 중이어야 한다. "앞으로 사용할 예정"은 인정하지 않는다.
- [ ] **Rule 2 — Business Logic 없음**: 프로젝트 고유 Business Logic가 없어야 한다. 허용(UI/Layout/Auth/DB/CollectionStore/Shared Types/Shared Utils/CLI/Templates/AI Infrastructure) vs 금지(CNBIZ Workflow, ShoppingMall Checkout, CRM Customer Pipeline, ERP Inventory Logic, Website Builder Screen 등 프로젝트 전용 로직).
- [ ] **Rule 3 — 독립 테스트 가능**: `apps/` 없이 `packages/` 단독으로 동작·테스트 가능해야 한다.
- [ ] **Rule 4 — 이름에서 프로젝트명 제거 가능**: 프로젝트 이름을 제거해도 의미가 유지되어야 한다. 가능(`AuthService`·`Database`·`CollectionStore`·`SharedButton`·`LayoutShell`) vs 금지(`CNBIZDashboard`·`ShoppingMallCart`·`CRMLeadPipeline`·`ERPInventory`·`WebsiteBuilderEditor`).

**판단 순서**(Repository Decision Rule):

1. 실제로 두 프로젝트 이상에서 사용하는가? → 아니오 → `apps/` 안에 둔다.
2. 프로젝트 전용 코드인가? → 예 → `apps/` 안에 둔다.
3. 독립 실행 가능한가? → 아니오 → `apps/` 안에 둔다.
4. 프로젝트 이름을 제거해도 되는가? → 아니오 → `apps/` 안에 둔다.
5. 위 네 조건을 모두 만족하는가? → 예 → `packages/` 승격 가능.

**Repository Philosophy(순서)**: "먼저 구현" → "실제 중복 확인" → "packages 승격" 순서를 따른다. "미래를 예상해서" 미리 공통화하지 않는다(Rule of Two 유지).

### Repository Review Checklist

새로운 기능을 Merge하기 전에 반드시 아래 항목을 확인한다.

- [ ] **Architecture** — 다른 `apps/*`를 직접 import하지 않았는가? (허용: `apps→packages`, `packages→packages` / 금지: `apps→apps`, `packages→apps`)
- [ ] **Packages** — `packages/`에 프로젝트 전용 코드가 들어가지 않았는가? (허용: `packages/auth`·`packages/database`·`packages/ui`·`packages/layout-primitives`·`packages/utils` / 금지: `packages/cnbiz-dashboard`·`packages/shoppingmall-cart`·`packages/crm`·`packages/erp`)
- [ ] **Rule of Two** — packages 승격이 Rule of Two를 만족하는가? 최소 두 프로젝트에서 실제로 사용되는가? 아니라면 `apps/` 안에 둔다.
- [ ] **Promotion Checklist** — Packages Promotion Checklist 4개 조건(실사용 2곳 이상 / Business Logic 없음 / 독립 테스트 가능 / 프로젝트명 제거 가능)을 모두 통과했는가?
- [ ] **Legacy** — Legacy(루트 `app/`, 루트 `components/`)에 신규 기능을 추가하지 않았는가?
- [ ] **Repository Structure** — 새 프로젝트는 `apps/` 아래에 생성되었는가?
- [ ] **Naming** — `packages/` 이름에 프로젝트명이 포함되어 있지 않은가? (허용: `Auth`·`Database`·`CollectionStore`·`SharedButton`·`LayoutShell` / 금지: `CNBIZ`·`ShoppingMall`·`CRM`·`ERP`·`WebsiteBuilder`)
- [ ] **Dependency** — 의존성이 `apps→packages→packages` 방향만 따르는가?
- [ ] **Documentation** — Repository Rules 변경 시 `README.md`·`CLAUDE.md` 두 문서가 동시에 수정되었는가?

**Code Review Rule**: Repository Review Checklist는 사람·AI Agent·Code Reviewer 모두 동일하게 적용한다. Repository Rule보다 우선하지 않는다 — Repository Rule을 실행하기 위한 Review 절차다.

**Repository Governance**: Repository 운영은 다음 순서를 따른다.

```
Repository Rules
  ↓
Packages Promotion Checklist
  ↓
Repository Decision Rule
  ↓
Repository Review Checklist
  ↓
Merge
```

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
