# AI Business OS - PROJECT STATUS

> 최종 분석: 2026-08-09 (Claude Code, apps/**·packages/** 변경 자동 반영 — 커밋 `d3fb4f2` 기준)
> 커밋 `edba62a` 기준)
> 이 문서는 추측이 아닌 실제 파일/코드 확인 결과만 반영합니다.

## 프로젝트 개요
AI 기반 홈페이지 제작 및 운영 플랫폼. `apps/cnbiz-web`(CNBIZ.KR 브랜드 홈페이지 + Development OS 대시보드)과 Customer Inquiry Pipeline(Inquiry→Client→WebsiteOrder→AiJob→GitHub→Vercel, AI Analysis Engine 포함)으로 구성됩니다. **2026-07-24 Rewiring**: 실제 의뢰 접수는 이제 cnbiz.kr 자체 문의 폼(`/contact`)과 `/developer/inquiries/new` 관리자 등록 폼 모두 내부 `POST /api/inquiries`(API Key 불필요, `createInquiry()` 등 기존 함수 재사용)로 들어옵니다 — cnbiz.ai.kr 챗봇 연동(`POST /api/external/inquiries`)은 실사용 증거가 확인되지 않아(`CHATBOT_API_KEY`가 Production에 한 번도 설정된 적 없음) `@deprecated`로 남기고 대체했습니다(`REWIRING_REPORT.md` 참고). 접수된 Inquiry의 AiJob은 관리자가 `/developer/inquiries/[id]`에서 승인해야 AI Generate가 실행되며, 생성 성공 직후 **Project Workspace가 자동 등록**되고(`triggerWorkspaceProvisioning()`, "고객 프로젝트"는 `ProjectRecord.websiteOrderId` 존재 여부로 식별 — 별도 Domain 없음), 이어서 **Phase 3**(`lib/deployment/pipeline.ts`)가 고객별 독립 GitHub Repository + Vercel Project를 자동 생성·배포합니다. **2026-08-03: `GITHUB_TOKEN`/`VERCEL_TOKEN`을 실제로 설정하고 의뢰 접수→관리자 승인→AiJob→AI 생성→Project Workspace→GitHub Repo→Commit/Push→Vercel Project→Production Deploy→Production URL까지 11단계 전 구간을 실 계정으로 검증해 전부 PASS했습니다(`FINAL_E2E_REPORT_v5.md`) — Customer Inquiry Pipeline Version 1을 공식 완료 상태로 기록합니다.** 루트 `app/`·`components/`(CNBIZ v1)는 레거시로 동결되어 있습니다.

---

## ✅ 해소됨 — CNBIZ.AI.KR 책임 임시 대행 (2026-07-24 Rewiring으로 대체)

> 아래는 2026-07-21~22에 유효했던 서술이며, 이력 확인용으로 남겨둔다. **현재는 더 이상 사실이
> 아니다** — 새 상태는 이 섹션 하단 참고.

~~목표 아키텍처: `CNBIZ.KR`(브랜드 사이트) → `CNBIZ.AI.KR`(문의폼·설문·파일업로드·고객 로그인·Inquiry/설문/첨부파일 저장·이메일/SMS/Push·관리자 알림) → `AI Business OS`(AI Analysis·Client/Project/AiJob 생성·Admin·Website Builder).~~

**2026-07-24 재검토 결과**: 이 목표 아키텍처가 전제한 "CNBIZ.AI.KR이 실제로 `POST /api/external/inquiries`를 호출하는 챗봇 연동"은 **실사용 증거가 전혀 확인되지 않았다**(`REWIRING_REPORT.md` 조사 근거):
- 이 라우트가 요구하는 `CHATBOT_API_KEY`가 Vercel Production 환경변수에 **한 번도 설정된 적이 없음**(도입 커밋 `0759bd5`, 2026-07-19부터 지금까지) — 설정 없이는 프로덕션에서 무조건 401을 반환하므로, 실제 호출이 있었다면 전부 실패했을 수밖에 없음
- `createInquiry()`를 호출하는 코드 경로가 저장소 전체에서 이 라우트 하나뿐이었음(다른 진입점 없음)
- `docs/EXTERNAL_API.md`/`CURRENT_SYSTEM_ARCHITECTURE.md`가 전제한 "cnbiz.ai.kr 실제 운영 중" 조차 코드로 검증된 적이 없고 사용자의 구두 확인에만 의존했음

**현재 상태**: 실제 운영 구조를 "고객 → cnbiz.kr → AI Business OS"(cnbiz.ai.kr 경유 없음)로 재정의하고 내부 재배선을 완료했다.
- 신규 `POST /api/inquiries`(`app/api/inquiries/route.ts`)가 `createInquiry()` 등 기존 함수를 그대로 재사용하는 내부 진입점 — API Key 불필요, cnbiz.kr의 `/contact` 폼과 `/developer/inquiries/new` 관리자 폼 양쪽이 호출
- `POST /api/external/inquiries`·`lib/auth/apiKey.ts`·`CHATBOT_API_KEY`는 삭제하지 않고 `@deprecated`만 표시(실제 호출자가 있을 가능성에 대비한 하위 호환 유지, 확인되면 별도 커밋으로 제거 예정)
- 관리자 알림(`notifyAdminOfNewInquiry()`)은 이제 새 내부 라우트가 직접 호출 — "CNBIZ.AI.KR 책임 임시 대행"이 아니라 이 시스템 자체의 정식 책임으로 재정의됨
- AI Analysis·Client·WebsiteOrder(Project)·AiJob·Admin·Website Builder 로직 자체는 무변경

---

## 🆕 Phase 3 — 고객별 독립 GitHub Repository + Vercel Project 자동 배포 (2026-07-24, 2026-08-03 실 계정 PASS 확정)

AI Generate(Website Builder) 성공 직후, `lib/deployment/pipeline.ts`가 `lib/github/*`·`lib/git/*`·`lib/vercel/*`(전부 REST API + `fetch`, 새 npm 의존성 없음)를 조합해 GitHub Repository 생성 → Commit → Push → Vercel Project 생성 → GitHub 연결 → Production Deploy → 결과를 `WebsiteRecord`에 저장까지 자동 수행한다. 실패 시 이미 생성된 외부 리소스를 역순 롤백하고, 전 단계를 `lib/audit/log.ts`(Audit Log)에 기록한다.

**✅ 2026-08-03: `GITHUB_TOKEN`/`VERCEL_TOKEN`을 이 환경에 실제로 설정하고 End-to-End를 실행 — GitHub Repository 생성·Commit/Push·Vercel Project 생성·Production Deploy(`readyState:"READY"`, `readySubstate:"PROMOTED"`, `target:"production"`)·Production URL 응답(HTTP 200)까지 GitHub/Vercel 양쪽 API로 직접 재확인해 전부 PASS했다(`FINAL_E2E_REPORT_v5.md`).** `GITHUB_TOKEN`/`VERCEL_TOKEN`이 미설정인 환경에서는 여전히 가짜 URL을 만들지 않고 `NotConfigured`로 명시적으로 스킵하는 기존 동작을 그대로 유지한다.

---

## 전체 진행률

**약 96%**

| 영역 | 진행률 | 근거 |
|---|---|---|
| CNBIZ.KR 브랜드 홈페이지 | 92% | Home/About/Services/Portfolio + **`/contact` 복원**(내부 `POST /api/inquiries` 제출). `/request`만 여전히 cnbiz.ai.kr로 308 redirect(별도 결정 대기). Portfolio 실콘텐츠·회사 연락처 정보만 TODO |
| Development OS 대시보드 | 97% | `/developer/**` 48개 페이지 실동작(기술 견적서·기능 명세서·프로젝트 타임라인·계약서·제안서 관리 포함). AI 의뢰 관리 "새 문의 등록"이 실제 `POST /api/inquiries` 호출로 연결됨 |
| AI 홈페이지 생성기(Website Builder v2) | 88% | CLI+대시보드 완결. **Design Automation(승인된 Review) → Website Build → Deployment 파이프라인 연결 완료**(`runDeploymentPipeline()` 재사용, `POST /api/design/website` 응답에 `deployment` 필드 노출) — 실 GitHub/Vercel 계정으로 연결 자체와, 검증 중 발견된 React Generator 빌드 실패 버그(`props.sourceType` 누출) 수정까지 확인 완료 |
| **Customer Inquiry Pipeline (Version 1)** | **100% — 공식 완료(PASS)** | 의뢰 접수→관리자 승인→AiJob→AI 생성→Project Workspace 자동 등록→GitHub Repo→Commit/Push→Vercel Project→Production Deploy→Production URL까지 11단계 전 구간을 실 계정으로 E2E 검증해 전부 PASS(`FINAL_E2E_REPORT_v5.md`, 2026-08-03) |
| 인증/권한 | 85% | 세션 인증 + RBAC **5-role**(신규 `customer` role 추가) + 정확한 (method,path) 단위 예외 완비. `proxy.ts`가 `/customer/**`도 세션 보호 대상에 포함. signup 백엔드·역할관리 UI만 없음. `x-api-key`(`CHATBOT_API_KEY`) 인증은 `@deprecated` |
| **고객(의뢰자) 시스템 — Customer Portal V1** | **90%** | 고객 로그인(`customer.login` 감사 로그), 본인 주문 목록(`/customer/orders`)·대시보드(`/customer/dashboard`)·주문 상세(`/customer/orders/[id]`, 견적서·명세서·타임라인·계약서·제안서·배포 상태 열람). `lib/customerPortal/view.ts`가 로그인 이메일 기준으로만 필터링해 타인 데이터 접근을 원천 차단(존재하지 않음/타인 소유 모두 동일하게 404). 회원가입·비밀번호 변경·알림 설정 등은 아직 없음 |
| 배포 자동화(고객별 GitHub/Vercel) | 100% | 파이프라인·롤백·감사 로그·Git Scope 보호 구현·테스트 완료 + 실 계정 E2E PASS 확정(`FINAL_E2E_REPORT_v5.md`, 2026-08-03). Design Automation 경로에서도 동일 파이프라인 재사용 확인(2026-08-09) |
| 테스트 인프라 | 100% | `apps/cnbiz-web` 실 계정 E2E 검증 중 발견된 버그에 대한 신규/보강 테스트 포함해 전부 통과 |

---

## ✅ 완료된 기능

**기존 시스템**
- CNBIZ.KR 브랜드 홈페이지(Home/About/Services/Portfolio) — 문의·제작 의뢰 폼은 의도적으로 제거(아래 참고)
- Development OS 대시보드 38개 페이지(Terminal/Workspace/GitHub/AI Workspace/Website Builder/Workflow Center/Marketplace/Settings/Logs/Health/Audit Log/Metrics/Backup/Design Automation 9종/AI 의뢰 관리 등) — 각 페이지 헤더에 `HelpTip`(신규, `components/developer/HelpTip.tsx`) 기반 맥락 도움말을 추가해 화면 목적·다른 화면과의 관계를 즉시 안내
- **Phase 01·02·09 대시보드**(`/developer/analysis`, `/developer/planning`, `/developer/deployment`, 신규) — 새 분석·기획·배포 엔진을 만들지 않고 기존 문서·기존 API/lib 함수만 연결한 읽기 전용 집계 화면. Analysis는 `lib/inquiries/registry.ts`의 `listInquiries()`로 AI 분석 완성도·업종 분포를 집계하고 `PROJECT_STATUS.md`(본 문서)·`REQUEST.md`류를 fs로 직접 읽어 표시. Planning은 `lib/workflows/registry.ts`·`lib/workflows/engine.ts`의 기존 Workflow 정의·Run 이력을 집계. Deployment는 `lib/health/checks.ts`(`/api/health`와 동일 함수)로 Git 상태·Health 캐시를 보여주고 `.github/workflows/*.yml`을 정적 파싱해 CI 파이프라인 목록을 표시. 3개 페이지와 그 데이터 원본 화면(AI 의뢰 관리·Workflow Center·Health·Design·Website Builder) 사이에 상호 탐색 링크를 추가해 Design Automation이 이미 쓰던 "이전/다음 단계" 내비게이션 관례를 따름
- AI 의뢰 관리 "새 문의 등록"(`/developer/inquiries/new`) — 문의 제목/고객명/회사명/**이메일**(2026-07-24 추가)/문의 내용/첨부파일(드래그앤드롭) 입력 UI. "AI 분석 시작" 버튼이 실제로 `POST /api/inquiries`를 호출한다(2026-07-24 Rewiring, 아래 참고). 첨부파일은 등록 전에 `POST /api/attachments/upload`로 실제 스토리지(Supabase Storage, 미설정 시 로컬 fs 폴백)에 업로드되어 실제 URL로 전달되며, 이미지 확장자는 AI Analysis가 Claude vision으로, PDF/DOC/DOCX/TXT 문서는 텍스트 추출(`lib/attachments/extractText.ts`, 신규, pdf-parse/mammoth/word-extractor)을 거쳐 프롬프트 본문에 원문으로 삽입되어 실제로 판단에 반영된다(2026-08-09 추가)
- Storage(`lib/storage/{types,fsStore,supabaseStore,extension,index}.ts`) — 첨부파일 저장 백엔드. `lib/db`와 동일한 resolve 규칙(`getDefaultAttachmentStore()`): Production은 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 필수(fail-fast), 없으면 `os.tmpdir()` 기반 로컬 fs 스토리지로 폴백. `GET /api/attachment-files/[id]`(신규, ungated)는 로컬 fs 스토리지 전용 서빙 라우트 — CLI 서브프로세스가 세션 쿠키 없이 이미지를 fetch해야 해서 의도적으로 ungated 처리. `safeExtension()`(신규, `extension.ts`, fsStore/supabaseStore 공유) 도입으로 로컬 fs 스토리지 URL도 확장자를 보존해 vision/문서 파싱 분류가 정상 동작한다(2026-08-09 버그 수정). `safeSlug()`(신규, `extension.ts`)로 원본 파일명을 정규화한 슬러그를 반환 URL에 `?name=` 쿼리로 덧붙여, `lib/ai-analysis/score.ts`의 `LOGO_PATTERN`(URL에 "logo" 포함 여부로 로고 첨부를 판단)이 실제로 동작하도록 수정(2026-08-09, fsStore/supabaseStore 양쪽 적용)
- 인증(이메일/비밀번호 세션) + RBAC 4-role — `lib/auth/{types,password,users,session,auth,middleware,rbac}.ts`, `proxy.ts`
- Website Builder v2(CLI `ai website create` + 대시보드) — `packages/cli/src/website/*`, `lib/websites/registry.ts`, `/developer/websites`
- Database — `lib/db/{collectionStore,fsStore,memoryStore,supabaseStore,index}.ts`(단일 Supabase 테이블 `app_collections`)

---

## 🚧 진행 중인 기능 (일부 구현) / 알려진 사소한 결함

- Design Automation Phase 9(Website Build 연동) — 코드 존재, CHANGELOG 검증 기록 없음
- 인증 — signup 백엔드·앱 내 역할관리 UI 없음(CLI 스크립트로만 가능)
- Client/WebsiteOrder 전용 관리자 목록 화면 — 개별 GET API(`/api/clients/[id]`, `/api/website-orders/[id]`)는 있고 `/developer/inquiries/[id]`·`/projects/[id]`에서 연결된 레코드를 확인할 수 있지만, `/developer/clients`·`/developer/website-orders` 같은 자체 목록 화면은 아직 없음
- **`WebsiteOrderRecord.aiJobIds`가 항상 빈 배열로 남는 표시 결함**(2026-08-03 E2E 검증 중 발견, `FINAL_E2E_REPORT_v5.md` 참고) — `app/api/inquiries/route.ts`가 `createAiJob()`만 호출하고 `addAiJobToWebsiteOrder()`를 호출하지 않음. AiJob 자체는 정상 생성·실행되고, GitHub/Vercel/Workspace 파이프라인은 `websiteIds`/`projectId`만 사용해 동작에 영향은 없음(순수 표시용 필드 누락). 낮은 우선순위, 별도 지시 하에 수정 권장

---

## ⏳ 예정된 기능 (미구현)

- Deploy 자동화(**AI Business OS 플랫폼 자신**, CLI `ai deploy`) — branch check + `git push`만 수행, 실제 빌드/배포 실행 코드 없음(Vercel Git 연동이 그 이후를 담당). ⚠️ **고객 생성 사이트**의 배포 자동화는 별개(Phase 3, `lib/deployment/pipeline.ts`)로 이미 구현됨 — 혼동 주의
- Notification 다채널화 — 이메일(Resend)만 존재, Slack/SMS/webhook/in-app 없음
- Customer Portal 확장 — 회원가입 백엔드, 비밀번호 변경/재설정, 알림 설정, 문서 다운로드(PDF Export) 등은 아직 없음(현재는 조회 전용 V1)
- Portfolio 실콘텐츠, 회사 연락처 정보 확정(자료 수령 필요)
- GSC(Google Search Console) 연동

---

## 최근 완료 작업

- **Design → Website Build → Deployment 연결 + React Generator 빌드 실패 버그 수정**(2026-08-09) — Design Automation이 승인된 Review로 생성한 사이트가 로컬 `outDir` 생성에서 멈추던 것을, 기존 `lib/deployment/pipeline.ts`의 `runDeploymentPipeline()`을 새 로직 없이 그대로 호출해(입력 형태는 `lib/aiJobs/worker.ts`의 `triggerDeployment()` 내부 호출과 동일) GitHub repo 생성→commit→push→Vercel 프로젝트 생성→배포까지 이어지도록 `POST /api/design/website`(`apps/cnbiz-web/app/api/design/website/route.ts`)를 연결했다. 응답에 `deployment` 필드를 추가해 `GITHUB_TOKEN`/`VERCEL_TOKEN` 미설정 시 "NotConfigured"가 그대로 노출되도록 했다. 이 연결을 실 GitHub/Vercel 계정으로 검증하는 과정에서, React Generator가 DesignDocument의 내부 추적용 메타데이터(`props.sourceType`, Wireframe→DesignDocument 컴포넌트 타입 매핑 시 원본 타입 보존 목적)를 실제 JSX 속성(`<div sourceType={"Navigation"} />`)으로 그대로 출력해 생성된 사이트가 Vercel에서 TypeScript 컴파일 오류로 항상 빌드 실패하던 버그를 발견·수정했다(`packages/cli/src/generators/react/tsx.ts`의 `PASSTHROUGH_HANDLED_KEYS`에 `"sourceType"` 1개 추가). 실 E2E로 실제 GitHub 저장소·Vercel 프로젝트를 생성해 빌드 실패(`readyState:"ERROR"`)를 먼저 재현한 뒤, 수정 후 로컬 재생성으로 18개 라우트 전부 정상 컴파일·빌드됨을 확인했다(검증에 사용한 GitHub 저장소·Vercel 프로젝트는 삭제 완료).
- **`company_logo`/`service_images` 완료도 판정이 파일 종류를 전혀 구분하지 않던 버그 수정**(2026-08-09) — `service_images`가 `!LOGO_PATTERN.test(file)`(로고 이름이 아닌 모든 첨부파일)을 사진으로 인정해 PDF·TXT만 첨부해도 채워진 것처럼 표시되고, `company_logo`도 이름에 우연히 "logo"가 들어간 문서를 로고로 오인하던 결함을 수정. `lib/attachments/classify.ts`(신규)로 URL 확장자 기반 이미지/문서 판별 로직을 통합해 `lib/ai-analysis/analysis.ts`·`lib/attachments/extractText.ts`·`lib/ai-analysis/score.ts` 3곳의 중복 구현을 제거하고, `score.ts`의 두 체크리스트 항목에 `isImageUrl()` 조건을 추가. 신규 테스트 2개 포함 `90 files/760 tests` 전부 통과, 실 E2E로 PDF만 첨부 시 `service_images`가 여전히 누락 항목에 포함됨을 확인.
- **`LOGO_PATTERN`("회사 로고" 완료 여부 판단) 버그 수정 — 원본 파일명을 URL에 슬러그로 보존**(2026-08-09) — 2026-08-09 (5)에서 후속 과제로 남겨뒀던 항목. 두 스토리지 구현(`fsStore.ts`·`supabaseStore.ts`) 모두 원본 파일명을 버리고 무작위 id(+확장자)만으로 URL을 만들어, 로고를 아무리 명확한 이름으로 첨부해도 `LOGO_PATTERN`(`/logo/i`)이 URL 문자열에서 "logo"를 절대 찾지 못해 "회사 로고" 항목이 항상 누락으로 표시되던 결함을 수정했다. `lib/storage/extension.ts`에 `safeSlug()`(신규)를 추가해 원본 파일명(확장자 제외)을 소문자·영숫자·하이픈만 남긴 슬러그(최대 40자)로 정규화하고, 스토리지 키 자체는 그대로 둔 채 반환 URL에 `?name=` 쿼리로 덧붙였다(확장자 기반 분류·서빙 라우트 모두 쿼리 스트링과 무관해 다른 코드 변경 불필요). 신규 테스트 12개(`tests/storage/extension.test.ts`·`tests/storage/fsStore.test.ts`·`tests/ai-analysis/score.test.ts` 보강) 추가, `90 files/758 tests` 전부 통과. 실 E2E로 "company-logo.png" 업로드 → 반환 URL이 `...png?name=company-logo` 형태임을 확인 → 그 URL만으로 의뢰 등록 → `analysis.missingItems`에 더 이상 `company_logo`가 포함되지 않음을 확인.
- **의뢰 첨부파일 — PDF/DOC/DOCX/TXT 문서 텍스트 추출 및 AI Analysis 반영**(2026-08-09) — `pdf-parse`·`mammoth`·`word-extractor` 신규 설치, `lib/attachments/extractText.ts`(신규)가 URL 확장자로 문서를 골라(최대 5개, 문서당 최대 8000자) 병렬 fetch+파싱하고 개별 문서 실패는 예외 없이 error로만 보고한다(이미지 vision의 `resolveImages()`와 동일 원칙). `lib/ai-analysis/analysis.ts`의 `buildPromptWithAttachments()`가 추출된 원문을 프롬프트에 `=== 첨부 문서 원문 ===` 섹션으로 삽입, `prompts.ts` 시스템 프롬프트에도 이를 실제로 읽고 판단에 반영하라는 지시를 추가했다. 실 E2E(PDF·DOCX·TXT·PNG 4종 업로드→의뢰 등록)로 AI 분석 결과에 첨부 문서 원문(브랜드 컬러 헥스값 등)이 실제로 인용됨을 확인, `88 files/748 tests` 전부 통과(신규 12개 포함).
- **로컬 fs 스토리지 첨부파일이 vision/문서 파싱 어느 쪽에도 분류되지 못하던 버그 수정**(2026-08-09) — `fsStore.ts`가 반환하는 URL(`/api/attachment-files/{id}`)에 확장자가 전혀 없어(Supabase는 `safeKey()`가 우연히 보존해 정상 동작), `SUPABASE_URL` 미설정 로컬 개발 환경에서는 업로드 이미지가 vision 분석에 조용히 전혀 반영되지 않고 있었다(2026-08-09 (4)의 E2E "검증 성공"도 실제로는 미반영이었음이 재확인됨). `lib/storage/extension.ts`(신규, `safeExtension()`)를 fsStore/supabaseStore가 공유하도록 통합해 로컬 fs URL도 확장자를 보존하게 수정. `lib/ai-analysis/score.ts`의 로고 판정(`LOGO_PATTERN`)도 동일 근본 원인으로 애초에 정상 동작한 적이 없었던 것으로 추정되나 완전한 수정은 원본 파일명 보존이 필요해 이번 범위에서 제외.
- **의뢰 첨부파일 — 실제 업로드 스토리지 구현 및 AI Analysis Vision 연동**(2026-08-09) — 그동안 파일명만 감사 목적으로 남기던 첨부파일 TODO를 해소. Supabase Storage/로컬 fs 스토리지 백엔드(`lib/storage/*`)와 업로드 API(`POST /api/attachments/upload`)를 신규 구현하고, AI Analysis가 업로드된 이미지를 `packages/cli`의 `ai chat --image`(Anthropic vision, base64 인코딩·5MB/장·최대 6장 제한)로 실제로 확인해 판단에 반영하도록 CLI Provider 계층까지 연결했다. 실 계정으로 업로드→서빙→AI 분석 전 구간 E2E 검증 완료(`confidence:0.15`로 실제 vision 호출 확인, 시뮬레이션 고정값 0.3 아님).
- **AI 분석·Design 체인 프로덕션 시뮬레이션 폴백 근본 원인 추가 수정 — CLI 서브프로세스 cwd를 읽기 전용 배포 번들에서 tmpdir로 교체**(2026-08-09) — `chatViaCli()`가 CLI 서브프로세스의 cwd로 `process.cwd()`(Vercel Lambda에서는 읽기 전용 `/var/task/...`)를 그대로 넘기고 있어, `packages/cli`의 `chat` 명령이 호출 이력을 `<cwd>/.runtime/tasks.json`에 기록하려다 `mkdir`이 실패(`ENOENT`)해 CLI 프로세스가 즉시 죽고 `chatViaCli()`가 조용히 결정론적 기본값으로 폴백하던 문제를 수정했다(2026-08-05에 Website Builder 생성 경로에서 이미 한 번 겪어 만들어둔 `resolveCliWorkingDir()`가 이 파일에만 연결되어 있지 않았다). `ANTHROPIC_API_KEY`를 프로덕션에 처음 설정한 뒤에야 이 코드 경로가 실행되며 처음 드러난 잠재적 결함이었다. 임시 진단 로그를 담은 빌드로 실제 프로덕션에서 재현 → Vercel Runtime Logs로 정확한 스택트레이스 확인 → `runAiCli()`의 cwd 기본값을 `resolveCliWorkingDir()`로 교체 → 재배포 후 동일 요청 경로에서 오류 없이 정상 응답됨을 확인했다. 진단 과정에서 프로덕션 Supabase에 생성된 테스트 의뢰 2건이 남아있어 관리자 수동 삭제가 필요하다.
- **Design 체인 시뮬레이션 폴백 잔여 원인 2건 추가 수정 — max_tokens·타임아웃 재상향**(2026-08-09) — `packages/cli/src/providers/anthropic.ts`의 기본 `max_tokens`(8192)가 `lib/design/wireframe-generator.ts`(데스크탑/태블릿/모바일 3-breakpoint 화면 구성)에는 부족해 응답이 8192 토큰에서 JSON 중간에 잘려 파싱 실패 → 시뮬레이션 폴백으로 이어짐을 실측(`usage.outputTokens: 8192`)으로 확인, 16000으로 재상향. `packages/cli/src/providers/provider.ts`의 요청 타임아웃 기본값(45000ms)도 같은 스키마에는 부족해 3회 재시도(각 45초, 총 약 2.3분)를 전부 소진한 뒤 폴백함을 확인, 120000ms로 재상향. 검증 전용 임시 계정으로 Design 체인 5단계(Requirements→Storyboard→Wireframe→Prototype→Claude Design) 전부 `simulated:false`로 실제 Anthropic 응답을 받음을 확인했다.
- **AI 분석이 항상 시뮬레이션 폴백으로 떨어지던 근본 원인 수정 — PowerShell 인자 재구성 버그**(2026-08-09) — `apps/cnbiz-web/lib/ai/bridge.ts`의 `runAiCli()`가 `lib/commandEngine/engine.ts`의 `execute()`(명령을 통짜 문자열로 PowerShell `-Command`에 넘겨 재해석시키는 방식)로 CLI를 shell-out하던 것을, `node`를 argv 배열로 직접 `spawn()`하는 방식으로 교체. `ANTHROPIC_API_KEY`가 정상 설정되어 있어도 AI Analysis 프롬프트처럼 큰따옴표가 반복되는 JSON 스키마 예시가 인자에 포함되면 PowerShell이 `-Command` 문자열을 파싱한 뒤 그 결과를 다시 네이티브 프로세스 호출용 커맨드라인으로 재구성하는 단계에서 인자가 쪼개져(`too many arguments for 'chat'`) CLI가 항상 실패하고, `generateAnalysis()`가 조용히 결정론적 기본값(`simulated`)으로 폴백하던 문제를 근본 수정 — 중간 셸 문자열 계층 자체를 없애 재현되지 않음을 확인.
- **프로젝트 상세 화면 — AI 의뢰 상담 내용 실시간 반영**(2026-08-05) — `websiteOrder.requirements`/`project.description`이 AI 의뢰 승인 시점에 한 번 복사된 스냅샷이라, 이후 관리자가 AI 의뢰 상세에서 상담 내용을 수정하거나 재분석해도 프로젝트 대시보드(`/projects/[id]`)에는 반영되지 않던 문제를 수정했다. `GET /api/inquiries/[id]`로 Inquiry를 직접 다시 조회해 항상 최신 `requirements`를 표시하고, "AI 의뢰 상세에서 수정 →" 링크를 추가했다.
- **실시간 미리보기 — 고객 프로젝트 배포 URL 연동**(2026-08-05) — `LivePreviewPanel`이 항상 `http://localhost:3000`을 시도해, 원격(배포된 사이트)에서 관리자가 고객 프로젝트를 열면 항상 연결 실패하던 문제를 수정. `deployedUrl` prop(신규)을 추가해 고객 프로젝트는 `WebsiteRecord.deployment.url`(실제 배포 URL)을 우선 사용하고, 배포가 아직 없으면 iframe 자체를 생략하도록 변경. Visual Editor(dev-inspector 오버레이 필요)는 배포된 사이트에는 적용되지 않으므로 이 경우 편집 모드를 숨긴다.
- **AI 의뢰 관리 — 의뢰 재분석(Re-analyze) 기능 추가**(2026-08-05) — `POST /api/inquiries/[id]/analyze`(신규) 추가. 신규 접수 시 자동 실행되는 것과 동일한 `generateAnalysis()`(`lib/ai-analysis/analysis`)를 현재 저장된 필드 값 기준으로 재실행해 `saveInquiryAnalysis()`로 결과를 갱신하고, 성공/실패 여부와 무관하게 `inquiry.analyze` 감사 로그(신규 `AuditAction`)를 기록한다. `/developer/inquiries/[id]`의 "AI 분석" 카드에 "재분석" 버튼과 로딩/에러 상태 UI를 추가(정보 수정 후 최신 값으로 다시 분석하거나, 최초 분석 실패 시 재시도하는 용도). `/developer/audit-log`·`/developer/errors`의 라벨/톤/필터 맵에 `inquiry.analyze` 반영.
- **AI 의뢰 관리 — 의뢰 정보 수정/삭제 기능 추가**(2026-08-05) — `PATCH /api/inquiries/[id]`가 기존 `status` 변경 외에 회사명·담당자명·이메일·연락처·사이트유형·요구사항·예산·업종 등 편집 가능 필드 patch(`updateInquiry()`, `lib/inquiries/registry.ts` 신규)를 지원하도록 확장(이메일 형식·필수값 서버 재검증 포함), `DELETE /api/inquiries/[id]`(신규, `deleteInquiry()`) 추가. `/developer/inquiries/[id]`에 인라인 편집 폼과 삭제 확인 UI 추가, `/developer/inquiries` 목록에도 삭제 액션 연동. `lib/audit/log.ts`에 `inquiry.update`·`inquiry.delete` 액션 추가하고 `/developer/audit-log`·`/developer/errors` 라벨/톤/필터 맵 갱신.
- **`resolveGeneratedWebsitesDir()`/`resolveCliWorkingDir()` — VERCEL 환경변수 분기 제거, 항상 os.tmpdir() 사용하도록 재수정**(2026-08-05) — 직전 수정(`process.env.VERCEL` 여부로 분기해 프로덕션만 tmpdir 사용)이 실제 프로덕션에서도 여전히 실패함을 로그로 재확인(`ENOENT ... mkdir '/var/task/apps/cnbiz-web/agents'`) — 분기 로직 자체가 런타임에 신뢰할 수 없다고 판단해, 플랫폼·환경과 무관하게 항상 `os.tmpdir()` 하위 고정 경로(`ai-business-os-cli/generated-websites`, `ai-business-os-cli/cli-cwd`)를 사용하도록 단순화했다. `resolveCliWorkingDir()`는 `child_process.spawn()`이 cwd 존재를 요구하므로 반환 전 `fs.mkdirSync(recursive:true)`로 미리 생성하도록 변경. `app/api/design/website/route.ts`도 `fs`/`path` 직접 조작 대신 새 헬퍼 3종(`resolveCliEntry`/`resolveCliWorkingDir`/`resolveGeneratedWebsitesDir`)만 사용하도록 리팩터링해 다른 CLI 호출 지점(`app/api/websites/route.ts`, `lib/aiJobs/executor.ts`)과 로직을 통일했다.
- **`resolveCliWorkingDir()` 추가 — Website Builder CLI 서브프로세스 작업 디렉터리를 Vercel에서 tmpdir로 분리**(2026-08-05) — `apps/cnbiz-web/lib/paths/repoRoot.ts`에 신규 함수 추가. `packages/cli`의 `website create` 생성 워크플로가 `--out`과 무관하게 자신의 cwd 기준 상대 경로에 `agents/` 등 부산물을 스캐폴딩하는 알려진 부작용이 있어, 로컬 dev(cwd=repoRoot, 이미 gitignore 대상)에서는 무해하지만 Vercel의 읽기 전용 배포 파일시스템에서는 `ENOENT: mkdir '/var/task/apps/cnbiz-web/agents'`로 즉시 실패함을 프로덕션 로그로 확인. `process.env.VERCEL` 여부로 분기해 프로덕션에서는 `os.tmpdir()`을 cwd로 사용하도록 수정.
- **`app/api/websites/route.ts`·`lib/aiJobs/executor.ts` — CLI 서브프로세스 cwd를 `resolveRepoRoot()`에서 `resolveCliWorkingDir()`로 교체**(2026-08-05) — Website Builder 생성(`POST /api/websites`)과 AI Job 실행(`executeJob()`) 양쪽의 `execute("node ...", { cwd })` 호출을 전부 새 함수로 교체해, 앞서 수정한 CLI 엔트리 경로·출력 디렉터리·Shell 실행자 문제에 이어 남아있던 마지막 프로덕션 실패 지점을 해소.
- **`executor.ts` — 빈 name/siteType/requirements로 인한 CLI 웹사이트 생성 거부 수정**(2026-08-05) — `apps/cnbiz-web/lib/aiJobs/executor.ts`가 `WebsiteOrder.name`/`siteType`/`requirements`를 TS 타입상 항상 채워진 문자열로 가정했으나, `/contact`처럼 구조화된 siteType·상세 requirements를 받지 않는 접수 경로에서는 실제로 빈 문자열일 수 있어 `packages/cli`의 `website create`가 "Project Name, Business Type, Target Audience, Brand, and Language are all required."로 즉시 거부하던 문제(프로덕션 로그로 확인)를 수정. `name`/`businessType`/`audience`가 비어있으면 각각 client 정보·`WEBSITE_TYPES` 라벨·기본값("웹사이트 프로젝트"/"일반 고객" 등)으로 폴백하도록 변경.
- **`execute()` 오류 메시지에 stdout 폴백 추가**(2026-08-05) — `apps/cnbiz-web/lib/commandEngine/engine.ts`의 `execute()`가 실패 시 `stderr`가 비어있으면 곧바로 `종료 코드 N`으로만 보고하던 것을, stdout 마지막 1000자를 함께 폴백으로 사용하도록 수정. `packages/cli` 등 일부 CLI가 실패 사유를 stderr가 아닌 stdout에 출력해 프로덕션 AI Job 실패 원인을 진단할 수 없던 문제를 해결.
- **`resolveCliEntry()` 재수정 — require.resolve 방식 폐기, 경로 기반 고정 해석으로 전환**(2026-08-05) — 직전 수정(require.resolve("@ai-business-os/cli"))이 Vercel 프로덕션에서도 여전히 실패함을 함수 로그로 확인: Turbopack이 빌드 시점에 그 리터럴 문자열을 실제 파일 경로가 아닌 내부 번들러 모듈 id로 재작성해버려, 런타임에 숫자 id를 파일처럼 require하려다 "Cannot find module" 오류가 발생했다. `apps/cnbiz-web/lib/paths/repoRoot.ts`의 `resolveCliEntry()`를 `path.join(process.cwd(), "..", "..", "packages", "cli", "dist", "index.js")` 방식으로 재작성 — `apps/cnbiz-web`은 로컬·배포 번들 양쪽에서 항상 모노레포 루트로부터 정확히 2단계 아래에 위치하고(`next.config.ts`의 `outputFileTracingRoot`가 이 구조를 그대로 보존), `process.cwd()`는 런타임에 항상 `apps/cnbiz-web` 자신의 디렉터리와 일치함(직전 `resolveRepoRoot()` fallback 값으로 이미 실측 확인된 사실)을 근거로 동적 탐색 없이 고정 상대 경로로 해석하도록 단순화했다. `createRequire` import 제거.
- **Vercel 프로덕션 실행 3종 결함 추가 수정 — CLI 경로 해석·출력 디렉터리·Shell 실행자**(2026-08-05) — 직전 outputFileTracing 보강만으로는 부족했던 나머지 프로덕션 실패 원인 3가지를 `lib/paths/repoRoot.ts`·`lib/terminal/server.ts`에서 해결했다. ① `resolveCliEntry()`(신규) — `path.join(resolveRepoRoot(), "packages/cli/dist/index.js")` 방식이 Vercel 서버리스 런타임에서는 `process.cwd()`가 로컬 dev처럼 `workspaces` package.json까지 거슬러 올라가지 못해 파일을 찾지 못하던 문제(Vercel 함수 로그로 실측, 번들에 파일이 실제로 포함돼 있었음에도 "packages/cli가 아직 빌드되지 않았습니다" 오류 발생)를, `apps/cnbiz-web`이 `@ai-business-os/cli`에 대한 실제 package.json 의존성을 갖도록 한 뒤 `require.resolve()`(Node 표준 모듈 해석, Next.js File Tracing과 호환)로 대체해 해결. `app/api/websites/route.ts`·`lib/ai/bridge.ts`·`lib/aiJobs/executor.ts` 3곳 전부 이 함수로 교체. ② `resolveGeneratedWebsitesDir()`(신규) — Vercel 배포 함수의 파일시스템은 `/tmp` 밖에서 읽기 전용이라, 기존처럼 저장소 경로 하위(`.generated-websites/`)에 생성 산출물을 쓰면 실패하던 문제를 `process.env.VERCEL` 여부로 분기해 프로덕션에서는 `os.tmpdir()` 하위에 쓰도록 수정(로컬 dev는 기존 경로 유지). ③ `buildShellInvocation()` — Vercel 프로덕션 런타임은 Linux인데 PowerShell/CMD/Git Bash를 그대로 실행하려 해서 AI Job 실행·Website Builder 생성이 `spawn ENOENT`로 실패하던 문제를, `process.platform !== "win32"`일 때 `/bin/sh -c`로 실행하도록 분기 추가.
- **`apps/cnbiz-web`에 `@ai-business-os/cli` workspace 의존성 명시 추가**(2026-08-05) — 직전 커밋(outputFileTracingIncludes 보강)의 후속 조치로, `apps/cnbiz-web/package.json`의 `dependencies`에 `@ai-business-os/cli: "*"`를 추가해 npm workspaces가 `packages/cli`를 `apps/cnbiz-web`의 명시적 의존성으로 링크하도록 했다. 기존에는 `lib/ai/bridge.ts` 등이 상대 경로(`node packages/cli/dist/index.js`)로만 shell-out했을 뿐 package.json상 의존 관계가 없어, Vercel의 workspace 의존성 그래프 판단(빌드 순서·설치 대상)에서 `packages/cli`가 명시적으로 드러나지 않았다 — 이번 변경으로 Output File Tracing 보강과 함께 배포본에 `packages/cli`가 안정적으로 포함되도록 보강했다.
- **Vercel 배포 시 `packages/cli/dist` 누락 수정(Output File Tracing 보강)**(2026-08-05) — `lib/ai/bridge.ts`·`lib/aiJobs/executor.ts`·`app/api/websites/route.ts` 등이 `node packages/cli/dist/index.js`를 동적 경로로 shell-out 실행하는데, Next.js의 빌드타임 File Tracing이 이를 정적으로 발견하지 못해 Vercel 배포본에 `packages/cli/dist`가 통째로 누락되고 관련 API가 런타임에 "packages/cli가 아직 빌드되지 않았습니다." 오류로 실패하던 문제(Vercel 함수 로그로 확인)를 수정했다. `apps/cnbiz-web/next.config.ts`에 `outputFileTracingRoot`(모노레포 루트로 확장)와 `outputFileTracingIncludes`(`/api/ai-jobs/**`·`/api/websites`·`/api/external/inquiries`에 `packages/cli/dist`·`package.json` + npm workspace로 하이스팅된 CLI 런타임 의존성 27종(chalk/commander/fs-extra/ora 및 전이 의존성, package-lock.json 기준)을 명시적으로 포함)를 추가하고, `apps/cnbiz-web/package.json`에 `prebuild` 스크립트(`npm run build --workspace=@ai-business-os/cli`)를 추가해 배포마다 `packages/cli`가 항상 최신으로 빌드된 뒤 트레이싱되도록 했다.
- **Development OS 대시보드 전 페이지에 맥락 도움말(HelpTip) 추가**(2026-08-05) — `components/developer/HelpTip.tsx`(신규, 클릭 시 펼쳐지는 인라인 도움말 팝오버)와 `components/developer/PageHeader.tsx`에 `help?: string[]` prop을 추가해, `/developer` 하위 30개 페이지(AI Workspace·Analysis·Audit Log·Backup·Clients·Contracts·Deployment·Design·Errors·Estimates·GitHub·Health·Inquiries·Logs·Marketplace·Metrics·Planning·Prompts·Proposals·Requests·Settings·Specifications·Terminal·Timeline·UI Map·Website Orders·Websites·Workflows·Workspace, `/projects` 포함) 헤더에 화면의 목적·다른 화면과의 관계·주의사항을 짧은 안내 문구로 노출했다. 새 API·새 데이터 저장소 없이 순수 UI/UX 보강이며 기존 로직은 변경하지 않았다.
- **로그인 페이지 비밀번호 표시/숨기기 토글 추가**(2026-08-05) — `apps/cnbiz-web/app/login/page.tsx`에 비밀번호 입력란 우측 눈 아이콘 버튼(`showPassword` state, `aria-pressed`)을 추가해 입력 중 비밀번호를 평문으로 확인할 수 있도록 UX 개선. 인증 로직·API 호출은 무변경.
- **Customer Portal V1 구현 — 고객 본인 주문 조회 신규 추가**(2026-08-04) — `Role` 타입에 `customer` 추가(`lib/auth/types.ts`), `lib/auth/rbac.ts`에 `/customer/**` 보호 규칙 추가, `proxy.ts`가 `/customer/**`도 세션 인증 대상에 포함하도록 확장. `lib/customerPortal/view.ts`(신규) — `findCustomerOrders()`/`getCustomerOrderDetail()`이 로그인 이메일과 일치하는 Client의 WebsiteOrder만 조회하며, Inquiry/Client/WebsiteOrder/Estimate/Specification/Timeline/Contract/Proposal 7개 Domain을 읽기 전용으로만 join한다(새 저장소 없음). `GET /api/customer/orders`·`GET /api/customer/orders/[id]`(신규) — 타인 소유 주문은 "존재하지 않음"과 동일한 404로 응답해 존재 여부조차 추측 불가능하도록 처리. `/customer/dashboard`·`/customer/orders`·`/customer/orders/[id]`·`/customer/layout.tsx`(신규 페이지 4개), `components/customer/{CustomerHeaderAuth,OrderCard,labels}.tsx`(신규). `POST /api/auth/login`에 `customer` role 로그인 시 `customer.login` 감사 로그 기록 추가(developer/admin 로그인 동작은 무변경), 주문 상세 조회 시 `customer.view_document` 감사 로그 기록. `lib/metrics/registry.ts`에 `customerPortalVisitCount` 카운터 추가(Metrics 위젯 반영).
- **`WebsiteOrderRecord.aiJobIds` 누락 결함 수정**(2026-08-04) — `app/api/inquiries/route.ts`·`app/api/external/inquiries/route.ts` 둘 다 `createAiJob()` 후 `addAiJobToWebsiteOrder()`를 호출하지 않아 항상 빈 배열로 남던 기존 결함(2026-08-03 E2E 검증에서 발견, 다음 작업 우선순위 1번)을 수정 — `addWebsiteOrderToClient()`/`addInquiryToClient()`와 동일한 "생성 직후 부모 레코드에 역참조 추가" 패턴을 그대로 적용.
- **Release Readiness Audit Major #3 완료 — fs CollectionStore(JSON Store) lost-update 해결**(2026-08-05) — 모든 registry가 공유하는 `list()`→JS 수정→`replaceAll()`(`getDoc()`→`setDoc()`도 동일) read-modify-write 패턴에 collection 단위 순수 Promise 락을 `lib/db/fsStore.ts` 내부에만 추가해, 동시 요청 시 나중 쓰기가 앞선 변경을 통째로 덮어쓰던 lost-update를 제거했다. 새 Store·새 라이브러리·`CollectionStore` 인터페이스 변경 없이 기존 4개 메서드 내부만 수정(호출자인 모든 registry는 무변경). 신규 `tests/db/fsStore.test.ts`로 동일 collection에 대한 **100회 동시 create·100회 동시 update·100회 동시 append**(및 카운터 increment)를 각각 실행해 전부 데이터 유실 0건을 실증했다(수정 전 코드로는 100→1로 붕괴함을 먼저 재현해 버그를 확인한 뒤 수정). `npx tsc --noEmit`·`npx eslint`·`npm run build` 전부 통과, `npm test` **88 files/742 tests** 전부 통과(신규 7개 포함, 회귀 없음).
- **AI JSON 파싱 유틸리티 공유화 — 6개 Generator 코드 중복 제거**(2026-08-04) — `lib/ai-analysis`·`lib/contracts`·`lib/estimates`·`lib/proposals`·`lib/specifications`·`lib/timeline` 각 Generator마다 복붙되어 있던 `stripCodeFence()`를 `lib/ai/json.ts`의 `extractJsonPayload()`(신규)로 통합했다. 기존 정규식은 응답 전체가 코드펜스 하나로만 이루어진 경우만 매칭했으나, 새 유틸리티는 코드펜스 앞뒤에 설명 문장이 붙은 경우와 코드펜스 없이 순수 JSON 앞뒤에 설명이 붙은 경우까지 균형 잡힌 중괄호 스캔으로 추출한다(JSON 자체를 관대하게 고쳐주지는 않음 — 여전히 `JSON.parse()` 엄격 검증 후 실패 시 결정론적 폴백, all-or-nothing 원칙 유지). 6개 Generator의 시스템 프롬프트도 "no prose, no markdown fences"에서 "Respond with ONLY that JSON object" + "valid JSON parseable by JSON.parse()"로 더 명시적으로 강화했다. 신규 테스트 `tests/ai/json.test.ts` 추가, 6개 Generator 테스트 파일에 관련 케이스 보강.
- **제안서(Proposal) 자동 생성 구현 — 자동 문서화 체인 최종 완결**(2026-08-04) — `lib/proposals/{types,generator,registry}.ts` 신규로 Inquiry.analysis뿐 아니라 EstimateRecord·SpecificationRecord·TimelineRecord·ContractRecord까지 전부 입력으로 사용하는 별도 서비스를 `lib/contracts/*`와 동일한 패턴으로 추가했다(기존 `AiJobType`·`AiJobStatus`·Customer Inquiry Pipeline 코드는 무변경). 견적서의 비용·명세서의 페이지/기능/범위·타임라인의 기간·계약서의 계약 금액/유지보수 조건을 종합해 고객 제안서(요약·강점·비용·일정·다음 단계)를 산출하며, `chatViaCli()` Provider 브릿지를 재사용하고 Provider 미설정/파싱 실패 시 결정론적 폴백으로 전부-아니면-전무 처리한다. `POST/GET /api/proposals`·`GET /api/proposals/[id]`(신규), `/developer/proposals`(목록)·`/developer/proposals/[id]`(상세) 신규 페이지, `/developer/inquiries/[id]`에 제안서 생성·조회 연동 추가(견적서·명세서·타임라인·계약서 넷 다 있어야 생성 가능). `lib/audit/log.ts`에 `proposal.generate` 액션, `lib/metrics/registry.ts`에 `proposalGenerationCount` 카운터 추가(Audit Log·Errors·Metrics 화면 반영). 신규 테스트(`tests/proposals/{generator,registry}.test.ts`, `tests/metrics/registry.test.ts` 보강) 포함 — 견적서→명세서→타임라인→계약서→제안서로 이어지는 자동 문서화 체인을 최종 완결했다.
- **계약서(Contract) 자동 생성 구현 — 자동 문서화 체인 완결**(2026-08-04) — `lib/contracts/{types,generator,registry}.ts` 신규로 Inquiry.analysis뿐 아니라 이미 생성된 EstimateRecord·SpecificationRecord·TimelineRecord까지 입력으로 사용하는 별도 서비스를 `lib/estimates/*`·`lib/specifications/*`·`lib/timeline/*`와 동일한 패턴으로 추가했다(기존 `AiJobType`·`AiJobStatus`·Customer Inquiry Pipeline 코드는 무변경). 견적서의 금액·명세서의 범위/산출물·타임라인의 기간/마일스톤을 종합해 계약 조건(계약 금액·범위·기간·마일스톤명)을 산출하며, `chatViaCli()` Provider 브릿지를 재사용하고 Provider 미설정/파싱 실패 시 결정론적 폴백으로 전부-아니면-전무 처리한다. `POST/GET /api/contracts`·`GET /api/contracts/[id]`(신규), `/developer/contracts`(목록)·`/developer/contracts/[id]`(상세, Export) 신규 페이지, `/developer/inquiries/[id]`에 계약서 생성·조회 연동 추가(견적서·명세서·타임라인 셋 다 있어야 생성 가능). `lib/audit/log.ts`에 `contract.generate` 액션, `lib/metrics/registry.ts`에 `contractGenerationCount` 카운터 추가(Audit Log·Errors·Metrics 화면 반영). 신규 테스트(`tests/contracts/{generator,registry}.test.ts`, `tests/metrics/registry.test.ts` 보강) 포함 — 견적서→명세서→타임라인→계약서로 이어지는 자동 문서화 체인을 완결했다.
- **프로젝트 타임라인(Timeline) 자동 생성 구현**(2026-08-04) — `lib/timeline/{types,generator,registry}.ts` 신규로 Inquiry.analysis(AI Analysis Engine 산출물)뿐 아니라 이미 생성된 EstimateRecord·SpecificationRecord도 입력으로 사용하는 별도 서비스를 `lib/estimates/*`·`lib/specifications/*`와 동일한 패턴으로 추가했다(기존 `AiJobType`·`AiJobStatus`·Customer Inquiry Pipeline 코드는 무변경). 견적서의 `timelineWeeks`와 명세서의 페이지/기능 수·범위를 함께 반영해 Phase별 일정을 산출하며, `chatViaCli()` Provider 브릿지를 재사용하고 Provider 미설정/파싱 실패 시 결정론적 폴백으로 전부-아니면-전무 처리한다. `POST/GET /api/timeline`·`GET /api/timeline/[id]`(신규), `/developer/timeline`(목록)·`/developer/timeline/[id]`(상세) 신규 페이지, `/developer/inquiries/[id]`에 타임라인 생성·조회 연동 추가(견적서·명세서 둘 다 있어야 생성 가능). `lib/audit/log.ts`에 `timeline.generate` 액션, `lib/metrics/registry.ts`에 `timelineGenerationCount` 카운터 추가(Audit Log·Errors·Metrics 화면 반영). 신규 테스트(`tests/timeline/{generator,registry}.test.ts`, `tests/metrics/registry.test.ts` 보강) 포함, 다음 작업 우선순위 3번(프로젝트 타임라인 생성)을 해소했다.
- **기능 명세서(Specification) 자동 생성 구현**(2026-08-04) — `lib/specifications/{types,generator,registry}.ts` 신규로 Inquiry.analysis(AI Analysis Engine 산출물)를 입력받아 페이지 구조·기능 목록·범위 밖 항목·가정 사항을 생성하는 별도 서비스를 `lib/estimates/*`와 동일한 패턴으로 추가했다(기존 `AiJobType`·`AiJobStatus`·Customer Inquiry Pipeline 코드는 무변경). `chatViaCli()` Provider 브릿지를 재사용하며 Provider 미설정/파싱 실패 시 결정론적 폴백으로 전부-아니면-전무 처리한다. `POST/GET /api/specifications`·`GET /api/specifications/[id]`(신규), `/developer/specifications`(목록)·`/developer/specifications/[id]`(상세) 신규 페이지, `/developer/inquiries/[id]`에 명세서 생성·조회 연동 추가. `lib/audit/log.ts`에 `specification.generate` 액션, `lib/metrics/registry.ts`에 `specificationGenerationCount` 카운터 추가(Audit Log·Errors·Metrics 화면 반영). 신규 테스트(`tests/specifications/{generator,registry}.test.ts`, `tests/metrics/registry.test.ts` 보강) 포함, 다음 작업 우선순위 3번(기능 명세서 생성)을 해소했다.
- **기술 견적서(Estimate) 자동 생성 구현**(2026-08-03) — `lib/estimates/{types,generator,registry}.ts` 신규로 Inquiry.analysis(AI Analysis Engine 산출물)를 입력받아 가격 범위·소요 기간·항목별 산정·가정 사항을 생성하는 별도 서비스를 추가했다(기존 `AiJobType`·`AiJobStatus`·Customer Inquiry Pipeline 코드는 무변경, 위 '예정된 기능'에서 명시한 확장 지점을 채택). `chatViaCli()` Provider 브릿지를 재사용하며 Provider 미설정/파싱 실패 시 결정론적 폴백으로 전부-아니면-전무 처리한다. `POST/GET /api/estimates`·`GET /api/estimates/[id]`(신규), `/developer/estimates`(목록)·`/developer/estimates/[id]`(상세, Export) 신규 페이지, `/developer/inquiries/[id]`에 견적서 생성·조회 연동 추가. `lib/audit/log.ts`에 `estimate.generate` 액션, `lib/metrics/registry.ts`에 `estimateGenerationCount` 카운터 추가(Audit Log·Errors·Metrics 화면 반영). 신규 테스트(`tests/estimates/{generator,registry}.test.ts`, `tests/metrics/registry.test.ts` 보강) 포함, 다음 작업 우선순위 3번(기술 견적서 생성)을 해소했다.
- **고객 URL 자동 전달 — Lifecycle Extension Point 구현**(2026-08-03) — `lib/aiJobs/lifecycle.ts`(신규)에 어떤 구체적 기능도 알지 못하는 범용 Post-Process Hook 실행기(`registerPostProcessHook()`/`runPostProcessHooks()`)를 신설해 `processJob()` 성공 경로 마지막에 단 한 번만 연결하고, `lib/aiJobs/hooks/index.ts`(Hook Registry)에 첫 Hook "customer-notification"(`lib/aiJobs/hooks/customerNotification.ts` → `lib/websites/notify.ts::triggerCustomerNotification()`)을 등록했다. 실제 알림은 기존 `lib/contact/email`(Resend Provider) 재사용으로 발송하고 `recordAuditEvent()`로 신규 `deployment.notify_customer` 액션을 기록한다(`app/developer/{audit-log,errors}/page.tsx` 라벨/톤 맵 갱신). 다음 작업 우선순위 10번("고객 URL 전달" 기능 설계·구현)을 해소했다. 신규 테스트 `tests/aiJobs/lifecycle.test.ts`·`tests/websites/notify.test.ts` 추가
- **Customer Inquiry Pipeline 실 운영 환경 E2E 검증 — Version 1 공식 완료**(2026-08-03,
  `FINAL_E2E_REPORT_v5.md`) — 코드 수정 없이 검증만 수행. `GITHUB_TOKEN`/`VERCEL_TOKEN`이 실제로
  설정된 이 환경에서 dev 서버를 기동하고 검증 전용 임시 계정으로 로그인해, 의뢰 접수 → 관리자
  승인 → AiJob 생성 → AI 홈페이지 생성 → Project Workspace 자동 생성 →
  `ProjectRecord.websiteOrderId` 연결 → GitHub Repository 생성 → Commit/Push → Vercel Project
  생성 → Production Deploy → Production URL 생성까지 11단계 전 구간을 curl로 직접 실행했다.
  GitHub API(`api.github.com`)·Vercel API(`api.vercel.com`)로 각각 직접 재조회해 저장소
  실존(`private:true`, `default_branch:main`)과 배포 상태(`readyState:"READY"`,
  `readySubstate:"PROMOTED"`, `target:"production"`)를 교차 확인했고, 프로덕션 별칭
  (`https://{repoName}.vercel.app`)이 실제 HTTP 200으로 생성된 사이트 HTML을 반환함을 확인했다.
  **11단계 전부 PASS.** 검증 중 `WebsiteOrderRecord.aiJobIds`가 항상 빈 배열로 남는 기존 결함
  1건을 발견했다(동작에는 영향 없음, 위 "🚧" 섹션 참고). 검증에 사용한 dev 서버·임시 계정·
  fs-store 데이터·`.generated-websites` 산출물·CLI 부작용(`agents/*`, `workflows/website-builder/`)은
  전부 정리했고, 실제로 생성된 GitHub 저장소/Vercel Project/Production 배포는 성공 증거로 보존
  중이다(삭제 여부 사용자 결정 대기).
- **Project Workspace 연동 마무리 — Audit Log/의뢰 상세/프로젝트 상세 UI 반영**(2026-08-03) — `workspace.autoprovision` 감사 로그 액션을 `/developer/audit-log`·`/developer/errors` 라벨/톤 맵에 반영, `/developer/inquiries/[id]`에서 연결된 Project Workspace로 이동하는 "5. Project Workspace" 배지 추가(`GET /api/projects/[id]` 재사용). `/projects/[id]`에는 `websiteOrderId`가 있을 때만 "고객 주문 정보" 카드(기존 `GET /api/website-orders/[id]` 재사용)와 "고객 프로젝트" 배지를 표시하도록 정리, `lib/websiteOrders/registry.ts`·`lib/projects/registry.ts`에 `projectId`/`websiteOrderId` 연결 필드 반영
- **`tests/aiJobs/worker.test.ts` 보강**(2026-08-03) — `triggerWorkspaceProvisioning()` 관련 케이스를 확장해 Workspace 자동 등록 흐름(최초 생성·중복 방지·실패 스킵 경로)의 테스트 커버리지를 강화
- **CustomerProject Domain 제거 — 구조 단순화**(2026-08-03) — 바로 아래 항목("Customer Project
  관리 메타데이터 계층")에서 만들었던 `lib/customerProjects/**`·`app/api/customer-projects/**`·
  `app/developer/customer-projects/**`·`tests/customerProjects/**`를 **전부 삭제**했다. 설계
  검토 결과 `ProjectRecord.websiteOrderId`(이미 존재, `triggerWorkspaceProvisioning()`이 채움)
  만으로 "고객 프로젝트"를 완전히 식별할 수 있고, 향후 예정된 목록/Dashboard/유지보수/AI
  수정/자동 재배포 기능도 전부 `websiteOrderId`(FK, 체인 탐색 가능)로 충족되어 별도
  Domain·`source` 필드 모두 불필요하다고 결론냈다(근거는 아래 참고). **`processJob()`·
  `executeJob()`·`triggerDeployment()`·`triggerWorkspaceProvisioning()`·Deployment
  Pipeline·GitHub/Vercel Client·`WebsiteRecord.outDir`·`.generated-websites`·Workspace/Project
  생성 로직은 이번에도 단 한 줄도 수정하지 않았다**
  - `app/developer/inquiries/[id]/page.tsx` — `ensureCustomerProject()`(POST
    `/api/customer-projects` 호출)와 "Customer Project 관리에서 보기" 링크 제거(원복).
    "5. Project Workspace" 배지(기존 `GET /api/projects/[id]` 재사용)는 그대로 유지
  - `components/developer/DeveloperNav.tsx` — "Customer Project" nav 항목 제거
  - `lib/audit/log.ts`, `app/developer/{audit-log,errors}/page.tsx` — `customerProject.create`
    액션·라벨/톤 제거
  - **`app/projects/page.tsx`·`app/projects/[id]/page.tsx`(신규 API 없음, 전부 additive)** —
    "고객 프로젝트" 배지를 `project.autoProvisioned` 대신 `project.websiteOrderId` 유무로
    표시하도록 변경(요청사항 4 반영). 상세 페이지에는 `websiteOrderId`가 있을 때만 "고객 주문
    정보" Card를 추가해 기존 `GET /api/website-orders/[id]`를 그대로 호출·표시(새 API 없음)
  - `lib/websiteOrders/types.ts` — 상단 주석을 "Project라는 단어를 아예 쓰지 않는다"에서 새
    구조(`ProjectRecord.websiteOrderId`로 고객 프로젝트 식별)에 맞게 갱신(문서 주석만, 로직
    무변경)
  - `npx tsc --noEmit`·`npx eslint`·`npm run build` 전부 통과, `npm test` **73 files/589 tests**
    전부 통과 — CustomerProject 도입 이전(직전전 세션) 기준선으로 정확히 복귀(회귀 0건, 신규
    테스트도 0건 — 순수 삭제+원복이므로)
- ~~**Customer Project 관리 메타데이터 계층**(2026-08-03)~~ — **위 항목으로 대체·삭제됨.** 의뢰 승인 시점에 즉시 생성되는
  읽기 전용 관리 화면. **기존 완료·검증 기능(`processJob()`·`executeJob()`·`.generated-websites`·
  `WebsiteRecord.outDir`·Deployment Pipeline·GitHub/Vercel Client·`triggerDeployment()`·
  `triggerWorkspaceProvisioning()`)은 단 한 줄도 수정하지 않았다** — 전부 Additive.
  `lib/customerProjects/{types,registry}.ts`(신규, 다른 모든 Registry와 동일한
  CollectionStore+`generateId` 패턴) — `CustomerProjectRecord`는 실제 프로젝트 폴더가 아니라
  `websiteOrderId` 하나만 들고 있는 순수 메타데이터(승인당 최초 1회만 생성, `findOrCreateCustomerProject()`로
  중복 방지). `lib/customerProjects/summary.ts`(신규, 순수 읽기 전용 join) — `WebsiteOrder`→
  `Client`→`AiJob`→`WebsiteRecord.outDir`→`ProjectRecord`(Workspace) 체인을 조회만 해서 진행
  단계(Approved/Generating/GenerationFailed/Generated/DeploymentFailed/Deployed)를 계산한다.
  `POST /api/customer-projects`(신규)는 `/developer/inquiries/[id]`의 "승인 및 생성" 클릭 시
  기존 `POST /api/ai-jobs/[id]/run`과 나란히(그 앞에) 호출되는 **완전히 별개의 API**이며, 실패해도
  AI 생성 실행을 막지 않는다. `/developer/customer-projects`(목록)·`/developer/customer-projects/[id]`
  (상세, 전 구간 읽기 전용 대시보드) 신규 페이지 + `DeveloperNav` 링크 1개 추가.
  `lib/audit/log.ts`에 `customerProject.create` 액션 추가(`app/developer/{audit-log,errors}/page.tsx`
  라벨/톤 맵 갱신). 신규 테스트 11개(`tests/customerProjects/{registry,summary}.test.ts`).
  `npx tsc --noEmit`·`npx eslint`·`npm run build` 전부 통과, `npm test` 75 files/600 tests 전부
  통과(신규 11개 포함, 기존 589개 전부 무변경으로 재통과 — 회귀 0건)
- **의뢰 승인 → Project Workspace 자동 생성**(2026-08-03) — AiJob(Website Builder) 생성 성공 직후,
  그 산출물(`outDir`)을 Development OS의 Project Manager(`lib/projects`)·Workspace
  Manager(`lib/workspaces`)에 자동 등록한다. 새 Domain/Registry를 만들지 않고
  `app/api/projects/import/route.ts`가 이미 쓰던 조합(`createWorkspace()` + `createProject()`,
  `createWorkspace`의 `mkdirSync`는 이미 존재하는 폴더에는 no-op)을 `lib/aiJobs/worker.ts`의
  신규 `triggerWorkspaceProvisioning()`에서 그대로 재사용 — `triggerDeployment()`와 나란히
  `processJob()`의 Success 이후 독립 실행되며, 실패해도 AiJob의 Success를 되돌리지 않는다(배포
  파이프라인과 동일한 원칙). `WebsiteOrderRecord`에 옵셔널 `projectId` 필드를 추가해 WebsiteOrder당
  최초 1회만 자동 등록하고(재시도로 새 `outDir`이 생겨도 이미 등록된 Workspace를 갈아끼우지
  않음), `ProjectRecord`에도 옵셔널 `autoProvisioned`·`websiteOrderId` 필드를 추가해 수동
  생성/Import와 구분한다(`lib/websiteOrders/registry.ts`의 `setWebsiteOrderProject()` 신규,
  `lib/projects/registry.ts`의 `createProject()` 입력 확장 — 둘 다 기존 patch 함수 패턴 그대로).
  `lib/audit/log.ts`에 `workspace.autoprovision` 액션 추가(`app/developer/{audit-log,errors}/page.tsx`
  라벨/톤 맵 갱신). `/developer/inquiries/[id]`의 "파이프라인 진행 상황" 카드에 5번째 단계
  "Project Workspace" 배지(생성되면 `/projects/{id}`로 링크) 추가, `/projects` 카드에 "AI 자동
  생성" 배지 추가(기존 `Imported` 배지와 같은 자리). 신규 테스트 5개
  (`tests/aiJobs/worker.test.ts`의 `triggerWorkspaceProvisioning()` describe 블록 — 최초 등록,
  재시도 시 중복 생성 방지, Website 실패 시 스킵, 연결된 Website 없을 때 스킵, Job 없을 때 스킵).
  `npx tsc --noEmit`·`npx eslint`·`npm run build` 전부 통과, `npm test` 73 files/589 tests 전부
  통과(신규 5개 포함, 회귀 없음)
- **AI Business OS Rewiring Phase 3 — 고객별 GitHub Repository + Vercel Project 자동 배포**(2026-07-24) —
  `lib/github/{types,client}.ts`·`lib/git/{types,client}.ts`·`lib/vercel/{types,client}.ts`·
  `lib/deployment/{types,pipeline}.ts` 신규(새 npm 의존성 없음, `fetch`만 사용 —
  `lib/design/figma-generator.ts`의 토큰/`fetchFn` 주입 관례 재사용). AI Generate(Website Builder)
  성공 직후 GitHub Repo 생성→Commit→Push→Vercel Project 생성→GitHub 연결→Production Deploy→
  `WebsiteRecord`에 결과 저장까지 자동 수행, 실패 시 이미 생성된 외부 리소스를 역순 롤백. 토큰이
  `commandEngine.execute()`의 로그(명령 문자열 전체 기록)에 남지 않도록 git push는 별도의 최소
  spawn 실행기로 분리했고, push 대상 URL도 `.git/config`에 영구 기록하지 않음(호출 1회의 인자로만
  존재). `GITHUB_TOKEN`/`VERCEL_TOKEN`이 이 환경에 없어 실제 계정으로 왕복 검증은 못했음 — 미설정
  시 가짜 URL을 만들지 않고 `WebsiteRecord.deploymentStatus="NotConfigured"`로 명시적으로 스킵.
  `lib/aiJobs/worker.ts`는 `executeJob()`/상태 전이 로직 무변경, `processJob()` 끝에 격리된 후속
  호출 1줄만 추가(배포 실패가 이미 성공한 AiJob을 되돌리지 않음). `lib/audit/log.ts`에
  `deployment.*` 8개 액션 추가(`app/developer/{audit-log,errors}/page.tsx` 라벨/톤/필터 맵 갱신).
  신규 테스트 49개(github/vercel 클라이언트 fetch mock, git 클라이언트는 fake runner unit + 실제
  git 서브프로세스 1건, deployment pipeline 성공/실패별 롤백 범위, aiJobs worker 트리거 조건).
  `npx tsc --noEmit`·`npm run build`·`npx eslint .` 전부 통과, `npm test` 73 files/564 tests
  전부 통과(신규 포함, 회귀 없음). 상세는 `PHASE3_REPORT.md`
- **AI Business OS Rewiring Phase 1/2/4 — `/api/external/inquiries` 의존 제거 + 내부 재배선**(2026-07-24) —
  선행 조사(아래 "✅ 해소됨" 섹션)에서 `CHATBOT_API_KEY`가 Production에 한 번도 설정된 적이 없어
  cnbiz.ai.kr 챗봇 연동이 실사용된 증거가 없음을 확인. 신규 `POST /api/inquiries`
  (`app/api/inquiries/route.ts`)가 기존 `createInquiry()`·`generateAnalysis()`·
  `findOrCreateClientByEmail()`·`createWebsiteOrder()`·`createAiJob()`·`notifyAdminOfNewInquiry()`를
  그대로 재사용(새 비즈니스 로직 없음), 단 AiJob은 자동 실행하지 않고 `Queued`로만 생성. `lib/auth/rbac.ts`에
  `UNGATED_EXACT_ROUTES`(method+path 정확히 일치하는 예외) 신설해 `POST /api/inquiries`만 비게이팅,
  `GET /api/inquiries`·`PATCH /api/inquiries/[id]`는 그대로 developer 게이팅 유지. cnbiz.kr
  `/contact` 폼 복원(`app/contact/page.tsx`, `components/sections/ContactForm.tsx`, `next.config.ts`
  리다이렉트 목록에서 제거 — `/request`는 유지). `/developer/inquiries/new`의 "AI 분석 시작" TODO를
  위 라우트 호출로 교체(이메일 필드 추가). `/developer/inquiries/[id]`의 기존 Job 실행 버튼이
  Queued 상태에서 "승인 및 생성"으로 라벨만 변경되어 관리자 승인 게이트 역할을 겸함(새 코드 없음,
  기존 `POST /api/ai-jobs/[id]/run` 그대로). `app/api/external/inquiries/**`·`lib/auth/apiKey.ts`·
  `.env.example`의 `CHATBOT_API_KEY`는 삭제하지 않고 `@deprecated` 주석만 추가(하위 호환).
  `npx tsc --noEmit`·`npm run build`·`npx eslint .` 전부 통과, `npm test` 68 files/510 tests
  전부 통과. 상세는 `REWIRING_REPORT.md`
- **문의 이메일 알림 로깅 보강**(2026-07-22) — `lib/contact/email/index.ts`에 `CONTACT_EMAIL_PROVIDER`가 `resend`가 아니거나 미설정일 때 noop provider로 폴백됨을 알리는 경고 로그 추가, `lib/inquiries/notify.ts`의 관리자 알림 성공/실패 로그에 `inquiry.id`를 포함하도록 개선(문제 추적 용이성 향상, 로직 변경 없음). `packages/cli/README.md`(신규, CLI 개요·설치·주요 명령 안내)·`packages/cli/src/templates/agent/examples.md`(신규, Agent 스캐폴딩 템플릿의 예시 섹션) 작성
- **Phase 01·02·09 대시보드 + AI 의뢰 관리 "새 문의 등록" UI**(2026-07-22) — Development OS에
  Analysis(`/developer/analysis`)·Planning(`/developer/planning`)·Deployment(`/developer/deployment`)
  3개 신규 대시보드를 추가. 새 분석/기획/배포 엔진·새 API·새 DB 컬렉션은 만들지 않고, 기존
  `lib/inquiries`·`lib/workflows`·`lib/health` 함수와 기존 문서(`REQUEST.md`류, WBS/로드맵,
  배포 가이드 등)만 fs로 읽어 연결(`lib/docs/{readDocEntry,readCiWorkflows}.ts` 신규, 순수 조회
  헬퍼). `components/developer/{DocList,Toast}.tsx` 신규(문서 미리보기·검증 실패 토스트, 다른
  페이지에서도 재사용 가능한 범용 컴포넌트). 3개 신규 페이지와 원본 데이터 화면(AI 의뢰 관리 ·
  Workflow Center · Health · Design · Website Builder) 사이에 상호 링크를 추가해 기존 Design
  Automation의 "이전/다음 단계" 내비게이션 관례를 따름. `/developer/inquiries/new`(AI 의뢰 관리
  확장) — 문의 등록 폼 UI, "AI 분석 시작"은 TODO 스텁(콘솔 로그만, 실제 AI 호출 없음).
  `npx tsc --noEmit`·`npm run lint`·`npm run build` 전부 통과, Playwright 실 브라우저로 로그인 →
  Phase 동선 전체 클릭 검증(Inquiries→Analysis→Planning→Workflow Center→Deployment→Health→
  Design→Storyboard, Website Builder→Deployment) 완료, 콘솔 에러 0건. 검증 과정에서 CI 트리거
  파싱 버그(`readCiWorkflows.ts`가 `on:` 블록 범위를 벗어난 `jobs: release:` 같은 무관한 키를
  트리거로 오인)를 발견해 즉시 수정. 이 커밋은 pre-commit SSOT 자동 동기화 훅이 로컬 `claude`
  CLI 헤드리스 호출 타임아웃으로 실패해 `--no-verify`로 진행했으며, 본 섹션은 그 대신 수동으로
  갱신함(사용자 승인)
- **아키텍처 감사 + CNBIZ.AI.KR 책임 경계 명시**(2026-07-21) — 목표 아키텍처(CNBIZ.KR→CNBIZ.AI.KR→AI Business OS)와 실제 구현을 대조 감사. CNBIZ.AI.KR은 이 저장소에 코드가 없는 외부 시스템이며 아직 자체 저장·알림을 하지 않음을 사용자 확인으로 검증. 목표상 CNBIZ.AI.KR 책임인 "Inquiry(+설문+첨부파일) 저장"·"관리자 알림"을 AI Business OS(`app/api/external/inquiries/route.ts`, `lib/inquiries/notify.ts`)가 임시로 대행 중임을 코드 주석으로 명시(로직·동작 변경 없음, 기능 삭제·이동 없음 — CNBIZ.AI.KR이 아직 이관받을 준비가 안 됐으므로). AI Analysis/Client/WebsiteOrder/AiJob/Admin/Website Builder는 이미 목표와 일치해 무변경
- **AI Business OS Phase 2 — 실제 AI Provider 연동 검증 시도**(2026-07-20) — 코드 변경 없음, 검증만 수행. `packages/cli provider list`로 5개 Provider(anthropic/openai/gemini/ollama/openrouter) 전부 `configured:false` 확인, `chatViaCli()` 실제 호출 결과 `"ANTHROPIC_API_KEY is not configured."`로 명시적 실패(즉 시뮬레이션 폴백). `.env.local`(루트·`apps/cnbiz-web` 둘 다) 어디에도 AI Provider 키 없음, 로컬 Ollama도 미실행. 지시대로 임의의 키 생성·우회 없이 이 사실을 그대로 보고. 대신 실제 도달 가능한 범위(파이프라인 전체 배선·결정론적 폴백 경로·파싱 안정성)를 5개 샘플 Inquiry(레스토랑/병원/법률사무소/쇼핑몰/기업홈페이지, 완전도 20~100점 분포)로 실 E2E 검증 — Completeness/Missing Items가 매번 수동 계산과 정확히 일치함을 확인. 발견된 한계: 폴백 경로의 `detectedBusinessType`은 `siteType`이 `WEBSITE_TYPES`와 매칭되면 `industry` 텍스트보다 우선시되어(법률사무소 샘플이 "기업 홈페이지"로만 표시됨), `recommendedPages`/`recommendedFunctions`는 모든 업종에서 동일한 고정 기본값만 반환 — 실제 AI 연결 전까지는 업종별 차별화가 없다는 점을 실측으로 확인(설계상 알려진 한계이지 버그 아님)
- **AI Business OS Phase 2 — AI Analysis Engine 구축**(2026-07-20) — `lib/ai-analysis/{types,score,prompts,analysis}.ts` 신규. Completeness(10개 체크리스트 항목×10점)·Missing Items는 `score.ts`가 규칙 기반으로 결정론적 계산(회사명/담당자명/연락처/서비스 설명/업종/로고/사진/참고사이트/브랜드컬러/도메인 — `survey`가 챗봇 자유 형식이라 키·값 느슨한 패턴 매칭으로 존재 추정). Business Type/추천 페이지·기능/Summary는 기존 `chatViaCli()`(Design Automation과 동일 브릿지) 재사용, Provider 미설정/파싱 실패 시 `siteType`→`WEBSITE_TYPES` 라벨 매핑 기반 결정론적 폴백(Design Automation의 resolve→parse→fallback 패턴 그대로). `POST /api/external/inquiries`에서 Inquiry 생성 직후 자동 실행되어 결과를 새 컬렉션 없이 기존 `inquiries` 레코드에 `analysis`/`analyzedAt`로 저장(`saveInquiryAnalysis()`). `/developer/inquiries/[id]`에 "AI 분석" 카드 추가. `AiJobType`·`AiJobStatus`·Website Builder·기존 Inquiry/Client/WebsiteOrder/AiJob 생성 로직·관리자 Inquiry 목록 화면은 지시대로 무변경(확장만). 기술 견적서/기능 명세서/프로젝트 타임라인은 이번에도 생성하지 않음(다음 Phase가 이 Analysis 결과를 입력으로 사용할 예정). 신규 테스트 15개(`tests/ai-analysis/{score,analysis}.test.ts`) + 실제 `POST /api/external/inquiries` 호출 → Supabase(로컬은 fsStore) 저장 → `/developer/inquiries/[id]` Playwright 렌더링까지 실 E2E 확인(콘솔 에러 0건). `npm test` 60 files/465 tests 전부 통과
- **AI Business OS Phase 1 — Inquiry 생성/관리자 화면 연결**(2026-07-20) — `POST /api/external/inquiries`(이미 구현되어 있던 오케스트레이션 엔드포인트)를 요청 스펙의 `POST /api/inquiries`로 채택(신규 엔드포인트 미생성, 관리자 전용 `/api/inquiries` GET과 경로/인증 계층 충돌 방지). `lib/inquiries/{types,validate}.ts`에 `industry`·`survey`·`uploadedFiles` 옵셔널 필드 추가 + `customerName`/`consultation` 별칭 파싱(기존 `contactName`/`requirements` 필드·타입은 무변경). 응답에 `status` 필드 추가. `/developer/inquiries`·`/developer/inquiries/[id]`(AI 의뢰 관리자 화면) 신규 — `/developer/requests`와 동일한 컴포넌트/패턴 재사용, Inquiry.status와 연결된 AiJob.status를 조합해 "신규 접수/AI 분석·생성 중/생성 완료/생성 실패"를 파생 표시(두 타입 모두 무변경). `AiJobType`·`AiJobStatus`·Website Builder 실행 로직은 지시대로 수정하지 않음. 기술 견적서/기능 명세서/프로젝트 타임라인은 코드베이스에 실제로 존재하지 않음을 전수 검색으로 확인 후 이번 범위에서 명시적으로 제외(다음 Phase로 이월)
- **PROJECT_STATUS.md 기재 오류 발견·수정** — 이 문서가 "AiJob 자동 실행 트리거 없음"을 "가장 중요한 미연결 지점"이라 계속 기재하고 있었으나, 실제로는 커밋 `74c12b0`(이 세션 이전)에서 이미 `POST /api/external/inquiries`가 `processJob()`을 직접 호출하도록 연결되어 있었음을 git log로 확인. 문서만 갱신되지 않았던 stale 상태였음
- **테스트 스위트 회귀 수정**(2026-07-20) — CNBIZ.KR 브랜드 피벗(아래) 세션에서 `/api/contact`·`/api/requests/submit`를 삭제하며 관련 테스트를 갱신하지 않아 발생한 실패 3건(`tests/auth/{rbac,proxy}.test.ts`)을 새 동작(두 경로 모두 이제 developer 게이팅)에 맞게 수정, 삭제된 `lib/contact/store.ts`를 참조하던 `tests/contact/store.test.ts` 삭제. `npm test` 58 files/450 tests 전부 통과 확인(이전엔 인지되지 못한 채 3 files/4 tests 실패 상태였음)
- **CNBIZ.KR 브랜드 홈페이지 피벗**(2026-07-20) — Header/Footer/CTA에서 문의·제작 의뢰 제거, `/contact`·`/request`(+API) 삭제 후 cnbiz.ai.kr로 308 redirect, `lib/links.ts`(`CNBIZ_AI_URL`) 신규. lint/tsc/build 통과 확인(당시 vitest는 실행하지 않아 위 회귀를 놓쳤음 — 이후 세션에서 발견·수정)
- **AI Job Worker/Executor 구현 + 자동 실행 연결**(2026-07-19) — `lib/aiJobs/{worker,executor}.ts` 신규, `POST /api/external/inquiries`에서 생성 직후 `processJob()` 호출(커밋 `74c12b0`)
- **Customer Inquiry Pipeline 도메인 모델 확립 + External API + Admin CRUD**(2026-07-19) — Inquiry→Client→WebsiteOrder→AiJob 설계, `POST /api/external/inquiries` 오케스트레이션, 관리자 CRUD 8개 라우트
- **Agent→Skill Phase 2 완료 + Repository 운영 규칙 확립**(2026-07-19) — `prompts/*.md` 5개 병합, `CLAUDE.md`/`README.md`에 신규 프로젝트 규칙·Packages Promotion Checklist·Repository Review Checklist 추가
- `apps/cnbiz-web`로 Development OS 전체 이관(커밋 `526831e`, 2026-07-15)

---

## 다음 작업 우선순위

1. **프로덕션에 남은 진단용 테스트 의뢰 2건 삭제** — "Diag Test Co"·"Diag Test Co 2"가 실제 프로덕션 Supabase에 생성된 채 남아있음(Vercel의 Sensitive 환경변수 제약으로 CLI에서 실제 값을 읽지 못해 REST API로 직접 삭제하지 못함). `/developer/inquiries`에서 관리자가 직접 삭제 필요
2. **`WebsiteOrderRecord.aiJobIds` 누락 수정** — `app/api/inquiries/route.ts`가 `createAiJob()` 후 `addAiJobToWebsiteOrder()`를 호출하지 않아 항상 빈 배열로 남음(2026-08-03 E2E 검증 중 발견, 동작 영향 없는 낮은 우선순위 결함)
3. **cnbiz.ai.kr이 실제로 이 시스템과 연동해야 하는지 최종 확인** — Rewiring 조사 결과 지금까지 실사용 증거가 없었음이 확인됐으나, cnbiz.ai.kr이 향후 실제로 연동할 계획이라면 `@deprecated`로 남겨둔 `/api/external/inquiries`·`CHATBOT_API_KEY`를 언제 완전히 제거할지 결정 필요. 연동 계획이 없다면 별도 커밋으로 제거
4. **실제 AI Provider 연결** — 이 환경엔 `packages/cli`가 지원하는 5개 Provider 중 하나도 설정되어 있지 않음(`.env.local` 2곳·로컬 Ollama 전부 확인). 하나라도 연결되어야 AI Analysis Engine·Estimate/Specification/Timeline/Contract/Proposal Generator의 진짜 판단 경로(현재는 결정론적 폴백만 동작 확인됨)를 검증할 수 있음
5. **`/request`도 `/contact`처럼 내부 처리로 전환할지 결정** — `/contact`는 복원했지만 `/request`는 아직 cnbiz.ai.kr로 308 redirect 중
6. **Client/WebsiteOrder 전용 관리자 목록 화면** — 현재는 Inquiry 상세·`/projects`에서만 연결된 레코드 확인 가능
7. **회원가입 백엔드 + 역할관리 UI**
8. **Portfolio 실콘텐츠·회사 연락처 정보 확정**(자료 수령 필요)

---

## Git 커밋

### 모든 변경사항 한 번에 커밋

```bash
git add -A
git commit -m "feat: 작업 내용"
git push origin main
```

### 진행률 자동 업데이트 (Claude Code)

```text
현재 프로젝트 전체를 분석해서 PROJECT_STATUS.md를 업데이트해줘.

실제 구현된 코드만 기준으로 작성하고,
완료 / 진행 중 / 미구현 기능을 구분해서
전체 진행률과 다음 작업 우선순위를 업데이트해줘.
```

## Git 커밋 방법

### 모든 변경사항 한 번에 커밋

```bash
git status
git add -A
git commit -m "feat: 업데이트 내용"
git push origin main
```

### 한 줄로 실행

```bash
git add -A && git commit -m "feat: 업데이트 내용" && git push origin main
```

### 커밋 메시지 예시

```bash
feat: 의뢰 접수 페이지 구현
feat: AI 홈페이지 생성 기능 추가
feat: 고객 대시보드 구현
fix: 관리자 로그인 오류 수정
docs: 프로젝트 진행률 업데이트
refactor: 코드 구조 개선
```

### 작업 순서

1. 기능 개발
2. PROJECT_STATUS.md 진행률 업데이트
3. `git add -A`
4. `git commit -m "작업 내용"`
5. `git push origin main`

---

# 개발 작업 규칙 (Working Rules)

## Single Source of Truth

- PROJECT_STATUS.md를 프로젝트의 Single Source of Truth(SSOT)로 사용한다.

## 구현 규칙

- 이미 구현된 기능은 수정·재구현·리팩터링하지 않는다.
- PROJECT_STATUS.md에서 "미구현" 또는 "일부 구현"으로 표시된 항목만 작업한다.
- 작업 전에 기존 코드의 재사용 여부를 먼저 확인한다.
- 새로운 Domain, API, Registry, Auth, RBAC, Website Builder를 생성하는 것은 금지한다.

## 작업 절차

1. PROJECT_STATUS.md 확인
2. 기존 코드 검색
3. 기존 구현 재사용 여부 확인
4. 필요한 경우에만 구현
5. PROJECT_STATUS.md 업데이트
6. 테스트
7. Git Commit

## 구현 금지

다음은 이미 구현되어 있으므로 새로 만들지 않는다.

- Domain Registry
- CollectionStore
- CRUD API
- Authentication
- RBAC
- Website Builder
- External Inquiry Orchestration
- Notification(Email)