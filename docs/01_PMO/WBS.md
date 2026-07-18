# WBS (Work Breakdown Structure)

> **최종 수정:** 2026-07-05  
> 이 파일은 세션 시작 시 가장 먼저 확인한다.

> ⚠️ 본 문서는 2026-07-05 기준으로 동결되었습니다. 최신 진행 상황은 저장소 루트의 `PROJECT_STATUS.md`를 참고하세요.

---

## 현재 상태 (Quick Status)

> ⚠️ **구조 변경 안내 (2026-07-05):** 2026-07-04 모노레포 전환 이후 실제 프로덕션(`cnbiz.kr`)은 `apps/cnbiz-web`(v2)에서 서비스된다. 아래 "WBS 상세" 1~11단계는 `app/`(v1, 레거시) 기준으로 2026-07-01에 마지막으로 갱신된 뒤 동결되었다. v2의 실제 진행 현황은 **[v2 모노레포 진행 현황](#v2-모노레포-진행-현황-appscnbiz-web--cnbizkr-실제-프로덕션)** 섹션을 기준으로 확인한다.

| 항목 | 내용 |
|------|------|
| **활성 프로젝트** | `apps/cnbiz-web` (v2 모노레포) — `cnbiz.kr` 프로덕션 |
| **v2 현재 작업** | SEO 보강(OG 이미지·canonical·Organization 구조화 데이터) 및 10단계 테스트(반응형·접근성·Lighthouse) |
| **v2 최근 완료** | Google Analytics 4 연동, Vercel 환경 변수 설정·재배포 후 프로덕션 반영 확인 (2026-07-05) |
| **v2 다음 작업** | 반응형(390/768/1280) 전 페이지 확인, `/portfolio` 실 콘텐츠·`/about` 연혁·`/contact` 연락처 정보(자료 수령 후), GSC 연동 |
| **v1(레거시) 상태** | 2026-07-01 기준 71%(55항목 중 39항목)에서 동결, 더 이상 갱신하지 않음 |

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | CNBIZ 기업 홈페이지 |
| 프레임워크 | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| 브랜드 컬러 | 블루 계열 (blue-600 / blue-700 중심) |
| 개발 방식 | AI 주도 개발 (Claude Code) |
| 저장소 | `D:\ai-web-master` (npm workspaces 모노레포) |
| 구조 | Development OS(`app/`·`lib/`·`components/`, 루트) + CNBIZ Website v2(`apps/cnbiz-web`) + 공유 패키지(`packages/*`) — 2026-07-04 모노레포 전환 |
| 목표 URL | `https://cnbiz.kr` (v2, Vercel 프로덕션 배포·검증 완료) / `https://cnbiz.ai.kr`(기존 운영 사이트, 별도 유지·미변경) |

---

## 확정 페이지 구성

| 페이지 | 경로 | Phase | 상태 |
|--------|------|-------|------|
| 메인 | `/` | 1 | ✅ 완료 |
| 회사소개 | `/about` | 1 | ✅ 완료 |
| 사업소개 | `/services` | 1 | ✅ 완료 |
| 포트폴리오 | `/portfolio` | 1 | 🔄 Placeholder 완료 |
| 문의하기 | `/contact` | 1 | 🔄 UI 완료, API 승인 대기 |
| 관리자 | `/admin` | 2 | 🔲 Phase 2 |

> 위 표는 v1(`app/`) 기준이다. `/admin`은 Development OS(루트) 전용이며 CNBIZ Website에는 해당하지 않는다. **v2(`apps/cnbiz-web`, 실제 프로덕션) 기준 페이지별 상태는 [v2 모노레포 진행 현황](#v2-모노레포-진행-현황-appscnbiz-web--cnbizkr-실제-프로덕션)을 따른다.**

---

## 개발 일정

| 단계 | 기간 | 상태 |
|------|------|------|
| Phase 0 — 기반·요건 확정 | 2026-06-30 | ✅ 완료 |
| Phase 1 — 4페이지 구현 | 진행 중 | 🔄 진행 중 |
| Phase 2 — 관리자·기능 확장 | 미정 | 🔲 대기 |
| Phase 3 — 테스트·배포 | 미정 | 🔲 대기 |

---

## 개발 순서

```
1. 프로젝트 준비       ✅ 완료
      ↓
2. 디자인 시스템       ✅ 완료 (컴포넌트 통합)
      ↓
3. 공통 컴포넌트       ✅ 완료 (Header·MobileMenu·Footer·layout)
      ↓
4. 메인페이지          ✅ 완료
      ↓
5. 회사소개 페이지     ✅ 완료
      ↓
6. 사업소개 페이지     ✅ 완료
      ↓
7. 포트폴리오 페이지   🔄 Placeholder 완료
      ↓
8. 문의 페이지         🔄 UI 완료, API 승인 대기
      ↓
9. SEO                 ✅ 완료
      ↓
10. 테스트              🔄 다음 작업
      ↓
11. 배포
```

---

## v2 모노레포 진행 현황 (`apps/cnbiz-web` — cnbiz.kr, 실제 프로덕션)

> 2026-07-04 모노레포 전환 이후 실제 서비스되는 CNBIZ 홈페이지는 이 섹션이 기준이다. 아래 "WBS 상세(v1)"는 참고용 이력이며 더 이상 갱신하지 않는다.

### 저장소 구조

```
apps/cnbiz-web/            # CNBIZ Website v2 (cnbiz.kr)
├── app/
│   ├── page.tsx            # 메인
│   ├── about/page.tsx       # 회사소개
│   ├── services/page.tsx    # 사업소개
│   ├── portfolio/page.tsx   # 포트폴리오
│   ├── contact/page.tsx     # 문의하기
│   ├── api/contact/route.ts # 문의 폼 처리 API
│   ├── sitemap.ts           # /sitemap.xml
│   └── robots.ts            # /robots.txt
├── components/sections/     # 페이지별 섹션 컴포넌트
├── components/layout/       # Header·Footer·MobileMenu (v2 신규 작성)
└── REQUEST.md                # v2 전용 의뢰서 (사실 정보 TODO 추적)

packages/
├── design-system/     # 컬러·타이포·레이아웃 토큰
├── ui/                # Button·LinkButton·Input·Textarea·Card
├── layout-primitives/ # Container·Section·MobileDrawer
└── utils/             # cn() 등 공용 유틸
```

### 페이지별 상태

| 페이지 | 경로 | 상태 | 비고 |
|--------|------|------|------|
| 메인 | `/` | ✅ 완료 | Hero·Values·ServicesOverview·FAQ·CTA |
| 회사소개 | `/about` | 🔄 부분 완료 | Hero·CompanyOverview·MissionVision·Process 완료. 연혁·조직도는 설립연도·직원 수 등 사실 정보 미확정으로 의도적 제외(TODO) |
| 사업소개 | `/services` | ✅ 완료 | Hero·Overview·Detail(4종, 앵커)·Process(5단계) |
| 포트폴리오 | `/portfolio` | 🔄 Placeholder | Hero + TODO 배지 카드 3종. 실제 사례는 자료 수령 후 진행 |
| 문의하기 | `/contact` | ✅ 완료 | UI·서버 검증·로컬 저장·이메일 발송(Resend)·스팸 방지(honeypot+rate limit) 구현, 실제 키로 발송 검증 완료(2026-07-04). 연락처 정보(전화·이메일·주소·운영시간)는 TODO 배지 표시 중(자료 수령 대기) |

### SEO

| 항목 | 상태 | 비고 |
|------|------|------|
| 페이지별 메타 title·description | ✅ 완료 | `app/layout.tsx`·각 페이지 Metadata |
| sitemap.xml | ✅ 완료 | `app/sitemap.ts`, 프로덕션 배포·응답 검증 완료(2026-07-05) |
| robots.txt | ✅ 완료 | `app/robots.ts`, sitemap 경로 포함 |
| OG 태그·동적 OG 이미지 | 🔲 대기 | v1에는 있으나(`app/opengraph-image.tsx`) v2엔 미구현 |
| canonical·metadataBase | 🔲 대기 | 미구현 |
| Organization 구조화 데이터(JSON-LD) | 🔲 대기 | 미구현 |

### 테스트

| 항목 | 상태 | 비고 |
|------|------|------|
| `npm run build` 통과 | ✅ 완료 | 매 기능 추가 시 확인 |
| Playwright 렌더링·콘솔 에러 확인 | ✅ 완료 | 매 기능 추가 시 페이지 단위로 확인(CHANGELOG 참고) |
| 모바일(390px)·태블릿(768px)·데스크탑(1280px) 반응형 전수 확인 | 🔲 대기 | 페이지별 부분 확인만 있었음, 전체 감사 미실시 |
| 키보드 네비게이션·접근성(aria) 전수 확인 | 🔲 대기 | |
| Lighthouse 성능 점수 확인 | 🔲 대기 | |

### 배포

| 항목 | 상태 | 비고 |
|------|------|------|
| Vercel 프로젝트 연결(Git 통합) | ✅ 완료 | 기존 연결 확인(사용자 확인, 2026-07-05), `main` push 시 자동 배포 확인 |
| 커스텀 도메인 `cnbiz.kr` 연결·SSL | ✅ 완료 | `cnbiz.kr` → `www.cnbiz.kr` 308 리다이렉트는 의도된 설정(사용자 확인). HTTPS 정상 |
| 환경 변수(Resend API 키 등) | ✅ 완료 | `.env.local`(machine-local)로 관리, 실제 발송 검증 완료 |
| Google Analytics 연동 | ✅ 완료 | `@next/third-parties`(`GoogleAnalytics`), production-only 게이팅. `NEXT_PUBLIC_GA_MEASUREMENT_ID`는 Vercel 환경 변수로 설정, 재배포 후 프로덕션에서 `gtag.js` 로드 확인(2026-07-05) |
| Google Search Console 등록·사이트맵 제출 | 🔲 대기 | |

### 남은 작업 (우선순위 순)

1. `/portfolio` 실제 사례 콘텐츠 (자료 수령 필요)
2. `/about` 연혁·조직도, `/contact` 연락처 정보 (사실 정보 확인 필요)
3. SEO 보강 — OG 이미지·canonical·Organization JSON-LD
4. 반응형·접근성·Lighthouse 전수 테스트
5. GSC 연동

---

## WBS 상세 (v1 — `app/`, 레거시 · 2026-07-01 기준 동결)

> 아래 1~11단계는 모노레포 전환 이전(v1, 루트 `app/`) 기준 WBS이며 참고 이력으로만 유지한다. 실제 진행 상황은 위 v2 섹션을 따른다.

### 1. 프로젝트 준비

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 1.1 | 프로젝트 초기 세팅 (Next.js 설치, 폴더 구조) | ✅ 완료 | |
| 1.2 | 기반 문서 작성 (VISION·ROADMAP·ARCHITECTURE·TECH_STACK) | ✅ 완료 | |
| 1.3 | REQUEST.md 실제 의뢰 내용 작성 | ✅ 완료 | 2026-06-30 |
| 1.4 | 환경 변수 설정 (`.env.local`) | 🔲 대기 | 이메일 서비스 키 필요 |
| 1.5 | ESLint·TypeScript 설정 확인 | 🔲 대기 | |

---

### 2. 디자인 시스템

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 2.1 | CSS 변수 정의 (`globals.css` — 브랜드 컬러 토큰) | ✅ 완료 | globals.css에 기본 변수 적용 |
| 2.2 | 타이포그래피 스케일 정의 | ✅ 완료 | Tailwind 클래스로 컴포넌트 통합 |
| 2.3 | `Button` 공통 컴포넌트 | ✅ 완료 | 인라인 Link 스타일로 통합 |
| 2.4 | `Input` · `Textarea` 공통 컴포넌트 | 🔲 대기 | 7단계 문의 폼 시 생성 |
| 2.5 | `Card` 공통 컴포넌트 | ✅ 완료 | ServicesSection 카드로 통합 |
| 2.6 | 인라인 SVG 아이콘 정의 | ✅ 완료 | 각 컴포넌트에 인라인 SVG 적용 |

---

### 3. 공통 컴포넌트

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 3.1 | `Header.tsx` — 로고·PC 네비게이션 (Server Component) | ✅ 완료 | 확정 4개 메뉴 (회사소개·사업소개·포트폴리오·문의) — 2026-07-01 포트폴리오 메뉴 추가 |
| 3.2 | `MobileMenu.tsx` — 햄버거 메뉴·드로어 (Client Component) | ✅ 완료 | |
| 3.3 | `Footer.tsx` — 회사정보·링크·저작권 (Server Component) | ✅ 완료 | 확정 4페이지 기준 링크 정리 |
| 3.4 | `app/layout.tsx` — 루트 레이아웃 완성 (Header+Footer 조합) | ✅ 완료 | |

---

### 4. 메인페이지 (`/`)

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 4.1 | `HeroSection.tsx` — 메인 비주얼·슬로건·CTA 버튼 | ✅ 완료 | |
| 4.2 | `CompanyIntroSection.tsx` — 회사 한줄 소개·핵심 수치 | ✅ 완료 | |
| 4.3 | `ServicesSection.tsx` — 사업 요약 카드 4개 | ✅ 완료 | |
| 4.4 | `CTASection.tsx` — 문의 유도 배너 | ✅ 완료 | |
| 4.5 | `app/page.tsx` — 섹션 조합·메타데이터 | ✅ 완료 | `npm run build` 통과 |

---

### 5. 회사소개 페이지 (`/about`)

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 5.1 | 페이지 Hero — 타이틀·소개 문구 | ✅ 완료 | `AboutHeroSection.tsx` |
| 5.2 | 비전·미션·핵심 가치 섹션 | ✅ 완료 | `VisionMissionSection.tsx` (id="values") |
| 5.3 | 회사 연혁 타임라인 | ✅ 완료 | `HistorySection.tsx` (id="history") — 임시 연혁, 자료 수령 후 내용 업데이트 필요 |
| 5.4 | 팀·조직 소개 그리드 | ✅ 완료 | `TeamSection.tsx` — 부서 단위 임시 구성, 자료 수령 후 내용 업데이트 필요 |
| 5.5 | `app/about/page.tsx` — 조합·메타데이터 | ✅ 완료 | 4개 섹션 조합, Metadata API 적용, 빌드 통과 |

---

### 6. 사업소개 페이지 (`/services`)

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 6.1 | 페이지 Hero — 타이틀·소개 문구 | ✅ 완료 | `ServicesHeroSection.tsx` |
| 6.2 | 서비스 목록 카드 그리드 | ✅ 완료 | `ServicesOverviewSection.tsx` — 인페이지 앵커(`#consulting` 등) 연결 |
| 6.3 | 서비스 상세 설명 섹션 | ✅ 완료 | `ServicesDetailSection.tsx` — 4종, Footer 앵커(`#consulting`·`#ai`·`#development`·`#cloud`)와 일치 |
| 6.4 | 도입 프로세스 스텝 섹션 | ✅ 완료 | `ServiceProcessSection.tsx` — 5단계 |
| 6.5 | `app/services/page.tsx` — 조합·메타데이터 | ✅ 완료 | 4개 섹션 조합, Metadata API 적용, 빌드 통과 |

---

### 7. 포트폴리오 페이지 (`/portfolio`)

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 7.1 | 페이지 Placeholder (Hero + 준비중 안내) | ✅ 완료 | `PortfolioComingSoonSection.tsx` |
| 7.2 | 프로젝트 사례 콘텐츠·그리드 UI | 🔲 대기 | 자료 수령 및 상세 기획 확정 후 |
| 7.3 | `app/portfolio/page.tsx` — 조합·메타데이터 | ✅ 완료 | Placeholder 버전, 빌드 통과 |

---

### 8. 문의하기 페이지 (`/contact`)

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 8.1 | `ContactForm.tsx` — 문의 폼 UI (Client Component) | ✅ 완료 | 이름·연락처·이메일·내용 4개 필드 |
| 8.2 | `app/api/contact/route.ts` — 이메일 발송 API | 🔲 대기 | **승인 후 진행** — 폼은 `/api/contact` 호출 구조로 미리 연결, 라우트 부재 시 오류 상태 UI로 정상 처리됨 |
| 8.3 | 회사 위치·연락처 정보 섹션 | ✅ 완료 | `ContactSection.tsx` 내 "오시는 길 및 연락처" 카드 — 주소는 임시, 자료 수령 후 업데이트 필요 |
| 8.4 | 폼 유효성 검사 및 제출 피드백 UI | ✅ 완료 | 필수값·이메일·연락처 형식 검증, idle/submitting/success/error 상태 UI |
| 8.5 | `app/contact/page.tsx` — 조합·메타데이터 | ✅ 완료 | Metadata API 적용, 빌드 통과. Footer `#form` 앵커 연결 |

---

### 9. SEO

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 9.1 | 페이지별 메타 title·description 설정 | ✅ 완료 | 전 페이지(`/`·`/about`·`/services`·`/portfolio`·`/contact`) title·description·canonical 적용, `lib/site-config.ts`로 공통값 관리 |
| 9.2 | OG 태그 (Open Graph) 설정 | ✅ 완료 | `app/opengraph-image.tsx`(`next/og` 동적 생성) + 전 페이지 openGraph(siteName·locale·image·url), Twitter Card 포함 |
| 9.3 | `sitemap.xml` 자동 생성 (`app/sitemap.ts`) | ✅ 완료 | 확정 5페이지 등록, `/sitemap.xml` 정상 응답 확인 |
| 9.4 | `robots.txt` 설정 (`app/robots.ts`) | ✅ 완료 | `/login`·`/signup`·`/admin` 크롤링 차단, sitemap 경로 명시 |
| 9.5 | Schema.org 구조화 데이터 (Organization) | ✅ 완료 | 루트 레이아웃에 JSON-LD 삽입 — 주소·로고·sameAs는 실제 자료 수령 후 추가 필요 |

---

### 10. 테스트

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 10.1 | `npm run build` 빌드 오류 없음 확인 | ✅ 완료 | 메인페이지 빌드 통과 |
| 10.2 | 모바일 (390px) 반응형 확인 | 🔲 대기 | 전 페이지 완료 후 |
| 10.3 | 태블릿 (768px) 반응형 확인 | 🔲 대기 | |
| 10.4 | 데스크탑 (1440px) 레이아웃 확인 | 🔲 대기 | |
| 10.5 | 키보드 네비게이션·aria 접근성 확인 | 🔲 대기 | |
| 10.6 | Lighthouse 성능 점수 확인 (목표 90+) | 🔲 대기 | |
| 10.7 | 문의 폼 실제 발송 E2E 확인 | 🔲 대기 | |

---

### 11. 배포

| # | 작업 항목 | 상태 | 비고 |
|---|-----------|------|------|
| 11.1 | `next.config.ts` 프로덕션 설정 최종 확인 | 🔲 대기 | |
| 11.2 | Vercel 프로젝트 연결 및 환경 변수 설정 | 🔲 대기 | **승인 후 진행** |
| 11.3 | 커스텀 도메인 연결 및 SSL 확인 | 🔲 대기 | 도메인 확정 후 |
| 11.4 | Google Analytics 연동 | 🔲 대기 | |
| 11.5 | Google Search Console 등록·사이트맵 제출 | 🔲 대기 | |

---

## 진행률 요약

| 단계 | 항목 수 | 완료 수 | 진행률 |
|------|---------|---------|--------|
| 1. 프로젝트 준비 | 5 | 3 | 60% |
| 2. 디자인 시스템 | 6 | 5 | 83% |
| 3. 공통 컴포넌트 | 4 | 4 | **100%** |
| 4. 메인페이지 | 5 | 5 | **100%** |
| 5. 회사소개 | 5 | 5 | **100%** |
| 6. 사업소개 | 5 | 5 | **100%** |
| 7. 포트폴리오 | 3 | 2 | 67% |
| 8. 문의하기 | 5 | 4 | 80% |
| 9. SEO | 5 | 5 | **100%** |
| 10. 테스트 | 7 | 1 | 14% |
| 11. 배포 | 5 | 0 | 0% |
| **합계** | **55** | **39** | **71%** |

---

## 변경 이력

| 날짜 | 변경 내용 | 작업자 |
|------|-----------|--------|
| 2026-06-30 | WBS.md 최초 생성, 1.1·1.2 완료 처리 | Claude Code |
| 2026-06-30 | REQUEST.md 확정 반영. 페이지 4개 확정, 1.3 완료 처리 | Claude Code |
| 2026-06-30 | 메인페이지 구현 완료. 2·3·4단계 완료, 9.1 빌드 통과 | Claude Code |
| 2026-07-01 | 회사소개(`/about`) 페이지 구현 완료. 5단계 완료, 빌드 통과 | Claude Code |
| 2026-07-01 | 헤더 메인 메뉴에 포트폴리오 추가, `/portfolio` Placeholder 페이지 신규 구현. WBS 7단계(포트폴리오) 신설, REQUEST.md 확정 페이지에 포트폴리오 반영 | Claude Code |
| 2026-07-01 | 사업소개(`/services`) 페이지 구현 완료. 6단계 완료, 빌드 통과 | Claude Code |
| 2026-07-01 | 문의하기(`/contact`) 페이지 UI 구현 완료(8.1·8.3·8.4·8.5). 이메일 발송 API(8.2)는 사용자 지시로 미구현, 승인 대기 | Claude Code |
| 2026-07-01 | SEO 구현 완료(9.1~9.5). 메타데이터·OG 이미지·sitemap.xml·robots.txt·Organization 구조화 데이터 적용, 9단계 완료 | Claude Code |
| 2026-07-05 | `apps/cnbiz-web`(v2 모노레포) 진행 현황 섹션 신설. sitemap.xml·robots.txt 구현 및 `cnbiz.kr` 프로덕션 배포 반영. 기존 1~11단계(v1, `app/`)는 레거시로 표시하고 2026-07-01 기준으로 동결 | Claude Code |
| 2026-07-05 | Google Analytics 4 연동 완료 반영 (`@next/third-parties`, Vercel 환경 변수 설정 후 프로덕션 확인) | Claude Code |
| 2026-07-05 | AI Business OS 문서 체계 구축 착수. `REQUEST.md` → `docs/01_PMO/` 재분류, `docs/00_COMPANY/`에 `ORGANIZATION.md`·`COMPANY_POLICY.md`·`DOCUMENT_INDEX.md` 신설, `docs/05_AI/`에 `AGENTS.md`·`TOKEN_POLICY.md`·`WORKFLOW.md`·`PROMPTS.md` 신설 | Claude Code |

---

*이 파일은 매 작업 완료 후 반드시 업데이트한다.*
