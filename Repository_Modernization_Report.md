# Repository Modernization Report

> 작성일: 2026-07-19 (분석 전용 — 코드/문서/폴더 변경 없음, 삭제·이동·리네임 없음)
> 목적: AI Business OS 아래 여러 프로젝트(Homepage/ShoppingMall/Chatbot/CRM/ERP 등)가 계속 추가되는
> 미래를 전제로, 현재 저장소 구조가 그 확장을 견딜 수 있는지 평가하고 장기 로드맵을 제시한다.
> 근거: 이번 세션 실측(`find`/`ls`/`grep`) + `REPORT.md`·`REFACTOR_PLAN.md`·`CHECKPOINT_REVIEW.md`·
> `PROJECT_STATUS.md`·`CLAUDE.md`·`AGENTS.md`·`README.md`·`docs/01_PMO/PROJECT_ROADMAP.md` 대조
> **본 문서는 설계 검토입니다. 어떤 파일도 삭제·이동·리네임·수정하지 않았습니다.**

---

## 1. Current Repository Structure

루트(`D:\ai-web-master`) 직속 34개 항목을 역할별로 분류:

| 영역 | 항목 | 역할 |
|---|---|---|
| **Active 실행 코드** | `apps/`(`cnbiz-web` 1개뿐), `packages/{ui,design-system,layout-primitives,utils,cli,dev-inspector}` | 실제 빌드·배포되는 코드 |
| **Legacy 실행 코드** | `app/`, `components/`, `lib/`(일부만) | CNBIZ v1, 동결·수정 금지 |
| **AI Platform 콘텐츠** | `agents/`, `prompts/`, `skills/`, `orchestration/`, `memory/`, `marketplace/` | Claude Code Skill 정의·마켓플레이스 (일부만 실제 로드됨, 아래 3번 참고) |
| **Phase 5 예약 폴더** | `packages/{agents,skills,templates,prompts,workflows}`(README만), `mcp/`(README만), `examples/`(README만) | `docs/01_PMO/PROJECT_ROADMAP.md` "Phase 5: AI Business OS Productization (Planned)"에 명시적으로 예약, 착수 시점 미정 |
| **문서** | `docs/`(00~09 번호 폴더), `PROJECT_STATUS.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGESET.md`, `REPORT.md`, `REFACTOR_PLAN.md`, `CHECKPOINT_REVIEW.md`, `REFACTOR_CHECK_REPORT.md` | 프로젝트 상태·규칙·이력 |
| **도구별 설정** | `.claude/`, `.cursor/`, `.codex/`(`config.toml`), `.agents/`(`skills/`), `.github/` | 여러 AI 코딩 도구(Claude Code/Cursor/Codex 등) 설정 — 이번 조사에서 처음 명시적으로 식별, 5번 항목에서 재언급 |
| **빌드 산출물/캐시** | `node_modules/`, `.next/`, `coverage/`, `tsconfig.tsbuildinfo`, `package-lock.json`, `.vercel/`, `.playwright-mcp/` | gitignore 대상, 구조 논의에서 제외 |
| **이물질(요주의)** | `.claude/worktrees/ai-provider-v1.1/` | 별도 git worktree, 4회째 사용자 확인 대기(처리하지 않음, 8번 항목에서 규칙화) |

`apps/cnbiz-web` 내부 자체도 최상위 레벨(`app/`·`components/`·`lib/`·`tests/`·`public/`·`scripts/`·자체 `package.json`/`tsconfig.json`/`eslint.config.mjs`)로 완결된 독립 Next.js 프로젝트 — 이 형태 자체가 "하나의 `apps/*` 프로젝트가 어떤 모양이어야 하는가"의 사실상 유일한 실례(precedent)다.

---

## 2. Active Area

**`apps/cnbiz-web`** — 유일한 실서비스. `.vercel/project.json`의 `projectName: "ai-web-master-cnbiz-web"`이 이 폴더를 배포 루트로 지정. 93개 API 라우트(이번 세션 Inquiry/Client/WebsiteOrder/AiJob/External API 추가로 84→93), Development OS 대시보드, Design Automation 9-Phase, Marketplace, Auth/RBAC 전부 이 안에 있다.

**`packages/{ui,design-system,layout-primitives,utils}`** — `apps/cnbiz-web`의 `next.config.ts`가 `transpilePackages`로 직접 소비. 실제 사용 중인 공유 패키지.

**`packages/cli`**(219개 파일) — `ai` 전역 CLI. `apps/cnbiz-web`의 `/developer/websites` 대시보드가 `lib/commandEngine`을 통해 이 CLI를 child process로 shell-out(`node packages/cli/dist/index.js website create ...`). 독립 배포 가능한 도구이자 동시에 `apps/cnbiz-web`의 기능 일부.

**`packages/dev-inspector`** — Website Builder가 생성하는 신규 프로젝트에 Visual Editor를 자동 연결하는 데 사용(`packages/cli/vendor/dev-inspector`에 물리 복사되어 번들됨).

---

## 3. Legacy Area

**동결 코드**: 루트 `app/`(5페이지, API 라우트 0개) + `components/`(레이아웃 3·섹션 14, PortfolioSection은 이미 삭제됨) + `lib/`의 잔존 2개 파일(`site-config.ts`, `dev/component-marker.ts` — `supabase.ts`는 참조 0건으로 이미 삭제). `CLAUDE.md`·`AGENTS.md`·`README.md` 3곳 모두 "유지보수 목적 외 수정 금지"를 명시(README.md:13-17, 52-58).

**왜 유지되는가**: (1) 삭제가 아니라 "동결"이 정책이다 — 실제로 빌드·린트·테스트가 전부 독립적으로 통과하는 살아있는 코드이며, `apps/cnbiz-web`이 아직 100% 기능 동등성을 확보하지 못한 과거 시점의 안전망으로 남아있다. (2) 루트 `components/`의 11개 동일 이름 파일은 이 레거시 `app/`이 실제로 import하고 있어(이번 세션 재확인), 삭제 시 레거시 자체가 깨진다 — "미사용 코드"가 아니라 "레거시 트리 내부에서는 사용 중인 코드"다. (3) Vercel에 배포되지 않으므로(2번 항목) 실사용자 트래픽에는 영향이 없다 — 유지 비용은 "저장소 용량 + 신규 기여자의 혼동 위험"뿐, 런타임 리스크는 없다.

**이물질**: `.claude/worktrees/ai-provider-v1.1/`(브랜치 `worktree-ai-provider-v1.1`) — 저장소 전체를 통째로 복제한 별도 git worktree. `find`로 재확인한 결과 `Header.tsx` 등 주요 파일이 이 안에도 중복 검색되어 grep 노이즈의 원인이 된다(5번 항목 참고). `docs/08_PLANS/상가분양센터/`도 동일하게 소관 불명 상태로 이월 중.

---

## 4. Shared Area — "진짜 공유되는 것" vs "apps/cnbiz-web 안에 갇힌 것"

**오늘 실제로 여러 프로젝트가 재사용 가능한 것**: `packages/ui`(Button/Input/Textarea/Select/Card/LinkButton), `packages/design-system`(색상·타이포·레이아웃 토큰), `packages/layout-primitives`(Container/Section/MobileDrawer), `packages/utils`(`cn()`). 전부 프레임워크 종속성이 낮고 CNBIZ 도메인 지식이 없는 순수 UI 유틸이라, `apps/homepage`든 `apps/shoppingmall`이든 바로 가져다 쓸 수 있다.

**핵심 발견 — 인프라 계층이 `apps/cnbiz-web/lib/` 안에 갇혀 있다.** `apps/cnbiz-web/lib/`은 30개 하위 모듈을 갖는데(이번 세션 실측), 이 중 최소 8개는 CNBIZ 비즈니스 도메인과 무관한 **범용 애플리케이션 인프라**다:

| 모듈 | 역할 | 두 번째 앱(예: `apps/shoppingmall`)이 필요로 하는가 |
|---|---|---|
| `lib/db`(`CollectionStore`, `getDefaultStore()`) | Supabase `app_collections` 단일 테이블 추상화 | **거의 확실히 그렇다** — 어떤 앱이든 영속 저장이 필요 |
| `lib/auth`(RBAC, 세션, 비밀번호 해시) | 이메일/비밀번호 로그인 + role 게이팅 | **그렇다** — 로그인이 있는 앱이라면 전부 |
| `lib/audit`(Audit Log) | 관리자 행동 이력 | 관리자 화면이 있는 앱이라면 필요 |
| `lib/metrics`(카운터 레지스트리) | 대시보드 카운터 | 유사 |
| `lib/events`(Event Bus) | Terminal/Git/Workflow 이벤트 발행-구독 | 부분적으로 필요 |
| `lib/commandEngine` | 셸 명령 실행 엔진 | Website Builder류 기능이 있을 때만 필요 |
| `lib/health`, `lib/backup` | 헬스체크·백업/복원 | 운영 대시보드가 있다면 필요 |

이 모듈들은 지금 `import { getDefaultStore } from "@/lib/db"`처럼 `apps/cnbiz-web` 내부 경로 별칭(`@/lib/...`)으로만 참조되며, `packages/*`의 어느 것도 이를 export하지 않는다. **오늘 `apps/shoppingmall`을 새로 만든다면, 이 8개 모듈 전체를 복사-붙여넣기하거나 처음부터 다시 구현해야 한다** — 이것이 이번 조사에서 확인한 가장 중요한 구조적 갭이다.

반대로 명백히 **CNBIZ 전용**이라 공유 대상이 아닌 모듈: `lib/contact`, `lib/requests`, `lib/inquiries`, `lib/clients`, `lib/websiteOrders`, `lib/aiJobs`, `lib/websites`, `lib/projects`, `lib/design`(Design Automation 9-Phase), `lib/marketplace`, `lib/workflows`, `lib/agents`, `lib/prompts`, `lib/providers`, `lib/devserver`, `lib/terminal`, `lib/workspaces`, `lib/settings`, `lib/dev`, `lib/paths`, `lib/store` — 이들은 "CNBIZ 홈페이지 제작 대행 + 자체 Development OS"라는 이 앱 고유의 비즈니스이며, 다른 프로젝트(쇼핑몰·CRM)로 옮길 이유가 없다.

---

## 5. Repository Navigation — "Header를 수정해야 한다"

**실측 결과, `Header.tsx`라는 이름의 파일이 실제로 3곳에 존재한다**(`.claude/worktrees/` 내부의 중복 2건은 별도 worktree 노이즈이므로 제외):

1. `apps/cnbiz-web/components/layout/Header.tsx` — **정답**(실서비스가 쓰는 헤더)
2. `components/layout/Header.tsx`(루트) — 오답(레거시 v1, 배포 안 됨)
3. `packages/cli/src/templates/website/components/Header.tsx`(+ 빌드 산출물 `dist/` 동일 파일) — **또 다른 성격의 파일**: CNBIZ 자신의 헤더가 아니라, `ai website create`가 새 고객 웹사이트를 생성할 때 뿌리는 **템플릿**이다. "Header를 고쳐달라"는 요청이 "CNBIZ 사이트 헤더"인지 "앞으로 생성될 고객 사이트들의 기본 헤더 템플릿"인지에 따라 정답이 완전히 달라진다.

**README.md만으로 1·2번은 몇 초 안에 해결된다** — README.md 9-17행이 "현재 개발은 `apps/cnbiz-web`에서 진행됩니다 / 다음 디렉터리는 Legacy(v1)이며 신규 기능을 추가하지 않습니다: app/·components/·lib/"라고 최상단에 명시하고, 52-58행에도 동일 내용이 "Legacy (Read Only)" 섹션으로 반복된다. `CLAUDE.md`도 7-9행에 동일한 "Active Application" 선언이 있다. **1·2번 사이의 혼동은 이미 문서로 해결되어 있다.**

**그러나 3번(CLI 템플릿)은 README.md/CLAUDE.md 어디에도 언급되지 않는다.** "Header 수정" 요청이 실제로는 "향후 생성될 고객 사이트들의 기본 디자인을 바꿔달라"는 의미일 수 있는데, 이 경우 정답은 1번이 아니라 3번이며, 두 문서 모두 이 세 번째 후보의 존재조차 알려주지 않는다. 이것이 **현재 유일하게 남은 실질적 Navigation 갭**이다.

**결론**: 일반적인 "우리 홈페이지 헤더 수정" 요청은 README만으로 수 분 내 해결 가능(1번↔2번 구분 명확). "신규 고객 사이트 생성 시 기본 템플릿" 관련 요청만 문서 갭이 존재(1번 vs 3번 구분 불가) — 8번 Repository Rules에 이 구분을 명문화할 것을 제안한다.

---

## 6. Component Architecture 제안

현재 3원 구조:

```
components/(루트)              — Legacy, 동결, 삭제 불가(app/이 참조 중)
apps/cnbiz-web/components/     — Active, CNBIZ 전용 조합 컴포넌트(레이아웃+섹션)
packages/ui/                   — Active, 범용 원자 컴포넌트(Button 등)
```

이 구조 자체(레거시 격리 + 원자 컴포넌트 패키지화 + 앱별 조합 컴포넌트)는 **패턴으로는 이미 옳다.** 문제는 프로젝트가 2개 이상이 되는 순간 드러난다: `apps/cnbiz-web/components/layout/Header.tsx` 안에 있는 "네비게이션 항목 정의·로고·CNBIZ 브랜드 문구" 같은 로직과, `Container`/`nav` 마크업처럼 어떤 앱이든 재사용 가능한 뼈대가 뒤섞여 있다. 지금은 앱이 1개뿐이라 이 뒤섞임이 드러나지 않을 뿐이다.

**장기 제안**(코드 변경 없이 방향만 제시): `packages/layout-primitives`가 이미 `Container`/`Section`/`MobileDrawer`처럼 "뼈대"를 담당하고 있으므로, 여기에 **Header/Footer의 구조적 뼈대**(슬롯 기반 — 로고 슬롯·네비 슬롯·CTA 슬롯을 props로 받는 `HeaderShell`/`FooterShell`)를 추가하고, 각 앱(`apps/cnbiz-web`, 향후 `apps/shoppingmall` 등)은 그 뼈대에 자기 브랜드 콘텐츠만 주입하는 방향을 권장한다. `packages/ui`(원자)·`packages/layout-primitives`(뼈대)·`apps/*/components`(브랜드 콘텐츠 주입)의 3계층이 지금보다 명확히 분리되면, 두 번째 앱을 만들 때 Header/Footer를 처음부터 새로 짜지 않아도 된다.

---

## 7. Future Repository Structure (제안, 미실행)

```
apps/
├── cnbiz-web/          (기존, 무변경)
├── homepage/            (예: 향후 신규 홈페이지형 프로젝트)
├── shoppingmall/
├── chatbot/
├── crm/
└── erp/

packages/
├── ui/                   (기존)
├── design-system/        (기존)
├── layout-primitives/     (기존 + Header/Footer Shell 추가 제안, 6번 참고)
├── utils/                 (기존)
├── cli/                   (기존)
├── dev-inspector/          (기존)
├── core-auth/  (신규 제안)   ← apps/cnbiz-web/lib/auth에서 CNBIZ 무관 부분 추출
├── core-db/    (신규 제안)   ← apps/cnbiz-web/lib/db(CollectionStore) 추출
├── core-audit/ (신규 제안)   ← apps/cnbiz-web/lib/audit 추출
├── core-metrics/(신규 제안)  ← apps/cnbiz-web/lib/metrics 추출
└── {agents,skills,templates,prompts,workflows}/  (기존, Phase 5 예약 그대로 유지)
```

각 신규 `apps/*`는 `apps/cnbiz-web`과 동일한 골격(자체 `package.json`/`next.config.ts`/`tsconfig.json`/`app`/`components`/`lib`/`tests`)을 갖되, `lib/` 안에는 그 프로젝트 고유 도메인 모듈만 남고 `core-auth`/`core-db`/`core-audit`/`core-metrics`는 `packages/`에서 import하는 형태를 제안한다. 이렇게 하면 N개 앱이 늘어나도 "로그인·저장소·감사로그"를 N번 재구현하지 않는다.

`docs/`·`marketplace/`·`skills/`·`agents/`·`prompts/`·`orchestration/`·`memory/`는 "AI Business OS 자체의 운영 체계"이므로 특정 `apps/*`에 속하지 않고 루트에 그대로 남는 것이 맞다(구조 변경 불필요).

---

## 8. Migration Roadmap (계획만, 실행 없음)

| Phase | 목표 | 선행조건 | 위험도 | 예상 작업량 |
|---|---|---|---|---|
| **Phase A — Active 영역 명확화** | README.md/CLAUDE.md에 "3번째 Header 후보"(CLI 템플릿) 같은 남은 Navigation 갭을 명문화. 신규 `apps/*` 생성 시 따라야 할 골격(7번 트리)을 `docs/`에 문서화 | 없음(순수 문서 작업) | **낮음** | 반나절 미만, 문서 2~3개 갱신 |
| **Phase B — Shared Component 정리** | `packages/layout-primitives`에 Header/Footer Shell(슬롯 기반) 추가, `apps/cnbiz-web`이 이를 사용하도록 점진적 전환(기존 컴포넌트는 유지한 채 신규 Shell을 도입 후 교체) | Phase A 완료, 실제 두 번째 앱이 확정되기 전에 먼저 검증할 필요는 없음(첫 앱에서도 리팩터링 가치 있음) | **중간**(기존 렌더링 결과가 바뀌면 안 됨, 시각적 회귀 테스트 필요) | 2~3일, Header/Footer 한정 |
| **Phase C — Core 패키지 추출** | `lib/db`(CollectionStore)·`lib/auth`(RBAC)를 `packages/core-db`·`packages/core-auth`로 추출, `apps/cnbiz-web`이 이를 import하도록 전환 | Phase A, 두 번째 `apps/*` 프로젝트가 실제로 착수되기 직전이 가장 적기(추상 상태로 미리 뽑으면 과설계 위험) | **높음**(저장소 전체 registry가 이 경로에 의존, 회귀 테스트 범위가 큼) | 1주 내외, `getDefaultStore()` 호출부 전수 회귀 확인 필요 |
| **Phase D — Legacy Isolation(격리, 삭제 아님)** | 루트 `app/`·`components/`·`lib/`을 `_legacy/v1/` 같은 별도 최상위 폴더로 물리 이동(삭제는 여전히 하지 않음) — Active/Legacy를 폴더 트리 레벨에서 원천 분리 | Phase A, 그리고 **`CLAUDE.md`/`AGENTS.md`의 "유지보수 목적 외 수정 금지" 정책이 "이동"까지 포함하는지 사용자 승인 필요**(현재 정책 문구는 "수정"만 명시, "이동"은 명시적 결정 없음) | **중간**(코드 내용은 안 바뀌지만 경로가 바뀌어 툴링·CI 참조가 있다면 갱신 필요) | 반나절, 이동 자체는 단순하나 승인 절차가 선행 |
| *(Phase E — Legacy Removal)* | 참고용으로만 표기: 완전 삭제는 이번 로드맵 범위 밖. Phase D 완료 후 충분한 시간이 지나 아무도 루트 레거시를 참조하지 않는다는 확신이 서면 별도로 재논의 | Phase D + 장기간 무참조 확인 | 해당 없음(미계획) | 해당 없음 |

**중요**: Phase C(Core 패키지 추출)는 지금 당장 서두를 필요가 없다. 앱이 1개뿐인 지금 미리 추출하면 "가상의 두 번째 앱"을 위한 과설계가 된다(`CLAUDE.md`의 "불필요한 분석/추상화를 하지 않는다" 원칙과도 상충). **실제로 두 번째 `apps/*` 프로젝트 착수가 확정되는 시점에 Phase C를 시작하는 것을 권장.**

---

## 9. Repository Rules (향후 준수 규칙 제안)

1. **신규 프로젝트는 반드시 `apps/` 아래에만 생성한다.** 루트에 두 번째 `app/` 스타일 폴더를 만들지 않는다(현재 "app"이라는 이름 자체가 이미 레거시로 선점되어 있어 혼동 위험이 큼).
2. **범용 UI는 `packages/ui`·`packages/layout-primitives`·`packages/design-system`을 우선 사용한다.** 새 앱이 버튼·카드·레이아웃 뼈대를 다시 만들기 전에 먼저 이 3개 패키지를 확인한다.
3. **루트 `app/`·`components/`·`lib/`(레거시)는 어떤 이유로도 신규 기능을 추가하지 않는다.** 버그 수정 등 불가피한 유지보수만 예외로 허용(`CLAUDE.md`/`AGENTS.md` 기존 정책 재확인).
4. **Active 영역 외 신규 코드를 작성하지 않는다** — `docs/`·`agents/`·`skills/`·`marketplace/` 등 "AI Platform 콘텐츠" 영역에 실행 코드를 넣지 않는다(이 영역은 정의·문서·마켓플레이스 메타데이터 전용).
5. **Feature 추가 시 폴더 생성 규칙**: 새 도메인 모듈은 `apps/<project>/lib/<domainName>/{types,registry}.ts` 형태를 따른다(이번 세션 Inquiry/Client/WebsiteOrder/AiJob이 확립한 패턴). 새 앱 전용이 아니라 여러 앱이 쓸 인프라라고 판단되면 즉시 `packages/`로 만들지 말고, 먼저 해당 앱 안에서 검증한 뒤 두 번째 실사용처가 생기는 시점에 추출한다("Rule of Two" — 최소 2곳에서 필요해지기 전까지는 추상화하지 않는다).
6. **README 작성 규칙**: 새 `apps/<project>`는 자체 `README.md`에 최소한 "이 프로젝트가 무엇인지 1줄" + "로컬 실행 방법" + "이 프로젝트가 `packages/*` 중 무엇을 쓰는지"를 포함한다. 루트 `README.md`의 "Active Application" 표에 새 앱을 즉시 추가한다(이번 감사들이 반복 지적한 "표는 갱신, 서술은 stale" 패턴을 문서 작성 시점부터 방지).
7. **Folder Naming Rule**: `apps/*`는 소문자-하이픈(`kebab-case`, 예: `shopping-mall`이 아니라 프로젝트 성격에 맞게 일관성 있게), `packages/*`는 역할을 나타내는 단수 명사(`ui`·`db`·`auth`류)를 사용한다. `lib/<domain>` 폴더명은 이번 세션에 확립된 대로 도메인 명사의 camelCase 복수형(`inquiries`·`clients`·`websiteOrders`·`aiJobs`)을 따른다.
8. **이물질 방지 규칙**: 검증/테스트 세션에서 생성된 스크래치 산출물(`test-project/` 같은)은 세션 종료 시 정리한다. 별도 git worktree를 만들었다면 작업 완료 즉시 `git worktree remove`로 정리하거나, 다음 세션 시작 시 1회 소유자에게 확인한다(4회 이상 미확인 상태로 이월시키지 않는다).
9. **Header/Footer 등 "이름이 같은 파일이 여러 곳에 있을 수 있는" 컴포넌트를 요청받으면, 어느 `apps/*`(또는 `packages/cli`의 생성 템플릿)를 말하는지 먼저 명확히 한다** — 5번 항목에서 확인된 실질적 갭에 대한 직접 대응 규칙.

---

## 10. Priority (Critical / High / Medium / Low)

> 전제: 현재 저장소는 lint/build/test가 전부 통과하는 정상 상태다. 아래 우선순위는 "얼마나 긴급한 결함인가"가 아니라 **"진행 중인 AI Job 실행기 등 기능 개발과 비교해 이 Modernization 작업을 언제 착수하는 게 합리적인가"** 기준이다.

| 우선순위 | 항목 | 이유 |
|---|---|---|
| **Critical** | 없음 | 구조적 결함이 서비스에 영향을 주는 상태는 없음 |
| **High** | Phase A(문서 갭 해소) | 비용이 거의 0(문서 수정)이고, 다음 세션이 3번째 Header 후보를 몰라서 겪을 혼동을 즉시 예방 가능. 기능 개발과 병행 가능 |
| **Medium** | Phase B(Header/Footer Shell 추출), Repository Rules 9개 항목을 실제 `CLAUDE.md`/`AGENTS.md`에 반영 | 지금 앱이 1개뿐이라도 미리 규칙을 문서화해두면 두 번째 앱 착수 시 혼란이 줄어듦. 다만 AI Job 실행기 등 진행 중인 기능 개발을 막을 이유는 없음 — 병행 가능 |
| **Low** | Phase C(Core 패키지 추출), Phase D(Legacy Isolation 이동) | 실제로 두 번째 `apps/*` 프로젝트가 확정되기 전까지는 착수하지 않는 것을 권장(과설계 방지). Phase D는 추가로 사용자의 정책 해석 승인(정지 vs 이동)이 선행되어야 함 |
| **참고(우선순위 없음)** | `.claude/worktrees/ai-provider-v1.1`, `docs/08_PLANS/상가분양센터/` | 이번 보고서 범위가 아님(기존 감사에서 반복 이월 중인 별건) — Repository Modernization과 무관하게 사용자 확인이 선행되어야 하는 항목으로만 재확인 |

**결론**: 지금 당장 저장소 구조를 대대적으로 바꿀 필요는 없다. **Phase A(문서 갭 메우기)만 즉시 진행하고, Phase B~D는 실제로 두 번째 프로젝트(`apps/homepage` 등)가 착수되는 시점까지 계획 상태로 보류하는 것이 가장 안전하고 효율적인 경로다.** 이는 AI Job 실행기 등 현재 진행 중인 기능 개발과 전혀 충돌하지 않는다.
