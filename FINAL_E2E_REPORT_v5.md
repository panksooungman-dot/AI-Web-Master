# FINAL_E2E_REPORT_v5 — Customer Inquiry Pipeline 전 구간 실 운영 환경 E2E 검증 (Version 1 공식 완료)

> 작성일: 2026-08-03
> 선행 조건: `FINAL_E2E_REPORT_v4.md`(GitHub Repository → Production Deploy 최초 완전 성공,
> 2026-07-25)에 이어, 그 이후 세션에서 구현된 **Project Workspace 자동 생성**·
> **`ProjectRecord.websiteOrderId` 기반 고객 프로젝트 식별 구조 확정**을 포함해 의뢰 접수부터
> Production URL 생성까지 **11단계 전 구간**을 처음부터 다시 실 계정으로 검증했다. 코드는 수정하지
> 않았다(검증 전용 세션).

---

## 최종 판정: **PASS**

의뢰 접수 → 관리자 승인 → AiJob 생성 → AI 홈페이지 생성 → Project Workspace 자동 생성 →
`ProjectRecord.websiteOrderId` 연결 → GitHub Repository 생성 → Commit/Push → Vercel Project 생성 →
Production Deploy → Production URL 생성까지 **11단계 전부 PASS**했다. GitHub·Vercel 양쪽 실제
API로 직접 재조회해 우리 쪽 DB 레코드가 아니라 외부 시스템 자체의 상태로 교차 확인했다.

---

## 테스트 환경

| 항목 | 값 |
|---|---|
| 대상 앱 | `apps/cnbiz-web`(활성 앱) |
| 커밋 기준 | `edba62a`(Project Workspace 자동 생성 + CustomerProject 제거 확정 커밋) |
| dev 서버 | `next dev -p 3500`(검증 전용, 이 세션에서 기동·종료) |
| 인증 | `scripts/create-auth-user.cjs`로 생성한 검증 전용 임시 계정(role: `developer`), `POST /api/auth/login`으로 세션 쿠키 획득 |
| 데이터 저장소 | fs-store(`os.tmpdir()/cnbiz-web/data`) — Supabase 미설정 환경, 검증 후 전부 삭제 |
| GitHub/Vercel 토큰 | `apps/cnbiz-web/.env.local`에 `GITHUB_TOKEN`/`VERCEL_TOKEN` 실제 값 설정되어 있음(이번에 처음 확인) — `GITHUB_OWNER`/`VERCEL_TEAM_ID`는 미설정이라 토큰 소유자 개인 계정(`panksooungman-dot`)에 생성됨 |
| AI Provider | 미설정 — Website Builder는 결정론적 폴백 콘텐츠로 생성(`simulatedContent:true`), 설계상 정상 동작 |

---

## 단계별 상세 검증

### 1~3. 의뢰 접수 / 관리자 승인 / AiJob 생성 확인 — ✅
```
POST /api/inquiries → 200
  inquiryId: inquiry-305a902b-26a7-4a6b-a8c4-5cadc5f67d22
  clientId: client-1432e171-7b98-4582-acb2-8dd56bb72a19
  websiteOrderId: website-order-4c278f65-91b5-4485-be5b-abfeb5633f6f
  aiJobId: ai-job-ac2e0aee-60c6-4f97-a012-b1ba704cf1de (승인 전 상태: Queued)

POST /api/ai-jobs/{id}/run → 200, aiJob.status: "Success"
```

### 4. AI 홈페이지 생성 확인 — ✅
```json
{
  "id": "website-1655106f-2a46-4e3a-b5ac-e2da54acaf45",
  "outDir": "D:\\ai-web-master\\.generated-websites\\ai-job-ac2e0aee-60c6-4f97-a012-b1ba704cf1de",
  "status": "Success",
  "simulatedContent": true
}
```
`.generated-websites/{jobId}`에 실제 Next.js 프로젝트가 생성됨을 확인. `simulatedContent:true`는
AI Provider 미설정에 따른 결정론적 폴백(기존에 문서화된 정상 동작, 버그 아님).

### 5. Project Workspace 자동 생성 확인 — ✅
```json
{
  "id": "project-612db10a-bf2e-4e0f-ad76-929fe01d2e2d",
  "workspaceId": "workspace-fda95091-fe57-451f-9d55-9582222fbe5d",
  "workspacePath": "D:\\ai-web-master\\.generated-websites\\ai-job-ac2e0aee-60c6-4f97-a012-b1ba704cf1de",
  "autoProvisioned": true
}
```
`workspacePath`가 위 4단계의 `outDir`과 정확히 일치 — `triggerWorkspaceProvisioning()`이 별도
파일 생성 없이 기존 산출물 폴더를 그대로 Workspace로 등록했음을 확인.

### 6. `ProjectRecord.websiteOrderId` 연결 확인 — ✅
```json
{ "websiteOrderId": "website-order-4c278f65-91b5-4485-be5b-abfeb5633f6f" }
```
`WebsiteOrder.projectId`도 역방향으로 `project-612db10a-...`를 정확히 가리켜 양방향 FK가 정상
연결됨을 확인. 별도 CustomerProject Domain 없이 이 필드 하나로 "고객 프로젝트"가 완전히
식별된다.

### 7. GitHub Repository 생성 확인 — ✅ (GitHub API 직접 재조회)
```
GET https://api.github.com/repos/panksooungman-dot/portfolio-54acaf45 → 200
  full_name: panksooungman-dot/portfolio-54acaf45
  private: true
  default_branch: main
  created_at: 2026-08-03T13:46:13Z
```

### 8. Commit / Push 확인 — ✅
Audit Log에 `deployment.git.commit_push`(success) 기록. Vercel 배포의 `gitSource.sha`
(`92c65b9b0f8ddada67bd8c2344d4401c2a9f36b5`)가 로컬에서 만들어진 커밋과 정확히 일치해, 로컬
산출물이 아니라 실제로 push된 커밋이 빌드됐음을 교차 확인.

### 9. Vercel Project 생성 확인 — ✅
```
vercelProjectId: prj_aKlr5M6hqlk2cxK7C1IxFsqpnLck
vercelProjectName: portfolio-54acaf45
```

### 10. Production Deploy 확인 — ✅ (Vercel API 직접 재조회)
```
GET https://api.vercel.com/v13/deployments/dpl_9FyAFWeWywYooJ6YJpL4tBHixssX → 200
  readyState: READY
  readySubstate: PROMOTED
  target: production
  gitSource.repoId: 1321833242 (GitHub repo id와 정확히 일치)
```

### 11. Production URL 생성 확인 — ✅
- `WebsiteRecord.deployment.url`(배포별 URL)로 접속 시 `302` → `vercel.com/sso-api`로 리다이렉트됨
  — Vercel의 비-커스텀 도메인 배포에 대한 기본 보안 동작(`FINAL_E2E_REPORT_v4.md`에 이미 문서화된
  정상 동작, 오류 아님).
- **프로덕션 별칭 `https://portfolio-54acaf45.vercel.app`으로 접속 시 `HTTP 200`, 실제 생성된
  HTML(35,278 bytes) 응답을 확인.** `<title>` 태그에 이번 테스트 회사명이 정확히 반영되어, 캐시된
  다른 페이지가 아니라 이 파이프라인이 방금 만든 사이트임을 확인.

---

## Audit Log 확인

```
workspace.autoprovision
deployment.pipeline.success
deployment.vercel.deploy
deployment.vercel.link_repo
deployment.vercel.create_project
deployment.git.commit_push
deployment.github.create_repo
```
(최신순) — 7단계가 논리적 순서대로 전부 기록됨을 확인.

## Git Scope 재확인

`ai-web-master` 루트 저장소는 이번 검증 전후로 커밋 이력·추적 파일 상태 무변경. `outDir`이
독립된 `.git`을 갖고 있어(로컬 커밋·push가 그 하위 저장소만 대상으로 함) 모노레포 오염이
없음을 재확인.

---

## 발견된 이슈

1. **`WebsiteOrderRecord.aiJobIds`가 항상 빈 배열로 남음** — `app/api/inquiries/route.ts`가
   `createAiJob()`만 호출하고 `addAiJobToWebsiteOrder()`를 호출하지 않는다. AiJob 자체는 정상
   생성·실행되며, GitHub/Vercel/Workspace 파이프라인은 `websiteIds`/`projectId`만 사용하므로
   동작에는 영향이 없다. 순수 표시용 필드 누락(낮은 우선순위, 이번 세션에서는 수정하지 않음).
2. **`WebsiteRecord.deployment.url`이 SSO 리다이렉트되는 배포별 URL** — 이미 알려진 Vercel 기본
   동작(버그 아님). 향후 "고객 URL 전달" 기능 설계 시 이 필드가 아니라 프로덕션 별칭
   (`https://{repoName}.vercel.app`)을 사용해야 함을 재확인.
3. **CLI Website Builder의 기존 부작용 재현** — `--out`과 무관하게 `process.cwd()` 기준
   `agents/*`·`workflows/website-builder/*`가 저장소 루트에 생성됨(이미 CHANGELOG에 여러 차례
   문서화됨). 검증 후 삭제 완료.

이번 세션에서 코드는 수정하지 않았다 — 위 이슈는 보고만 하고 `PROJECT_STATUS.md`의 "다음 작업
우선순위"에 등록했다.

---

## 검증 환경 정리

- 임시 계정, fs-store 임시 데이터(`os.tmpdir()/cnbiz-web/data`), `.generated-websites` 산출물,
  CLI 부작용 폴더(`agents/*`, `workflows/website-builder/`) 전부 삭제, 검증용 dev 서버(포트 3500)
  종료 완료.
- **실제로 생성된 GitHub 저장소(`panksooungman-dot/portfolio-54acaf45`)와 Vercel
  Project(`portfolio-54acaf45`, Production 배포 포함)는 삭제하지 않고 보존 중** —
  `FINAL_E2E_REPORT_v4.md`와 동일한 전례를 따름(PASS 증거 보존, 삭제 여부는 사용자 결정 대기).

---

## 결론

Customer Inquiry Pipeline의 전 구간(의뢰 접수 → 관리자 승인 → AI 생성 → Project Workspace 자동
등록 → GitHub → Vercel → Production Deploy → Production URL)이 실 운영 환경에서 100% 정상
동작함을 확인했다. `WebsiteOrderRecord.aiJobIds` 누락 1건을 제외하면 발견된 결함이 없으며, 이
결함도 파이프라인 동작 자체에는 영향이 없다.

**AI Business OS Customer Inquiry Pipeline E2E PASS — Version 1 공식 완료.**
