# TECH_STACK

> AI Business OS - Standard Technology Stack

---

# 문서 정보

| 항목 | 내용 |
|------|------|
| Document | TECH_STACK.md |
| Department | 02_DEVELOPMENT |
| Version | 1.0 |
| Status | Active |
| Owner | Development Team |
| Approver | CEO |

---

# 목적 (Purpose)

본 문서는 AI Business OS에서 사용하는 표준 기술 스택을 정의한다.

모든 프로젝트는 특별한 사유가 없는 한 본 문서를 기준으로 기술을 선택한다.

---

# 기술 선정 원칙

- 안정성이 검증된 기술을 사용한다.
- 장기 유지보수가 가능한 기술을 선택한다.
- 커뮤니티와 생태계가 활성화된 기술을 우선한다.
- 새로운 기술은 검토와 승인 후 도입한다.

---

# Frontend

| 영역 | 기술 |
|------|------|
| Framework | Next.js |
| Language | TypeScript |
| UI | React |
| Styling | Tailwind CSS |
| Component | shadcn/ui |
| Icons | Lucide React |

---

# Backend

| 영역 | 기술 |
|------|------|
| Runtime | Node.js |
| Framework | Next.js API Route / Route Handler |
| Validation | Zod |

---

# Database

| 영역 | 기술 |
|------|------|
| Database | Supabase PostgreSQL |
| ORM | Prisma (필요 시) |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |

---

# AI

| 영역 | 기술 |
|------|------|
| AI Platform | OpenAI |
| AI Assistant | ChatGPT |
| AI Coding | Claude Code |
| Prompt Management | Markdown SOP |

---

# Development Tools

| 영역 | 기술 |
|------|------|
| IDE | Visual Studio Code |
| Version Control | Git |
| Repository | GitHub |
| Package Manager | pnpm |

---

# Deployment

| 영역 | 기술 |
|------|------|
| Hosting | Vercel |
| Database Hosting | Supabase |
| Domain | 프로젝트별 지정 |

---

# Code Quality

모든 프로젝트는 다음을 준수한다.

- TypeScript 사용
- ESLint 적용
- Prettier 적용
- 불필요한 any 사용 금지
- Console 로그는 운영 배포 전 제거

---

# Git Strategy

- main : 운영
- develop : 개발
- feature/* : 기능 개발
- hotfix/* : 긴급 수정

---

# 패키지 관리 원칙

- 필요한 패키지만 설치한다.
- 동일한 기능의 패키지는 하나만 사용한다.
- 장기간 유지보수되는 패키지를 우선 선택한다.
- 설치 전 CEO 승인 여부를 확인한다.

---

# 기술 변경 정책

다음 변경은 승인 후 진행한다.

- Framework 변경
- Database 변경
- 인증 방식 변경
- Hosting 변경
- Package Manager 변경

---

# 체크리스트

프로젝트 시작 전

- [ ] TECH_STACK 확인
- [ ] ARCHITECTURE 확인
- [ ] CNBIZ_RULES 확인

패키지 설치 전

- [ ] 기존 패키지로 해결 가능한지 확인
- [ ] 유지보수 상태 확인
- [ ] 라이선스 확인

---

# 관련 문서

- CNBIZ_RULES.md
- ARCHITECTURE.md
- AI_COMPONENT_GUIDE.md
- AI_RULES.md
- COMPANY_POLICY.md

---

# 변경 이력

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | 2026-07-05 | Initial Release |