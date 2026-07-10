# CHANGELOG

프로젝트 변경 이력을 기록합니다.

---

## 2026-07-10

### 추가 (Added)

- **구조 리팩터링 — 가이드 노트 및 로드맵 반영**: `agents/README.md`·`prompts/README.md`·`memory/README.md`·`orchestration/README.md` 신규 작성 — 각 디렉터리를 의도적으로 비워두었음을 알리고 정식 문서 위치(`docs/05_AI/`·`docs/09_WORK_HISTORY/`)를 안내
- `docs/01_PMO/PROJECT_ROADMAP.md`에 **Phase 5: AI Business OS Productization (Planned)** 신설. `marketplace/`·`mcp/`·`examples/`·`docs/getting-started.md`·`docs/installation.md`·`docs/faq.md`를 "중복 문서"가 아닌 "별도 계획된 제품 인프라"로 재분류(오너: Human Lead 최종 승인, 세부 담당 추후 지정), 폴더·파일은 유지

### 변경 (Changed)

- `docs/README.md` — 빈 파일이었던 것을 `docs/00_COMPANY/DOCUMENT_INDEX.md`로 안내하는 경량 인덱스로 교체

### 삭제 (Removed)

- 오늘(2026-07-10) 스캐폴딩 과정에서 생성된 **0바이트 중복 파일 33개** 삭제, 디렉터리 자체는 삭제하지 않음
  - `agents/*.md`(10) — `skills/experts/*`(실 콘텐츠)와 이름 중복
  - `prompts/*.md`(7) — `docs/05_AI/PROMPTS.md`(실 콘텐츠)와 개념 중복
  - `orchestration/*.md`(5) — `docs/05_AI/WORKFLOW.md`(실 콘텐츠)와 개념 중복
  - `memory/*.md`(6) — `docs/09_WORK_HISTORY/*`(실 콘텐츠, 운영 중)와 개념 중복
  - 루트 `CHANGELOG.md`·`ROADMAP.md`(2) — `docs/01_PMO/{CHANGELOG,PROJECT_ROADMAP}.md`(실 콘텐츠)와 이름 중복
  - `docs/architecture.md`·`docs/roadmap.md`·`docs/release-notes.md`(3) — `docs/02_DEVELOPMENT/ARCHITECTURE.md`·`docs/01_PMO/PROJECT_ROADMAP.md`·`docs/01_PMO/CHANGELOG.md`(실 콘텐츠)와 이름·개념 중복

### 검증 (Verified)

- 삭제 대상 33개 파일 전부 삭제 직전 0바이트 상태 재확인, 삭제 후 `docs/05_AI/**`·`docs/09_WORK_HISTORY/**`·`skills/**`·`docs/01_PMO/CHANGELOG.md`·`docs/02_DEVELOPMENT/ARCHITECTURE.md` 등 실 콘텐츠 문서는 전부 무변경 확인
- 최상위 디렉터리(`skills`·`agents`·`prompts`·`memory`·`orchestration`·`app`·`packages`·`components`·`docs`·`examples`·`cli`·`mcp`·`marketplace`·`.github`·`scripts`) 전수 Role Matrix 검토 완료. 루트 `cli/`(4개 파일, 0바이트)는 `packages/cli`(실제 구현된 CLI)와 여전히 중복으로 확인되어 삭제 후보로 남음(미실행, 승인 대기). `skills/` 내 카테고리 인덱스 stub 14개도 미해결로 남음(미실행, 승인 대기)
- `scripts/create-*.ps1`·`scripts/init-ai-business-os.ps1`(10개)이 전부 0바이트임을 확인 — `skills/` 실 콘텐츠는 이 스크립트들이 아닌 별도 경로로 작성된 것으로 추정(재현성 격차, 별도 후속 조치 필요)
- `git status`로 모든 변경(삭제 33건·신규 4건·수정 2건)이 미스테이징 상태임을 확인 — 커밋·푸시는 미실행(사용자 승인 대기)

---

## 2026-07-09 (16)

### 수정 (Fixed)

- **AI Business OS CLI — `ai devmode`의 dev 서버 포트 자동 감지 실패 수정**: 실제 재현 결과 두 가지 원인이 함께 있었음
  1. Windows에서 `spawn("powershell.exe", [...], { detached: true, stdio: "ignore" })`로 새 터미널 창을 직접 띄우면, 새 프로세스가 콘솔을 제대로 할당받지 못해 명령을 한 줄도 실행하지 못한 채 exit code 0으로 즉시 종료됨(실제로 stdout/stderr을 캡처해 재현 확인). 즉 새 터미널 창 자체가 뜨지 않아 `npm run dev`가 시작되지 않았음
  2. 콘솔이 정상 할당되어도, Windows PowerShell의 `Tee-Object -FilePath`가 기본적으로 UTF-16LE(BOM `FF FE`)로 로그 파일을 쓰는데 CLI는 이를 `"utf-8"`로 읽고 있어 포트 정규식이 매칭되지 않았음
  - `packages/cli/src/lib/devServer.js` — Windows 실행 방식을 `cmd.exe`의 `start "제목" powershell.exe -NoExit -Command "..."`(`shell: true`)로 교체해 콘솔이 정상 할당되도록 수정. 로그 파일 읽기를 BOM 유무로 인코딩(UTF-16LE/UTF-8)을 판별하는 `readLogFile()` 헬퍼로 교체

### 추가 (Added)

- **AI Business OS CLI ↔ Development OS — Dev Server 상태 공유**: `ai devmode`(CLI)가 시작한 dev 서버와 Development OS의 Dev Server Manager(`/developer` 카드)가 서로 다른 프로세스의 인메모리 상태만 사용해, CLI로 실제 서버를 띄워도 화면에는 항상 Stopped로 표시되던 문제 수정. 워크스페이스 경로 기준 `<workspacePath>/lib/data/devservers.json` 공유 상태 파일을 도입해 두 프로세스가 동일한 Status/PID/Port를 보도록 함
  - `lib/devserver/manager.ts` — `getDevServerStatus()`/`isDevServerRunning()`/`startDevServer()`/`stopDevServer()`가 인메모리에 없으면 공유 상태 파일을 확인하도록 확장. 기록된 PID가 실제로 살아있는지(`process.kill(pid, 0)`) 검증해 죽은 프로세스가 남긴 stale한 "running" 상태는 자동으로 정리
  - `packages/cli/src/lib/devServer.js` — 포트 감지 시 `netstat`으로 실제 리스닝 중인 프로세스의 PID를 찾아 동일한 스키마로 상태 파일에 기록

### 검증 (Verified)

- CLI의 `startDevServer("D:/ai-web-master")`를 실제로 실행 → 새 터미널 창에서 `npm run dev` 정상 기동, 포트 3000 정상 감지, `lib/data/devservers.json`에 `{pid, port:3000, status:"running"}` 정상 기록 확인
- 그 상태로 뜬 실제 Next.js 서버의 `/api/devserver/status` API(카드가 호출하는 것과 동일)를 직접 조회 → `{"running":true,"status":"running","pid":...,"port":3000}` 정상 응답 확인, `netstat`으로 해당 PID가 실제 리스닝 프로세스와 일치함을 재확인
- Playwright로 실제 브라우저에서 `http://localhost:3000/developer` 접속 → "🖥️ Development Server" 카드에 **Status: Running / Port: 3000 / PID: (실제 PID) / URL: http://localhost:3000** 정상 표시 확인
- 테스트에 사용한 dev 서버·프로세스·상태 파일은 모두 종료·삭제 완료(`git status` 확인 결과 의도한 수정 파일만 존재)

---

## 2026-07-09 (15)

### 변경 (Changed)

- **AI Business OS CLI — 메뉴 런처를 State 기반 구조(SessionManager)로 재구성**: 기존에는 메인 메뉴 루프(`menu/index.js`)가 항목을 실행하다가 화면 전환이 필요한 기능(개발 시작·프로젝트 관리·Git 관리·설정)마다 그 함수 내부에서 또 자기만의 while 루프를 만들어 화면을 그리는 구조였다(루프 안에 루프가 중첩, 화면 전환 = 함수를 다시 호출). 이를 단일 루프 + State 전이 구조로 재구성해 화면 전환 로직을 한곳(`SessionManager.run()`)으로 모음
  - `packages/cli/src/session/SessionManager.js`(신규) — 세션 전체를 관리하는 상태 기계. `run()`의 while 루프가 매 반복마다 현재 `this.state`에 해당하는 State 모듈의 `step()`을 한 번만 호출하고, `step()`이 반환한 다음 state 이름으로 `this.state`를 갱신. 기존 메뉴 루프의 안전망(uncaughtException/unhandledRejection 캡처, 종료 시 `process.exit(0)`)을 그대로 유지
  - `packages/cli/src/session/ui.js`(신규) — `BOX_WIDTH`/`DIVIDER`/`THIN_DIVIDER` 등 화면 그리기 상수를 공용화(기존 `menu/index.js`에만 있던 것을 여러 State가 공유)
  - `packages/cli/src/session/states/{mainMenuState,developmentOSState,projectState,gitState,settingsState}.js`(신규) — 5개 화면을 각각 독립된 State 모듈로 분리. `mainMenuState`는 `menu.json`의 각 항목이 `action`(1회성 함수, 기존과 동일)인지 `state`(화면 전환)인지 구분해 처리하도록 검증 로직 확장. `developmentOSState`는 `devmode()`가 반환하는 컨텍스트(project·workspacePath·port)를 `session.context`에 저장해 같은 화면에 머무는 동안 `devmode()`를 재실행하지 않고, "브라우저 다시 열기"·"Git 상태 새로고침" 하위 메뉴 제공
  - `packages/cli/src/commands/menu/index.js` — `SessionManager`를 생성·실행하는 얇은 어댑터로 축소(223줄 → 9줄). `packages/cli/src/commands/menu/actions.js` — 화면 전환이 필요 없는 1회성 액션(설치/업데이트·환경 점검·UI Explorer·Claude Code·ChatGPT) 5개만 남기고 나머지(개발 시작·프로젝트 관리·Git 관리·설정)는 State로 이전
  - `packages/cli/src/config/menu.json` — 화면 전환 항목은 `"action"` 대신 `"state"` 필드로 선언(예: `{"state": "developmentOS"}`)
  - `packages/cli/src/commands/devmode.js` — `devmode()`가 열던 페이지를 Live Preview(`/`)에서 Development OS 화면(`/developer`)으로 변경하고, 함수 종료 시 `{ project, workspacePath, port }` 컨텍스트를 반환하도록 변경(기존엔 반환값 없음) — `developmentOSState`가 이 값으로 재실행 없이 하위 메뉴를 그릴 수 있도록 함

### 검증 (Verified)

- `packages/cli` 전체 JS 파일(`src/`, `bin/`) `node --check` 구문 검증 통과
- 실사용자 레지스트리·현재 저장소를 건드리지 않도록 `USERPROFILE`을 스크래치 홈으로, cwd를 스크래치 Git 저장소로 완전히 격리한 환경에서 실제 타이핑을 지연 시뮬레이션(입력 사이 600ms 지연)한 자동화 테스트로 State 전이 전 구간 확인: 메인 메뉴 → `3`(프로젝트 관리, 등록된 프로젝트 목록 표시) → `0`(메인 메뉴로 복귀) → `8`(Git 관리) → `1`(상태 확인 — `Branch: master`, `Status: clean` 실제 조회값 정상 표시) → `0`(메인 메뉴로 복귀) → `0`(종료, "[menu] 종료합니다." 출력과 함께 정상 종료 코드 0)
- 화면 전환이 함수 재호출이 아닌 State 반환으로만 이뤄짐을 확인(Git 관리 화면에 상태 확인 후에도 동일 State에 머무르며 하위 메뉴가 유지되고, `0` 입력 시에만 메인 메뉴 State로 실제 전이됨)
- 개발 시작(`developmentOS`)·설정(`settings`) State 자체 상세 시나리오는 이번 회차에서 반복 검증하지 않음 — 기반 로직(`devmode()`, Git 상태 조회, 프로젝트 목록)은 기존에 이미 여러 차례 검증된 함수를 그대로 재사용하며, 이번 변경은 그 호출 방식(루프 재귀 → State 전이)만 바꾼 것이라 프로젝트 관리·Git 관리 State 검증으로 State 전이 메커니즘 자체의 정상 동작을 확인했다고 판단(Testing Policy: 통합 테스트 1회 원칙, 동일 유형 재검증 지양)
- 테스트에 사용한 스크래치 Git 저장소·홈 디렉터리는 모두 삭제 완료

### 변경 (Changed)

- **Development OS — Dev Server Manager 안정화**: 신규 기능 추가 없이 기존 Start/Stop/Restart/Status를 안정화. 상태를 4단계(Starting/Running/Stopped/Error)로 세분화하고, 포트를 실행 로그에서 실제로 추출하며, 화면 정보 표시를 정리
  - `lib/devserver/manager.ts` — `DevServerState`에 `status`("starting"|"running"|"error")·`port` 필드 추가. `startDevServer()`가 실행 요청 즉시 `status:"starting"`을 기록해 진행 중인 시작을 다른 요청·다른 탭에서도 즉시 확인 가능하게 하고, 실패 시에는 삭제 대신 `status:"error"`(+에러 메시지)로 남겨 Stop을 누르기 전까지 상태가 유지되도록 함. 중복 실행 방지 조건을 `starting`·`running` 모두 포함하도록 확장(기존엔 `running`만 체크). `watchPort()`(신규) — dev 서버 stdout을 최대 30초 동안 관찰해 `Local: http://localhost:3000` 류의 로그에서 포트를 정규식으로 추출, 감지 즉시 리스너 해제. `getDevServerStatus()` 응답에 `status`·`port`·(에러 시) `error` 추가(기존 `running`·`pid` 필드는 유지되어 하위 호환)
  - `lib/devserver/client.ts` — `DevServerStatusResponse`에 `status`(`DevServerRunStatus`)·`port`·`error` 필드 추가
  - `components/developer/DevServerManagerCard.tsx` — Status 배지를 4색(Starting=주황, Running=초록, Stopped=회색, Error=빨강)으로 표시. Start/Restart 성공 후 최대 30초 동안 2초 간격으로 상태를 재조회해 포트가 감지되는 즉시 화면에 반영(`pollUntilPortKnownOrSettled`). Error 상태는 페이지 새로고침 후에도 서버가 기억하고 있는 실제 상태이므로 메시지로 함께 노출. 정보 패널을 Status/Port/PID/URL/Branch/Git 변경 수 6개 항목의 2열 그리드로 재정렬(요청 4번). URL은 Running이고 포트를 알 때만 `http://localhost:{port}` 링크로 표시. Branch·Git 변경 수는 기존에 이미 구현되어 있던 `lib/projects/status.ts`의 `fetchGitStatus()`를 그대로 재사용(신규 Git 로직 없음)
  - Command Engine(`lib/commandEngine/*`)은 이번 회차에서 수정하지 않음 — `executeBackground()`가 이미 반환하던 `process` 핸들에 Dev Server Manager가 직접 stdout 리스너를 붙이는 방식으로 구현해 엔진 자체는 그대로 유지(요청사항 "신규 기능 추가하지 않음" 충족)

### 검증 (Verified)

- `npx tsc --noEmit`, `npm run lint` 통과
- 저장소의 실제 Next.js dev 서버를 임시 기동해 실제 HTTP 요청으로 검증:
  - **포트 감지**: `- Local: http://localhost:4321` 로그를 늦게(500ms 후) 출력하는 스크래치 프로젝트로 Start → 즉시 이어진 Status 조회에서 `port:4321` 정상 감지 확인
  - **4단계 상태**: 초기 `status:"stopped"` → Start 요청이 진행 중인 동안 동시 Status 조회 시 `status:"starting"` 확인 → 완료 후 `status:"running"` → 실패하는 dev 스크립트로 별도 프로젝트를 Start해 `status:"error"`(+에러 메시지)가 Status 재조회에서도 유지됨을 확인 → Stop으로 `status:"stopped"`로 복귀됨을 확인
  - **중복 실행 방지**: 실행 중인 프로젝트에 Start 재요청 → `{"success":false,"error":"이미 실행 중입니다."}` 즉시 반환 확인
  - **화면 렌더링**: `/developer` 페이지 HTML에 Status·Port·PID·URL·Branch·Git 변경 수 6개 라벨 전부 정상 출력 확인
- 테스트에 사용한 프로세스·dev 서버·스크래치 프로젝트는 모두 종료·삭제 완료(포트 3000 재확인 결과 LISTENING 없음), `git status` 결과 의도한 변경 파일만 존재

---

## 2026-07-09 (13)

### 추가 (Added)

- **Development OS — Terminal Engine을 공용 Command Engine으로 확장**: 그동안 Dev Server 전용이던 실행 엔진(`lib/devserver/manager.ts`)을 Development OS의 모든 명령(빌드·테스트·린트, 패키지 설치, Git, 유틸리티)을 실행할 수 있는 공용 엔진(`lib/commandEngine/`)으로 분리·확장. 이번 회차는 엔진만 다루며 UI·API 라우트는 추가하지 않음(사용자 지시)
  - `lib/commandEngine/types.ts`(신규) — `ExecuteOptions`/`ExecuteResult`(1회성 명령, stdout·stderr 분리 수집)·`BackgroundExecuteOptions`/`BackgroundExecuteResult`(dev 서버처럼 종료를 기다리지 않는 장기 실행 명령)·`TerminateResult`·`CommandRecord`/`CommandHistoryStore`(요구사항 5 — 명령 실행 이력 인터페이스) 타입 정의
  - `lib/commandEngine/history.ts`(신규) — `CommandHistoryStore`의 기본 구현 `InMemoryCommandHistoryStore`(최근 200건, 최신순), 모듈 싱글턴 `commandHistoryStore`와 `getCommandHistory()` 노출(스토리지 교체가 필요해지면 인터페이스만 구현하면 되는 구조)
  - `lib/commandEngine/commands.ts`(신규) — 요청된 4개 카테고리(Development: `npm run dev/build/test/lint` · Package: `npm install/update` · Git: `git status/pull/push` · Utility: `code .`/`explorer .`)를 선언적 카탈로그(`COMMAND_CATALOG`)로 정의. "기본 브라우저로 URL 열기"는 인자(URL)가 필요해 카탈로그 대신 `buildOpenUrlCommand(url)`(PowerShell `Start-Process`)로 별도 제공
  - `lib/commandEngine/engine.ts`(신규) — `execute(command, options)`(1회성, 종료까지 대기하며 stdout/stderr 분리 수집 — 요구사항 4), `executeBackground(command, options)`(장기 실행, settleMs 동안 조기 종료가 없으면 성공 판정 후 해당 `ChildProcess` 핸들을 호출자에게 반환해 이후 종료 감지는 호출자가 직접 구독하도록 위임), `terminateProcessTree(pid)`(taskkill 기반, 이미 종료된 PID는 오류로 취급하지 않음 — 기존 Dev Server Manager의 로직을 그대로 이전), `runCatalogCommand(id, cwd)`(카탈로그 항목을 `background` 플래그에 따라 `execute`/`executeBackground`로 자동 분기), `openUrl(url, cwd)`. `lib/terminal/server.ts`의 기존 `buildShellInvocation()`을 그대로 재사용(PowerShell/CMD/Git Bash 실행 인자 구성 중복 없음). 모든 명령 실행은 완료 시 `commandHistoryStore`에 기록되고, 기존 `eventBus`(Logs Manager가 이미 구독 중인 terminal/git 카테고리)에도 동일하게 이벤트를 발행해 재사용
  - `lib/devserver/manager.ts` — 내부 구현을 새 엔진 기반으로 교체(로컬에 있던 `spawn`+수동 settle 로직, `killProcessTree`를 각각 `executeBackground()`/`terminateProcessTree()` 호출로 대체). `startDevServer`/`stopDevServer`/`restartDevServer`/`getDevServerStatus`/`isDevServerRunning`의 시그니처·반환값·동작은 동일하게 유지(요구사항 2·6) — `/api/devserver/*` 4개 라우트와 `DevServerManagerCard.tsx`는 무수정

### 검증 (Verified)

- `npx tsc --noEmit`(루트), `npm run lint`, `npm run build`(루트 전체, 43개 라우트 정상 생성) 모두 통과
- 실제 HTTP 요청으로 신규 Command Engine 3개 카테고리를 검증(검증 전용 임시 API 라우트를 만들어 실행 후 삭제, 최종 변경분에는 포함되지 않음): **npm run build**(scratch 프로젝트, `execute()` 직접 호출) → `exitCode:0`, stdout에 `"build ok"` 캡처 확인 / **git status**(저장소 루트, 카탈로그 `git:status`) → `exitCode:0`, 실제 `git status` 출력(현재 변경 파일 목록)과 정확히 일치 / **code .**(저장소 루트, 카탈로그 `util:code`) → `exitCode:0`(실제 VS Code 창이 열림)
- 리팩터링에 따른 회귀 여부 확인을 위해 Dev Server Manager의 Status→Start→Status→Restart→Status→Stop→Status를 1회 왕복 실행 — Start(`pid:624`)·Restart(`pid:20552`로 교체)·Stop 전부 이전과 동일하게 정상 동작함을 확인(요구사항 6 충족, 상세 반복 검증은 이전 회차에서 이미 완료되어 반복하지 않음)
- 검증에 사용한 프로세스·dev 서버·스크래치 프로젝트·임시 API 라우트·`.next` 빌드 캐시는 모두 종료·삭제 완료(포트 3000 재확인 결과 LISTENING 없음, `git status` 결과 의도한 변경 파일만 존재)

---

## 2026-07-09 (12)

### 추가 (Added)

- **Development OS — UI Explorer에 화면별 인라인 Preview(미리보기) 추가**: Dev Server Manager를 포함한 화면 전체를 UI Explorer에서 페이지 이동 없이 바로 확인·테스트할 수 있도록 개선(Backend/Terminal Engine 로직은 이번 변경에서 다루지 않음, UI 연결·표시만 다룸)
  - `components/developer/UiMapExplorer.tsx` — 항목별 카드에 "미리보기" 토글 버튼 추가. 열면 카드 하단에 `<iframe src={entry.openUrl}>`가 인라인으로 표시되고("열기" 버튼은 페이지 이동, "미리보기"는 그 자리에서 확인). 항목별로 독립적으로 열고 닫을 수 있도록 `Set<string>` state로 관리
  - `docs/UI_MAP.md` — "Development OS 인덱스"(`/developer`) 행을 "사용 중"으로 갱신하고 Dev Server Manager가 실제 프로세스를 제어함을 반영(이전 회차에 "UI만 구현"으로 적어둔 설명이 이후 Start/Stop/Restart 실구현으로 이미 낡아 있었음)
  - Dev Server Manager 카드 자체(`components/developer/DevServerManagerCard.tsx`, `app/developer/page.tsx`)는 이전 회차에서 이미 요청사항(카드 추가, Status/Port/PID 실시간 표시, Start/Stop/Restart 연결, 마운트 시 자동 조회, 액션 후 자동 갱신, Running/Stopped 배지·필드 규칙, 기존 Card/Badge 재사용)을 모두 충족하고 있어 이번 회차에서는 수정하지 않음

### 검증 (Verified)

- `npx tsc --noEmit`(루트), `npm run lint` 통과
- 저장소의 실제 Next.js dev 서버를 임시 기동해 `/developer`(카드·Start/Stop/Restart 버튼·Stopped 배지 텍스트 렌더링) `/developer/ui-map`("미리보기" 버튼 렌더링) 페이지가 정상 응답함을 curl로 확인
- Dev Server Manager가 실제로 호출하는 API 경로로 Start → Status → Restart → Status → Stop → Status 1회 왕복 확인: `pid:20340`(Start) → `running:true,pid:20340` → `pid:22444`(Restart) → `running:true,pid:22444` → Stop 성공 → `running:false,pid:null`. Start/Stop/Restart/Status 각 기능의 상세 반복 검증은 이전 회차(2026-07-09 (8)~(11))에서 이미 완료되어 이번 회차에서 반복하지 않음
- 테스트에 사용한 프로세스·dev 서버·스크래치 폴더는 모두 종료·삭제 완료(포트 3000 재확인 결과 LISTENING 없음)

---

## 2026-07-09 (11)

### 추가 (Added)

- **Development OS — Dev Server Manager Restart 기능 실제 구현**: Restart 버튼이 내부적으로 Stop → Start를 순차 실행해 새 PID로 개발 서버를 재시작하도록 구현
  - `lib/devserver/manager.ts` — `restartDevServer(workspacePath)` 추가. `stopDevServer()` 실행 후 성공 시에만 `startDevServer()`로 이어감(Stop 실패 시 기존 프로세스가 살아있을 수 있어 중복 실행을 막기 위해 Start를 시도하지 않고 그대로 실패 반환)
  - `app/api/devserver/restart/route.ts`(신규) — `POST { cwd }` → `restartDevServer()` 위임
  - `lib/devserver/client.ts` — `restartDevServer(cwd)` 클라이언트 함수 추가(응답 형태가 Start와 동일해 `StartDevServerResponse` 재사용)
  - `components/developer/DevServerManagerCard.tsx` — Restart 버튼을 실제 API에 연결, 완료 후 `refreshStatus()`로 Status·PID·Port를 실제 서버 상태 기준으로 즉시 갱신. Start/Stop/Restart 세 액션이 동시에 겹쳐 호출되지 않도록 `isBusy`(세 로딩 상태의 OR)로 버튼을 함께 잠금 처리(더 이상 쓰이지 않는 Mock PID 생성 함수 `generateMockPid` 제거)

### 검증 (Verified)

- `npx tsc --noEmit`(루트), `npm run lint` 통과
- 저장소의 실제 Next.js dev 서버를 임시 기동 후 실제 HTTP 요청으로 검증: 아무것도 실행 중이지 않을 때 Restart(Stop no-op → Start, PID 956) → Status 일치, 실행 중일 때 Restart(PID 20088로 교체) → Status 일치 → Stop. 이어서 `Start → Restart → Stop`을 3회 반복 실행해 매 회 서로 다른 PID로 정상 재시작되고 Stop 후 `{running:false, pid:null}`로 정확히 돌아옴을 확인. Restart로 교체되기 전의 옛 PID(9252·21536·3096·956)가 `tasklist`에서 실제로 사라졌음을 확인해 이전 프로세스가 고아로 남지 않고 확실히 종료됨을 검증. 테스트에 사용한 프로세스·dev 서버·스크래치 폴더는 모두 종료·삭제 완료(포트 3000 재확인 결과 LISTENING 없음)

---

## 2026-07-09 (10)

### 추가 (Added)

- **Development OS — Dev Server Manager Stop 기능 실제 구현**: Stop 버튼이 Start에서 추적해 둔 PID로 실제 개발 서버 프로세스를 종료하도록 구현
  - `lib/devserver/manager.ts` — `stopDevServer(workspacePath)` 추가. `taskkill /F /T /PID <pid>`로 프로세스 트리 전체를 종료(PowerShell로 감싸 실행한 npm/pnpm/yarn/bun 자식 프로세스까지 함께 종료됨). 실행 중인 프로세스가 없으면(registry에 없음) 즉시 성공으로 처리(안전한 no-op), 이미 종료된 PID(`taskkill` 종료 코드 128)도 오류로 취급하지 않고 성공 처리. 그 외 실패(예: 권한 문제)는 registry에서 제거하지 않고 오류 메시지와 함께 실패 반환
  - `app/api/devserver/stop/route.ts`(신규) — `POST { cwd }` → `stopDevServer()` 위임
  - `lib/devserver/client.ts` — `stopDevServer(cwd)` 클라이언트 함수 추가
  - `components/developer/DevServerManagerCard.tsx` — Stop 버튼을 실제 API에 연결, 종료 후 `refreshStatus()`로 실제 서버 상태를 다시 조회해 Status/PID/Port를 즉시 갱신(성공 시 Stopped·-·- 로 표시됨은 실제 상태 재조회의 결과)

### 검증 (Verified)

- `npx tsc --noEmit`(루트), `npm run lint` 통과
- 저장소의 실제 Next.js dev 서버를 임시 기동 후 실제 HTTP 요청으로 검증: 실행 중인 프로세스가 없을 때 Stop → 오류 없이 성공, Start(PID 20996) → Status(running:true) → Stop → Status(running:false, pid:null) → Stop 재호출(이미 종료됨, 오류 없이 성공), Start→Stop→Start 반복(2회차 PID 22488도 동일하게 정상 동작). `tasklist`로 종료된 PID가 실제 OS 프로세스 목록에서도 사라졌음을 재확인(단순 registry 제거가 아닌 실제 프로세스 종료임을 확인). 테스트에 사용한 프로세스·dev 서버·스크래치 폴더는 모두 종료·삭제 완료(포트 3000 재확인 결과 LISTENING 없음)

---

## 2026-07-09 (9)

### 추가 (Added)

- **Development OS — Dev Server Manager Status/PID를 실제 서버 상태 기준으로 표시**: 기존에는 Start 성공 시 응답값으로만 잠깐 Status/PID를 표시하고, 페이지를 새로고침하면 실제로는 프로세스가 계속 실행 중이어도 클라이언트 state가 초기화되어 항상 "Stopped/-"로 되돌아가던 문제를 수정. `lib/devserver/manager.ts`의 실행 중 프로세스 registry(Map)를 서버 측 단일 진실 공급원으로 삼아 조회하도록 변경
  - `lib/devserver/manager.ts` — `getDevServerStatus(workspacePath)` 추가(registry에 있으면 `{running:true, pid}`, 없으면 `{running:false, pid:null}`)
  - `app/api/devserver/status/route.ts`(신규) — `GET ?cwd=`으로 위 함수를 노출
  - `lib/devserver/client.ts` — `fetchDevServerStatus(cwd)` 추가
  - `components/developer/DevServerManagerCard.tsx` — `cwd`가 정해지면(마운트·Workspace 전환 시) 실제 상태를 조회해 Status/PID/Port에 반영, Start 성공 직후에도 재조회해 항상 서버의 실제 상태와 일치하도록 수정

### 검증 (Verified)

- `npx tsc --noEmit`(루트), `npm run lint` 통과
- 저장소의 실제 Next.js dev 서버를 임시 기동 후, 정상 `dev` 스크립트가 있는 스크래치 프로젝트로 (1) Start 이전 상태 조회 → `{running:false, pid:null}`, (2) Start 실행 → `{success:true, pid:19000}`, (3) Start 이후 상태 재조회 → `{running:true, pid:19000}`(Start 응답의 PID와 정확히 일치)까지 실제 HTTP 요청으로 확인. 테스트에 사용한 프로세스·dev 서버·스크래치 폴더는 모두 종료·삭제 완료(포트 3000 재확인 결과 LISTENING 없음)

---

## 2026-07-09 (8)

### 추가 (Added)

- **Development OS — Dev Server Manager Start 버튼 실제 구현**: `/developer` 카드의 Start 버튼이 실제로 현재 프로젝트 경로에서 dev 서버를 실행하도록 구현(성공/실패 여부만 표시, 사용자 지시 범위)
  - `lib/terminal/server.ts` — 기존 `buildShellInvocation()`(PowerShell/CMD/Git Bash 별 실행 인자 구성)을 export해 Dev Server Manager에서 재사용
  - `lib/devserver/manager.ts`(신규) — `startDevServer(workspacePath)`. `lib/projects/detect.ts`의 `detectProjectFiles()`로 packageManager를 재사용 감지해 `npm run dev`/`pnpm dev`/`yarn dev`/`bun run dev` 중 실행. `package.json` 부재·`dev` 스크립트 부재·이미 실행 중인 경우를 사전에 걸러 즉시 실패 반환. 프로세스는 일반 `executeShellCommand()`처럼 종료를 기다리지 않고(dev 서버는 종료되지 않는 프로세스이므로) 2초 동안 조기 종료(`exit`)·실행 오류(`error`)가 없으면 "성공"으로 판정, 경로별로 실행 중인 프로세스를 모듈 싱글턴 Map에 기록(중복 실행 방지)
  - `app/api/devserver/start/route.ts`(신규) — `POST { cwd }` → `startDevServer()` 위임
  - `lib/devserver/client.ts`(신규) — 위 API를 호출하는 클라이언트 함수
  - `components/developer/DevServerManagerCard.tsx` — Start 클릭 시 `useResolvedCwd()`(Terminal/GitHub Manager와 동일하게 현재 Workspace 기준 경로 재사용)로 얻은 cwd로 실제 API를 호출, 성공/실패 여부만 `StatusMessage`(초록/빨강)로 표시. 성공 시 Status/PID는 실제 응답값(spawn된 프로세스의 실제 PID)으로 갱신. Stop/Restart 버튼은 이번 범위에 포함되지 않아 기존 Mock 동작 그대로 유지(주의: 실제로 spawn된 프로세스를 Stop이 아직 종료시키지 못함 — 아래 다음 추천 작업 참고)

### 검증 (Verified)

- `npx tsc --noEmit`(루트), `npm run lint` 통과
- 격리된 스크래치 프로젝트 2종(정상 `dev` 스크립트가 있는 프로젝트, `dev` 스크립트가 없는 프로젝트)을 만들고, 저장소의 실제 Next.js dev 서버를 임시로 기동해 `/api/devserver/start`에 실제 HTTP 요청으로 검증: (1) 정상 프로젝트 → `{success:true, pid:<실제 PID>}` 확인, 실제 프로세스가 살아있음을 `tasklist`로 확인, (2) `dev` 스크립트 없는 프로젝트 → `{success:false, error:"package.json에 dev 스크립트가 없습니다."}` 확인, (3) 이미 실행 중인 경로에 재요청 → `{success:false, error:"이미 실행 중입니다."}` 확인(중복 실행 방지 정상 동작). 검증에 사용한 프로세스·테스트용 dev 서버·스크래치 폴더는 모두 종료·삭제 완료(포트 3000 재확인 결과 LISTENING 없음)

### 다음 추천 작업

- Stop/Restart를 실제로 연결하지 않으면, Start로 spawn된 프로세스가 UI에서 Stop을 눌러도 종료되지 않고 백그라운드에 남습니다(현재는 서버 재시작 전까지 `lib/devserver/manager.ts`의 Map으로만 추적됨). Stop 구현 시 이 Map에서 프로세스를 찾아 종료하는 방식으로 이어서 구현 가능

---

## 2026-07-09 (6)

### 수정 (Fixed)

- **AI Business OS CLI — 프로젝트 재등록 시 경로가 이름 기준으로 갱신되도록 수정**: 실제 새 컴퓨터 재현·값 단위 추적으로 확인된 원인 — `upsertProject()`(`packages/cli/src/lib/projects.js`)가 프로젝트 동일성을 **경로 문자열**로만 판단해, `D:\AI-Web-Master`에서 `C:\Users\cnbiz\AI-Web-Master`로 재등록해도 기존 항목을 덮어쓰지 못하고 별개 항목으로 추가되어 옛 경로가 레지스트리에 계속 남아있었음
  - `isSameProject(a, b)`(신규, 이름 기준 비교)를 분리해 "동일 프로젝트"의 기준을 명시적인 함수로 만들고, `upsertProject()`가 경로가 아닌 이 기준으로 기존 항목을 찾아 **workspacePath만 덮어쓰도록** 수정(새 항목 추가 안 함 → 중복 없음, 옛 경로 값은 대입으로 자연히 사라짐)
  - 더 이상 쓰이지 않게 된 `updateProjectPath()`(이전 시도에서 추가했던 경로-한정 갱신 함수)는 제거

### 추가 (Added)

- **AI Business OS CLI — `ai` 실행 시 PowerShell 세션 자체가 프로젝트 폴더로 이동(Set-Location)**: 기존에는 `ai`가 일반 실행 파일(`ai.cmd`/`ai.ps1`)이라, 내부에서 아무리 `process.chdir()`을 해도 그 효과가 자식 프로세스 자신에게만 미치고 사용자가 실제로 타이핑하는 부모 PowerShell 세션은 전혀 이동하지 않았음(자식 프로세스가 부모 셸의 cwd를 바꿀 수 없다는 OS 프로세스 모델의 근본적 제약 — 버그가 아니라 구조적 한계로 확인). `nvm`/`pyenv`/`conda activate`처럼 **PowerShell 함수**로 `ai`를 다시 감싸는 방식으로 해결
  - `packages/cli/shell/ai-function.ps1`(신규) — `$PROFILE`에 등록되는 `ai` 함수. 실제 CLI(`ai.cmd`, 확장자 명시로 자기 자신을 다시 호출하는 재귀 방지)를 실행한 뒤, CLI가 남긴 최종 작업 경로를 임시 파일에서 읽어 `Set-Location`으로 **이 PowerShell 세션 자신**을 이동시킴
  - `packages/cli/bin/ai.js` — `AI_PWSH_CWD_FILE` 환경변수(PowerShell 함수가 실행 직전에 지정)가 있으면, 프로세스가 어떻게 종료되든(`process.on("exit")`, `menu()`의 명시적 `process.exit(0)` 포함) 그 순간의 `process.cwd()`(이미 `pickProject()`가 chdir해 둔 값)를 그 파일에 기록. 환경변수가 없으면(함수 없이 `ai.cmd` 직접 실행 등) 아무 동작도 하지 않아 기존 사용 방식과 100% 호환
  - `packages/cli/package.json` — `files`에 `shell` 추가(npm 패키징에 포함되도록)
  - `packages/cli/install.ps1` — 새 단계(6-0) 추가: 설치된 패키지 안의 `shell/ai-function.ps1` 경로를 계산해 `$PROFILE`에 dot-source 줄을 추가(기존 `scripts/setup.ps1`의 프로필 등록 패턴과 동일, 중복 삽입 방지). `$PROFILE`은 PowerShell 시작 시에만 읽히므로 설치 완료 안내에 "새 PowerShell 창을 열어야 적용됨" 안내 추가

### 검증 (Verified)

- **재등록 이름 매칭 수정**: 격리 환경에서 `old-D`(경로 A, 이름 `ai-web-master`) 등록 → `old-D` 폴더를 삭제하지 않은 채로 `new-C`(경로 B, 같은 이름)로 재등록 → `projects.json`에 **항목이 여전히 1개**로 유지되고 `workspacePath`만 B로 갱신됨을 확인. `ai register` 없이 그냥 `third-E` 폴더에서 `ai` 실행(자동 감지)만으로도 동일하게 3번째 경로로 갱신됨을 확인(연속 이동 정상 수렴). 이름이 다른 프로젝트는 별도 항목으로 정상 유지됨(회귀 없음)
- **PowerShell cd 기능**: 실제 `npm install -g <경로> --force`로 격리된 npm prefix에 설치(`shell/ai-function.ps1` 포함 확인) → 새 PowerShell 프로세스에서 해당 함수를 dot-source(실제 설치 시 `$PROFILE`에 등록되는 것과 동일한 파일) → 프로젝트를 1개만 등록 → **무관한 폴더**(`...\Users-cnbiz`)로 이동 후 `ai` 실행(표준입력으로 메뉴 종료 "0" 전달) → 실행 완료 후 **`$PWD.Path`가 실제로 `...\AI-Web-Master`로 바뀌어 있음을 확인**(요청하신 "PS C:\Users\...> → ai → PS C:\...\AI-Web-Master>" 시나리오와 정확히 일치)
- **회귀 확인**: `AI_PWSH_CWD_FILE` 환경변수 없이 `ai.cmd`를 직접 실행(함수 없는 환경, 예: cmd.exe)해도 `--version`/`--help` 정상 동작함을 확인 — 기존 사용 방식에 영향 없음
- `install.ps1`·`shell/ai-function.ps1` PowerShell 구문 검사(`Parser::ParseFile`) 통과, `bin/ai.js` `node --check` 통과, `npm pack --dry-run`으로 `shell/ai-function.ps1`이 패키징 대상에 포함됨을 확인

---

## 2026-07-09 (5)

### 조사 (Investigated) — 사용자의 후속 재현: PATH는 정상인데 설치된 CLI가 구버전

- 사용자가 새 컴퓨터에서 `Get-Command ai` 결과(`...\npm\ai.ps1`, 단일 경로)를 확인해 PATH 자체는 정상임을 직접 확인했고, 그럼에도 `ai --version`(당시엔 미지원)·`project`/`register`가 없다고 재보고. "PATH가 아니라 CLI 엔트리포인트·빌드 과정을 봐달라"는 요청에 따라 재조사
  - `packages/cli/package.json`에 build/dist 단계가 없음을 재확인(스크립트 없음, TypeScript 컴파일·번들링 없음) — `bin/ai.js`가 `src/*.js`를 CommonJS로 직접 `require()`하는 순수 소스 배포 구조라 "dist가 최신인지"는 애초에 해당 사항이 없음
  - `.npmignore`(루트·`packages/cli` 모두 없음), 루트 `.gitignore`에도 `packages/` 관련 제외 규칙이 없어 `files` 필드 기반 패키징을 방해할 요소가 없음을 재확인
  - npm이 실제로 생성하는 `ai.ps1` 셸(전역 표준 템플릿)을 직접 열어 확인 — `$basedir/node_modules/@cnbiz/ai-business-os-cli/bin/ai.js`라는 **고정 경로**를 실행할 뿐, 별도 캐시·버전 판단 로직이 전혀 없음(즉 설치된 패키지 폴더의 실제 파일 내용이 오래됐다면 그것은 100% "그 경로에 실제로 설치된 내용 자체가 오래된 것"이며, 셸 자체의 문제일 수 없음)
  - 결론: 소스에 build 단계가 없고 셸도 고정 경로 위임만 하므로, 남은 유일한 설명은 "그 컴퓨터에 실제로 설치된 패키지 파일 자체가 오래된 소스로부터 만들어졌다"는 것 — 가장 유력한 경로는 여전히 오래된 클론에서 `setup.ps1`을 실행한 경우

### 추가 (Added)

- **AI Business OS CLI — 설치된 패키지에 실제 커밋 해시를 새겨넣어 "설치된 코드가 어느 커밋인지" 원격 확인 없이 즉시 대조 가능하게 함**: 단순 semver 버전(`0.2.0`)만으로는 다음 기능 추가 전까지 신구 구분이 안 되는 근본적 한계가 있어, 설치 시점마다 바뀌는 정보(커밋 해시)를 설치된 패키지 안에 직접 남기도록 개선
  - `packages/cli/src/buildInfo.js`(신규) — `module.exports = { commit: null }`. 소스에서 직접 실행할 때(설치 없이 `node bin/ai.js`)의 기본값
  - `packages/cli/bin/ai.js` — `CLI_VERSION`에 `buildInfo.commit`이 있으면 `v0.2.0+<커밋 7자리>` 형태로 이어붙여 `ai --version`/`ai --help` 양쪽에 표시
  - `packages/cli/install.ps1` — `npm install -g` 직전에 `src/buildInfo.js`를 현재 `git rev-parse --short HEAD` 값으로 잠깐 덮어써 패키징하고, 설치 성공/실패와 무관하게 `finally`에서 반드시 원래 내용으로 복원(소스 트리 git 상태를 깨끗하게 유지). 세 곳(기본 설치·사용자 prefix 재시도·shim 누락 시 자동 복구 재설치)에서 모두 이 커밋 해시가 적용되도록 `try/finally`로 install 구간 전체를 감쌈

### 수정 (Fixed)

- **위 기능을 실제로 검증하는 과정에서 직접 재현·발견한 버그**: `install.ps1`이 `src/buildInfo.js` 원본을 `Get-Content -Raw`로 읽었는데, Windows PowerShell 5.1의 `Get-Content` 기본 인코딩이 BOM 없는 UTF-8 파일의 한글을 시스템 코드페이지로 잘못 해석해, 복원 시 파일의 한글 주석이 깨진 상태로 저장되는 사고가 실제로 발생함(저장소의 실제 파일이 한 차례 깨졌다가 즉시 원본으로 복구·재검증됨 — 커밋에는 깨진 상태가 포함되지 않음). `[System.IO.File]::ReadAllText(path, UTF8Encoding($false))`로 읽기를 명시적 UTF-8로 교체해 근본 수정

### 검증 (Verified)

- 실제 저장소의 `packages/cli/src/buildInfo.js`를 대상으로, `install.ps1`이 하는 것과 동일한 "커밋 해시 삽입 → 격리된 npm prefix에 설치 → 원본 복원" 시퀀스를 그대로 실행(전역 npm/PATH는 건드리지 않도록 `--prefix`만 스크래치 경로로 격리, 소스 파일 자체는 실제 경로 사용)
  - 삽입된 커밋 해시로 설치된 CLI의 `ai --version` → `0.2.0+eac5396`(당시 HEAD) 정확히 표시됨을 확인
  - **인코딩 버그를 이 과정에서 실제로 재현**(첫 시도에서 한글 주석이 깨진 채 복원됨을 발견) → 원본을 MD5 해시로 정확히 복구 확인 → 인코딩을 명시적 UTF-8로 수정 → 재실행 시 복원된 파일이 원본과 바이트 단위로 완전히 동일함(`RESTORE_OK`)을 확인
- `install.ps1` 전체 PowerShell 구문 검사(`Parser::ParseFile`) 통과, `bin/ai.js`·`buildInfo.js` `node --check` 통과
- 이 컴퓨터에 이미 있던 실제 전역 설치(저장소로의 `npm link` 방식 Junction)는 이번 변경으로 건드리지 않음(테스트를 격리된 prefix로만 수행) — 사용자의 다음 설치/재설치부터 새 진단 기능이 적용됨

---

## 2026-07-09 (4)

### 검증 (Verified) — 새 컴퓨터에서 `ai --help`에 프로젝트 명령이 안 보인다는 보고 조사

- 사용자가 실제 새 컴퓨터에서 `setup.ps1` 설치 후 `ai --help`에 `ai project`/`ai register`가 표시되지 않는다고 보고. 아래 절차로 원인 조사
  - `npm pack --dry-run`으로 `packages/cli`가 패키징하는 실제 파일 목록을 확인 — `src/commands/project.js`·`src/commands/register.js`·`src/lib/projectPicker.js` 등 신규 파일 전부 포함됨을 확인(패키징 누락 아님)
  - `setup.ps1`/`install.ps1`이 실제로 실행하는 `npm install -g "<packages/cli 경로>" --force` 명령을, 실사용자 npm 전역 환경을 건드리지 않도록 격리된 npm prefix에 그대로 재현해 두 시나리오로 검증: (1) 완전히 새로운 설치 → `ai --help`에 `ai project`/`ai register` 정상 표시, (2) 이 세션 이전 커밋(`73429c7`, project/register 없음)을 먼저 설치한 뒤 최신 코드로 재설치(업그레이드 시나리오, `git archive`로 구버전 소스 추출해 재현) → 정확히 최신 코드로 갱신되어 두 명령이 나타남을 확인
  - 이 컴퓨터에 이미 설치되어 있던 실제 전역 `ai`(`%APPDATA%\npm`)도 재확인 — `npm link` 방식(저장소로의 디렉터리 Junction)이라 항상 최신 소스를 그대로 반영하고 있었고, 실제로 `ai --help`에도 정상 표시됨을 확인
  - **결론**: 코드 연결·패키징·`npm install -g --force`를 통한 설치/업그레이드 메커니즘 자체는 정상 동작함을 재현 검증으로 확인. 새 컴퓨터에서 재현된 문제의 가장 유력한 원인은 그 컴퓨터의 저장소 클론이 최신 커밋 이전 상태에서 `setup.ps1`을 실행했을 가능성(설치 스크립트는 항상 로컬 클론에 있는 코드 그대로를 패키징하므로, 클론이 오래되면 오래된 코드가 설치되는 것은 설계상 당연한 동작) — 사용자가 즉시 스스로 판별할 수 있도록 아래 진단 기능을 추가

### 추가 (Added)

- **AI Business OS CLI — 설치된 버전 확인 명령 및 중복 설치 감지**: "설치는 됐는데 새 기능이 안 보인다"는 상황을 사용자가 직접, 즉시 진단할 수 있도록 개선
  - `packages/cli/package.json` — 버전 `0.1.0` → `0.2.0`(프로젝트 런처·자동 등록 등 이번 기능 묶음 반영, 이후 버전 비교의 기준점)
  - `packages/cli/bin/ai.js` — `ai --version`/`ai -v`(신규) 추가: 설치된 CLI의 실제 버전만 출력. `ai --help` 첫 줄에도 버전(`AI Business OS CLI  v0.2.0`) 표시 — 새 컴퓨터에서 이 값이 예상보다 낮으면 재클론/재설치가 필요하다는 신호로 바로 알 수 있음
  - `packages/cli/install.ps1` — ① 최종 점검에 `ai --version` 실행 추가(설치 로그에 버전이 항상 남음). ② **중복 설치 감지**: `Get-Command ai -All`로 PATH상에 `ai` 명령이 여러 곳에 있는지 확인해, 방금 설치/갱신한 위치가 PATH 우선순위상 맨 앞이 아니면("오래된 설치가 대신 실행될 수 있음") 발견된 모든 경로와 함께 명시적으로 경고

### 검증 (Verified)

- 격리된 npm prefix에 재설치 후 `ai --version` 실행 → `0.2.0` 정상 출력, `ai -h`의 첫 줄에도 `v0.2.0` 반영 확인
- 중복 설치 감지 로직을 별도 스크립트로 추출해 검증: PATH 앞쪽에 구버전 위치, 뒤쪽에 신버전 위치를 두고 `Get-Command ai -All` 기반 로직 실행 → "PATH에서 ai 명령이 N곳에서 발견", 우선순위 1번 표시(`→`), "방금 설치/갱신한 위치가 최우선이 아님" 경고까지 의도대로 정확히 동작함을 확인
- `install.ps1` 전체 PowerShell 구문 검사(`Parser::ParseFile`) 통과, `bin/ai.js` `node --check` 통과

---

## 2026-07-09 (3)

### 수정 (Fixed)

- **AI Business OS CLI — 새 컴퓨터 첫 실행(First Run) 시 `ai`가 프로젝트를 찾지 못하던 문제 수정**: 사용자가 새 컴퓨터에서 `setup.ps1` 설치 후 `ai`를 실행했을 때, 그동안 `setup.ps1`이 전역 `ai` 명령만 설치하고 프로젝트 레지스트리(`~/.ai-business-os/projects.json`)에는 아무것도 등록하지 않아 "최근 프로젝트" 목록이 항상 비어있던 것을 실제 재현 보고를 통해 확인. 아래 두 가지로 해결
  - `packages/cli/src/commands/register.js`(신규) — `ai register --path <경로>`. 프롬프트 없이 지정된 경로를 프로젝트 레지스트리에 즉시 등록/갱신하는 비대화형 명령(설치 스크립트에서 안전하게 호출하기 위함). `packages/cli/bin/ai.js`에 라우팅 및 `--help` 안내 추가
  - `scripts/setup.ps1` — 9번째 단계 "Project Registration" 추가. 8번(AI CLI 설치) 단계에서 확인된 `ai.cmd`의 실제 파일 경로를 직접 호출해 `ai register --path <이 저장소 루트>`를 실행, 이 저장소(ai-web-master) 자신을 자동 등록한다(PATH가 아직 이 세션에 반영되지 않았어도 항상 동작). 설치 완료 안내(Next Step)에도 `ai` 실행 시 이 프로젝트가 자동으로 열린다는 안내를 추가

### 추가 (Added)

- **AI Business OS CLI — 등록된 프로젝트가 1개뿐이면 선택 없이 자동으로 열기**: 기존에는 프로젝트가 1개만 등록되어 있어도 매번 "번호를 선택하세요(Enter=현재 폴더)"를 물었음 — 새 컴퓨터에서 프로젝트가 정확히 1개(방금 설치한 이 저장소)뿐인 가장 흔한 첫 실행 상황에서도 매번 Enter를 눌러야 했던 불필요한 단계였음
  - `packages/cli/src/lib/projectPicker.js`(`pickProject()`) — 최근 프로젝트가 정확히 1개면 목록 표시·프롬프트 없이 곧바로 그 프로젝트로 `process.chdir()`(필요한 경우)하고 반환. 2개 이상일 때는 기존과 동일하게 번호 선택 목록을 표시(회귀 없음)

### 검증 (Verified)

- 실사용자 레지스트리(`~/.ai-business-os/projects.json`, 이 컴퓨터에는 아직 파일 자체가 없음을 사전 확인)를 건드리지 않도록 `USERPROFILE`을 스크래치 홈으로 오버라이드한 격리 환경에서 실제 `node bin/ai.js` 실행으로 검증(종료 후 스크래치 폴더 전부 삭제)
- **`ai register` 등록·멱등성**: 프로젝트가 전혀 등록되지 않은 상태에서 관계없는 폴더(cwd)로부터 `ai register --path <projA>` 실행 → 프롬프트 없이 즉시 등록되고 `projects.json`에 반영됨을 확인. 동일 경로로 재실행해도 중복 항목 없이 `lastOpenedAt`만 갱신됨을 확인(setup.ps1을 여러 번 실행해도 안전)
- **1개 프로젝트 자동 열기(cd 불필요)**: 등록된 프로젝트가 1개(projA)뿐인 상태에서, 그와 무관한 폴더에서 `ai project` 및 `ai menu`(= 맨 `ai`) 각각 실행 → "최근 프로젝트" 목록·선택 프롬프트가 전혀 나타나지 않고 "프로젝트 자동 열기" 로그와 함께 즉시 projA로 전환됨을 확인. `ai project`에서는 이어서 Repo(Git 브랜치·변경 건수)가 projA 기준으로 정확히 표시됨을 확인, `ai menu`에서는 메인 메뉴 배너가 즉시 projA로 표시됨을 확인
- **2개 이상이면 선택 메뉴 유지(회귀 확인)**: 두 번째 프로젝트(projB)를 추가 등록한 뒤 다시 무관한 폴더에서 `ai project` 실행 → 이번엔 기존과 동일하게 번호 선택 목록(1·2번)이 정상적으로 다시 표시됨을 확인
- `setup.ps1` 전체 PowerShell 구문 검사(`[System.Management.Automation.Language.Parser]::ParseFile`) 통과. 신규/수정 JS 파일(`bin/ai.js`, `commands/register.js`, `lib/projectPicker.js`) `node --check` 구문 검증 통과
- **미실행 항목**: `setup.ps1` 9번 단계 자체(PowerShell에서 실제 `& $aiCmdPath register ...` 호출)는 8번 단계(AI CLI 설치)와 동일한 방식으로 실제 `ai register` 명령을 격리 환경에서 검증했으므로 전체 `setup.ps1`을 처음부터 재실행하는 통합 테스트는 반복하지 않음(Testing Policy: 통합 테스트 1회 원칙, 8번 단계 자체는 이전 세션에서 이미 전 구간 실행 검증됨)

---

## 2026-07-09 (2)

### 추가 (Added)

- **AI Business OS CLI — `ai project` 프로젝트 런처 신규 추가**: 이전 작업(2026-07-09)에서 대화형 메뉴 진입 시에만 동작하던 프로젝트 선택을, `cd` 없이 곧바로 "선택 → 이동 → VS Code/dev 서버 실행"까지 이어지는 독립 명령 `ai project`로 확장. `ai --help`에도 표시됨
  - `packages/cli/src/lib/projectPicker.js`(신규) — 기존 `menu/projectSelect.js`에 있던 "현재 폴더 자동 인식·등록 → 최근 프로젝트 목록 표시 → 번호 선택 → `process.chdir()`" 핵심 로직을 `pickProject()`로 추출(중복 제거). `ai project`와 `ai`/`ai menu` 양쪽이 이 함수를 공유
  - `packages/cli/src/commands/menu/projectSelect.js` — `pickProject()`를 호출하는 얇은 래퍼로 축소(동작 변경 없음)
  - `packages/cli/src/commands/project.js`(신규) — `ai project` 명령. `pickProject()`로 선택받은 뒤 프로젝트명·경로·**Repo(Git 브랜치·변경 건수)**를 곧바로 화면에 표시(선택한 프로젝트로 전환됐음을 명확히 보여줌), "VS Code와 dev 서버를 실행할까요? (Y/n)"를 물어 Y(기본값)면 기존 `devmode()`를 그대로 재사용해 VS Code·`npm run dev`·실시간 미리보기·Visual Editor까지 이어서 실행
  - `packages/cli/bin/ai.js` — `project` 명령 라우팅 추가, `--help` 출력에 `ai project` 안내 추가
  - 레지스트리는 기존과 동일하게 사용자 홈 기준 전역 설정(`~/.ai-business-os/projects.json`)이라 별도 설정 없이 새 컴퓨터에서도 동일하게 동작함

### 검증 (Verified)

- 실사용자 레지스트리를 건드리지 않도록 `USERPROFILE`을 스크래치 홈으로 오버라이드한 격리 환경에서 실제 `node bin/ai.js` 실행으로 검증(종료 후 스크래치 폴더 전부 삭제)
- `ai --help` 출력에 `ai project` 안내 문구가 정상 표시됨을 확인
- `pickProject()` 추출(리팩터링) 이후 기존 `ai menu` 흐름(프로젝트 자동 인식·목록 표시·선택·메인 메뉴 진입·종료)이 회귀 없이 그대로 동작함을 재확인
- `ai project`를 projB(현재 폴더)에서 실행 → 최근 목록에 B(현재 폴더)·A 표시 → "2"(A) 선택 → 화면에 "프로젝트: scratch-project-a", "경로: ...projA", **"Repo: master (clean)"**가 즉시 표시됨을 확인(시작 폴더는 B였음에도 A의 실제 Git 상태가 정확히 조회됨 — `chdir`가 정상 적용되었음을 재확인). "VS Code와 dev 서버를 실행할까요?" 프롬프트에서 "n" 입력 시 정상적으로 건너뛰고 종료됨을 확인
- VS Code·새 터미널 창을 실제로 여는 "Y" 경로는, 동일한 `devmode({ path })` 호출을 이전 작업(`devStart()`)에서 이미 검증했고 파라미터 전달 방식이 동일하므로 사용자 화면에 실제 창을 띄우는 재검증은 생략(자동 테스트 정책상 반복 검증 지양)
- 수정/신규 파일(`bin/ai.js`, `lib/projectPicker.js`, `commands/project.js`, `commands/menu/projectSelect.js`) 전체 `node --check` 구문 검증 통과

---

## 2026-07-09

### 추가 (Added)

- **AI Business OS CLI — 프로젝트 자동 인식·최근 프로젝트 선택**: `ai` 실행 시 매번 프로젝트를 수동으로 `cd`해서 찾아다니던 것을, 현재 폴더를 자동 인식하고 최근 프로젝트 목록에서 번호로 골라 바로 그 프로젝트에서 실행할 수 있도록 개선
  - `packages/cli/src/lib/projects.js` — `upsertProject()`(경로 기준으로 이미 등록된 프로젝트면 최근 사용 시각만 갱신, 없으면 신규 등록 — 중복 등록 방지), `getRecentProjects()`(최근 사용순 정렬), `normalizePath()`(Windows 경로 대소문자·구분자 차이를 흡수하는 비교용 정규화) 추가
  - `packages/cli/src/lib/currentProject.js`(신규) — 현재 폴더가 "프로젝트"인지(package.json 존재 또는 Git 저장소) 판별하는 `detectCurrentProject()`. 프로젝트가 아닌 임의의 폴더(예: 바탕화면)는 레지스트리에 등록하지 않음
  - `packages/cli/src/commands/menu/projectSelect.js`(신규) — `ai` 실행 시 1회 호출되는 `selectSessionProject()`. 현재 폴더 자동 인식·등록 → 최근 프로젝트 최대 8개를 번호와 함께 표시(현재 폴더는 "← 현재 폴더" 표시) → 번호 선택 시 해당 프로젝트 경로로 `process.chdir()` → 최근 사용 시각 갱신. 선택할 프로젝트가 전혀 없으면(레지스트리 비어있고 현재 폴더도 프로젝트가 아님) 프롬프트 없이 바로 진행
  - `packages/cli/src/commands/menu/index.js` — `menu()` 시작 시(메인 메뉴 루프 진입 전) `selectSessionProject()` 호출. 이후 메뉴 상단 배너("프로젝트"·"경로")는 매 루프마다 `process.cwd()`를 다시 읽으므로 선택된 프로젝트가 자동으로 반영됨(Repo 표시 자동 변경). Git 상태·개발 시작 등 나머지 모든 메뉴 기능도 `process.cwd()`를 그대로 사용하므로 별도 수정 없이 선택된 프로젝트를 대상으로 자동 실행됨
  - `packages/cli/src/commands/menu/actions.js` — `devStart()`가 이미 선택된 프로젝트 경로(`process.cwd()`)를 `devmode({ path })`로 명시 전달해, 기존에 `devmode`가 자체적으로 다시 묻던 프로젝트 선택 프롬프트가 메뉴 흐름에서 중복 표시되지 않도록 수정
  - `ai new`·`ai devmode`·`ai deploy`·`ai doctor`(단독 실행)의 기존 동작은 변경하지 않음 — 프로젝트 선택 단계는 `ai`/`ai menu`(대화형 메뉴 진입) 시점에만 적용됨

### 검증 (Verified)

- 실제 사용자 레지스트리(`~/.ai-business-os/projects.json`)를 건드리지 않도록 `USERPROFILE` 환경변수를 스크래치 홈 디렉터리로 오버라이드한 격리 환경에서 실제 `node bin/ai.js menu`를 실행해 검증(스크래치 프로젝트 폴더 2개 생성 후 종료 시 전부 삭제)
- **자동 인식·등록**: 등록된 프로젝트가 하나도 없는 상태에서 package.json이 있는 폴더(projA)에서 최초 실행 → 프로젝트 선택 화면에 자동으로 1개 항목("← 현재 폴더" 표시)이 나타나고, `projects.json`에 새 항목이 실제로 생성됨을 확인
- **최근 프로젝트 선택 + 자동 실행 + Repo 표시 변경**: 다른 프로젝트 폴더(projB)에서 실행 → 최근 목록에 B(현재 폴더, 1번)·A(2번) 둘 다 표시됨을 확인. 번호 "2"(A) 선택 → 메뉴 상단 배너가 즉시 "프로젝트: scratch-project-a", "경로: ...projA"로 바뀜을 확인(실행 시작 폴더는 B였음에도 A로 전환) — `process.chdir()`가 실제로 적용되어 이후 모든 메뉴 기능이 A를 대상으로 동작함을 확인
- **최근 사용 시각 갱신**: 위 선택 이후 `projects.json`에서 A의 `lastOpenedAt`이 B보다 최신으로 갱신됨을 확인(다음 실행 시 A가 목록 최상단에 오름)
- **중복 등록 방지**: 동일 경로(A·B)에서 총 3회 실행했음에도 `projects.json`에 경로당 정확히 1개 항목만 유지됨을 확인(경로 기준 upsert 정상 동작)
- **프로젝트가 아닌 폴더 처리**: package.json도 Git 저장소도 아닌 폴더에서 실행 → 레지스트리에 등록되지 않고(항목 수 2건 유지), 최근 목록(A·B)은 정상 표시되며 Enter 시 현재 폴더로 정상 진행됨을 확인
- 수정한 5개 파일 전체 `node --check` 구문 검증 통과

---

## 2026-07-08 (10)

### 추가 (Added)

- **AI Business OS CLI — 메뉴 런처에 "설치 / 업데이트" 최상위 항목 복원**: V5에서 "설정" 하위로 재배치됐던 `🛠 설치 / 업데이트`를 다시 최상위 1번으로 복원(새 컴퓨터에서도 메뉴만으로 설치를 진행할 수 있어야 한다는 목적에 맞춤). 나머지 항목은 한 칸씩 밀려 최종 순서는 1.설치/업데이트 2.개발 시작 3.프로젝트 관리 4.환경 점검 5.UI Explorer 6.Claude Code 7.ChatGPT 8.Git 관리 9.설정(도움말은 기존과 동일하게 `H` 단축키로 접근). "설정" 하위에 중복으로 있던 "설치 / 업데이트 실행" 옵션은 최상위와 중복되므로 제거
  - `packages/cli/src/commands/menu/actions.js` — `install()`이 `spawnSync`의 결과(종료 코드)를 직접 확인하도록 개선. 기존에는 `scripts/setup.ps1`을 실행만 하고 결과를 확인하지 않았으나, 이제 종료 코드 0이면 "완료되었습니다.", 0이 아니면 "설치가 완료되지 않았습니다 (종료 코드: N)"을 명확히 출력. `install`을 다시 `module.exports`에 등록(menu.json이 최상위 action으로 참조)
  - `packages/cli/src/config/menu.json` — 위 순서로 전면 재배열

### 수정 (Fixed)

- **실제로 재현된 버그: cwd가 npm workspaces 멤버 폴더 안일 때 `설치 / 업데이트`가 항상 실패하던 문제**: 메뉴의 "설치 / 업데이트"를 실제로 실행해 검증하던 중 발견. `scripts/setup.ps1`이 호출하는 `packages/cli/install.ps1`의 `npm config get prefix`가, 이 명령을 실행하는 프로세스의 현재 작업 폴더(cwd)가 npm workspaces 멤버 폴더(예: 이 저장소의 `packages/cli` 자체) 안에 있으면 `ENOWORKSPACES` 오류로 실패하고, 그 결과로 `$npmPrefix`가 `$null`이 되어 이후 모든 단계가 연쇄적으로 깨짐(`ai.cmd` 생성 확인 실패 → 설치 항목 전체 실패). `cwd`가 저장소 루트일 때는 재현되지 않고, 워크스페이스 "멤버" 폴더 안일 때만 재현됨을 직접 검증으로 확인 — 개발자가 `packages/cli`에서 작업하다 `ai`를 실행하는 실제 시나리오에서 발생할 수 있는 문제였음
  - `packages/cli/install.ps1`·`scripts/setup.ps1` — 두 곳의 `npm config get prefix` 호출에 `--workspaces=false`를 추가해 cwd와 무관하게 항상 전역 prefix를 올바르게 조회하도록 수정

### 검증 (Verified)

- **버그 재현 및 수정 확인**: `D:\ai-web-master\packages\cli`(워크스페이스 멤버 폴더)를 cwd로 `npm config get prefix`를 직접 실행해 `ENOWORKSPACES` 실패를 재현 → `--workspaces=false` 추가 후 동일 위치에서 정상 값 반환 확인. 이 cwd에서 메뉴의 "설치 / 업데이트"를 실제로 실행해(네이티브 PowerShell 환경에서 직접 확인) 수정 전 실패 → 수정 후 "완료되었습니다." 성공 메시지와 함께 정상 종료(코드 0, 약 8~9초 소요)까지 재확인
- **설치 성공 경로**: 실제 저장소 루트 기준으로도 메뉴를 통해 `scripts/setup.ps1`이 정상 실행되고 진행 상황이 그대로 출력되며 완료 메시지가 표시됨을 확인
- **설치 실패 경로**: 의도적으로 `exit 1`을 반환하는 가짜 `scripts/setup.ps1`을 별도 스크래치 저장소에 만들어 실행 — 스크립트 자체 출력이 그대로 표시되고, `설치가 완료되지 않았습니다 (종료 코드: 1)`로 원인이 명확히 보고된 뒤 메인 메뉴로 복귀함을 확인
- **회귀 테스트**: 스크래치 Git 저장소에서 전체 메뉴(1 설치/업데이트-저장소 없음 안내, 3 프로젝트 관리, 4 환경 점검, 5 UI Explorer, 7 ChatGPT, 8 Git 관리의 상태 확인/저장 및 업로드, 9 설정의 중복 옵션 제거 확인, H/R/잘못된 입력/0 종료)를 자동화 테스트로 재확인. 오류 복원력 테스트(동기 예외·미처리 비동기 거부, 새 번호로 갱신)도 재실행해 정상 동작 확인. `menu.json`에 임시 항목을 추가하는 확장성 테스트도 재확인 후 원복

---

## 2026-07-08 (9)

### 변경 (Changed)

- **AI Business OS CLI — 메뉴 런처(Menu Launcher) V5: 개발자 메인 런처(Home Launcher)로 메뉴 재구성**: 요청된 순서(개발 시작 → 프로젝트 관리 → 환경 점검 → UI Explorer → Claude Code → ChatGPT → Git 관리 → 설정 → 도움말 → 종료)로 `src/config/menu.json`을 전면 재구성. 기존 기능은 전부 남기되, 최상위 메뉴에서 빠진 항목은 아래로 재배치해 "기존 기능을 깨뜨리지 말 것" 원칙을 지킴
  - **신규**: `📁 프로젝트 관리`(action: `projectManage`, 신규) — 등록된 프로젝트 목록 표시, 신규 프로젝트 등록(기존 `ai new`/`newProject()` 그대로 재사용). `💬 ChatGPT`(action: `chatgpt`, 신규) — `https://chat.openai.com/`을 브라우저로 열기
  - **통합**: 기존 최상위 항목이던 `Git 동기화`·`저장 및 업로드`를 `🔄 Git 관리`(action: `gitManage`, 신규) 하나로 통합 — 하위에 `1.상태 확인`(신규 `showGitStatus()`) `2.동기화(pull)` `3.저장 및 업로드(commit+push)` 서브메뉴 제공. 기존 `gitSync()`/`saveUpload()` 함수는 그대로 유지되어 내부적으로 재사용됨(동작 변경 없음)
  - **재배치**: 최상위 메뉴에서 빠진 `🛠 설치 / 업데이트`는 `⚙ 설정` 하위 옵션(`2.설치 / 업데이트 실행`)으로 이동 — 기존 `install()` 함수 그대로 재사용, 실행 결과·안내 메시지 동일
  - **신규 메뉴 타입**: `9.📖 도움말`에 `type: "help"`를 추가해, 번호로 선택해도 `H` 단축키와 완전히 동일한 도움말 화면이 뜨도록 통합(같은 코드 경로 재사용). `menu.json` 검증 로직(`loadMenuConfig`)도 `type: "help"` 항목은 `action`/`command`가 없어도 되도록 반영
  - `menu.json` 기반 구조·"설정 파일만 수정하면 메뉴 추가/삭제 가능" 원칙은 V2~V4와 동일하게 유지(코드 변경 없이 항목 추가/삭제로 검증 완료)

### 검증 (Verified)

- 실제 저장소에서 새 메뉴 순서(1~9, 0)가 요청대로 정확히 표시됨을 확인
- 스크래치 Git 저장소(원격 없음)에서 전체 시나리오 자동화 테스트: 2(프로젝트 관리 진입/복귀), 3(환경 점검, 기존 기능 회귀 확인), 4(UI Explorer), 6(ChatGPT), 7(Git 관리 → 상태 확인/동기화/저장 및 업로드 3개 하위 옵션 모두), 8(설정 → 새로 추가된 "설치/업데이트 실행" 옵션이 저장소 전용 파일 없음을 정상 안내), 9(도움말, 번호 선택)와 `H` 단축키가 동일한 도움말 화면을 띄우는지, `R`(새로고침), 잘못된 입력, `0`(종료)까지 전부 정상 동작 확인. 프로세스 정상 종료 코드 0 확인
- **회귀 테스트**: V3의 오류 복원력 테스트(동기 예외·미처리 비동기 거부 몬키패치, UI Explorer 키 번호를 5→4로 갱신)를 재실행 — V5 구조 변경 후에도 여전히 정상 동작(크래시 없이 메인 메뉴 복귀) 확인
- **확장성 재확인**: `menu.json`에 `type: "shell"` 임시 항목을 코드 변경 없이 추가해 정상 로드됨을 확인한 뒤 원복 — "menu.json만 수정하면 메뉴 추가" 요구사항이 V5 구조에서도 유지됨을 확인

---

## 2026-07-08 (8)

### 추가 (Added)

- **AI Business OS CLI — 메뉴 런처(Menu Launcher) V4: 일반 사용자용 시작 화면·단축키**: `ai` 실행 시 보이는 화면을 "일반 사용자도 쉽게 사용할 수 있는" 형태로 재구성
  - `packages/cli/src/commands/menu/index.js` — 시작 화면에 CLI 자체 버전(`packages/cli/package.json`의 `version`)과 로고(제목) 표시, 현재 프로젝트명(현재 폴더의 `package.json`의 `name`, 없으면 폴더명)과 현재 경로(`process.cwd()`) 표시, 하단에 `H : 도움말 / R : 새로고침 / Q : 종료` 안내 바 추가. 메뉴 항목 번호·단축키에 색상 적용(`packages/cli/src/lib/log.js`에 `boldCyan`/`boldYellow` 색상 추가)
  - **단축키**: `H`(대소문자 무관) — 전체 메뉴·단축키 설명을 보여주는 도움말 화면. `R` — 코드 재시작 없이 `menu.json`을 다시 읽어들여 즉시 반영(메뉴를 설정 파일만 수정해 추가/삭제하는 워크플로와 자연스럽게 연결됨). `Q` — 숫자 종료 키(`menu.json`의 `exitKey`)와 동일하게 즉시 종료
  - 기존 숫자 선택·자동 메인 메뉴 복귀·V3의 오류 복원력(uncaughtException/unhandledRejection 안전망)·종료 시 `process.exit(0)`·`menu.json` 기반 구조는 변경 없이 그대로 유지

### 검증 (Verified)

- 실제 저장소(`D:\ai-web-master`)에서 시작 화면에 배너·버전(`v0.1.0`)·프로젝트명(`ai-web-master`)·경로·하단 도움말 바가 모두 정상 표시됨을 확인
- `H`(도움말 화면 표시), `R`(menu.json 재로드 성공 메시지), 잘못된 입력(`99`) 처리, 기존 기능(`3` 환경 점검) 정상 동작, 소문자 `q`로 종료까지 자동화 테스트로 전체 흐름 확인, 프로세스 정상 종료 코드 0 확인
- **회귀 테스트**: V3에서 작성한 오류 복원력 테스트(동기 예외·미처리 비동기 거부 몬키패치)와 스크래치 Git 저장소 테스트(항목 1·5·6·7·8)를 새 프롬프트 문구(`선택 >`)에 맞게 갱신해 재실행 — 모두 이전과 동일하게 정상 동작함을 확인(V4의 UI 변경이 V2/V3 로직에 회귀를 일으키지 않음)

---

## 2026-07-08 (7)

### 변경 (Changed)

- **AI Business OS CLI — 메뉴 런처(Menu Launcher) V3: 오류 복원력 강화 및 종료 안정화**: V2까지는 액션 함수 안에서 `await`로 감싸지 못한 콜백·타이머 등에서 발생한 예외(비동기로 지연되는 미처리 거부 등)가 메뉴 루프의 `try/catch`를 우회해 Node 기본 동작(`uncaughtException`/`unhandledRejection` 발생 시 프로세스 종료)으로 이어질 수 있는 경우가 있었음. `packages/cli/src/commands/menu/index.js`에 메뉴 루프가 실행되는 동안에만 유효한 `uncaughtException`/`unhandledRejection` 안전망을 추가해, 어떤 오류가 나도 즉시 로그로 남기고 메인 메뉴로 복귀하도록 강화(루프 밖의 단일 명령 실행, 예: `ai doctor`에는 영향 없음)
  - 메뉴 종료(`0` 선택) 시 `process.exit(0)`을 명시적으로 호출하도록 추가. `readline`이 매 질문마다 `process.stdin`을 flowing 모드로 전환해두는 특성상, 인터페이스를 다 닫아도 stdin 핸들이 이벤트 루프를 계속 붙잡아 실제 터미널에서는 "종료합니다" 메시지만 찍히고 셸로 돌아가지 못하는 경우가 있었음(테스트 중 실제로 재현)
  - `menu.json` 기반 구조·8개 기존 메뉴 항목·설정 파일만 수정해 메뉴를 추가/삭제하는 구조는 V2와 동일하게 유지(코드 변경 없음)

### 검증 (Verified)

- **오류 복원력**: `actions.js`의 함수를 일시적으로 몬키패치해 (1) 동기 예외를 던지는 액션, (2) `await`로 감싸지 못한 비동기 거부(미처리 rejection)를 발생시키는 액션을 각각 실행 — 두 경우 모두 프로세스가 죽지 않고 오류 메시지가 출력된 뒤 메인 메뉴로 정상 복귀했고, 이후 다른 정상 기능(환경 점검)도 이어서 정상 동작함을 확인
- **종료 안정성**: 위 수정 전에는 `0` 선택 후 종료 메시지만 출력되고 프로세스가 종료되지 않는 현상(child의 `exit` 이벤트가 발생하지 않음)을 실제로 재현 → `process.exit(0)` 추가 후 정상 종료 코드 `0`으로 프로세스가 종료됨을 확인
- **전체 기능 회귀 테스트**: 실제 스크래치 Git 저장소(원격 없음)에서 1(설치/업데이트 — 저장소 전용 파일 없음 안내), 5(UI Explorer), 6(Git 동기화 — 원격 없어 실패해도 안전 처리), 7(저장 및 업로드 — 커밋 성공, push는 원격 없어 실패하지만 크래시 없이 안전 처리), 8(설정 서브메뉴 진입/복귀) 전부 정상 동작 확인. 3(환경 점검)은 실제 저장소에서 정상 동작 재확인. `scripts/setup.ps1` 경로 탐색도 실제 저장소 기준으로 정상 확인(전체 재실행은 이전 세션에서 이미 검증되어 생략)

---

## 2026-07-08 (6)

### 변경 (Changed)

- **AI Business OS CLI — 메뉴 런처(Menu Launcher) V2: 메뉴 정의를 설정 파일로 분리**: V1(`packages/cli/src/commands/menu.js`)은 메뉴 8개 항목과 각 항목의 실행 로직이 하나의 파일에 배열(`MENU_ITEMS`)로 하드코딩되어 있어, 새 메뉴를 추가하려면 항상 이 파일을 수정해야 했다. V2에서는 "무엇을 보여줄지(메뉴 구성)"와 "어떻게 실행할지(핸들러 코드)"를 분리해, 기존 동작을 재사용하는 새 메뉴는 코드를 건드리지 않고 설정 파일만 수정해도 되도록 재구성
  - `packages/cli/src/config/menu.json`(신규) — 메뉴 제목·종료 키·8개 항목(key·icon·label·action)을 선언적으로 정의. 항목마다 `action`(핸들러 이름) 대신 `type: "shell"` + `command`를 지정하면 코드 추가 없이 임의의 셸 명령을 새 메뉴로 등록할 수 있음(실제 동작 검증 완료, 최종 커밋에는 8개 기존 항목만 유지)
  - `packages/cli/src/commands/menu/actions.js`(신규) — V1 `menu.js`에 있던 8개 핸들러 함수(install·devStart·healthCheck·claude·uiExplorer·gitSync·saveUpload·settings)를 그대로 옮기고, `menu.json`의 `action` 이름과 1:1 대응하는 registry 객체로 export
  - `packages/cli/src/commands/menu/index.js`(신규, 기존 `commands/menu.js` 대체) — `menu.json`을 읽어 메뉴를 출력하고 번호 입력을 받아 대응하는 핸들러(또는 셸 명령)를 실행하는 루프만 담당. 시작 시 `menu.json`의 모든 `action`이 `actions.js`에 실제로 존재하는지 검증해, 오타가 있으면 메뉴 실행 전에 어떤 항목·어떤 이름이 잘못됐는지 즉시 알려줌(예: `menu.json의 "설치 / 업데이트"(action: "nonExistentAction")에 해당하는 핸들러가 없습니다 ...`)
  - `packages/cli/src/commands/menu.js`(V1 파일) 삭제 — `bin/ai.js`의 `require("../src/commands/menu")`는 코드 변경 없이 새 폴더의 `index.js`로 자동 해석됨(Node의 디렉터리 require 규칙)

### 검증 (Verified)

- 실제 타이핑을 지연 시뮬레이션한 자동화 테스트로 V1과 동일한 메뉴 흐름(출력 → 3번 선택 → `doctor()` 실행 → 계속 대기 → 메뉴 복귀 → `0` 종료) 정상 동작 재확인
- **설정 파일만 수정해 메뉴 추가가 실제로 되는지 검증**: `menu.json`에 `type: "shell"` 항목(`9. 테스트 셸 명령`)을 임시로 추가해 코드 변경 없이 메뉴에 나타나고 실행(echo 명령 출력 확인)됨을 확인한 뒤 되돌림
- **잘못된 설정에 대한 방어 검증**: `menu.json`의 한 항목에 존재하지 않는 `action` 이름을 넣었을 때, 메뉴가 그려지기 전에 어떤 항목·어떤 이름이 잘못됐는지 명확한 에러 메시지로 안내하고 정상 종료됨을 확인한 뒤 원복

---

## 2026-07-08 (4)

### 수정 (Fixed)

- **`setup.ps1`이 "Installation Complete!"를 출력해도 실제로는 `ai.cmd`가 생성되지 않던 문제 수정**: 근본 원인은 `packages/cli/install.ps1` 20번째 줄의 `$ErrorActionPreference = "Stop"` — `npm install -g`가 stderr에 경고 한 줄(예: `npm warn using --force ...`)만 출력해도 PowerShell 5.1이 이를 즉시 종료 오류(NativeCommandError)로 승격시켜 스크립트가 `ai.cmd` shim 생성 확인 코드에 도달하기 전에 조용히 중단되고 있었음. `setup.ps1`은 이 중단을 감지하지 못하고 `Get-Command ai`(PATH 인식 여부)만으로 성공을 판정해 항상 "Installation Complete!"를 출력하던 것도 함께 원인이었음
  - `packages/cli/install.ps1` — `$ErrorActionPreference`를 `"Stop"`에서 `"Continue"`로 변경(스크립트는 예외가 아닌 `$LASTEXITCODE` 명시적 확인으로 성공 여부를 판단하므로 안전). `npm install -g`에 `--force` 추가(npm이 "up to date"로 오판해 shim 재생성을 건너뛰는 것 방지). shim이 여전히 없으면 `npm uninstall -g` 후 재설치하는 자동 복구 로직 추가. 전체 실패 시 `exit 1` 반환(기존엔 항상 exit 0)
  - `scripts/setup.ps1` — "AI CLI (ai 명령)" 항목을 `Get-Command ai` 단독 판정 대신, `npm config get prefix` + `Test-Path "<prefix>\ai.cmd"`로 파일 실존 여부를 직접 검사한 뒤에만 성공 처리하도록 변경

### 검증 (Verified)

- `ai.cmd`·`ai.ps1`·`ai` shim 파일을 실제로 삭제해 "새 PC" 상태를 재현한 뒤 `install.ps1` 단독 실행, `setup.ps1` 전체 실행 각각에 대해 수정 전 재현(조용한 중단, `ai.cmd` 미생성) → 수정 후 정상 생성(`Test-Path` → `True`, 종료 코드 0)까지 확인

---

## 2026-07-08 (5)

### 추가 (Added)

- **AI Business OS CLI — 메뉴 런처(Menu Launcher) V1 구현**: 명령어를 외우지 않고 `ai`만 입력하면 번호로 모든 기능을 실행할 수 있는 대화형 메뉴 신규 추가
  - `packages/cli/src/commands/menu.js`(신규) — 메뉴 항목을 `{ key, label, action }` 배열(`MENU_ITEMS`)로 정의해 새 메뉴 추가 시 함수 하나 + 배열 한 줄만 더하면 되는 구조. 1.설치/업데이트(`scripts/setup.ps1` 실행, 저장소 루트를 자동 탐색해 실행하고 없으면 안내 메시지) 2.개발 시작(기존 `devmode()` 그대로 재사용) 3.환경 점검(기존 `doctor()` 그대로 재사용) 4.Claude 실행(현재 폴더에서 `claude` 인터랙티브 실행) 5.UI Explorer(`http://localhost:3000/developer/ui-explorer` 열기) 6.Git 동기화(`git pull`) 7.저장 및 업로드(커밋 메시지 입력 → `git add -A` → commit → 확인 후 push) 8.설정(설정 폴더 경로 표시 및 열기) 0.종료
  - `packages/cli/bin/ai.js` — 인자 없이 `ai`만 입력하거나 `ai menu` 입력 시 메뉴가 실행되도록 연결(기존 `ai new`·`ai devmode`·`ai deploy`·`ai doctor`는 동작 변경 없이 그대로 유지), 도움말에 메뉴 안내 추가
  - **중복 제거 리팩터링**: `devmode.js`·`deploy.js`에 각각 중복 정의되어 있던 단일 질문용 `ask()`를 `packages/cli/src/lib/prompt.js`(신규)로, `devmode.js`의 `openBrowser()`를 `packages/cli/src/lib/system.js`(신규, `openInSystem()` — URL과 폴더 경로를 동일하게 처리)로 추출해 메뉴에서도 재사용. `packages/cli/src/lib/paths.js`(신규) — 현재 폴더 또는 Git 저장소 루트 기준으로 특정 저장소 전용 파일(`scripts/setup.ps1` 등)을 탐색하는 `findProjectFile()` 추가

### 검증 (Verified)

- `node bin/ai.js --help`로 도움말에 메뉴 안내 정상 출력 확인
- 실제 타이핑을 지연 시뮬레이션(각 입력 사이 0.5~1.5초 지연)한 자동화 테스트로 메뉴 전체 흐름(메뉴 출력 → 번호 선택 → 기존 `doctor()` 실행 → "계속하려면 Enter" 대기 → 메뉴로 복귀 → `0` 입력 시 정상 종료) End-to-End 확인. 한 번에 모든 입력을 몰아넣는 파이프 테스트에서만 나타나는 Node readline의 알려진 특성(순차 생성되는 readline 인터페이스가 버퍼링된 입력을 놓치는 현상)을 원인으로 확인했고, 실제 인터랙티브 사용(사람이 순차적으로 타이핑) 환경에서는 재현되지 않음을 확인

---

## 2026-07-08 (3)

### 수정 (Fixed)

- **PowerShell Profile로 열린 창(ai-business-os.ps1 정상 실행·배너 표시)에서도 `Get-Command ai`가 계속 실패하던 문제 수정**: `ai` CLI 자체는 정상 설치되어 있어도, PATH 레지스트리 등록이 **그 창이 열리기 전에** 다른 프로세스(install.ps1/setup.ps1)에서 이뤄졌다면 이미 실행 중이던 PowerShell 세션의 `$env:Path`에는 반영되지 않는다 — 새 창을 열지 않고 계속 쓰던 세션에서 흔히 발생하는 문제
  - `scripts/ai-business-os.ps1`에 자가 복구 로직 추가: 스크립트가 로드될 때(Profile을 통해 새 PowerShell 창을 열 때마다 실행됨) `ai` 명령이 현재 세션에서 인식되지 않으면, Machine+User 레지스트리에서 PATH를 다시 읽어 세션에 즉시 반영 — 사용자가 별도 조치를 하지 않아도 다음에 여는 창부터는 자동으로 해결됨
  - 시작 배너(`Show-AIBizBanner`)에 `ai CLI: 설치됨 (경로)` / `ai CLI: 미설치 - ... 실행 필요` 줄 추가 — 터미널을 열 때마다 `ai` 상태가 바로 보이므로 다음에 같은 문제가 생겨도 원인을 즉시 알 수 있음

### 검증 (Verified)

- 안전한 발췌본(exit-hook 등록 이전 구간만) dot-source 방식으로 재현 테스트: 현재 세션의 `$env:Path`에서만 npm 전역 경로를 제거해 "이미 열려 있던 창" 상태를 만든 뒤(레지스트리는 건드리지 않음) `ai` 인식 실패를 먼저 확인 → 자가 복구 로직 실행 후 `ai` 인식 성공, 배너에 `ai CLI: 설치됨 (...)` 표시까지 확인
- 전체 스크립트 구문 검사(`Parser]::ParseFile`) 통과, UTF-8 BOM 유지 확인

---

## 2026-07-08 (2)

### 수정 (Fixed)

- **`setup.ps1` 실행 후에도 `Get-Command ai`가 실패하던 문제 수정**: 사용자가 "설치"로 실행한 것이 `packages/cli/install.ps1`(신규 `ai` 전역 CLI 설치 스크립트)가 아니라 `scripts/setup.ps1`(이 저장소 전용, PowerShell 프로필에 `devmode`/`health` 등을 연결하는 기존 스크립트)이었음을 확인. `setup.ps1`은 "Installation Complete!"를 출력하지만 애초에 `ai` CLI를 전혀 설치하지 않는 별개의 스크립트였음 — 두 설치 스크립트가 이름 때문에 혼동되고 있었음
  - `setup.ps1`에 8번째 단계 "AI CLI (ai 명령)" 추가 — `packages/cli/install.ps1`을 직접 호출해 전역 `ai` 명령을 실제로 설치하고, 완료 후 `Get-Command ai`로 재검증해 결과 테이블에 포함. 어느 설치 스크립트를 먼저 실행하더라도 최종적으로 `ai` 명령이 설치되도록 함
  - 스크립트 상단 설명과 "Next Step" 안내를 `ai doctor`/`ai devmode` 중심으로 갱신, 기존 `health`/`startday`(이 저장소 전용)는 별도로 구분 표기

### 검증 (Verified)

- 이전과 동일한 방법으로 "새 PC" 상태 재현(레지스트리 User PATH에서 npm 전역 경로 임시 제거, 사전 백업) 후 `setup.ps1`을 직접 실행 — 결과 테이블에 `✔ AI CLI (ai 명령)` 표시, "Installation Complete!" 출력 확인
- 스크립트 종료 직후 레지스트리(`[Environment]::GetEnvironmentVariable("Path","User")`, 프로세스 캐시가 아닌 실제 저장값)에 npm 전역 경로가 영구 등록됐음을 확인
- 세션 PATH 갱신 후 사용자가 보고한 것과 동일한 명령을 실행 — `Get-Command ai`(정상 조회), `ai --help`(정상 출력) 모두 확인

---

## 2026-07-08

### 수정 (Fixed)

- **`install.ps1`이 새 컴퓨터에서 `ai` 명령을 PATH에 영구 등록하지 못하던 문제 수정**: 사용자가 실제 새 PC에서 설치 후 `Get-Command ai`/`where.exe ai`가 모두 실패한다고 보고. 원인은 기존 `Update-SessionPath`가 **현재 세션의 `$env:Path`만** 갱신하고 레지스트리(`HKCU\Environment`)에는 아무것도 쓰지 않았던 것 — Node.js를 새로 설치한 환경에서 npm 전역 prefix(`%AppData%\Roaming\npm`)가 애초에 영구 PATH에 등록되어 있지 않으면, 설치 스크립트가 끝나고 새 터미널을 열어도 `ai`가 인식되지 않았음
  - `Add-ToUserPath` 함수 신규 추가 — `npm config get prefix`로 실제 npm 전역 설치 위치를 **가정하지 않고 직접 조회**한 뒤, 사용자 PATH(레지스트리, 영구 반영)에 없으면 추가. 이미 있으면 중복 추가하지 않음
  - `npm install -g`가 실패하면(관리자 권한이 필요한 위치를 가리키는 경우 등) 사용자 전용 npm prefix(`%LOCALAPPDATA%\ai-business-os\npm-global`)로 전환해 자동 재시도
  - `npm install -g` 성공 여부 판정 로직도 함께 수정 — 기존에는 `2>&1 | ForEach-Object {...}`로 출력을 파이프한 뒤 `$LASTEXITCODE`를 읽어 값이 유실될 수 있었음. 네이티브 호출 직후 즉시 `$LASTEXITCODE`를 캡처하도록 변경
  - 설치 마지막 단계에서 `Get-Command`(PATH 조회, 세션에 따라 달라질 수 있음)만이 아니라 `ai.cmd` 파일이 실제로 디스크에 존재하는지, 그 전체 경로로 `ai --help`/`ai doctor`를 직접 실행했을 때 정상 동작하는지까지 증거 기반으로 검증하도록 변경

### 검증 (Verified)

- 실제 재현 후 수정: 이 개발 PC의 사용자 PATH(레지스트리)에서 npm 전역 prefix 항목을 임시로 제거해(`[Environment]::SetEnvironmentVariable` 직접 조작, 사전에 원본 값 백업) "새 PC에 Node.js는 있지만 npm 전역 경로가 PATH에 없는" 상태를 실제로 재현
- 그 상태에서 `install.ps1`을 재실행 — `사용자 PATH 등록 ... (새로 추가함)` 로그로 실제 추가 동작을 확인하고, 스크립트 종료 직후 레지스트리를 다시 읽어(`[Environment]::GetEnvironmentVariable("Path","User")`, 프로세스에 캐시된 값이 아닌 실제 저장값) npm prefix가 영구적으로 포함됐음을 확인 — 새로 여는 터미널에서도 정상 동작할 근거 확보
- `ai --help`·`ai doctor`가 설치 스크립트 내에서 전체 경로 직접 실행으로 정상 출력됨을 확인

---

## 2026-07-07 (3)

### 추가 (Added)

- **AI Business OS CLI 설치 완결(원커맨드 설치)**: `packages/cli/install.ps1`을 Node.js/npm만 확인하던 기존 버전에서, Git·Node.js·VS Code까지 winget으로 자동 설치 시도하는 전체 설치 스크립트로 확장. `packages/cli/Setup.cmd`(더블클릭 실행기, 관리자 권한 불필요) 신규 추가 — "Setup.exe" 요청에 대해 컴파일된 MSI/EXE 대신 더블클릭 가능한 배치 런처로 대응(README에 이 선택을 명시)
  - 설치 스크립트가 winget install 직후 `$env:Path`를 Machine+User 레지스트리에서 다시 읽어 **현재 세션에 즉시 반영** — 새 터미널을 열지 않아도 이어서 `ai` 명령을 바로 사용 가능
  - 설치 마지막 단계에서 방금 설치한 `ai` 자신으로 `ai doctor`를 실행해 최종 점검 결과를 보여줌 — "설치 후 devmode 바로 실행 가능" 상태를 설치 스크립트 스스로 증명
  - 소요 시간 표시(초 단위) 추가
  - README에 "AI Business OS CLI 설치" 섹션 신규 작성 — Setup.cmd/install.ps1 두 가지 설치 경로, 설치 스크립트가 수행하는 단계, `ai doctor`/`ai new`/`ai devmode` 사용법, 제거 방법 기재

### 수정 (Fixed)

- `install.ps1`이 UTF-8 BOM 없이 저장되어 있어 Windows PowerShell 5.1에서 한글 문자열이 깨져 표시되던 문제 발견 및 수정 — 기존 `scripts/ai-business-os.ps1`·`scripts/setup.ps1`과 동일하게 UTF-8 BOM으로 재저장. 스크립트 안에서 `[Console]::OutputEncoding`을 UTF-8로 맞추는 것만으로는 해결되지 않고(콘솔 출력 인코딩과 스크립트 소스 파일 자체를 읽는 인코딩은 별개 문제), 파일 자체의 BOM이 원인이었음을 실제 재현 후 확인

### 검증 (Verified)

- 격리된 PowerShell 프로세스(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File install.ps1`)로 설치 스크립트 전체를 처음부터 끝까지 실제 실행 — Git·Node.js·npm·VS Code 확인, `npm install -g` 전역 설치, 세션 내 PATH 즉시 갱신, 마지막 `ai doctor` 임베디드 실행까지 전 구간 정상 동작 확인(환경에 이미 도구가 설치되어 있어 winget 자동 설치 분기 자체는 조건 검증만 하고 실제 설치 실행까지는 재현하지 않음 — 정직하게 한계로 기록)
- BOM 수정 전/후 동일한 스크립트를 재실행해 한글 깨짐이 실제로 해결됨을 화면 출력으로 직접 대조 확인

## 2026-07-07 (2)

### 추가 (Added)

- **AI Business OS 전역 CLI (`packages/cli`, `@cnbiz/ai-business-os-cli`, `ai` 명령) 신규 구현**: 기존 `devmode`는 ai-web-master 저장소에 PowerShell 프로필이 연결되어 있어야만 동작하는 프로젝트 전용 기능이었음을 확인하고(프로젝트 레지스트리·Visual Editor 공유 패키지가 모두 저장소 내부 경로에 고정), 어떤 컴퓨터·어떤 프로젝트에서도 동작하는 Node.js 기반 전역 CLI로 새로 구현
  - `ai new` — 새 프로젝트 스캐폴딩(package.json·README·git init) 후 전역 레지스트리(`~/.ai-business-os/projects.json`, 특정 저장소가 아닌 사용자 홈 기준)에 등록
  - `ai devmode` — VS Code 열기 + 새 터미널 창에서 `npm run dev`(포트 자동 감지) + 브라우저 미리보기 + Git 상태 + Claude Code 준비 확인 + Visual Editor(@cnbiz/dev-inspector) 자동 연결. 등록된 프로젝트가 없으면 현재 폴더를 대상으로 동작(`--path`/`--name` 옵션 지원)
  - `ai deploy` — 브랜치 확인 → 미커밋 변경사항 검사 → 확인 후 push
  - `ai doctor` — Git·Node·npm·VS Code·Claude Code 설치 여부 및 버전, 전역 설정 디렉터리 상태 점검
  - Visual Editor 자동 연결 로직은 `scripts/ai-business-os.ps1`의 `Install-AIBizDevInspector`를 Node.js로 포팅(`packages/cli/src/lib/devInspectorInstall.js`), `@cnbiz/dev-inspector` 공유 패키지 소스를 `packages/cli/vendor/dev-inspector`에 물리적으로 복사해 번들 — CLI가 어느 컴퓨터에 설치되든 ai-web-master 저장소가 로컬에 없어도 동작
  - `packages/cli/install.ps1` — Node.js/npm 확인 후 `npm install -g`로 전역 설치하는 Windows 설치 스크립트(관리자 권한 불필요, MSI/EXE 아님)
  - 기존 `scripts/ai-business-os.ps1`의 `devmode`(PowerShell 프로필 기반)는 그대로 유지 — 저장소 전용 워크플로가 필요한 기존 사용자를 위해 남겨두고, 함수 상단에 전역 CLI로의 안내 주석만 추가

### 검증 (Verified)

- `npm link`로 `ai` 명령을 전역 등록 후, ai-web-master와 무관한 디렉터리(`C:\Users\CNBIZ`)에서 `ai doctor` 실행 확인 — Git·Node·npm·VS Code·Claude Code 전부 정상 감지
- `ai new`로 ai-web-master 외부(scratchpad)에 완전히 새 프로젝트 생성 → 전역 레지스트리 등록 확인
- 격리된 Next.js 형태 fixture 프로젝트에 대해 `ai devmode --path`를 실제로 실행 — Visual Editor 자동 연결(npm install로 `packages/cli/vendor/dev-inspector`를 `file:` 의존성으로 연결, API 라우트 3개 생성, `babel.config.js` 생성, `next.config.ts`에 `transpilePackages` 추가, `app/layout.tsx`에 `<DevInspectorOverlay />` 삽입) 전부 파일 diff로 확인, 재실행 시 멱등하게 건너뜀을 확인. VS Code 실제 실행, Git 상태·Claude Code 준비 확인까지 전 구간 정상 동작 확인
- 버그 수정: Windows에서 `npm.cmd`/`code.cmd`처럼 셸 스크립트로 배포되는 명령은 `shell:true` 없이 `spawnSync`하면 `EINVAL`로 실패함을 발견해 수정. `git init` 직후(커밋이 하나도 없는 상태)에는 `git rev-parse --abbrev-ref HEAD`가 실패해 브랜치를 "Git 저장소가 아님"으로 잘못 표시하던 문제를 `git symbolic-ref --short HEAD` fallback으로 수정 — `ai new` 직후 `ai devmode`를 실행하는 실제 흐름에서 발생하는 문제였음
- 루트(Development OS) `npx tsc --noEmit`·`npm run lint` 통과, 회귀 없음 확인

## 2026-07-07

### 변경 (Changed)

- **`health` 명령 전면 업그레이드**: `scripts/ai-business-os.ps1`의 `health` 함수를 새 PC에서도 한 번에 개발 환경 전체를 점검할 수 있도록 재작성. Development Tools(Git·VS Code·Node.js·npm·Claude Code 버전 확인), Environment(PowerShell 버전·Profile 연결·PATH·Project Root·Git Repository), AI Business OS(CURRENT_CONTEXT.md·WORK_HISTORY.md·sessions 폴더·startday/endday/exit/health 명령 등록 여부), Git(현재 브랜치·Working Tree 상태) 4개 섹션으로 구성하고 각 항목을 ✅/❌로 출력. 실패 항목은 원인과 해결 방법을 함께 출력, 마지막에 `Overall Status : PASS/FAIL` 요약 추가. 공용 출력 헬퍼 `Write-AIBizHealthLine` 신규 추가. 기존 `-Full`(lint 실행) 옵션은 유지

### 검증 (Verified)

- PowerShell에서 `. scripts/ai-business-os.ps1; health` 1회 실행 — Git·VS Code·Node.js·npm·Claude Code·PowerShell·Profile·PATH·Project Root·Git Repository·CURRENT_CONTEXT·WORK_HISTORY·Sessions·startday·endday·exit·health 전 항목 ✅, `Overall Status : PASS` 정상 출력 확인. 세션 종료 시 exit 훅이 자동 실행되어 변경사항 1건을 감지했으나 비대화형 실행이라 커밋/푸시 없이 정상 종료됨을 `git status`로 재확인(오작동 아님)

---

## 2026-07-06

### 추가 (Added)

- **`/endday` 슬래시 명령 구현**: `.claude/commands/endday.md` 신규 작성. Claude Code 전용 프로젝트 종료 명령으로, Git 작업(add/commit/push)은 수행하지 않고 `docs/09_WORK_HISTORY/`(CURRENT_CONTEXT.md·WORK_HISTORY.md·sessions/MM-DD.md) 문서 정리와 내일 TODO 생성, 읽기 전용 Health Check만 수행하도록 범위를 분리. Git 작업은 기존 PowerShell `exit`(`scripts/ai-business-os.ps1`)가 전담하는 역할 분리 유지
- **`startday` 명령 재구현 (PowerShell)**: `scripts/ai-business-os.ps1`의 `startday`를 기존 `sync`+`health`+WBS 요약 방식에서 `docs/09_WORK_HISTORY/CURRENT_CONTEXT.md`와 가장 최근 `sessions/MM-DD.md`를 읽어 Project·Current Status·Yesterday(최근 완료 작업)·Today's Priority(다음 작업)·Health Check(문서 존재 여부)를 출력하는 방식으로 교체. 마크다운 섹션 추출용 `Get-AIBizMarkdownSection` 헬퍼 함수 신규 추가. Git Commit/Push는 수행하지 않음
- **`setup.ps1` 신규 구현**: `scripts/setup.ps1` 신규 작성 — 새 PC에서 1회 실행으로 AI Business OS 개발 환경을 자동 구성. PowerShell Profile 확인·생성 → `ai-business-os.ps1` 연결(중복 연결 방지) → startday/endday/health/sync/exit 명령 등록 확인(정적 텍스트 검사, 부작용 없음) → 프로젝트 폴더·Git 저장소 확인 → Git 설치 확인 → Claude Code 설치 확인 → PATH(git/node/npm) 확인 → 8단계 결과를 Health Check로 요약 출력. Git Commit/Push는 수행하지 않음

### 변경 (Changed)

- **`docs/09_BUILD_LOG` 폐기, `docs/09_WORK_HISTORY`를 "09" 슬롯 공식 구조로 확정**: `docs/09_BUILD_LOG/README.md`(이전 세션에서 이미 삭제되어 uncommitted 상태였음) 삭제를 확정하고, 프로젝트 전체에서 `09_BUILD_LOG` 참조를 `09_WORK_HISTORY`로 갱신 — `README.md`, `src/README.md`, `scripts/README.md`, `docs/05_AI/{Builder,Reviewer,Documenter,skills/README}.md`, `docs/06_TEMPLATES/{feature,bug}-template.md`, `docs/08_PLANS/001-phase1-mvp.md`, `docs/00_COMPANY/DOCUMENT_INDEX.md`(섹션 11을 Work History 구성 파일 기준으로 재작성). `docs/09_WORK_HISTORY/README.md`는 예전 Build Log 설명이 그대로 남아있던 것을 확인하고 실제 Work History 구조(CURRENT_CONTEXT.md·WORK_HISTORY.md·sessions/, startday/`/endday` 흐름)에 맞게 재작성
- **`setup.ps1`/`ai-business-os.ps1` 프로젝트 루트 하드코딩 제거**: 두 스크립트의 `$script:AIBizOSRoot = "D:\ai-web-master"`를 `$PSScriptRoot`(스크립트 자신의 실제 위치) 기준 `(Resolve-Path (Join-Path $PSScriptRoot "..")).Path`로 교체 — `scripts/`의 상위 폴더를 프로젝트 루트로 자동 계산하므로 어느 경로에 Git Clone해도 동일하게 동작. `setup.ps1`이 Profile에 연결하는 `ai-business-os.ps1` 경로도 `$PSScriptRoot` 기준으로 계산
- **`setup.ps1` 출력을 "AI Business OS Installer v1.0" 형식으로 재구성**: Project Root / PowerShell Profile / Git / Claude Code / Commands Registered / Dynamic Root Detection / Health Check 7개 항목의 ✔/✘ 요약과 "Installation Complete! → Next Step(health/startday)" 출력으로 정리. 다른 경로에 클론한 상황을 시뮬레이션해 전 항목 PASS를 재검증(테스트 후 실제 PowerShell Profile은 백업본으로 원상복구)

---

## 2026-07-05

### 추가 (Added)

- **CNBIZ Website v2 — sitemap.xml·robots.txt 신규 구현**: 루트 프로젝트(Development OS)와 별개로 `apps/cnbiz-web`(cnbiz.kr)에는 sitemap·robots가 없던 것을 확인하고 신규 추가
  - `apps/cnbiz-web/app/sitemap.ts`(신규) — Base URL `https://cnbiz.kr`, 5개 공개 페이지(`/`·`/about`·`/services`·`/portfolio`·`/contact`)에 `changeFrequency`·`priority` 지정
  - `apps/cnbiz-web/app/robots.ts`(신규) — 전체 크롤러 허용(`/login`·`/signup`·`/admin` 등 비공개 라우트가 이 앱에는 존재하지 않아 disallow 규칙 없음), sitemap 경로 명시

### 검증 (Verified)

- `apps/cnbiz-web` `npm run build` 통과, `/sitemap.xml`·`/robots.txt` 정적 라우트로 생성됨을 확인
- `next start`로 로컬 프로덕션 서버 실행 후 `curl`로 XML/텍스트 응답 직접 확인
- `feat/cnbiz-web-sitemap` 브랜치로 커밋·푸시 후 `main`에 머지·푸시(Vercel Git 연동으로 자동 배포). 배포 완료 후 `https://cnbiz.kr/sitemap.xml` 실제 프로덕션 응답을 확인 — `cnbiz.kr` → `www.cnbiz.kr` 308 리다이렉트 후 200과 함께 5개 URL이 포함된 유효한 XML을 반환함을 확인

---

## 2026-07-05 (2)

### 추가 (Added)

- **CNBIZ Website v2 — Google Analytics 4 연동**: `apps/cnbiz-web`에 `@next/third-parties`의 `GoogleAnalytics` 컴포넌트로 GA4 연동. 개발 환경(`next dev`)에서는 로드되지 않도록 `NODE_ENV === "production"` 및 측정 ID 존재 여부로 게이팅
  - `apps/cnbiz-web/package.json` — `@next/third-parties` 의존성 추가
  - `apps/cnbiz-web/app/layout.tsx` — 루트 레이아웃에 `<GoogleAnalytics gaId={...} />` 조건부 렌더링 추가
  - `apps/cnbiz-web/.env.example` — `NEXT_PUBLIC_GA_MEASUREMENT_ID` 템플릿 항목 추가(값 없음)
  - `apps/cnbiz-web/.env.local`(machine-local, git 미추적) — 실제 측정 ID(`G-HF43CX4DP5`) 설정

### 검증 (Verified)

- `apps/cnbiz-web` `npm run build` 통과. 프로덕션 빌드 HTML에 `googletagmanager.com/gtag/js?id=G-HF43CX4DP5` 포함 확인, `next dev`에서는 GA 스크립트가 로드되지 않음을 확인(production-only 게이팅 정상 동작)
- `main` 병합·push 후 Vercel 자동 배포. 최초 배포 시 `NEXT_PUBLIC_GA_MEASUREMENT_ID`가 Vercel 환경 변수에 없어 프로덕션에 GA 스크립트가 반영되지 않음을 확인 — 사용자가 Vercel 프로젝트 설정에 해당 환경 변수를 추가하고 재배포
- 재배포 후 `https://cnbiz.kr/`에서 GA 스크립트(`gtag.js?id=G-HF43CX4DP5`)가 정상 포함됨을 확인. `/`·`/about`·`/services`·`/portfolio`·`/contact`·`/sitemap.xml`·`/robots.txt` 전체 200 응답 확인

---

## 2026-07-05 (3)

### 추가 (Added)

- **AI Business OS — Company 표준 문서 신설**: `docs/00_COMPANY/`에 회사 운영체계 문서 3종 신규 작성
  - `ORGANIZATION.md` — 조직도, 역할 디렉터리, 의사결정 권한(RACI), 에스컬레이션 경로, 성장 모델
  - `COMPANY_POLICY.md` — 운영 원칙, 승인 권한 매트릭스, 엔지니어링·보안·클라이언트·문서화 정책
  - `DOCUMENT_INDEX.md` — 저장소 전체 문서 마스터 인덱스(00~99 폴더 전수), 인덱스 유지 규칙
- **AI Business OS — `docs/05_AI` 폴더 확장**: 에이전트 역할 분리·토큰 최적화·실행 오케스트레이션·프롬프트 표준을 다루는 문서 4종 신규 작성
  - `AGENTS.md` — AI 에이전트 실행 레지스트리(호출 방식·상태), 루트 `AGENTS.md`·`ORGANIZATION.md`와 스코프 구분 명시
  - `TOKEN_POLICY.md` — 파일 접근·컨텍스트 관리·서브 에이전트 위임·출력 절제 등 토큰 최적화 정책
  - `WORKFLOW.md` — 에이전트 실행 트리거·핸드오프 프로토콜·에스컬레이션(문서 라이프사이클과 구분된 실행 메커니즘)
  - `PROMPTS.md` — 역할별 호출 프롬프트 템플릿, Component ID 기반 UI 프롬프트 규칙, 토큰 효율적 프롬프팅 가이드
  - `DOCUMENT_INDEX.md`의 05_AI 섹션에 위 4종 등록(갱신)

### 변경 (Changed)

- **문서 위치 정리**: `REQUEST.md`를 `docs/00_COMPANY/`에서 `docs/01_PMO/`로 이동(PMO 문서로 재분류), 참조 링크(`apps/cnbiz-web/REQUEST.md` 6번째 줄) 1건 수정
- **루트 Markdown 정리 마무리**: 이전 세션에서 진행되던 루트→`docs/` 재편 작업 중 누락되어 있던 `agents/README.md`→`docs/05_AI/README.md`, `templates/README.md`→`docs/06_TEMPLATES/README.md` 이동 완료, 빈 폴더(`agents/`, `templates/`) 삭제, 루트 `README.md`의 잔존 링크 2건(`@AI_RULES.md` 경로, `templates/` 경로) 수정

---

## 2026-07-04 (13)

### 검증 (Verified)

- **CNBIZ Website v2 — Contact 이메일 실제 발송 확인**: 사용자가 발급한 실제 Resend API 키로 `apps/cnbiz-web/.env.local`(machine-local, git 미추적)을 구성하고 실제 발송을 검증
  - 최초 `CONTACT_EMAIL_FROM`을 개인 Gmail 주소로 설정했을 때 Resend가 403(도메인 미검증)으로 거부함을 확인 — Gmail 등 일반 웹메일 도메인은 발신 도메인으로 검증이 불가능하므로, 실제 도메인(`cnbiz.kr`) 검증 전까지는 Resend 기본 샌드박스 발신 주소(`onboarding@resend.dev`)를 사용하도록 조정
  - 조정 후 실제 이메일이 수신 주소로 정상 도착함을 사용자가 직접 확인
  - 유효성 검사(400)·honeypot(200, 저장·발송 모두 생략)가 실제 이메일 설정이 활성화된 상태에서도 동일하게 정상 동작함을 재확인
  - `apps/cnbiz-web` `npm run lint`·`npm run build` 통과, Playwright로 `/`·`/about`·`/services`·`/portfolio` 전 페이지 콘솔 에러 없이 정상 로드됨을 최종 확인

### 수정 (Fixed)

- **자격 증명 관리 실수 수정**: 실제 Resend API 키·수신/발신 이메일 주소가 git으로 추적되는 `apps/cnbiz-web/.env.example`(템플릿 파일)에 잘못 입력된 것을 발견. 아직 커밋·스테이징되지 않은 상태(untracked)임을 `git status`로 확인해 git 이력에는 노출되지 않았음을 확인. 값을 git 미추적 파일인 `apps/cnbiz-web/.env.local`로 옮기고 `.env.example`은 값이 비어있는 템플릿 상태로 복원

---

## 2026-07-04 (12)

### 추가 (Added)

- **CNBIZ Website v2 — Contact API 스팸 방지**: 이메일 발송 전 단계 검증 강화 목적으로 honeypot·요청 빈도 제한 추가
  - `apps/cnbiz-web/lib/contact/spam.ts`(신규) — `isHoneypotFilled()`(봇이 채우는 숨김 필드 `company` 감지 시 저장·발송 없이 성공 응답만 반환해 봇에게 탐지 사실을 알리지 않음), `isRateLimited()`(IP당 10분에 5회, 단일 인스턴스 메모리 기반 — 다중 인스턴스 확장 시 Redis 등 공유 저장소로 교체 필요), `getClientIp()`
  - `apps/cnbiz-web/app/api/contact/route.ts` — honeypot·rate limit 검사를 유효성 검사보다 먼저 수행하도록 연결(요청 429 응답 추가)
  - `apps/cnbiz-web/components/sections/ContactForm.tsx` — 화면에 보이지 않는 honeypot 필드(`company`) 추가, `aria-hidden`·`tabIndex={-1}`로 실제 사용자·키보드 이용자에게는 노출되지 않음

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- **실패 처리 검증**: 의도적으로 잘못된 `RESEND_API_KEY`로 실제 Resend API에 요청해 401 응답을 실제로 받았고, `notifyContactSubmission()`이 이를 catch하여 로그만 남기고 예외를 전파하지 않음을 확인 — API는 200을 반환했고 제출 내역은 로컬에 정상 저장됨(검증 후 테스트 키·데이터 제거)
- **스팸 방지 검증**: honeypot(`company`) 필드를 채운 요청은 200을 반환하되 로컬 저장·이메일 발송 모두 건너뜀을 확인. 동일 IP로 연속 요청 시 5번째 요청부터 429와 함께 차단됨을 확인(검증 후 서버 재시작으로 메모리 상태·테스트 데이터 초기화)
- **유효성 검사 재확인**: 필수값 누락·잘못된 이메일 형식 요청이 여전히 400과 필드별 오류를 반환함을 확인
- Playwright로 `/contact`에서 실제 폼 제출 최종 확인 — 성공 상태 UI 정상 표시, 한글 데이터가 깨지지 않고 정상 저장됨을 확인(콘솔 에러는 파비콘 404 1건뿐)
- **미완료 항목(사용자 확인 필요)**: 실제 Resend API 키·실제 수신/발신 이메일 주소가 없어 실제 이메일 발송 성공 여부는 검증하지 못함. 개발 환경 배포 대상(호스팅 플랫폼)도 아직 확정되지 않음 — 아래 메시지로 확인 요청

---

## 2026-07-04 (11)

### 추가 (Added)

- **CNBIZ Website v2 — Contact 이메일 알림 연동**: 새 npm 패키지 설치 없이 `fetch` 기반 HTTP 호출로 Resend 이메일 발송을 구현. 환경 변수로만 동작하며 자격 증명은 코드에 하드코딩하지 않음, 제공자 교체가 쉽도록 인터페이스로 분리
  - `apps/cnbiz-web/lib/contact/email/types.ts` — `EmailProvider` 인터페이스(`send()`)
  - `apps/cnbiz-web/lib/contact/email/providers/resend.ts` — Resend REST API(`fetch`) 기반 구현
  - `apps/cnbiz-web/lib/contact/email/providers/noop.ts` — 제공자 미설정/자격 증명 누락 시 발송을 건너뛰는 fallback(로컬 저장은 `lib/contact/store.ts`에서 이미 항상 수행되므로 제출 자체는 유실되지 않음)
  - `apps/cnbiz-web/lib/contact/email/index.ts` — `CONTACT_EMAIL_PROVIDER` 값에 따라 제공자를 선택(현재 `resend`만 지원, 새 제공자는 `providers/`에 파일 추가 + `switch` 분기 추가만으로 확장 가능)
  - `apps/cnbiz-web/lib/contact/notify.ts` — no-op 스텁을 실제 발송 로직으로 교체. `CONTACT_EMAIL_TO`/`CONTACT_EMAIL_FROM` 미설정 또는 발송 실패 시에도 예외를 던지지 않고 경고만 로그(문의 접수 자체는 항상 로컬 저장을 통해 유지됨)
  - `apps/cnbiz-web/.env.example`(신규) — `CONTACT_EMAIL_PROVIDER`·`CONTACT_EMAIL_TO`·`CONTACT_EMAIL_FROM`·`RESEND_API_KEY` (전부 값 없이 키만 기재)
  - `.gitignore` — `!.env.example` 예외 추가(기존 `.env*` 규칙이 `.env.example`까지 무시하고 있던 문제 수정, `.env.example`만 커밋되도록)

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 `/contact`에서 이메일 환경 변수가 전혀 설정되지 않은 현재 개발 환경 기준으로 제출 테스트 — 성공 상태 UI 정상 표시, 로컬 `contact-submissions.json`에 정상 기록됨을 확인, 서버 로그에 `[contact-email] CONTACT_EMAIL_TO/CONTACT_EMAIL_FROM not set, skipping email notification` 경고만 출력되고 요청은 200으로 정상 종료됨을 확인(실제 Resend API 키가 없어 발송 자체는 테스트하지 못함 — 배포 전 실제 키로 별도 검증 필요)
- 콘솔 에러는 파비콘 404(로고 미수령으로 인한 기존 예상 상태) 1건만 존재

---

## 2026-07-04 (10)

### 추가 (Added)

- **CNBIZ Website v2 — Contact API 구현 (`POST /api/contact`)**: 이메일 발송 없이 서버 검증·로컬 저장까지만 구현. `lib/workspaces/registry.ts`(fs 기반 JSON 저장)와 동일한 패턴을 `apps/cnbiz-web`에 적용
  - `apps/cnbiz-web/lib/contact/types.ts` — `ContactSubmissionInput`·`ContactSubmissionRecord` 타입
  - `apps/cnbiz-web/lib/contact/validate.ts` — 클라이언트(`ContactForm.tsx`)와 동일한 규칙(필수값·이메일·연락처 형식)으로 서버 측 재검증
  - `apps/cnbiz-web/lib/contact/store.ts` — `apps/cnbiz-web/lib/data/contact-submissions.json`(machine-local, `.gitignore` 처리)에 제출 내역 append 저장
  - `apps/cnbiz-web/lib/contact/notify.ts` — 이메일 발송은 아직 구현하지 않고, 추후 이메일 서비스(Resend·SES 등)를 연결할 수 있도록 시그니처만 갖춘 no-op 함수로 구조화(사용자 승인 전까지 실제 발송 없음)
  - `apps/cnbiz-web/app/api/contact/route.ts`(신규) — 요청 파싱 실패·유효성 오류 시 400과 필드별 오류 메시지 반환, 정상 시 로컬 저장 후 200 반환
  - `.gitignore` — `apps/cnbiz-web/lib/data/` 추가

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과(`/api/contact`가 동적 라우트로 정상 생성됨을 확인)
- Playwright로 `/contact`에서 유효한 값 제출 → 성공 상태 UI("문의가 접수되었습니다") 표시 확인, `contact-submissions.json`에 실제로 기록됨을 확인(테스트 데이터는 확인 후 초기화)
- `curl`로 빈 값·잘못된 이메일/연락처를 담은 요청을 직접 전송해 클라이언트를 우회해도 서버가 400과 필드별 오류 메시지를 반환함을 확인
- 콘솔 에러는 파비콘 404(로고 미수령으로 인한 기존 예상 상태) 1건만 존재

---

## 2026-07-04 (9)

### 추가 (Added)

- **CNBIZ Website v2 — Contact(문의하기) 페이지 UI 구현**: `apps/cnbiz-web`에 문의하기 페이지 신규 구현. REQUEST.md v2 8번(Contact Information)에서 전화번호·이메일·주소·운영 시간이 전부 TODO 상태임을 확인하고, 지어내는 대신 각 항목에 명시적 "TODO" 배지를 표시. 문의 응답 정책(영업일 기준 24시간 이내 답변)은 이미 Services·FAQ에서 확정 사용 중인 문구라 그대로 재사용. 오시는 길은 실제 위치·지도 연동 여부(카카오맵/구글맵)가 미정이라 지도 대신 placeholder 박스로 대체
  - `apps/cnbiz-web/components/sections/ContactHeroSection.tsx`(신규)
  - `apps/cnbiz-web/components/sections/ContactFormSection.tsx`·`ContactForm.tsx`(신규, Client Component) — 이름·연락처·이메일·문의 내용 4개 필드, 클라이언트 유효성 검사(필수값·이메일·연락처 형식), idle/submitting/success/error 상태 UI. `/api/contact`로 POST하도록 미리 연결하되 라우트는 아직 만들지 않아 현재는 항상 오류 상태 UI로 정상 처리됨(API 구현은 사용자 승인 후 별도 진행)
  - `apps/cnbiz-web/components/sections/ContactInfoSection.tsx`(신규) — 전화번호·이메일·주소·운영 시간 TODO 배지, 문의 응답 정책(확정), 지도 placeholder
  - `apps/cnbiz-web/app/contact/page.tsx`(신규) — ContactHero→ContactForm→ContactInfo 순으로 조합, Metadata 적용

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 `/contact` 렌더링 확인 — TODO 배지·응답 정책·지도 placeholder 정상 표시. 빈 폼 제출 시 4개 필드 유효성 오류 메시지 정상 표시, 유효한 값 입력 후 제출 시 `/api/contact` 부재로 인한 오류 상태 UI가 의도대로 표시됨을 확인. 콘솔 에러는 파비콘 404(로고 미수령으로 인한 기존 예상 상태) 1건만 존재

---

## 2026-07-04 (8)

### 추가 (Added)

- **CNBIZ Website v2 — Home 페이지 FAQ 섹션 추가**: FAQ 전용 라우트 없이 홈(`/`) 페이지 ServicesOverview와 CTA 사이에 아코디언 형태로 추가(사용자 확인 후 진행). REQUEST.md v2 14번(FAQ) 5개 질문 중 답변이 검증된 3개(진행 절차·제공 서비스·견적 문의)는 그대로 사용. 유지보수 지원 여부는 이미 확정된 Services 도입 프로세스 05단계("오픈 이후에도 운영·유지보수를 통해 안정적인 서비스를 지원") 문구를 재사용해 답변. 소규모 기업 의뢰 가능 여부는 확정된 사실이 없어 특정 규모·정책을 지어내지 않고 "상담을 통해 함께 결정한다"는 일반적인 문구로 답변
  - `apps/cnbiz-web/components/sections/FAQSection.tsx`(신규, Client Component) — 단일 항목만 펼쳐지는 아코디언, `aria-expanded`·`aria-controls` 적용
  - `apps/cnbiz-web/app/page.tsx` — FAQSection을 ServicesOverviewSection과 CTASection 사이에 추가

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 `/` 렌더링 확인 — FAQ 아코디언 정상 표시(첫 항목 기본 펼침), 다른 질문 클릭 시 이전 항목이 닫히고 클릭한 항목만 펼쳐지는 단일 아코디언 동작 확인, 콘솔 에러 없음

---

## 2026-07-04 (7)

### 추가 (Added)

- **CNBIZ Website v2 — About 페이지 Process(일하는 방식) 섹션 추가**: 새 라우트를 만들지 않고 `/about` 페이지에 섹션을 추가하는 방향으로 사용자 확인 후 진행. 구체적인 방법론·수치는 검증되지 않았으므로, "깊은 이해 → 함께 설계 → 신뢰할 수 있는 실행 → 지속적인 동반자"라는 일반적이고 전문적인 4단계 협업 방식 설명으로 구성(기존 Services 페이지의 영업 프로세스 5단계와는 별개, 회사 고유 수치·사실 없이 범용 표현만 사용)
  - `apps/cnbiz-web/components/sections/AboutProcessSection.tsx`(신규)
  - `apps/cnbiz-web/app/about/page.tsx` — MissionVisionSection과 CTASection 사이에 추가

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 `/about` 렌더링 확인 — Process 섹션 정상 표시, 콘솔 에러 없음

---

## 2026-07-04 (6)

### 추가 (Added)

- **CNBIZ Website v2 — Portfolio(포트폴리오) 페이지 구현**: `apps/cnbiz-web`에 Portfolio 페이지 신규 구현. REQUEST.md v2 12번(Portfolio)이 프로젝트명·고객사·카테고리·설명·이미지 전 항목 TODO 상태임을 확인하고, 실제 사례를 지어내는 대신 명시적으로 "TODO" 배지가 붙은 placeholder 카드 3개(REQUEST.md의 3행 구조와 동일)로 구성
  - `apps/cnbiz-web/components/sections/PortfolioHeroSection.tsx`(신규) — Portfolio 페이지 히어로("더 나은 사례로 곧 찾아뵙겠습니다")
  - `apps/cnbiz-web/components/sections/PortfolioPlaceholderSection.tsx`(신규) — Case 01~03 placeholder 카드. 점선 테두리·회색 톤·"TODO" 배지로 실제 콘텐츠 카드와 시각적으로 구분, 디자인 토큰(`packages/design-system`)에 정의된 색상만 사용(임의의 강조색 추가하지 않음)
  - `apps/cnbiz-web/app/portfolio/page.tsx`(신규) — PortfolioHero→PortfolioPlaceholder→CTA(공용 컴포넌트 재사용) 순으로 조합, Metadata 적용

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 `/portfolio` 렌더링 확인 — Hero·3개 TODO placeholder 카드·CTA 정상 표시, 콘솔 에러는 파비콘 404(로고 미수령으로 인한 기존 예상 상태) 1건만 존재

---

## 2026-07-04 (5)

### 추가 (Added)

- **CNBIZ Website v2 — Services(사업소개) 페이지 구현**: `apps/cnbiz-web`에 REQUEST.md v2 7번(Services)에서 확정한 4개 서비스·주요 제공 범위·5단계 도입 프로세스만으로 구성. 실제 고객 사례·포트폴리오는 REQUEST.md 12번이 여전히 전부 TODO 상태라 이번 범위에 포함하지 않음(사례 지어내지 않음)
  - `apps/cnbiz-web/components/sections/ServicesHeroSection.tsx`(신규) — Services 페이지 히어로
  - `apps/cnbiz-web/components/sections/ServicesDetailSection.tsx`(신규) — 4개 서비스 상세(한줄 설명 + 주요 제공 범위), 각 서비스에 `id`(`consulting`/`ai`/`development`/`cloud`) 부여해 기존 Footer·Home `ServicesOverviewSection`의 앵커 링크가 실제로 이동하도록 연결
  - `apps/cnbiz-web/components/sections/ServiceProcessSection.tsx`(신규) — 도입 프로세스 5단계
  - `apps/cnbiz-web/app/services/page.tsx`(신규) — ServicesHero→ServicesOverview(공용 컴포넌트 재사용)→ServicesDetail→ServiceProcess→CTA(공용 컴포넌트 재사용) 순으로 조합, Metadata 적용

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 `/services`·`/services#cloud` 렌더링 확인 — 4개 서비스 카드→상세 앵커 이동 정상 동작, 도입 프로세스 5단계 정상 표시, 콘솔 에러 없음

---

## 2026-07-04 (4)

### 추가 (Added)

- **CNBIZ Website v2 — About(회사소개) 페이지 구현**: 도메인 전략 확정(`cnbiz.kr`= 신규 공식 홈페이지, `cnbiz.ai.kr`= 기존 운영 사이트 유지·미변경)에 따라 `apps/cnbiz-web`(cnbiz.kr용)에 About 페이지 신규 구현. 회사 연혁·조직도는 설립연도·직원 수 등 의뢰자 확인 사실 정보가 여전히 TODO 상태라 이번 범위에서 제외(v1처럼 임시 수치를 채워 넣지 않음)
  - `apps/cnbiz-web/components/sections/AboutHeroSection.tsx`(신규) — REQUEST.md v2 4번(회사 개요)의 소개 한 줄·소개 상세 문구를 그대로 사용
  - `apps/cnbiz-web/components/sections/CompanyOverviewSection.tsx`(신규) — 회사명·업종·대표 서비스(검증된 값)만 표기, 설립연도·직원 수는 표기하지 않음(TODO 유지)
  - `apps/cnbiz-web/components/sections/MissionVisionSection.tsx`(신규, `id="values"`) — Mission·Vision·핵심가치 4종. Footer의 `/about#values` 링크와 일치
  - `apps/cnbiz-web/app/about/page.tsx`(신규) — AboutHero→CompanyOverview→MissionVision→CTA(공용 컴포넌트 재사용) 순으로 조합, Metadata 적용

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 `/about` 렌더링 확인 — 회사명·업종·대표 서비스·Mission·Vision·핵심가치 정상 표시, 설립연도·직원 수·연혁·조직도 등 미확인 정보는 노출되지 않음을 확인. 콘솔 에러는 파비콘 404(로고 미수령으로 인한 기존 예상 상태) 1건만 존재

---

## 2026-07-04 (3)

### 추가 (Added)

- **CNBIZ Website v2 — 콘텐츠 기반 문서 및 Header·Footer·Home 구현**
  - `apps/cnbiz-web/REQUEST.md`(신규) — v2 전용 의뢰서. 카피라이팅 성격 콘텐츠(헤드라인·Mission·Vision·핵심가치·서비스 설명·프로세스)는 v1 초안을 v2 확정 콘텐츠로 채택하고, 의뢰자만 확인 가능한 사실 정보(설립연도·직원 수·실주소·로고·최종 브랜드 컬러·후기·FAQ 일부)만 TODO로 남김. v1 컴포넌트에 있던 "설립연도 2010"·"직원 150+"·"15년 이상" 등의 수치는 v1 `REQUEST.md`가 실제로는 "추후 기입" 상태였음을 확인하고 사실로 취급하지 않음(TODO 유지)
  - `apps/cnbiz-web/components/layout/{Header,Footer,MobileMenu}.tsx`(신규) — v1 코드 재사용 없이 신규 작성, `packages/ui`(`LinkButton`)·`packages/layout-primitives`(`Container`·`MobileDrawer`) 기반. Footer는 실제 확인되지 않은 주소·SNS 링크를 지어내지 않고 "확인 후 게시 예정"으로 안내
  - `apps/cnbiz-web/components/sections/{Hero,Values,ServicesOverview,CTA}Section.tsx`(신규) — REQUEST.md v2에서 확정한 카피로 Home 페이지 구성. Hero의 신뢰 지표(설립연도·프로젝트 수 등)는 실제 수치 미확정 상태라 UI에 포함하지 않음
  - `apps/cnbiz-web/app/layout.tsx`·`app/page.tsx` — Header/Footer 연결, Hero→Values→ServicesOverview→CTA 순서로 Home 조합

### 검증 (Verified)

- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과
- Playwright로 데스크탑·모바일(390px) 뷰포트에서 Home 페이지 렌더링 확인, 모바일 햄버거 메뉴 열기/닫기 및 nav 링크 동작 확인. 콘솔 에러는 파비콘 404(로고 미수령으로 인한 예상된 상태) 1건만 존재

---

## 2026-07-04 (2)

### 추가 (Added)

- **모노레포 전환 — CNBIZ Website v2 착수**: npm workspaces(`workspaces: ["apps/*", "packages/*"]`)를 도입해 Development OS(기존 루트 `app/`·`lib/`·`components/`, 변경 없음)와 신규 CNBIZ 홈페이지 v2(`apps/cnbiz-web`)를 같은 저장소 안에서 완전히 분리된 프로젝트로 운영. v1의 UI 원자 컴포넌트(Button·Card 등)는 WBS 2.3/2.5 기준 실제로는 각 섹션에 인라인으로만 존재해 추출된 적이 없었음을 확인하고, `DESIGN_SYSTEM.md`/`CNBIZ_RULES.md` 스펙을 기준으로 신규 작성
  - `packages/design-system` — 색상·타이포·레이아웃·radius 토큰(`tokens.ts`)과 Tailwind 4 `@theme` 블록(`theme.css`)
  - `packages/ui` — `Button`·`LinkButton`·`Input`·`Textarea`·`Card` 신규 작성(기존 v1 코드 재사용 아님)
  - `packages/layout-primitives` — `Container`·`Section`·`MobileDrawer`(범용 동작만 추출, v1 Header/Footer의 CNBIZ 전용 콘텐츠는 가져오지 않음)
  - `packages/utils` — `cn()` 클래스 병합 유틸
  - `apps/cnbiz-web` — Next.js 16 신규 앱(자체 `package.json`·`next.config.ts`·`tsconfig.json`·`eslint.config.mjs`), 공유 패키지를 `transpilePackages`로 연결. 임시 플레이스홀더 홈(`app/page.tsx`)만 존재하며 실제 비즈니스 페이지(회사소개·사업소개·포트폴리오·문의)는 아직 미구현
  - 루트 `tsconfig.json`에 `apps`·`packages` 제외 추가, 루트 `eslint.config.mjs`에 `apps/**`·`packages/**` 무시 추가 — 두 프로젝트의 타입체크·린트 범위가 서로 섞이지 않도록 분리(Dev OS의 린트/빌드 범위는 기존과 동일하게 유지)
  - `.gitignore`의 `node_modules`·`.next`·`out` 패턴을 모든 하위 워크스페이스에 적용되도록 일반화

### 검증 (Verified)

- 루트(Development OS) `npm run lint`·`npm run build` 통과 — 기존 35개 라우트 전부 회귀 없음 확인
- `apps/cnbiz-web` `npm run lint`·`npm run build` 통과, 생성된 CSS에서 `packages/design-system`의 `--primary` 토큰(`#005bac`)이 정상적으로 반영됨을 확인(패키지 간 CSS `@import` 해석 검증)

---

## 2026-07-04

### 추가 (Added)

- New Project 부트스트랩 워크플로 — `/projects`에서 "새 Workspace 자동 생성" 모드로 Project를 생성하면 Workspace 생성 → Git 초기화 → 폴더/README/package.json 생성 → `npm install` → 최초 커밋까지 7단계를 하나의 Workflow Run으로 자동 실행. 기존 Workflow Engine(`lib/workflows/engine.ts`)에 3개 Step Kind(`generate-structure`·`generate-readme`·`generate-package-json`, 모두 로컬 fs 연산으로 새 프로세스 없이 처리)와 `retryStep()`(실패한 Step만 재실행), Workspace id/name을 다음 Step으로 전달하는 Context 전파를 추가해 구현. 새 대시보드 없이 기존 Project Manager UI에 진행 상황 패널(Step별 상태·소요시간·에러 메시지, 진행률 바)만 추가
  - `app/api/projects/bootstrap/route.ts`(신규) — Bootstrap Workflow 정의·Run 생성, `app/api/workflows/runs/[id]/retry/route.ts`(신규) — 실패 Step 재시도 API
  - `app/projects/page.tsx` — Run을 1초 간격으로 폴링해 진행 상황 표시, 완료 시 `POST /api/projects`로 Project 자동 등록, 실패 시 재시도·취소 버튼 노출
- Logs Manager 실데이터 연동 — `app/api/logs/route.ts`(신규)에서 기존 Event Bus(`lib/events/eventBus.ts`)의 실행 이력(Terminal·Git 명령, Workflow Run/Step, Agent Task 이벤트)을 조회해 Logs Manager가 표시하는 형식으로 변환. Logs Manager(`app/developer/logs/page.tsx`)가 10건의 고정 Mock 데이터 대신 이 API를 호출하도록 변경(검색·필터·Export UI는 그대로 유지, Refresh 버튼이 실제 재조회를 수행하도록 연결)

### 변경 (Changed)

- 없음

### 수정 (Fixed)

- Terminal(`app/developer/terminal/page.tsx`) — 페이지 진입 직후(클라이언트 하이드레이션 완료 전) Run 버튼을 클릭하면 클릭이 씹히거나 입력한 명령이 조용히 사라져 아무 반응이 없던 문제 수정. `isMounted` 상태를 추가해 하이드레이션이 끝나기 전까지 Run 버튼·명령 입력창을 실제로 비활성화하도록 변경(반복 재현 테스트로 수정 전 첫 클릭 실패율 약 2/3 확인, 수정 후 5/5 연속 성공 확인)
- Project 진행 상황 패널의 "취소" 버튼(`app/projects/page.tsx`) — 이미 종료된(Failed·Completed·Cancelled) Run에 취소 API를 호출해 항상 400 오류가 발생하던 문제 수정. 오류 발생 여부와 무관하게 화면에서 Run을 지워버리는 로직이라 실제로 아직 실행 중인 Run의 취소 요청이 실패해도 진행 상황 패널이 사라지는(추적 불가능해지는) 위험이 있었음. 종료된 Run은 API 호출 없이 즉시 패널을 닫고, 진행 중인 Run은 취소 API가 성공했을 때만 패널을 닫도록 수정, 버튼 라벨도 종료 상태에서는 "닫기"로 표시

### 검증 (Verified)

- New Project 부트스트랩 워크플로 End-to-End 확인 — Playwright로 Project 생성(새 Workspace 자동 생성) → 7단계 Run 완료 → Project 자동 등록 → Open Project → Open Terminal → 실제 명령 실행(`dir`) → Logs Manager에서 실시간 반영까지 전 구간 확인
- 실패 처리 확인 — Workspace 생성 실패(잘못된 경로 문자로 실제 `ENOENT` 유발), Git 초기화 실패(존재하지 않는 cwd), Terminal 명령 실행 실패(존재하지 않는 명령) 각각 실제로 실패시켜 Run 상태·에러 메시지가 정상 표시됨을 확인
- 재시도·취소 확인 — 실패한 Step만 재시도되어 동일하게 재실패함을 확인(전체 Run이 처음부터 재실행되지 않음), 실행 중인 Step에 대한 취소가 약 2초 내 실제 프로세스 종료로 이어짐을 확인(제한 시간 60초 명령이 끝까지 실행되지 않고 즉시 Cancelled 처리됨)
- `npm run lint`·`npm run build` 통과 확인

---

## 2026-07-03

### 추가 (Added)

- Phase 4: AI Workflow Engine — `lib/workflows/`에 Development OS·Agent Engine·Project Manager를 연결하는 워크플로 오케스트레이션 엔진 신규 구현. 새 대시보드는 만들지 않고 서비스 레이어 + API 라우트로만 구성
  - **재사용 중심 설계**: 6종 Step(Create Workspace·Run Terminal·Initialize Git·Execute AI Prompt·Commit Changes·Push Repository) 전부가 새 실행 로직 없이 기존 서비스로만 위임됨 — Create Workspace는 `lib/workspaces/registry.ts`의 `createWorkspace()`, 나머지 5종은 전부 `lib/agents/taskQueue.ts`의 `taskQueue.enqueue()`(→ Agent Service → `executeShellCommand`)로 위임. Git 관련 Step은 `git ` 접두사 자동 분류로 Git 이벤트도 별도 코드 없이 발생
  - `lib/workflows/types.ts`·`lib/workflows/registry.ts`(Workflow 정의 fs 저장 `lib/data/workflows.json`, 기존 registry 패턴과 동일) — Create workflow
  - `lib/workflows/engine.ts` — Execute·Pause·Resume·Cancel(Task Queue의 Pending/Running/Completed/Failed 상태 전이 재사용), 각 Step의 Timestamp·Duration·Logs·Result를 `StepExecutionRecord`로 기록(Execution History). Task 완료 대기는 폴링이 아닌 기존 Event Bus 구독(`eventBus.subscribe`)으로 구현. Cancel은 진행 중인 Step의 `taskQueue.cancel()`을 그대로 호출해 실제 프로세스를 종료
  - `lib/events/eventBus.ts` — `EventCategory`에 `workflow` 한 종류만 추가(기존 agent/terminal/git 카테고리와 이벤트 버스 자체는 그대로 재사용, 새 이벤트 버스를 만들지 않음)
  - API 라우트(신규 페이지 없음) — `app/api/workflows`(목록·생성)·`app/api/workflows/[id]`·`app/api/workflows/[id]/run`, `app/api/workflows/runs`(전체 실행 이력)·`app/api/workflows/runs/[id]`·`.../pause`·`.../resume`·`.../cancel`
  - curl로 End-to-End 검증: Workspace 생성→파일 작성→`git init`→커밋까지 4단계 전부 실제 파일시스템·Git에 반영됨을 확인. Pause(진행 중이던 Step은 끝까지 완료 후 다음 Step 전에 정지)→Resume(나머지 Step 정상 완료) 확인. Cancel 시 10초 대기 명령이 약 1.8초 만에 실제 프로세스 종료됨을 확인(soft-cancel 아님)
  - `npm run lint`·`npm run build` 통과(31개 라우트), Development OS·Project Manager·Agent Engine 전부 회귀 없음을 재확인

- Phase 3: Project Manager — `app/projects/`에 Development OS 위에서 실행되는 첫 번째 애플리케이션 신규 구현
  - `lib/projects/registry.ts` — `ProjectRecord`(Name·Company·Type·Description·Workspace 연결·Status·CreatedAt·LastOpenedAt) fs 기반 저장(`lib/data/projects.json`, Workspace registry와 동일한 패턴)
  - `lib/projects/status.ts` — 기존 공용 서비스 `runTerminalCommand`(`lib/terminal/client.ts`)만 재사용해 Git 상태(branch·dirty count·last commit)와 AI 도구 설치 여부(`claude --version`·`cursor --version`)를 조회. Terminal/GitHub/AI Manager 페이지는 전혀 수정하지 않음
  - `app/api/projects/route.ts`(GET 목록·POST 생성), `app/api/projects/[id]/route.ts`(GET 단건·PATCH로 Last Opened 갱신) 신규 구현. 기존에 있던(구) `app/api/projects/create|list|open`은 VS Code를 직접 실행하는 별개의 구식 개념이라 신규 API로 교체
  - `app/projects/page.tsx` — Project List(Name·Company·Status·Created At·Last Opened) + New Project 폼(Name·Company·Type·Description·**기존** Workspace 선택, 새 Workspace를 만들지 않고 `/api/workspaces`로 기존 목록만 재사용)
  - `app/projects/[id]/page.tsx` — Open Project 시 `useWorkspaceStore().selectWorkspace()`로 Workspace 선택 + Dashboard(Terminal 상태·Git 상태·AI 상태·Recent Activity)를 표시하고 Terminal/GitHub Manager/AI Manager로 이동하는 링크 제공. Development OS의 UI는 재사용만 하고 재구현하지 않음(`components/developer/Card`·`Badge`·`PageHeader`·`StatusMessage` 재사용)
  - `npm run lint`, `npm run build` 모두 통과, Development OS 6개 페이지는 수정 없이 그대로 유지됨을 확인
- Phase 4: AI Agent Engine — AI-WEB-MASTER의 핵심 엔진을 `lib/agents/`·`lib/prompts/`·`lib/events/`에 신규 구현. 새 대시보드/페이지는 만들지 않고, 순수 서비스 레이어 + 이를 노출하는 API 라우트로만 구성
  - **공통 리팩터링(중복 제거 목적)**: Terminal API(`app/api/terminal/route.ts`)에 인라인으로 있던 shell 실행 로직(PowerShell/CMD/Git Bash 실행, `cd` 처리)을 `lib/terminal/server.ts`의 `executeShellCommand()`로 추출. 라우트는 이 함수를 호출하는 얇은 어댑터로 변경(외부 동작·응답 형식은 동일하게 유지, Terminal/GitHub/AI Manager/Project Manager 전 페이지에서 회귀 없음을 재확인). 이 함수를 Agent Engine이 HTTP 왕복 없이 그대로 재사용
  - **Agent Service** — `lib/agents/types.ts`(Agent 인터페이스), `lib/agents/registry.ts`(Agent 등록·조회), `lib/agents/implementations/`(Shell·Claude Code·Cursor 3개 Agent, 모두 `executeShellCommand` 재사용). Claude Code는 `claude -p`로 headless 프롬프트 실행, Cursor는 `cursor --version` 가용성 확인 + Workspace 폴더 열기
  - **Task Queue** — `lib/agents/taskQueue.ts`. Queue·Progress(0~100)·Status(Queued/Running/Success/Failed/Cancelled)·Cancel을 인메모리로 구현. Cancel은 `AbortController`로 실제 프로세스를 종료(soft-cancel이 아닌 실제 kill을 확인)
  - **Prompt Manager** — `lib/prompts/registry.ts`(fs 기반 저장 `lib/data/prompts.json`, Workspace/Project registry와 동일 패턴)로 프롬프트 저장·버전 관리(수정 시 새 버전 추가, 기존 버전 보존), `lib/prompts/executor.ts`로 특정 버전을 Task Queue/Session에 실행 위임
  - **AI Session** — `lib/agents/session.ts`. Workspace에 바인딩된 세션 생성, 세션 내 실행 히스토리(Task 참조) 추적
  - **Event Bus** — `lib/events/eventBus.ts`. Agent(`task.queued`·`task.started`·`task.completed`·`task.failed`·`task.cancelled`)·Terminal·Git(명령어가 `git `으로 시작하면 자동 분류) 이벤트를 `executeShellCommand`/Task Queue에서 발행
  - **API 라우트(신규 페이지 없음)** — `app/api/agents`(목록)·`app/api/agents/run`·`app/api/agents/tasks`·`app/api/agents/tasks/[id]`·`app/api/agents/tasks/[id]/cancel`, `app/api/prompts`·`app/api/prompts/[id]`·`app/api/prompts/[id]/execute`, `app/api/sessions`·`app/api/sessions/[id]`·`app/api/sessions/[id]/run`
  - curl로 전체 파이프라인(Agent 목록 조회 → Task 실행/취소/큐잉 취소 → Prompt 생성/버전 추가/실행 → Session 생성/실행/히스토리 조회) End-to-End 동작 확인, `npm run lint`·`npm run build` 통과, Development OS 6개 페이지와 Project Manager 전부 회귀 없음을 재확인

- AI Manager MVP (Task 010) — `app/developer/ai/page.tsx` 신규 구현. Claude Code(Status·Version·Start·Stop·Restart), ChatGPT(Status·Open·Settings 토글 패널), Cursor(Status·Open·Version), Ollama(Status·Installed Models, 향후 사용) 카드와 AI 실행 로그 영역 추가. 실제 프로세스 실행 없이 로컬 state로만 상태·로그 관리(UI/상태 관리 MVP 단계). 모바일(390px) 반응형 확인 완료
- Logs Manager MVP (Task 011) — `app/developer/logs/page.tsx` 신규 구현. Terminal·Git·AI·System 4개 카테고리의 Mock 로그(Timestamp·Category·Message·Status)를 카드로 표시. Search Logs(메시지 검색)와 All/Terminal/Git/AI/System 필터를 조합 적용, Refresh(Mock 데이터 재조회)·Clear Logs(초기화)·Export(현재 로그를 JSON 파일로 다운로드) 버튼 구현. 모바일(390px) 반응형 확인 완료
- Settings Manager MVP (Task 012) — `app/developer/settings/page.tsx` 신규 구현. General(Theme·Language·Auto Save), Terminal(Default Shell·Font Size·Working Directory), Git(User Name·User Email·Default Branch), AI(Claude Code Path·Cursor Path·ChatGPT URL), Workspace(Default Workspace Path·Auto Open Last Workspace), About(App/Node/Next.js Version) 6개 섹션 구현. Save·Reset(기본값)·Export Settings(JSON 다운로드)·Import Settings(JSON 업로드) 버튼 구현, `localStorage`(`ai-web-master:settings`)로 저장(Database 미사용). 모바일(390px) 반응형 확인 완료
- Phase 2: Integrate Development OS — `lib/settings/store.ts` 신규 구현(`Settings` 타입·`DEFAULT_SETTINGS`·`readSettings()`를 공용 모듈로 분리, Settings Manager가 이를 사용하도록 리팩터링). Settings > Git의 User Name/Email을 Save·Import 시 실제 `git config --global user.name`/`user.email`로 동기화. Terminal API(`app/api/terminal/route.ts`)에 `shell`(PowerShell/CMD/Git Bash) 파라미터를 추가해 요청받은 셸(`powershell.exe`/`cmd.exe`/`bash.exe`)로 실제 실행. Terminal 페이지가 Settings의 Default Shell·Font Size(입력창·출력 영역에 즉시 반영)·Default Workspace Path(Workspace 미선택 시 시작 경로로 자동 적용)를 실제로 사용하도록 연결. AI Manager가 `claude --version`·`cursor --version`을 실행해 실제 설치 여부와 버전을 표시(미설치 시 Start/Open 버튼 비활성화). GitHub Manager의 Commit이 Settings의 Git User Name/Email을 `git -c user.name=... -c user.email=...` 오버라이드로 사용
- Phase 2: Development OS Stabilization — Terminal·Workspace·GitHub·AI·Logs·Settings 6개 페이지를 전수 검토하고 공용 컴포넌트/훅으로 정리
  - `components/developer/PageHeader.tsx`, `Card.tsx`, `Badge.tsx`, `StatusMessage.tsx`(+`LoadingText`), `DeveloperNav.tsx` 신규 구현 — 6개 페이지에서 중복되던 헤더·카드·배지·로딩/에러 메시지 UI를 공용 컴포넌트로 추출
  - `lib/terminal/client.ts`(`runTerminalCommand`·`fetchDefaultCwd`) 신규 구현 — Terminal/GitHub/AI/Settings 4곳에 흩어져 있던 `/api/terminal` fetch 보일러플레이트를 공용 함수로 통합
  - `lib/hooks/useResolvedCwd.ts` 신규 구현 — Terminal·GitHub에 중복돼 있던 cwd 해석 로직(Workspace → Settings Default Workspace Path → 서버 기본값)을 공용 훅으로 추출. 이 과정에서 GitHub Manager에 없던 "Default Workspace Path" fallback을 Terminal과 동일하게 적용해 두 페이지의 동작을 일치시킴(기존 불일치 수정)
  - `app/developer/layout.tsx` 신규 구현 — 6개 페이지가 각자 선언하던 `<main className="min-h-screen bg-gray-950 ...">` 래퍼를 공용 레이아웃으로 통합하고, 모든 도구를 오가는 `DeveloperNav`를 추가(라우팅 개선). `app/developer/page.tsx`는 nav와 중복되던 3개 링크 목록을 제거하고 안내 문구만 남기도록 단순화
  - Workspace 목록 로딩 시 fetch 실패에 대한 에러 처리 추가(기존에는 실패 시 무한 로딩 상태로 남을 수 있었음), Terminal/GitHub의 cwd 해석 실패도 "Loading..." 대신 에러 메시지로 표시
  - Settings의 저장/가져오기 상태 메시지가 Git 설정 동기화 실패 시에도 항상 초록색으로 표시되던 버그 수정(`StatusMessage` 도입으로 성공/실패에 따라 초록/빨강 구분)
  - `eslint.config.mjs`에 `*.cjs` 무시 패턴 추가 — Next.js 앱 소스가 아닌 독립 스크립트(`screenshot.cjs`)의 `require()` 오탐 제거
  - `npm run lint`, `npm run build` 모두 경고 없이 통과 확인
- Terminal Engine (Task 002) — `app/api/terminal/route.ts` 신규 구현. POST로 받은 `command`를 `child_process.spawn`으로 Windows PowerShell에 전달하여 실행하고 결과를 `{ success, output }` / `{ success: false, error }` JSON으로 반환
- `app/developer/terminal/page.tsx`를 Client Component로 전환하여 실제 API와 연결 — `useState`(command/output/isLoading), Run 버튼·Enter 키 실행, 출력 누적, Clear 버튼, 로딩 상태 표시 추가. 기존 UI(Tailwind 스타일·레이아웃)는 그대로 유지
- `pwd`·`dir`·`git status`·`node -v`·`npm -v` 명령으로 API·UI 동작 확인 완료
- Terminal Test & Fix (Task 003) — 출력을 `{ type, text }` 라인 배열로 구조화하여 명령(`> command`)은 흰색, 정상 출력은 초록색, 에러는 빨간색(`text-red-500`)으로 구분 렌더링. `pwd`·`dir`·`node -v`·`npm -v`·`git --version` 명령으로 재검증 완료
- Workspace Manager (Task 003) — `lib/mock/workspaces.ts`(Workspace 타입·Mock 데이터), `app/developer/workspace/page.tsx`(Workspace 목록: Search·New Workspace·Rename·Delete·Open, 카드에 Name·Path·Status·Last Opened 표시), `app/developer/workspace/[id]/page.tsx`(Workspace 상세: Files·Terminal·GitHub·AI·Logs 탭, Mock 콘텐츠) 신규 구현. DB 미사용, Mock Data 기반. 모바일(390px) 반응형 확인 완료
- Terminal Session (Task 004) — `app/api/terminal/route.ts`에 `GET`(초기 cwd 반환) 추가, `POST`가 클라이언트가 보낸 `cwd`를 기준으로 PowerShell을 실행하고 실행 후 `cwd`를 응답에 포함하도록 개선. `cd` 명령은 PowerShell로 넘기지 않고 서버에서 직접 경로를 검증·해석(`path.resolve`, `~`·`..`·상대/절대 경로 지원)하여 존재하지 않는 경로는 에러 처리
- `app/developer/terminal/page.tsx` — 현재 작업 경로를 상단과 입력창 Prompt(`{cwd} >`)에 표시, 명령 실행마다 서버가 반환한 `cwd`로 갱신하여 다음 명령에도 유지. `↑`/`↓` 방향키로 명령 히스토리 탐색 기능 추가. 출력 영역에 자동 스크롤(`useRef` + `useEffect`) 추가
- `pwd`·`cd app`·`dir`·`cd ..`·`git status`·`npm -v` 순차 실행 및 히스토리 탐색으로 재검증 완료
- Workspace Session (Task 005) — `lib/store/workspace-store.tsx`에 `WorkspaceStoreProvider`/`useWorkspaceStore` 신규 구현. 현재 Workspace(`id`·`name`·`path`)를 React Context로 보관하고 `localStorage`(`ai-web-master:current-workspace`)에 저장해 새로고침 후에도 유지. `app/developer/layout.tsx`를 추가해 `/developer` 하위 전체에 Provider 적용
- Workspace 목록·상세 페이지에서 Workspace를 열면(`Open`/카드 이름 클릭, 상세 페이지 진입) `selectWorkspace`를 호출해 현재 Workspace로 저장하도록 연결
- `app/developer/terminal/page.tsx` — 현재 Workspace가 있으면 Terminal의 초기 작업 경로(cwd)를 `Workspace.path`로 사용(없으면 기존 `process.cwd()` fallback 유지), 헤더에 `Workspace: {name}` 표시 추가. Workspace를 변경한 뒤 Terminal로 이동하면 자동으로 새 경로를 반영
- Real Workspace (Task 006) — `lib/workspaces/registry.ts` 신규 구현. `fs.mkdirSync`로 실제 폴더를 생성하고 `name`·`path`·`createdAt`을 `lib/data/workspaces.json`(machine-local, `.gitignore` 처리)에 기록. 목록 조회 시 `fs.existsSync`로 실제 존재하는 폴더만 표시(삭제된 폴더는 registry에서 자동 정리)
- `app/api/workspaces/route.ts` 신규 구현 — `GET`(실제 폴더 기준 Workspace 목록), `POST`(이름·경로를 받아 실제 폴더 생성 및 등록, 존재하지 않는 경로는 `recursive: true`로 자동 생성)
- `app/workspaces/page.tsx` 신규 구현 — Workspace 목록·New Workspace 생성 폼(Name 입력 시 Path를 `D:/Workspace/{name}`로 자동 제안, 직접 수정 가능), Open 클릭 시 `useWorkspaceStore`로 현재 Workspace 저장 후 `/developer/terminal`로 이동
- `app/layout.tsx`에 `WorkspaceStoreProvider`를 루트 레벨로 이동해 `/workspaces`와 `/developer/terminal`이 하나의 Context를 공유하도록 변경
- GitHub Manager (Task 007) — `app/developer/github/page.tsx` 신규 구현. Terminal API(`/api/terminal`)를 재사용해 `git status --porcelain`·`git branch`·`git remote -v`·`git log --oneline -5`를 실행하고 Repository Name·Branch·Remote URL·Last Commit·Git Status(Modified/Added/Deleted/Untracked)·Git Log(최근 5개)를 화면에 표시. Clone·Pull·Push·Fetch 버튼과 Commit Message 입력 후 커밋(`git add -A` + `git commit -m`) 기능 추가, 액션 성공 시 자동 새로고침. GitHub API는 사용하지 않고 로컬 Git 명령만 사용

### 변경 (Changed)

- Mock Workspace 전체 제거 — `lib/mock/workspaces.ts`, `app/developer/workspace/page.tsx`, `app/developer/workspace/[id]/page.tsx`, `app/developer/layout.tsx`(Provider가 루트로 이전되어 불필요) 삭제하고 실제 폴더 기반 구현(`app/workspaces/`)으로 대체
- 라우팅 정리(Task 008) — `app/workspaces/page.tsx`를 `app/developer/workspace/page.tsx`로 이동해 `/developer/workspace`·`/developer/terminal`·`/developer/github` 3개 라우트를 `/developer/*` 하위로 통일. 빈 껍데기 상태였던 `app/developer/[id]/page.tsx`(라우팅 충돌로 `/developer/workspace` 500 에러의 원인이었음)와 `app/developer/ai`·`create`·`logs`·`projects`·`settings` 아래의 빈 스텁 페이지를 제거해 `npm run build` type-check 실패 원인 제거. `app/developer/page.tsx`가 존재하지 않는 `@/components/developer/DeveloperCenter`를 import하던 문제를 Workspace·Terminal·GitHub로 이동하는 최소한의 링크 목록으로 교체

### 수정 (Fixed)

- `app/api/terminal/route.ts` — PowerShell 실행 결과에 한글이 포함된 경우(`dir`의 "디렉터리" 헤더, PowerShell 오류 메시지 등) 콘솔 코드페이지 불일치로 문자가 깨지던 문제 수정. 실행 명령 앞에 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;`을 추가해 UTF-8로 통일
- `npm run build` 프로덕션 빌드 실패 수정 — 위 라우팅 정리로 `next build`가 오류 없이 완료되고 `/developer`·`/developer/workspace`·`/developer/terminal`·`/developer/github`가 모두 정적/동적 라우트로 정상 생성됨을 확인

---

## 2026-07-01

### 추가 (Added)

- 회사소개 페이지(`/about`) 신규 구현 — `AboutHeroSection`, `VisionMissionSection`(id="values"), `HistorySection`(id="history"), `TeamSection`
- 연혁·조직 콘텐츠는 자료 수령 전까지 임시 데이터로 구성 (WBS 5.3·5.4)
- 헤더 메인 메뉴에 "포트폴리오" 추가, `/portfolio` Placeholder 페이지 신규 구현 (`PortfolioComingSoonSection`) — 상세 콘텐츠는 자료·기획 확정 후 추가 예정 (WBS 7단계 신설)
- 사업소개 페이지(`/services`) 신규 구현 — `ServicesHeroSection`, `ServicesOverviewSection`, `ServicesDetailSection`(id="consulting"·"ai"·"development"·"cloud"), `ServiceProcessSection`(도입 프로세스 5단계)
- 문의하기 페이지(`/contact`) UI 신규 구현 — `ContactForm`(Client Component, 이름·연락처·이메일·문의내용 4개 필드), `ContactSection`(연락처 정보 카드 + 폼 조합, id="form"). 클라이언트 유효성 검사와 idle/submitting/success/error 제출 피드백 UI 포함. 이메일 발송 API(`app/api/contact/route.ts`)는 사용자 승인 전까지 미구현 — 폼은 `/api/contact` 호출 구조만 미리 연결해두어, 현재는 항상 오류 상태 UI로 정상 처리됨
- SEO 구현 — `lib/site-config.ts`(공통 SITE_URL·OG 기본값), `app/opengraph-image.tsx`(`next/og` 기반 동적 OG 이미지), `app/sitemap.ts`(확정 5페이지), `app/robots.ts`(`/login`·`/signup`·`/admin` 크롤링 차단), 루트 레이아웃에 Organization JSON-LD 추가. 전 페이지에 canonical·OG(siteName/locale/image)·Twitter Card 적용

- `globals.css`에 DESIGN_SYSTEM.md 기준 컬러 토큰 추가 (`--primary: #005BAC`, `--primary-light`, `--primary-dark`, `--secondary: #1F2937`)

### 변경 (Changed)

- 메인페이지 Hero 섹션 색상을 디자인 시스템 토큰으로 교체, 버튼 radius 8px로 통일, 섹션 패딩을 80px 기준으로 조정, 버튼 키보드 포커스 스타일 추가
- Header·MobileMenu의 강조 색상(`blue-600`)을 Primary 토큰으로 교체, 모바일 메뉴 CTA 버튼 radius를 Header와 동일한 8px로 통일
- Hero 배지 라벨 크기를 `text-xs`→`text-sm`으로 수정하여 CNBIZ_RULES.md Label 규격 및 사이트 내 다른 섹션 라벨과 통일, 섹션 패딩을 `py-20 lg:py-24`로 재조정(모바일 80px·데스크탑 96px)

### 수정 (Fixed)

- 없음

---

## 2026-06-30

### 추가 (Added)

- Claude Code 프로젝트 문서 구성
- CLAUDE.md 작성
- AGENTS.md 작성
- PROJECT_VISION.md 작성
- PROJECT_ROADMAP.md 작성
- ARCHITECTURE.md 작성
- TECH_STACK.md 작성
- CNBIZ_RULES.md 작성
- WBS.md 작성

### 변경 (Changed)

- AI 작업 규칙 추가
- 작업 시작/종료 절차 추가

### 수정 (Fixed)

- 없음
