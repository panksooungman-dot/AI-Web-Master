# CHANGELOG

프로젝트 변경 이력을 기록합니다.

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
