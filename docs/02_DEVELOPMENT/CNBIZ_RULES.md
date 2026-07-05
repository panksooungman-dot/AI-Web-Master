# CNBIZ 프로젝트 개발 규칙

CNBIZ 회사 홈페이지 프로젝트의 개발 표준 문서입니다.  
모든 기여자는 이 규칙을 숙지하고 준수해야 합니다.

---

## 목차

1. [개발 원칙](#1-개발-원칙)
2. [폴더 구조](#2-폴더-구조)
3. [컴포넌트 규칙](#3-컴포넌트-규칙)
4. [UI/UX 원칙](#4-uiux-원칙)
5. [Git 규칙](#5-git-규칙)

---

## 1. 개발 원칙

### 1.1 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.x |
| UI 라이브러리 | React | 19.x |
| 언어 | TypeScript | 5.x |
| 스타일링 | Tailwind CSS | 4.x |
| 데이터베이스 | Supabase | 2.x |
| 패키지 매니저 | npm | - |

### 1.2 핵심 원칙

**Server Component 우선**
- 모든 컴포넌트는 기본적으로 Server Component로 작성한다.
- `useState`, `useEffect`, 브라우저 API, 이벤트 핸들러가 필요한 경우에만 `"use client"`를 선언한다.
- Client Component는 가능한 한 트리의 말단(leaf)에 위치시켜 번들 크기를 최소화한다.

**타입 안전성**
- `any` 타입 사용을 금지한다. 불가피한 경우 `unknown`을 사용하고 타입 가드를 작성한다.
- 외부 데이터(API 응답, 폼 입력)는 반드시 타입을 명시한다.
- `interface`는 객체 형태, `type`은 유니온·교차·유틸리티 타입에 사용한다.

**코드 품질**
- 함수·변수 이름은 역할이 명확히 드러나도록 작성한다. 주석은 WHY가 불명확한 경우에만 작성한다.
- 중복 코드가 3회 이상 반복되면 컴포넌트 또는 유틸 함수로 추출한다.
- 파일 하나에 하나의 책임(Single Responsibility)을 부여한다.

**Next.js 16 준수**
- 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 참조한다.
- `params`, `searchParams`는 Next.js 16 기준 `Promise<...>` 타입으로 처리한다.
- `PageProps`, `LayoutProps` 헬퍼 타입을 활용한다.

---

## 2. 폴더 구조

```
ai-web-master/
│
├── app/                        # Next.js App Router — 라우팅 진입점
│   ├── layout.tsx              # 루트 레이아웃 (HTML, 메타데이터, Header/Footer)
│   ├── page.tsx                # 홈 페이지 (섹션 컴포넌트 조합)
│   ├── globals.css             # 전역 스타일, Tailwind 임포트, CSS 변수
│   ├── about/
│   │   └── page.tsx
│   ├── services/
│   │   └── page.tsx
│   ├── portfolio/
│   │   └── page.tsx
│   ├── careers/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   └── api/                    # Route Handlers (서버사이드 API)
│       └── contact/
│           └── route.ts
│
├── components/                 # 재사용 가능한 UI 컴포넌트
│   ├── layout/                 # 전체 페이지에 공유되는 레이아웃 컴포넌트
│   │   ├── Header.tsx          # Server Component
│   │   ├── MobileMenu.tsx      # Client Component ("use client")
│   │   └── Footer.tsx          # Server Component
│   ├── sections/               # 페이지를 구성하는 섹션 단위 컴포넌트
│   │   ├── HeroSection.tsx
│   │   ├── CompanyIntroSection.tsx
│   │   ├── ServicesSection.tsx
│   │   ├── PortfolioSection.tsx
│   │   └── CTASection.tsx
│   └── ui/                     # 범용 원자 컴포넌트 (버튼, 인풋, 카드 등)
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
│
├── lib/                        # 유틸리티, 클라이언트 초기화
│   └── supabase.ts
│
├── types/                      # 전역 TypeScript 타입 정의
│   └── index.ts
│
└── public/                     # 정적 파일 (이미지, 폰트, favicon)
    ├── images/
    └── favicon.ico
```

### 2.1 폴더별 책임

| 폴더 | 책임 | 금지 사항 |
|------|------|-----------|
| `app/` | 라우팅, 메타데이터, 페이지 조합 | 비즈니스 로직 직접 작성 |
| `components/layout/` | 전역 공유 레이아웃 | 페이지 고유 로직 포함 |
| `components/sections/` | 페이지 섹션 단위 UI | 다른 섹션에 직접 의존 |
| `components/ui/` | 재사용 원자 컴포넌트 | 페이지 특화 스타일 하드코딩 |
| `lib/` | 외부 서비스 클라이언트, 공통 유틸 | UI 렌더링 코드 포함 |
| `types/` | TypeScript 타입·인터페이스 | 런타임 로직 포함 |

---

## 3. 컴포넌트 규칙

### 3.1 Server vs Client Component 판단 기준

```
인터랙션(onClick, onChange 등)이 필요한가?
    ├── YES → "use client" 선언
    └── NO
         └── useState / useEffect가 필요한가?
                 ├── YES → "use client" 선언
                 └── NO → Server Component (기본값)
```

### 3.2 파일 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase | `HeroSection.tsx` |
| 유틸 함수 파일 | camelCase | `formatDate.ts` |
| Next.js 특수 파일 | 소문자 | `page.tsx`, `layout.tsx`, `route.ts` |
| 타입 파일 | camelCase | `index.ts` |

### 3.3 컴포넌트 작성 규칙

```tsx
// ✅ 올바른 예 — Server Component (기본)
import Link from "next/link";

interface ServiceCardProps {
  title: string;
  description: string;
  href: string;
}

export default function ServiceCard({ title, description, href }: ServiceCardProps) {
  return (
    <Link href={href} className="...">
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}
```

```tsx
// ✅ 올바른 예 — Client Component (인터랙션 필요 시)
"use client";

import { useState } from "react";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  // ...
}
```

```tsx
// ❌ 금지 — 불필요한 Client Component
"use client";              // 인터랙션 없는데 "use client" 선언
export default function StaticBanner() {
  return <div>배너</div>;  // 정적 컨텐츠인데 클라이언트 번들에 포함됨
}
```

### 3.4 Props 규칙

- Props 타입은 `interface`로 정의하고 컴포넌트 바로 위에 선언한다.
- 선택적 Props는 `?`를 사용하고 기본값을 지정한다.
- 콜백 Props 이름은 `on` 접두사를 사용한다: `onClick`, `onSubmit`, `onChange`.
- Client Component에 전달하는 Props는 직렬화 가능해야 한다(함수, 클래스 인스턴스, DOM 노드 불가).

### 3.5 SVG 아이콘

- 외부 아이콘 라이브러리 대신 인라인 SVG를 사용한다 (번들 크기 최소화).
- 장식용 아이콘에는 `aria-hidden` 속성을 반드시 추가한다.
- 의미 있는 아이콘에는 `aria-label`을 제공한다.

```tsx
// ✅ 장식용 아이콘
<svg className="h-5 w-5" aria-hidden fill="none" viewBox="0 0 24 24" ...>

// ✅ 의미 있는 아이콘 버튼
<button aria-label="메뉴 열기">
  <svg className="h-6 w-6" aria-hidden ...>
```

---

## 4. UI/UX 원칙

### 4.1 컬러 팔레트

프로젝트 전반에 걸쳐 아래 색상만 사용한다.

| 역할 | Tailwind 클래스 | 용도 |
|------|----------------|------|
| **Primary** | `slate-900` | 헤더 배경, 주요 텍스트, 다크 섹션 배경 |
| **Accent** | `blue-600` | CTA 버튼, 링크, 강조 텍스트, 아이콘 배경 |
| **Accent Light** | `blue-400` | 다크 배경 위 강조 텍스트 |
| **Background** | `white` | 기본 섹션 배경 |
| **Background Alt** | `slate-50` | 교차 섹션 배경 |
| **Body Text** | `slate-600` | 본문 텍스트 |
| **Heading Text** | `slate-900` | 섹션 제목 |
| **Border** | `slate-100`, `slate-200` | 카드, 구분선 |
| **Success** | `emerald-400` / `emerald-600` | 성공, 체크 표시 |

### 4.2 타이포그래피

```
H1 (Hero): text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight
H2 (섹션 제목): text-3xl sm:text-4xl font-bold leading-tight
H3 (카드 제목): text-lg font-bold
Body (본문): text-base leading-relaxed text-slate-600
Small (보조): text-sm text-slate-600
Label (섹션 레이블): text-sm font-semibold tracking-widest uppercase text-blue-600
```

### 4.3 반응형 브레이크포인트

Tailwind 기본 브레이크포인트를 그대로 사용한다.

| 이름 | 최소 너비 | 적용 대상 |
|------|-----------|-----------|
| (기본) | 0px | 모바일 — 1열 레이아웃, 세로 스택 |
| `sm` | 640px | 태블릿 — 2열 그리드, 버튼 가로 배열 |
| `lg` | 1024px | 데스크탑 — 데스크탑 네비, 4열 그리드 |
| `xl` | 1280px | 와이드 — 콘텐츠 최대 너비 확장 |

**모바일 우선(Mobile-First) 원칙**: 기본 스타일을 모바일 기준으로 작성하고, `sm:`, `lg:` 순서로 점진적으로 확장한다.

### 4.4 레이아웃

- 콘텐츠 최대 너비: `max-w-7xl mx-auto`
- 섹션 좌우 패딩: `px-4 sm:px-6 lg:px-8`
- 섹션 상하 패딩: `py-24`
- 섹션은 `white` ↔ `slate-50` ↔ `slate-900` 배경을 교차하여 시각적 구분을 만든다.

### 4.5 인터랙션 & 애니메이션

- 색상 전환: `transition-colors` (200ms)
- 간격 전환: `transition-all duration-200`
- 그림자 전환: `transition-shadow duration-200`
- 커스텀 애니메이션 라이브러리(Framer Motion 등)는 Phase 2 이후 도입을 검토한다.
- 사용자가 `prefers-reduced-motion`을 설정한 경우 애니메이션을 최소화한다.

### 4.6 접근성 (a11y)

- 모든 이미지에 `alt` 속성을 작성한다. 장식 이미지는 `alt=""`.
- 인터랙티브 요소(버튼, 링크)는 키보드로 접근 가능해야 한다.
- 색상만으로 정보를 전달하지 않는다.
- 폼 입력 필드에는 `<label>`과 `htmlFor`를 반드시 연결한다.
- 토글·드로어 등 상태가 있는 컴포넌트에 `aria-expanded`, `aria-label`을 적용한다.
- 섹션 제목은 h1 → h2 → h3 순서를 지킨다. 레벨을 건너뛰지 않는다.

### 4.7 Next.js Image 컴포넌트

- 모든 이미지는 `<img>` 대신 `next/image`의 `<Image>`를 사용한다.
- 외부 이미지 도메인은 `next.config.ts`의 `images.remotePatterns`에 등록한다.
- `width`, `height` 또는 `fill` 속성을 반드시 지정한다.

```tsx
// ✅ 올바른 예
import Image from "next/image";
<Image src="/images/hero.jpg" alt="CNBIZ 사옥" width={800} height={600} />

// ❌ 금지
<img src="/images/hero.jpg" alt="..." />
```

---

## 5. Git 규칙

### 5.1 브랜치 전략

```
main            ← 프로덕션 배포 브랜치 (직접 push 금지)
├── develop     ← 개발 통합 브랜치
│   ├── feat/hero-section         ← 기능 개발
│   ├── fix/mobile-menu-close     ← 버그 수정
│   ├── style/footer-spacing      ← 스타일 조정
│   └── docs/update-cnbiz-rules   ← 문서 수정
```

| 브랜치 접두사 | 용도 |
|--------------|------|
| `feat/` | 새로운 기능, 페이지, 컴포넌트 추가 |
| `fix/` | 버그 수정 |
| `style/` | 스타일·레이아웃 조정 (기능 변경 없음) |
| `refactor/` | 리팩터링 (기능·스타일 변경 없음) |
| `docs/` | 문서 추가·수정 |
| `chore/` | 패키지 업데이트, 설정 변경 |

### 5.2 커밋 메시지 규칙

**형식**
```
<타입>(<범위>): <제목>

<본문 — 선택>
```

**타입**

| 타입 | 설명 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `style` | 스타일 변경 (코드 동작에 영향 없음) |
| `refactor` | 리팩터링 |
| `docs` | 문서 작성·수정 |
| `chore` | 빌드·설정·패키지 관련 |
| `perf` | 성능 개선 |

**예시**
```
feat(sections): Hero 섹션 통계 카드 추가

설립연도, 직원 수, 프로젝트 수, 고객사 수를 표시하는
통계 그리드를 Hero 하단에 추가함.
```

```
fix(header): 모바일 메뉴 외부 클릭 시 닫히지 않는 문제 수정
```

```
style(footer): 모바일 하단 패딩 조정 (pb-6 → pb-8)
```

### 5.3 Pull Request 규칙

- PR 제목은 커밋 메시지와 동일한 형식을 따른다.
- PR 설명에 **변경 내용**, **스크린샷 또는 테스트 결과**, **체크리스트**를 포함한다.
- `main` 브랜치로의 직접 push는 금지한다. 반드시 PR을 통해 머지한다.
- 머지 전 `npm run build`가 성공해야 한다.

**PR 체크리스트**
```
- [ ] npm run build 통과
- [ ] 모바일(390px) 반응형 확인
- [ ] 데스크탑(1440px) 레이아웃 확인
- [ ] 접근성 (키보드 네비게이션, aria 속성) 확인
- [ ] 새로운 이미지에 next/image 사용
- [ ] 불필요한 console.log 제거
```

### 5.4 금지 사항

- `--force` push (main, develop 브랜치)
- `--no-verify` 로 훅 우회
- 바이너리 파일(이미지 원본 등) 직접 커밋 — `public/images/`에 최적화된 이미지만 포함
- `.env.local` 파일 커밋 — 환경 변수는 `.env.example`만 커밋

---

## 부록 — 환경 변수

`.env.local` 파일을 프로젝트 루트에 생성하고 아래 변수를 설정한다.  
이 파일은 절대 Git에 커밋하지 않는다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`.env.example` 파일을 참고하여 필요한 변수를 설정한다.

---

*최종 수정: 2024년 | 관리: CNBIZ 개발팀*
