# USER_GUIDE — 사용자 가이드

> AI Business OS v1.0 · Development OS(대시보드) 사용 안내
> 대상: `developer` 또는 `super_admin` 역할로 로그인해 `/developer` 대시보드를 사용하는 사용자

이 문서는 화면 사용법만 다룹니다. 설치는 `docs/INSTALL.md`, 계정·역할 관리는 `docs/ADMIN_GUIDE.md`, 오류 해결은 `docs/TROUBLESHOOTING.md`를 참고하세요.

---

## 1. 로그인

1. `/login`에서 이메일·비밀번호를 입력합니다. (계정이 없다면 운영자에게 `docs/INSTALL.md` 3번 절차로 생성을 요청하세요.)
2. 로그인에 성공하면 역할(Role)에 따라 자동으로 이동합니다:
   - `developer` / `super_admin` → `/developer` (대시보드)
   - `admin` → `/admin` (현재 버전에는 화면이 없습니다 — `docs/ADMIN_GUIDE.md` 참고)
   - `user` → `/` (공개 홈페이지, 대시보드 접근 권한 없음)
3. 특정 페이지로 바로 이동하려다 로그인이 필요했다면(`?redirect=...`), 로그인 후 그 페이지로 돌아갑니다.
4. 세션은 7일간 유지됩니다. 우측 상단 **로그아웃** 버튼으로 언제든 종료할 수 있습니다.

**403(접근 권한 없음)이 뜬다면** 역할이 `/developer`에 접근할 수 없는 상태입니다 — 계정을 만든 운영자에게 역할 변경을 요청하세요(`docs/ADMIN_GUIDE.md` 참고).

---

## 2. 대시보드 구성 (`/developer`)

로그인 후 상단 내비게이션에서 아래 화면들을 오갈 수 있습니다.

| 메뉴 | 경로 | 설명 |
|------|------|------|
| Dashboard | `/developer` | Projects·실행 중인 AI Task·Workflow·Marketplace·최근 활동·시스템 상태 요약 |
| 프로젝트 관리 | `/projects` | 프로젝트 생성(신규 Workspace 자동 부트스트랩)·조회·삭제 |
| Workspace | `/developer/workspace` | 실제 로컬 폴더 기반 작업 공간 관리 |
| Terminal | `/developer/terminal` | 브라우저에서 실제 셸 명령 실행 |
| GitHub | `/developer/github` | Git 상태 확인·커밋·푸시·풀 |
| AI Workspace | `/developer/ai` | Provider 상태(Claude Code/Cursor/Ollama/OpenAI/Gemini), Chat/Code/Content 실행, Task 이력 |
| Prompt Library | `/developer/prompts` | 프롬프트 생성·버전 관리·미리보기·실행 |
| Workflow Center | `/developer/workflows` | Workflow 실행/일시정지/재개/취소/재시도 |
| Design | `/developer/design` | Design Automation 파이프라인(아래 3번 참고) |
| Website Builder | `/developer/websites` | `ai website create`를 대시보드에서 실행 |
| Marketplace | `/developer/marketplace` | Agent/Workflow/Skill 패키지 조회·설치·업데이트·제거 |
| Logs / Audit Log / Metrics / Error Report | `/developer/{logs,audit-log,metrics,errors}` | 실행 이력·감사 로그·누적 지표·오류 조회 |
| Health | `/developer/health` | Git 상태·디스크 사용량 실시간 확인, Build/Test/Coverage 수동 실행 |
| Backup | `/developer/backup` | 데이터 백업 내보내기/가져오기 |
| Settings | `/developer/settings` | 프로필·Terminal·Git·AI·Workspace 설정 |

---

## 3. Design Automation 파이프라인

`/developer/design`에서 시작해 아래 순서로 이어지는 9단계 파이프라인을 사용할 수 있습니다. 각 화면 우측 상단의 링크(`Storyboard →`, `Wireframe →` 등)로 다음 단계로 이동합니다.

```
Requirements(요구사항 분석)
  → Storyboard(화면 흐름)
  → Wireframe(레이아웃)
  → Prototype(인터랙션)
  → Claude Design(디자인 프롬프트 생성)
  → Review(고객 검토·승인/반려/수정요청)
  → Figma(Import/Export)
  → Design Sync(Design ↔ Code 동기화)
  → Website Builder(실제 Next.js 프로젝트 생성)
```

- **Review에서 승인(Approve)해야만** Figma Export·Website Builder 단계로 진행할 수 있습니다(승인되지 않은 상태에서 시도하면 오류로 안내됩니다).
- 각 단계 화면에서 **Export JSON / Export Markdown** 버튼으로 결과를 내려받을 수 있습니다.
- AI Provider(`ANTHROPIC_API_KEY` 등)가 설정되어 있지 않아도 모든 단계가 결정론적 기본값으로 동작합니다(화면에 "Simulated" 배지로 표시).

---

## 4. Website Builder

`/developer/websites` 또는 Design Automation의 마지막 단계(`/developer/design/website`)에서 실제 Next.js 웹사이트 프로젝트를 생성할 수 있습니다.

- 지원 사이트 타입: 범용 웹사이트·랜딩 페이지·포트폴리오·기업 홈페이지·에이전시·치과·병원·레스토랑·쇼핑몰·블로그·교육
- 생성된 프로젝트는 저장소의 `.generated-websites/<slug>/`(또는 지정한 경로)에 만들어지며, 11개 페이지(Home/About/Services/Products/Pricing/FAQ/Blog/Contact/Privacy/Terms/404)를 갖춘 완전한 Next.js 프로젝트입니다.
- 생성 후 안내되는 `cd`·`npm install`·`npm run dev`로 바로 실행해 볼 수 있습니다.

---

## 5. 자주 쓰는 CLI 명령 (선택)

대시보드 대신 터미널에서 직접 작업하고 싶다면 전역 `ai` 명령을 사용할 수 있습니다(설치: `docs/INSTALL.md` 4번).

```bash
ai devmode                 # VS Code + 개발 서버 + 브라우저 자동 연결
ai website create --site-type dental --name "OO치과"
ai chat "질문"
ai prompt list
```

전체 명령은 `ai --help` 또는 저장소 루트 `README.md`의 "CLI Usage" 절을 참고하세요.
