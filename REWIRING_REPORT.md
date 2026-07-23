# AI Business OS Rewiring Report

> 작성일: 2026-07-23
> 목표: 기존 기능을 유지한 채, `/api/external/*`(cnbiz.ai.kr 챗봇 전제) 없이도 Customer Inquiry
> Pipeline이 내부적으로 완결되도록 재배선. 새 비즈니스 로직은 추가하지 않고 기존
> `createInquiry()` 등 registry 함수를 그대로 재사용.

---

## Phase 1 — 완료

### 1. `POST /api/inquiries` 신규 (내부 진입점)

- 파일: `apps/cnbiz-web/app/api/inquiries/route.ts`
- 기존 `app/api/external/inquiries/route.ts`가 하던 오케스트레이션을 그대로 재사용:
  `parseInquiryInput`/`validateInquiryInput` → `createInquiry()` → `generateAnalysis()`/
  `saveInquiryAnalysis()` → `findOrCreateClientByEmail()`/`addInquiryToClient()` →
  `createWebsiteOrder()`/`addWebsiteOrderToClient()` → `createAiJob()` →
  `linkInquiryToClientAndOrder()` → `notifyAdminOfNewInquiry()`. **새로 작성한 로직은 없음** —
  전부 기존에 이미 존재하고 테스트되어 있던 함수 호출.
- 외부 라우트와의 차이 2가지(의도적):
  1. `x-api-key` 검사 없음 — 같은 오리진(cnbiz.kr 문의 폼, `/developer/inquiries/new` 관리자
     폼)에서만 호출되므로 API Key가 필요 없음.
  2. **`processJob()`을 자동 호출하지 않음** — AiJob을 `Queued` 상태로만 만들어두고, 관리자가
     승인해야 실행되도록 함(Phase 2).
- RBAC: `lib/auth/rbac.ts`에 **정확히 `(POST, /api/inquiries)`만** 게이팅 제외하는
  `UNGATED_EXACT_ROUTES`를 신설(경로 prefix가 아닌 메서드+경로 정확히 일치). `GET /api/inquiries`
  (관리자 목록 조회)와 `PATCH /api/inquiries/[id]`는 그대로 `developer` 세션 게이팅 유지.
  `proxy.ts`가 `resolveProtectedArea(pathname, request.method)`로 메서드를 함께 전달하도록 수정.

### 2. cnbiz.kr 문의 폼 → `POST /api/inquiries`

- `/contact`는 "CNBIZ.KR 브랜드 피벗"(2026-07-20) 이후 cnbiz.ai.kr로의 308 리다이렉트만 있고
  실제 폼이 없었다(파일 자체가 삭제된 상태). 이번 작업으로 **복원**:
  - `apps/cnbiz-web/app/contact/page.tsx`(신규) — Hero + 폼 조합, Metadata 적용
  - `apps/cnbiz-web/components/sections/ContactHeroSection.tsx`(신규)
  - `apps/cnbiz-web/components/sections/ContactForm.tsx`(신규, Client Component) — 담당자명/
    이메일/연락처/회사명/희망 사이트 유형/예산/문의 내용 입력, `lib/inquiries/validate.ts`의
    `parseInquiryInput()`/`validateInquiryInput()`를 **그대로 재사용**(검증 로직 중복 작성 없음),
    `POST /api/inquiries`로 제출
  - `apps/cnbiz-web/next.config.ts` — `/contact` 리다이렉트 제거(`/request`는 유지, 아래 "범위
    밖" 참고)
- `@cnbiz/ui`(Button/Input/Select/Textarea)·`@cnbiz/layout-primitives`(Container/Section) 등
  기존 공유 컴포넌트만 사용, 새 UI 프리미티브 없음.

### 3. `/developer/inquiries/new`의 TODO 제거 → `createInquiry()` 연결

- 파일: `apps/cnbiz-web/app/developer/inquiries/new/page.tsx`
- "AI 분석 시작" 버튼(`handleAnalyze`)이 콘솔 로그만 남기던 것을, `POST /api/inquiries`(Contact
  폼과 동일한 진입점, `source: "manual"`)를 실제로 호출하도록 교체. 성공 시
  `/developer/inquiries/[id]`로 이동.
- 이 폼에 없던 **이메일 필드를 추가**했다 — `InquiryInput.email`이 필수값(`validateInquiryInput`)
  인데 원래 폼에는 이메일 입력란 자체가 없어 그대로 연결하면 항상 400이 났다. 최소한의 필수
  필드 보강으로 판단해 추가함(새 비즈니스 로직이 아니라 기존 스키마에 폼을 맞춘 것).
- 파일 첨부는 실제 업로드 백엔드(Supabase Storage)가 없어 이번 범위에 포함하지 않음 — 파일명만
  감사 목적으로 `rawPayload.uploadedFileNames`에 담아 보냄(실제 URL 아님). 남은 TODO로 명시.

---

## Phase 2 — 완료 (신규 코드 없음, 기존 연결부 재사용 확인 + 라벨 정리)

- `/developer/inquiries/[id]`에 **이미** `Queued`/`Failed` 상태의 AiJob에 실행 버튼이 있었고
  (`handleRunJob` → `POST /api/ai-jobs/[id]/run` → `lib/aiJobs/worker.ts`의 `processJob()`),
  Phase 1에서 자동 실행을 껐기 때문에 **이 버튼이 곧 "관리자 승인 → AI Generate Workflow
  실행"이 된다.** 별도 승인 API나 워크플로 코드를 새로 만들지 않았다.
- 명확성을 위해 `Queued` 상태일 때의 버튼 라벨만 "지금 실행" → **"승인 및 생성"**으로 변경
  (`Failed` 상태는 기존과 동일하게 "재실행" 유지). 호출하는 API·로직은 완전히 동일.

---

## Phase 3 — 보류 (구현하지 않음, 아래 사유로 확인 필요)

**"AI Generate 완료 후 Git Commit → Git Push → Vercel Deploy"를 연결하지 않았습니다.** 코드
조사 결과 실행 전 반드시 확인이 필요한 구조적 문제를 발견했습니다.

1. **커밋할 대상이 없음** — Website Builder(`lib/aiJobs/executor.ts`)의 산출물은
   `.generated-websites/<job.id>/`에 생성되는데, 이 경로는 `.gitignore:51`에 이미
   `/.generated-websites/`로 등록되어 있습니다. 즉 `git-commit` 스텝을 이 저장소(`cwd: repoRoot`)
   기준으로 실행해도 **커밋할 변경사항이 애초에 없습니다**(git이 그 폴더 자체를 무시함).
2. **대상 저장소가 불명확** — 생성된 사이트 자체는 `git init`이 되어 있지 않습니다(Website
   Builder는 파일만 생성, 별도 Git 저장소를 만들지 않음). "Git Commit/Push"가 (a) 이 플랫폼
   저장소(`AI-Web-Master`, `main` 브랜치) 자체를 의미하는지, (b) 생성된 고객 사이트를 위한
   **별도 신규 저장소**를 의미하는지가 코드·문서 어디에도 정의되어 있지 않습니다.
3. **(a)로 해석할 경우의 리스크** — `.gitignore` 예외 처리를 해서 매 AiJob마다 고객이 생성한
   정적 사이트 산출물을 이 플랫폼의 `main` 브랜치에 커밋·푸시하도록 만들면, (i) 이 저장소가
   고객 데이터로 무한히 불어나고, (ii) Vercel Git 연동이 `apps/cnbiz-web`(플랫폼 자체)만
   빌드하므로 그 push가 실제로는 "고객 사이트 배포"가 아니라 **플랫폼 자체의 무의미한
   재배포**만 유발합니다 — 요청하신 목적(고객 사이트를 실제로 배포)과 맞지 않습니다.
4. **프로젝트 Git 정책과의 충돌** — `CLAUDE.md`는 "Git Commit, Push는 반드시 사용자 승인 후
   진행한다"를 명시하고 있습니다. 관리자가 "승인"(Phase 2)을 누를 때마다 **추가 확인 없이**
   자동으로 `main`에 push까지 실행되는 구조는 이 정책과 정면으로 충돌합니다.

**Workflow Engine 자체(`lib/workflows/engine.ts`)는 `git-commit`/`git-push` Step Kind를 이미
지원**하므로(2026-07-03 구현), 재사용할 준비는 되어 있습니다. 다만 어디에 무엇을 커밋/푸시할
것인지가 정해져야 안전하게 연결할 수 있습니다 — 아래 "확인 필요" 참고.

---

## Phase 4 — 완료 (삭제하지 않고 `@deprecated` 주석만 추가)

삭제한 파일 없음. 아래에 `@deprecated` 블록 주석만 추가하고 동작은 그대로 유지:

| 파일 | 비고 |
|---|---|
| `app/api/external/inquiries/route.ts` | 여전히 정상 동작(하위 호환), 내부 대체 경로 명시 |
| `app/api/external/inquiries/[id]/route.ts` | 동일 |
| `lib/auth/apiKey.ts` | `CHATBOT_API_KEY`가 Production에 한 번도 설정된 적 없다는 사실 명시 |
| `.env.example`의 `CHATBOT_API_KEY` 항목 | 주석만 갱신 |
| `lib/auth/rbac.ts`의 `/api/external` 관련 주석 | Deprecated 사유 명시 |

실제 호출자가 없음이 최종 확인되면(별도 커밋으로) 다음을 함께 제거:
`app/api/external/**`, `lib/auth/apiKey.ts`, `lib/external/status.ts`(GET 라우트 전용 헬퍼),
`.env.example`의 `CHATBOT_API_KEY` 줄, `lib/auth/rbac.ts`의 `"/api/external"` 항목,
`tests/auth/apiKey.test.ts`·`tests/external/status.test.ts`·`tests/auth/rbac.test.ts`의 관련
케이스.

---

## 변경 파일 목록

**수정 (12개)**
```
apps/cnbiz-web/.env.example
apps/cnbiz-web/app/api/external/inquiries/[id]/route.ts
apps/cnbiz-web/app/api/external/inquiries/route.ts
apps/cnbiz-web/app/api/inquiries/route.ts
apps/cnbiz-web/app/developer/inquiries/[id]/page.tsx
apps/cnbiz-web/app/developer/inquiries/new/page.tsx
apps/cnbiz-web/lib/auth/apiKey.ts
apps/cnbiz-web/lib/auth/rbac.ts
apps/cnbiz-web/lib/inquiries/notify.ts
apps/cnbiz-web/next.config.ts
apps/cnbiz-web/proxy.ts
apps/cnbiz-web/tests/auth/rbac.test.ts
```

**신규 (3개)**
```
apps/cnbiz-web/app/contact/page.tsx
apps/cnbiz-web/components/sections/ContactForm.tsx
apps/cnbiz-web/components/sections/ContactHeroSection.tsx
```

---

## 검증

- `npx tsc --noEmit`(apps/cnbiz-web) — 0 errors
- `npm test`(apps/cnbiz-web) — **68 files / 510 tests 전부 통과**(신규 rbac 테스트 1건 포함,
  회귀 없음)
- `npm run build`(apps/cnbiz-web) — 106개 라우트 정상 생성(`/contact` 정적 페이지, `/api/inquiries`
  동적 라우트로 정상 포함), 기존에 있던 무관한 Turbopack NFT 경고 1건만 존재(이번 변경과 무관,
  이전 세션부터 존재)
- **의도적으로 하지 않은 검증**: 로컬 `next dev`로 `POST /api/inquiries`를 실제 curl/브라우저로
  호출하는 E2E는 수행하지 않았습니다. `apps/cnbiz-web/.env.local`에 실제 `RESEND_API_KEY`·
  `CONTACT_EMAIL_TO`·`CONTACT_EMAIL_FROM` 값이 이미 설정되어 있어(값 확인, 길이만 확인하고
  내용은 출력하지 않음), 실행 시 `notifyAdminOfNewInquiry()`가 **실제 이메일을 발송**하게
  됩니다 — 요청되지 않은 부수 효과라 판단해 스킵했습니다. 대신 이 경로가 호출하는 모든 함수
  (`createInquiry`·`findOrCreateClientByEmail`·`createWebsiteOrder`·`createAiJob`·
  `linkInquiryToClientAndOrder`·`saveInquiryAnalysis`·`parseInquiryInput`/`validateInquiryInput`)
  는 기존 테스트로 개별 검증되어 있고, 새로 작성한 것은 이 함수들을 조합하는 라우트 코드
  자체뿐입니다. 실제 이메일 발송까지 포함한 전체 E2E 확인이 필요하면 말씀해 주세요.
- `git status` — 위 목록 그대로, 커밋은 하지 않았습니다(사용자 승인 대기).

---

## 확인 필요 (다음 진행 전 결정 사항)

1. **Phase 3 대상**: "Git Commit → Push → Vercel Deploy"가 (a) 이 플랫폼 저장소를 뜻하는지,
   (b) 생성된 고객 사이트마다 별도 저장소/Vercel 프로젝트를 새로 만드는 것을 뜻하는지 확인
   부탁드립니다. (b)라면 저장소 생성 API(GitHub 등) 연동이 이번 범위를 넘어서는 신규 설계가
   필요합니다.
2. **자동 push의 승인 정책**: Phase 3을 (a)로 진행하더라도, `CLAUDE.md`의 "Git Commit/Push는
   사용자 승인 후 진행" 원칙을 이 자동화 흐름에 예외로 둘지 확인이 필요합니다.
3. **`/request`**: 이번 작업은 `/contact`만 복원했습니다. `/request`(별도 페이지)는 여전히
   cnbiz.ai.kr로 리다이렉트됩니다 — 그대로 둘지 별도로 알려주시면 이어서 처리하겠습니다.
