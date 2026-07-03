# CHANGELOG

프로젝트 변경 이력을 기록합니다.

---

## 2026-07-03

### 추가 (Added)

- Terminal Engine (Task 002) — `app/api/terminal/route.ts` 신규 구현. POST로 받은 `command`를 `child_process.spawn`으로 Windows PowerShell에 전달하여 실행하고 결과를 `{ success, output }` / `{ success: false, error }` JSON으로 반환
- `app/developer/terminal/page.tsx`를 Client Component로 전환하여 실제 API와 연결 — `useState`(command/output/isLoading), Run 버튼·Enter 키 실행, 출력 누적, Clear 버튼, 로딩 상태 표시 추가. 기존 UI(Tailwind 스타일·레이아웃)는 그대로 유지
- `pwd`·`dir`·`git status`·`node -v`·`npm -v` 명령으로 API·UI 동작 확인 완료
- Terminal Test & Fix (Task 003) — 출력을 `{ type, text }` 라인 배열로 구조화하여 명령(`> command`)은 흰색, 정상 출력은 초록색, 에러는 빨간색(`text-red-500`)으로 구분 렌더링. `pwd`·`dir`·`node -v`·`npm -v`·`git --version` 명령으로 재검증 완료

### 변경 (Changed)

- 없음

### 수정 (Fixed)

- `app/api/terminal/route.ts` — PowerShell 실행 결과에 한글이 포함된 경우(`dir`의 "디렉터리" 헤더, PowerShell 오류 메시지 등) 콘솔 코드페이지 불일치로 문자가 깨지던 문제 수정. 실행 명령 앞에 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;`을 추가해 UTF-8로 통일

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
