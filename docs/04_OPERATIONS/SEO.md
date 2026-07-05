# SEO

> AI Business OS - Search Engine Optimization Standard

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | SEO.md |
| Department | 04_OPERATIONS |
| Version | 1.0 |
| Status | Active |
| Owner | Operations Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 검색 엔진 최적화(SEO)의 표준을 정의한다.

목표

- 검색 노출 향상
- 유기적 트래픽 증가
- 빠른 페이지 인덱싱
- 사용자 경험 향상
- 유지보수가 쉬운 SEO 구조 구축

---

# 적용 범위 (Scope)

본 문서는 다음 대상에 적용한다.

- Web Application
- Landing Page
- Blog
- Documentation
- Marketing Page

---

# SEO 핵심 원칙

## 1. Content First

검색 엔진보다 사용자를 위한 콘텐츠를 작성한다.

---

## 2. Semantic HTML

Semantic HTML을 기본으로 사용한다.

예시

- header
- nav
- main
- section
- article
- footer

---

## 3. Performance First

빠른 페이지 로딩은 SEO의 핵심 요소이다.

---

## 4. Mobile First

모든 페이지는 모바일을 우선으로 설계한다.

---

# Metadata

모든 페이지는 다음 정보를 포함한다.

- Title
- Description
- Canonical URL
- Open Graph
- Twitter Card

---

# URL 규칙

좋은 예

```text
/products
/products/ai-business-os
/blog/seo-guide
```

나쁜 예

```text
/page?id=123
```

규칙

- 소문자 사용
- 하이픈(-) 사용
- 짧고 명확한 URL

---

# Heading 구조

페이지는 다음 순서를 따른다.

```text
H1
 ├── H2
 │    ├── H3
 │    └── H3
 └── H2
```

H1은 페이지당 하나만 사용한다.

---

# 이미지 최적화

모든 이미지는

- alt 속성
- 적절한 파일명
- WebP 권장
- Lazy Loading

을 적용한다.

---

# 내부 링크

규칙

- 관련 문서 연결
- 끊어진 링크 금지
- Breadcrumb 제공

---

# Sitemap

다음을 유지한다.

- sitemap.xml
- robots.txt

검색 엔진이 접근 가능해야 한다.

---

# Core Web Vitals

목표

- LCP ≤ 2.5s
- INP ≤ 200ms
- CLS ≤ 0.1

---

# 콘텐츠 작성

원칙

- 명확한 제목
- 적절한 소제목
- 짧은 문단
- 리스트 활용
- 중복 콘텐츠 금지

---

# 기술 SEO

확인 항목

- HTTPS
- Canonical
- Structured Data
- Robots
- Sitemap
- Redirect

---

# 접근성

SEO와 함께 다음을 준수한다.

- Alt Text
- Label
- Semantic HTML
- Keyboard Navigation

---

# 금지 사항

다음을 금지한다.

- Keyword Stuffing
- 중복 콘텐츠
- 숨겨진 텍스트
- 깨진 링크
- 의미 없는 제목

---

# 체크리스트

페이지 생성 전

- [ ] Title 작성
- [ ] Description 작성
- [ ] URL 확인

배포 전

- [ ] Sitemap 확인
- [ ] Robots 확인
- [ ] Open Graph 확인
- [ ] Core Web Vitals 확인

운영 중

- [ ] 검색 노출 확인
- [ ] 깨진 링크 확인
- [ ] 메타데이터 최신화

---

# 관련 문서

- ANALYTICS.md
- DEPLOYMENT.md
- UI_GUIDE.md
- UX_GUIDE.md
- COMPANY_POLICY.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |