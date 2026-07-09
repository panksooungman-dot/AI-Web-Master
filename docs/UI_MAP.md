# UI_MAP — 전체 화면 분석 및 카테고리 분류

> 코드 수정 없이 저장소를 정적 분석하여 작성한 개발자 참고 문서다. (작성 기준일: 2026-07-07)
> 이전 버전(파이프라인 단계별 분류)은 [`PROJECT_PAGES.md`](./PROJECT_PAGES.md) 참고. 이 문서는 요청에 따라 **기능 카테고리** 축으로 재정리했다.

---

## 0. 분석 범위

이 저장소(`D:\ai-web-master`)의 루트 `app/`에는 서로 다른 두 제품이 공존한다.

| 영역 | 성격 |
|---|---|
| CNBIZ 홈페이지 v1(레거시, 공개) | 대외 공개용 회사 소개 사이트 (`/`, `/about`, `/services`, `/portfolio`, `/contact`) |
| AI Business OS (Development OS, 내부용) | 내부 개발자 도구 (`/developer/*`, `/projects*`, `/login`, `/signup`) |

`apps/cnbiz-web/`(v2, `cnbiz.kr` 실제 프로덕션)는 별도 애플리케이션이라 분석 대상에서 제외했다.

**표 항목 설명**
- **메뉴 접근**: Header / Footer / DeveloperNav 등 화면 내비게이션에서 클릭으로 도달 가능한지
- **사용 여부**: `사용 중`(실제 기능 동작) / `부분 사용`(화면은 있으나 핵심 기능 미동작, UI만 존재) / `미사용`(고아 코드, 아무 데서도 참조되지 않음) — 요청하신 "사용 중인지 / 미사용인지" 두 항목을 하나의 3단계 값으로 통합 표기

---

## 1. 프로젝트 관리

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| Project 목록/생성 | `/projects` | `app/projects/page.tsx` | ✅ `DeveloperNav`("프로젝트 관리") | 사용 중 | 신규 Project 생성(신규/기존 Workspace 선택), 기존 폴더 Import, Bootstrap Workflow(폴더 생성→Git init→구조/README/package.json 생성→`npm install`→커밋→Push) 진행상황 실시간 표시 |
| Project 대시보드 | `/projects/[id]` | `app/projects/[id]/page.tsx` | ⚠️ 간접(목록 카드 클릭으로만 진입) | 사용 중 | 개별 Project의 Terminal/Git/AI 상태, Health(프레임워크 감지), 최근 활동 표시. Terminal/GitHub/AI Manager 진입점 제공 |
| Workspace 관리 | `/developer/workspace` | `app/developer/workspace/page.tsx` | ✅ `DeveloperNav` | 사용 중 | 실제 로컬 폴더 생성/조회(`lib/workspaces/registry.ts`, fs 기반). Project의 물리적 폴더 단위를 관리 |

---

## 2. 고객관리

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| — | — | — | — | — | **구현된 화면 없음.** 고객/CRM 데이터 모델, 문의 이력 관리 화면이 저장소 어디에도 없다. `/contact`(아래 8절 "기타")는 공개 사이트의 단순 문의 폼일 뿐, 접수 내역을 조회·관리하는 내부 화면이 아니며 그마저 백엔드 미연결 상태다 |

---

## 3. AI

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| AI 도구 관리 | `/developer/ai` | `app/developer/ai/page.tsx` | ✅ `DeveloperNav` | 사용 중 | Claude Code/ChatGPT/Cursor/Ollama 상태·버전 표시, 실행/중지(`claude --version` 등 실제 프로세스 조회) |

> 참고: `lib/agents/*`(Agent Service·Task Queue), `lib/prompts/*`(Prompt 버전관리), `lib/agents/session.ts`(AI Session)는 전용 화면 없이 API(`/api/agents/*`, `/api/prompts/*`, `/api/sessions/*`)로만 존재한다. curl 기반으로만 검증된 백엔드 로직이며, 화면(UI)이 아니라 이 표에는 포함하지 않았다.

---

## 4. 관리자

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| — | — | — | — | — | **구현된 화면 없음.** `/admin` 라우트 자체가 존재하지 않는다. `app/robots.ts`가 `/admin`을 크롤링 차단 목록에 미리 넣어두었고, `WBS.md`에도 "Phase 2 대기"로 표시되어 있어 **향후 구현 예정**임을 알 수 있으나 현재는 페이지 파일이 없다 |

---

## 5. 인증

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| 로그인 | `/login` | `app/login/page.tsx` | ❌ 없음(직접 URL 진입만) | 부분 사용(UI만) | 이메일/비밀번호 입력 폼 UI. `onSubmit`이 `e.preventDefault()`만 호출 — 실제 인증 요청·세션 처리 없음 |
| 회원가입 | `/signup` | `app/signup/page.tsx` | ❌ 없음(직접 URL 진입만) | 부분 사용(UI만) | 이름/이메일/비밀번호 입력 폼 UI. `/login`과 동일하게 제출 로직 없음 |

> 인증 시스템 자체가 전역 미구현 상태다(`middleware.ts` 없음, 세션/역할 검사 코드 없음). `lib/supabase.ts`가 있으나 어디에서도 import되지 않는 미사용 코드이며 `.env.local` 부재로 실제 호출 시 즉시 예외를 던진다. 결과적으로 이 저장소의 **모든 URL은 로그인 여부와 무관하게 접근 가능**하다.

---

## 6. 개발자

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| Development OS 인덱스 | `/developer` | `app/developer/page.tsx` | ❌ 없음(`DeveloperNav`에도 자기 자신 링크 없음) | 사용 중 | 안내 문구 + Dev Server Manager 카드(현재 프로젝트에서 실제 `npm run dev` 등을 실행·PID 추적·종료·재시작. Status·Port·PID 실시간 조회, Start/Stop/Restart 버튼) |
| Terminal | `/developer/terminal` | `app/developer/terminal/page.tsx` | ✅ `DeveloperNav` | 사용 중 | PowerShell 명령 실제 실행(`/api/terminal`), 현재 Workspace 기준 cwd 세션 유지, 명령 히스토리(↑/↓) |
| GitHub 관리 | `/developer/github` | `app/developer/github/page.tsx` | ✅ `DeveloperNav` | 사용 중 | `git status`/`branch`/`remote`/`log` 조회, Commit/Push/Pull/Fetch 실행(Terminal API 재사용) |
| Logs | `/developer/logs` | `app/developer/logs/page.tsx` | ✅ `DeveloperNav` | 사용 중 | Event Bus(Terminal/Git/Agent/Workflow) 실행 이력 조회(`/api/logs`), 검색/필터/Export |

---

## 7. 설정

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| Settings | `/developer/settings` | `app/developer/settings/page.tsx` | ✅ `DeveloperNav` | 사용 중 | General/Terminal/Git/AI/Workspace/About 설정. `localStorage` 저장 + Git User Name/Email은 실제 `git config --global`과 동기화 |

---

## 8. 기타 (CNBIZ 공개 마케팅 사이트, v1)

| 화면 이름 | URL | 파일 위치 | 메뉴 접근 | 사용 여부 | 기능 |
|---|---|---|---|---|---|
| 메인 홈 | `/` | `app/page.tsx` | ✅ Header 로고, Footer 로고 | 사용 중 | Hero, 회사 소개 요약, 서비스 카드, CTA |
| 회사소개 | `/about` | `app/about/page.tsx` | ✅ Header·Footer | 사용 중 | 비전/미션/핵심가치, 연혁(임시 데이터), 조직 소개(임시 데이터) |
| 사업소개 | `/services` | `app/services/page.tsx` | ✅ Header·Footer | 사용 중 | 서비스 4종 상세, 도입 프로세스 5단계 |
| 포트폴리오 | `/portfolio` | `app/portfolio/page.tsx` | ✅ Header | 부분 사용 | `PortfolioComingSoonSection`(Placeholder)만 표시, 실제 프로젝트 사례 콘텐츠 없음 |
| 문의하기 | `/contact` | `app/contact/page.tsx` | ✅ Header·Footer | 부분 사용(UI만) | `ContactForm.tsx`가 `/api/contact`를 호출하나 루트 앱에 해당 API 라우트가 없어 **제출 시 항상 오류로 귀결** |

---

## 9. 메뉴에 없거나 미사용인 코드 (교차 확인)

### 9-1. 메뉴에서 접근 불가한 화면 (URL은 있으나 내비게이션 미연결)

- `/developer` — 인덱스 페이지 자체가 링크되지 않음
- `/login`, `/signup` — 전역 메뉴 어디에도 없음
- `/projects/[id]` — 전역 메뉴엔 없고 `/projects` 목록 카드 클릭으로만 도달

### 9-2. 완전 미사용(고아) 코드

| 대상 | 위치 | 비고 |
|---|---|---|
| `PortfolioSection.tsx` | `components/sections/PortfolioSection.tsx` | 어디에서도 import되지 않음. 실제 `/portfolio`는 `PortfolioComingSoonSection.tsx` 사용 |
| `lib/supabase.ts` | `lib/supabase.ts` | 어디에서도 import되지 않음. env 미설정 시 즉시 throw하는 코드 |

---

## 10. 요약

| 카테고리 | 화면 수 | 사용 중 | 부분 사용(UI만) | 미구현(화면 없음) |
|---|---|---|---|---|
| 프로젝트 관리 | 3 | 3 | 0 | — |
| 고객관리 | 0 | — | — | 전체 |
| AI | 1 | 1 | 0 | — |
| 관리자 | 0 | — | — | 전체 |
| 인증 | 2 | 0 | 2 | — |
| 개발자 | 4 | 3 | 1 | — |
| 설정 | 1 | 1 | 0 | — |
| 기타(공개 사이트) | 5 | 3 | 2 | — |
| **합계** | **16개 페이지** | | | |

핵심 발견:
- **고객관리·관리자 카테고리는 화면 자체가 없다** — 향후 구현이 필요한 영역
- 메뉴로 접근 불가능한 화면 4개(`/developer`, `/login`, `/signup`, `/projects/[id]`)
- 인증 화면은 UI만 있고 실제 기능 없음, 저장소 전체에 인증/인가 시스템 미구현
- 고아 코드 2건(`PortfolioSection.tsx`, `lib/supabase.ts`)
