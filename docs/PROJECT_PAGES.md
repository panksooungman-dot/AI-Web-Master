# PROJECT_PAGES — 화면/URL 전수 분석

> 이 문서는 코드 수정 없이 저장소를 정적 분석하여 작성되었다. (2026-07-07 기준)

---

## 0. 분석 범위 안내

이 저장소는 실제로는 **두 개의 서로 다른 제품**을 하나의 모노레포에 담고 있다.

| 프로젝트 | 위치 | 성격 |
|---|---|---|
| **AI Business OS (Development OS)** | 루트 `app/`(`/developer/*`, `/projects*`, `/login`, `/signup`) | 내부용 "프로젝트 관리 도구" — 본 분석의 핵심 대상 |
| **CNBIZ 홈페이지 v1 (레거시)** | 루트 `app/`(`/`, `/about`, `/services`, `/portfolio`, `/contact`) | 대외 공개용 회사 홈페이지. `/` 경로를 Development OS와 공유하고 있음 |
| **CNBIZ 홈페이지 v2 (프로덕션)** | `apps/cnbiz-web/` (별도 Next.js 앱, `cnbiz.kr`) | 실제 서비스 중인 회사 홈페이지. 별도 워크스페이스라 아래 표에서 제외 |

사용자가 요청한 "의뢰 접수 → 유지보수" 8단계 분류는 **소프트웨어 개발/납품 파이프라인**을 전제로 하므로, 아래 표는 **AI Business OS(Development OS)** 화면을 중심으로 작성했다. 다만 1단계(의뢰 접수)에 한해 CNBIZ v1의 `/contact` 페이지도 참고용으로 포함했다(실제 파이프라인과 연결되어 있지 않음, 아래 "특이사항" 참고).

**중요 발견**: 8단계(의뢰접수~유지보수) 중 실제로 전용 화면이 존재하는 것은 **"4. 프로젝트 생성"** 하나뿐이다. "개발/테스트/배포/유지보수"는 별도 화면이 없고, Terminal·GitHub·AI Manager 등 동일한 범용 도구를 프로젝트 생성 이후 반복 사용하는 구조다. "의뢰 접수·요구사항 분석·견적 및 일정"에 해당하는 화면은 코드베이스 어디에도 존재하지 않는다.

---

## 1. 단계별 화면 분류표

| 단계 | 화면명 | URL | 파일 위치 | 구현 여부 | 비고 |
|---|---|---|---|---|---|
| 1. 의뢰 접수 | (전용 화면 없음) | — | — | ❌ 미구현 | 내부 파이프라인에 "의뢰 접수" 화면 자체가 없음. 참고: CNBIZ v1 공개 사이트의 `/contact`(`app/contact/page.tsx`)가 문의 폼을 제공하지만 `/api/contact` 라우트가 루트 앱에 없어 **항상 전송 실패**하며, Development OS(프로젝트 관리)와 데이터로 연결되어 있지 않음 |
| 2. 요구사항 분석 | (전용 화면 없음) | — | — | ❌ 미구현 | 관련 화면·데이터 모델 없음. `ServiceProcessSection.tsx`(CNBIZ v1 마케팅 카피)에 "요구사항 분석"이라는 문구가 있으나 실제 동작하는 화면이 아니라 홍보용 텍스트 |
| 3. 견적 및 일정 | (전용 화면 없음) | — | — | ❌ 미구현 | 관련 화면·데이터 모델 없음 |
| 4. 프로젝트 생성 | Project 목록/생성 | `/projects` | `app/projects/page.tsx` | ✅ 구현 완료 | 신규 Workspace 생성 또는 기존 Workspace 선택으로 Project 생성, 기존 폴더 Import(`isImporting` 상태) 기능 포함. 생성 시 Bootstrap Workflow(Workspace 생성→Git init→구조 생성→README/package.json 생성→`npm install`→커밋→Push) 진행 상황을 실시간 표시(`/api/projects/bootstrap`, `/api/workflows/*` 폴링) |
| 4. 프로젝트 생성 | Project 대시보드 | `/projects/[id]` | `app/projects/[id]/page.tsx` | ✅ 구현 완료 | 개별 Project의 Terminal/Git/AI 상태·Health(프레임워크 감지)·최근 활동 표시, Terminal/GitHub/AI Manager로 이동하는 진입점 역할 |
| 4. 프로젝트 생성 (보조) | Workspace 관리 | `/developer/workspace` | `app/developer/workspace/page.tsx` | ✅ 구현 완료 | 실제 로컬 폴더 생성/조회(`lib/workspaces/registry.ts`, fs 기반). Project의 하위 개념(실제 폴더)을 관리하는 화면. `/projects`에서도 이 목록을 재사용 |
| 5. 개발 | Terminal | `/developer/terminal` | `app/developer/terminal/page.tsx` | ✅ 구현 완료 | PowerShell 명령 실행(`/api/terminal`), 현재 Workspace 기준 cwd 유지, 히스토리(↑/↓) |
| 5. 개발 | GitHub 관리 | `/developer/github` | `app/developer/github/page.tsx` | ✅ 구현 완료 | `git status`/`branch`/`remote`/`log` 조회, Commit/Push/Pull/Fetch 실행(Terminal API 재사용) |
| 5. 개발 | AI 도구 관리 | `/developer/ai` | `app/developer/ai/page.tsx` | ✅ 구현 완료 | Claude Code/ChatGPT/Cursor/Ollama 상태·버전 표시, 실행/중지 |
| 5. 개발 (기반) | AI Agent Engine / Prompt / Session API | (UI 없음, API만) | `lib/agents/*`, `lib/prompts/*`, `app/api/agents/*`, `app/api/prompts/*`, `app/api/sessions/*` | ⚠️ API만 구현, 전용 UI 없음 | Task Queue·Prompt 버전관리·AI Session을 제공하는 백엔드 서비스. 화면(페이지)이 없어 curl/API로만 검증된 상태(CHANGELOG 2026-07-03 참고) |
| 5. 개발 (기반) | Workflow Engine | (UI 없음, API만 + `/projects` 내 진행 패널로 일부 노출) | `lib/workflows/*`, `app/api/workflows/*` | ⚠️ API만 구현 | Pause/Resume/Cancel/Retry 등 엔진 기능 대부분은 `/projects`의 Bootstrap 진행 패널에서만 부분적으로 소비됨. 별도 Workflow 관리 화면은 없음 |
| 6. 테스트 | (전용 화면 없음) | — | — | ❌ 미구현 | 테스트 단계만을 위한 화면 없음. Terminal(`/developer/terminal`)에서 `npm run build`/`lint` 등을 수동 실행하는 방식으로 대체 |
| 7. 배포 | (전용 화면 없음) | — | — | ❌ 미구현 | 배포 단계만을 위한 화면 없음. GitHub 관리(`/developer/github`)의 Push 기능으로 일부 대체(실제 배포는 Vercel Git 연동에 의존, 앱 내 화면 없음) |
| 8. 유지보수 | Logs | `/developer/logs` | `app/developer/logs/page.tsx` | ✅ 구현 완료 | Event Bus(Terminal/Git/Agent/Workflow) 실행 이력 조회(`/api/logs`), 검색/필터/Export |
| 8. 유지보수 | Settings | `/developer/settings` | `app/developer/settings/page.tsx` | ✅ 구현 완료 | General/Terminal/Git/AI/Workspace/About 설정, `localStorage` 저장 + Git 설정은 실제 `git config --global`과 동기화 |
| (공통 진입) | Development OS 홈 | `/developer` | `app/developer/page.tsx` | ✅ 구현(안내 문구만) | "위 메뉴에서 선택하세요" 안내 텍스트만 있는 빈 랜딩 페이지, `DeveloperNav`로 하위 6개 화면 이동 |

---

## 2. 메뉴 ↔ 실제 연결 상태 교차 검증

### 2-1. 메뉴에는 있지만(또는 페이지는 있지만) 실제로 연결되지 않은 경우

| 화면 | URL | 문제 |
|---|---|---|
| `/projects` | `/projects` | **어디에서도 링크되지 않음.** `DeveloperNav`(6개 링크: Workspace/Terminal/GitHub/AI/Logs/Settings)에 `/projects`가 없고, CNBIZ 공개 Header/Footer에도 없음. URL을 직접 입력해야만 접근 가능 — Project 생성/관리 기능 전체가 사실상 "숨겨진" 상태 |
| `/developer` (인덱스) | `/developer` | 자기 자신을 가리키는 링크가 없음(직접 URL 진입 또는 하위 페이지에서 뒤로가기로만 도달) |
| `/login` | `/login` | 코드상 완전히 구현된 로그인 폼 UI가 있으나(`"use client"`, 이메일/비밀번호 입력) `onSubmit`이 `e.preventDefault()`만 호출 — 실제 인증 로직 없음. 어떤 메뉴에서도 링크되지 않고, `robots.ts`가 크롤링까지 차단 |
| `/signup` | `/signup` | `/login`과 동일한 상태 — UI만 존재, 제출 로직 없음, 메뉴 연결 없음, 크롤링 차단 |

### 2-2. 구현되어 있지만 실질적으로 사용되지 않는(죽은) 코드

| 대상 | 위치 | 비고 |
|---|---|---|
| `PortfolioSection.tsx` | `components/sections/PortfolioSection.tsx` | 실제 `/portfolio` 페이지는 `PortfolioComingSoonSection.tsx`를 사용 중이며, `PortfolioSection`은 어디에서도 import되지 않음(고아 컴포넌트) |
| `app/developer/workspace/[id]` (Workspace 상세, Mock) | — | CHANGELOG(2026-07-04)에 따르면 이미 삭제됨. 현재 저장소에는 파일이 존재하지 않아 라우트 없음(과거엔 존재했으나 Mock 데이터 방식이라 제거됨) |
| Contact 폼(루트) | `app/contact/page.tsx` → `components/sections/ContactForm.tsx` | `/api/contact`를 호출하지만 루트 `app/api/`에 해당 라우트가 없어 제출 시 항상 오류 상태 UI로 귀결(코드 주석에도 "사용자 승인 전까지 미구현"이라 명시됨). `apps/cnbiz-web`에는 동일 기능이 실제로 구현되어 있음 |

### 2-3. URL만 있고 메뉴(내비게이션)에는 없는 경우

| URL | 파일 위치 | 비고 |
|---|---|---|
| `/projects` | `app/projects/page.tsx` | 위 2-1과 동일 항목(중요도가 높아 재기재) |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | `/projects` 목록에서만 진입 가능, 전역 메뉴엔 없음 |
| `/login`, `/signup` | `app/login/page.tsx`, `app/signup/page.tsx` | 위 2-1과 동일 |
| `/developer` | `app/developer/page.tsx` | 위 2-1과 동일 |

---

## 3. 구조적 특이사항 (참고)

- **레이아웃 중첩**: 루트 `app/layout.tsx`가 CNBIZ 공개 사이트용 `<Header/>`·`<Footer/>`를 전역에 적용하고 있어, `/developer/*`·`/projects*`(다크 테마 개발자 도구 화면)도 그 안에 CNBIZ 공개 헤더/푸터로 감싸인 채 렌더링된다. `app/developer/layout.tsx`·`app/projects/layout.tsx`가 각자 다크 배경(`bg-gray-950`)을 덮어씌우지만 최상단 공개 Header/Footer는 그대로 노출된다.
- **`/projects`의 실질적 역할**: 이름은 "프로젝트 생성"이지만 화면 내부에서 Workspace 목록 조회, Bootstrap Workflow 실행/진행상황 폴링, Import까지 겸하고 있어 사실상 "프로젝트 생성" 단계의 허브 역할을 한다. 반면 정작 이 화면 자체는 메뉴에서 접근할 수 없다(2-1 참고).
- **8단계 분류와 실제 구현의 간극**: 요청된 8단계 중 절반(의뢰 접수·요구사항 분석·견적 및 일정·테스트·배포)은 전용 화면이 없다. 현재 구현은 "프로젝트 생성 이후의 로컬 개발 도구 모음"(Workspace/Terminal/GitHub/AI/Logs/Settings)에 집중되어 있다.

---

## 4. 전체 URL 인벤토리 (페이지 라우트만)

| URL | 파일 |
|---|---|
| `/` | `app/page.tsx` |
| `/about` | `app/about/page.tsx` |
| `/services` | `app/services/page.tsx` |
| `/portfolio` | `app/portfolio/page.tsx` |
| `/contact` | `app/contact/page.tsx` |
| `/login` | `app/login/page.tsx` |
| `/signup` | `app/signup/page.tsx` |
| `/developer` | `app/developer/page.tsx` |
| `/developer/workspace` | `app/developer/workspace/page.tsx` |
| `/developer/terminal` | `app/developer/terminal/page.tsx` |
| `/developer/github` | `app/developer/github/page.tsx` |
| `/developer/ai` | `app/developer/ai/page.tsx` |
| `/developer/logs` | `app/developer/logs/page.tsx` |
| `/developer/settings` | `app/developer/settings/page.tsx` |
| `/projects` | `app/projects/page.tsx` |
| `/projects/[id]` | `app/projects/[id]/page.tsx` |

> API 라우트(`/api/*`)는 화면이 아니므로 위 표에서 제외했으며, 1절 본문 중 관련 화면 설명에 함께 표기했다.
