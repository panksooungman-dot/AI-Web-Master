# Release Notes — AI Business OS v1.0.0

> 배포일: 2026-07-14 | 이전 버전: `0.1.0`(Phase 0 Foundation) | 근거: `docs/01_PMO/CHANGELOG.md` 전체 이력, `docs/REPOSITORY_INDEX.md`

AI Business OS의 첫 안정 릴리스입니다. "Development OS"(내부 대시보드) + "AI Business OS CLI"(전역 `ai` 명령) + "CNBIZ Website"(고객사 납품물)로 구성된 모노레포가 실제로 빌드·테스트·동작하는 상태에 도달했습니다.

---

## New Features

### Dashboard (Development OS)
- `/developer` 전체가 10개 모듈(Dashboard Home·Project Manager·AI Workspace·Website Builder·Workflow Center·GitHub·Marketplace·Settings·Logs·Health)로 구성된 실 운영 대시보드로 전환
- Dashboard Home에 Projects·Running AI Tasks·Active Workflows·Marketplace Packages·Provider Status·Token Usage·Recent Activity·System Health 8개 위젯
- Project Manager(`/projects`)에 Create(신규 Workspace 자동 부트스트랩)·List·Open·Delete 전체 CRUD

### Authentication
- 이메일/비밀번호 + 서버 측 세션(`crypto.scryptSync`/`crypto.randomBytes`, 신규 npm 의존성 없음)으로 `/developer/**`·`/projects/**` 보호
- `proxy.ts`(Next.js 16의 `middleware.ts` 후속)로 미인증 접근을 `/login`으로 리다이렉트

### AI Business OS CLI
- State 기반 메뉴 런처(`SessionManager`), 프로젝트 자동 인식·최근 프로젝트 런처(`ai project`)
- 새 PC 온보딩: `Setup.cmd`/`install.ps1`이 Git·Node.js·VS Code 자동 설치 + `ai` 전역 등록 + PowerShell 세션 자동 `cd`까지 1회 실행으로 완료
- `ai website create` — **Website Builder v2**: 11개 사이트 타입, Home·About·Services·Products·Pricing·FAQ·Blog·Contact·Privacy·Terms·404 11페이지, 디자인 토큰·12종 컴포넌트·SEO·자산·배포 설정 파일까지 자동 생성
- `ai marketplace {install,remove,update,search,publish}` — **Marketplace v1**: 실제로 install과 맞물려 동작하는 패키지 관리(이전에는 remove/update가 install과 전혀 다른 경로를 가정해 한 번도 정상 동작한 적이 없었음, 이번 릴리스에서 수정)
- `ai chat`, `ai prompt {list,show,create,preview,execute}`, `ai provider {list,use,test,models,set-key,usage}`, `ai models`, `ai task {list,show,retry}` — **AI Platform v1**: Anthropic/OpenAI/Gemini/Ollama/OpenRouter 5개 Provider, 실 연결 확인, 토큰 사용량 추적, Prompt 버전·변수·미리보기, Task 재시도

### Workflow / Agent Runtime
- Development OS(`lib/agents`, `lib/workflows`)와 CLI(`packages/cli/src/runtime`, `packages/cli/src/workflow`)에 각각 독립적인 Agent Runtime·Workflow Engine 구현 — Task 큐잉/취소/재시도, Workflow Run/Pause/Resume/Cancel/Retry

### Testing & CI
- Vitest 기반 테스트 인프라 신설, **30개 파일 / 188개 테스트** 전부 실 소스 대상(가짜/no-op 아님)
- GitHub Actions `test.yml`을 실제 Vitest 스위트 실행으로 교체

---

## Breaking Changes

이 저장소는 외부에 배포된 적이 없는 내부 프로젝트이므로 "하위 호환성 깨짐"의 의미에서 breaking change는 없습니다. 다만 v1.0 준비 과정에서 아래 내부 구조가 변경되었습니다.

- **저장소 루트 정리**: `AI-Web-Master/`(자기 자신의 중첩 복제본, broken gitlink), `docs.zip`/`docs_extract/`, `tree.txt`/`structure.txt`/`apps-tree.txt`/`packages-tree.txt`/`typescript-files.txt`, `test-project/`, `backup.bat`/`start-wor.bat`, `docs/` 최상위의 구 감사 문서 14종(`*_AUDIT.md`, `PROJECT_STATUS*.md`, `TODO_CURRENT.md` 등)을 제거했습니다. 이 파일들을 참조하던 외부 스크립트나 북마크가 있다면 깨집니다 — `docs/REPOSITORY_INDEX.md`가 유일한 최신 소스입니다.
- **`.gitignore` 패턴 변경**: `.playwright-mcp/`가 이제 모든 하위 경로에서 무시됩니다(이전엔 루트만). `next-env.d.ts`는 여전히 무시되지만 `packages/cli/src/templates/website/next-env.d.ts`(웹사이트 생성 템플릿 소스)는 예외로 추적됩니다.
- **`eslint.config.mjs`의 `globalIgnores`가 재귀 패턴으로 변경**되어 `apps/**`/`packages/**`/`coverage/**` 등이 모든 깊이에서 무시됩니다(이전엔 최상위 경로만 매칭하는 버그가 있었음).
- **버전 체계**: 루트 `ai-web-master` 패키지가 `0.1.0` → `1.0.0`으로 승격되었습니다. `@ai-business-os/cli`(`packages/cli`)는 이미 `1.1.0`으로 독립 버저닝 중이라 변경하지 않았습니다.

---

## Known Issues

- **`docs/08_PLANS/상가분양센터/`(7개 파일)** — CNBIZ/AI Business OS와 무관해 보이는 별도 고객사 자료로 추정되나, 소유권을 확인하지 못해 이번 릴리스에서 삭제하지 않고 그대로 남겨두었습니다. 삭제 여부는 별도 확인이 필요합니다.
- **루트 `app/{about,services,portfolio,contact}`(v1 레거시 CNBIZ 마케팅 페이지)** — 실제 서비스는 `apps/cnbiz-web`(v2, `cnbiz.kr`)로 이전되어 `WBS.md` 기준 2026-07-01부로 동결되었으나, 루트 Development OS 앱에는 여전히 인증 없이 공개 상태로 남아 있습니다. 이번 릴리스는 안정화에 집중하기 위해 제거하지 않았습니다.
- **Website Builder 실 배포 미자동화** — `ai website create`는 `vercel.json`/`.env.example`만 생성하고, 실제 배포 명령(Vercel CLI 등)은 실행하지 않습니다.
- **Authentication 보호 범위 제한** — `/developer/**`·`/projects/**`만 세션으로 보호됩니다. `/api/workspaces`·`/api/terminal`·`/api/devserver` 등은 `packages/cli`(`ai devmode` 등)가 세션 없이 직접 호출해야 하므로 의도적으로 미보호 상태입니다. `/signup` 백엔드도 이번 범위에 포함되지 않았습니다(정적 폼만 존재).
- **Marketplace 카탈로그가 비어 있음** — Install/Remove/Update/Publish 메커니즘 자체는 정상 동작 확인됐지만, 실제로 아무도 `ai marketplace publish`를 실행하지 않아 `marketplace/manifest.json`의 5개 카테고리가 여전히 `count: 0`입니다. 온라인(원격) Marketplace Provider도 아직 없고 로컬 파일시스템 Provider만 존재합니다.
- **AI Platform 실 API 키 미검증** — 이 개발 환경에는 실제 Anthropic/OpenAI/Gemini/OpenRouter 키가 없어 `ai chat`/`ai prompt execute`/AI Studio는 전부 시뮬레이션 폴백 경로로만 검증되었습니다.
- **`ai task`의 Cancel/Progress 제한적** — CLI 프로세스는 매 호출이 동기적으로 종료되므로, 파일 기반 원장(`.runtime/tasks.json`)에 기록만 할 뿐 실행 중인 호출을 다른 프로세스에서 취소하거나 진행률을 볼 수 없습니다(아키텍처상 한계, 위장 없음).
- **테스트 커버리지가 고르지 않음** — Orchestrator, Development OS Workflow Engine의 실행 경로 자체, Provider 실 호출 경로, 대부분의 API 라우트/Dashboard 컴포넌트는 아직 전용 테스트가 없습니다(순수 로직·핵심 버그 수정 지점 위주로만 188개 테스트가 존재).
- **Agent Runtime / Workflow Engine이 Development OS와 CLI에 각각 독립적으로 구현되어 있음** — 의도된 설계(서로 다른 프로세스)이나, 장기적으로 개념을 통합할지는 미결정입니다.
- **`lint.yml`에는 빌드 검증 단계가 없음** — 빌드 실패는 `test.yml`(및 태그 push 시 `release.yml`)에서만 잡힙니다.

전체 이력과 각 항목의 근거는 `docs/01_PMO/CHANGELOG.md`와 `docs/REPOSITORY_INDEX.md`를 참고하십시오.
