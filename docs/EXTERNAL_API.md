# EXTERNAL_API — CNBIZ.AI.KR 연동 가이드

> 대상: `cnbiz.ai.kr` AI 챗봇(서버-투-서버 호출자)
> 구현 위치: `apps/cnbiz-web/app/api/external/**`
> 인증: API Key (`x-api-key` 헤더)

---

## 1. 개요

`cnbiz.ai.kr`의 AI 챗봇이 방문자와의 대화를 통해 홈페이지 제작 의뢰를 수집하면, 이 API로 넘겨
AI Business OS의 기존 파이프라인을 그대로 태운다.

```
문의 접수 (POST /api/external/inquiries)
    ↓
Inquiry 생성 → Client(find-or-create) → WebsiteOrder 생성 → AiJob 생성
    ↓
AiJob 즉시 실행(Worker) → Website Builder CLI 실행 → Website 산출물 생성
    ↓
진행 상태 조회 (GET /api/external/inquiries/{inquiryId})
```

이 API가 감싸는 실제 엔진(Inquiry/Client/WebsiteOrder/AiJob Registry, Worker, Website
Builder CLI)은 전부 이미 존재하던 것을 그대로 재사용한다 — 이 문서가 다루는 것은
`cnbiz.ai.kr`이 호출하는 **바깥쪽 계약**뿐이다.

---

## 2. 인증

모든 `/api/external/**` 요청은 헤더로 API Key를 전달해야 한다.

```
x-api-key: <CHATBOT_API_KEY>
```

- 운영 환경에서는 서버의 `CHATBOT_API_KEY` 환경변수가 반드시 설정되어야 하며, 값이 다르면
  `401`을 반환한다.
- 로컬 개발(`next dev`)에서 `CHATBOT_API_KEY`가 설정되지 않은 경우에 한해 인증을 생략할 수
  있다(개발 편의, 프로덕션에서는 절대 허용되지 않음).
- 이 API 그룹은 브라우저 세션(로그인)을 요구하지 않는다 — 챗봇이 서버 간 호출로 직접
  사용하는 것을 전제로 한다.

요청 제한(스팸/키 유출 방지): 동일 발신 IP 기준 10분당 30회. 초과 시 `429`.

---

## 3. POST /api/external/inquiries — 문의 접수

챗봇 대화가 끝나고 확보한 정보를 그대로 넘긴다. 이 한 번의 호출로 Inquiry·Client·
WebsiteOrder·AiJob이 모두 생성되고, AiJob은 이 요청이 끝나기 전에 즉시 실행되어 완료
(`Success`/`Failed`)까지 진행된 뒤 응답한다.

### Request

```http
POST /api/external/inquiries
Content-Type: application/json
x-api-key: <CHATBOT_API_KEY>
```

```json
{
  "source": "chatbot",
  "externalConversationId": "conv-abc123",
  "companyName": "테스트상사",
  "contactName": "김대표",
  "email": "client@example.com",
  "phone": "010-1234-5678",
  "siteType": "restaurant",
  "requirements": "이탈리안 레스토랑 홈페이지, 예약 폼 필요",
  "budget": "300만원",
  "rawPayload": { "any": "챗봇이 남기고 싶은 원본 데이터 — 그대로 감사 로그에 보관됨" }
}
```

| 필드 | 필수 | 설명 |
|---|:---:|---|
| `source` | | `"chatbot"` \| `"manual"` (기본값 `"chatbot"`) |
| `externalConversationId` | | 챗봇 세션/대화 스레드 ID (중복 접수 추적용) |
| `companyName` | | 회사명 |
| `contactName` | ✅ | 담당자명 |
| `email` | ✅ | 이메일 (형식 검증) |
| `phone` | | 연락처 |
| `siteType` | | 업종/사이트 유형 |
| `requirements` | ✅ | AI가 정리한 요구사항 요약 |
| `budget` | | 예산 |
| `rawPayload` | | 원본 페이로드(그대로 보관, 감사/디버깅용) |

### Response `200`

```json
{
  "success": true,
  "inquiryId": "inquiry-1784530058496",
  "clientId": "client-1784530058487",
  "websiteOrderId": "website-order-1784530058490",
  "aiJobId": "ai-job-1784530058496"
}
```

**`inquiryId`가 이후 진행 상태를 조회할 때 쓰는 유일한 추적 번호다.**

### Error responses

| 상태 | 상황 |
|---|---|
| `400` | 요청 형식이 JSON이 아니거나, `contactName`/`email`/`requirements` 등 필수값 누락·형식 오류 |
| `401` | API Key 누락/불일치 |
| `429` | 요청 제한 초과 |

---

## 4. GET /api/external/inquiries/{inquiryId} — 진행 상태 조회

챗봇이 `inquiryId`로 언제든 폴링할 수 있는 상태 조회 엔드포인트. 하나의 응답에 진행
단계·에러·생성된 Website 정보·완료 시간을 모두 담는다.

### Request

```http
GET /api/external/inquiries/inquiry-1784530058496
x-api-key: <CHATBOT_API_KEY>
```

### Response `200`

```json
{
  "success": true,
  "inquiryId": "inquiry-1784530058496",
  "status": "Completed",
  "stages": {
    "received":         { "done": true,  "at": "2026-07-20T06:47:38.496Z" },
    "orderCreated":      { "done": true,  "at": "2026-07-20T06:47:38.490Z" },
    "jobCreated":        { "done": true,  "at": "2026-07-20T06:47:38.496Z" },
    "running":           { "done": true,  "at": "2026-07-20T06:47:39.226Z" },
    "websiteGenerated":  { "done": true,  "at": "2026-07-20T06:47:41.552Z" },
    "deployed":          { "done": false, "at": null },
    "completed":         { "done": true,  "at": "2026-07-20T06:47:41.552Z" },
    "failed":            { "done": false, "at": null }
  },
  "error": null,
  "order": {
    "id": "website-order-1784530058490",
    "name": "테스트상사 홈페이지 제작",
    "siteType": "restaurant",
    "status": "Requested"
  },
  "website": {
    "id": "website-1784530061552",
    "name": "테스트상사 홈페이지 제작",
    "siteType": "restaurant",
    "previewUrl": null,
    "deployUrl": null
  },
  "completedAt": "2026-07-20T06:47:41.552Z"
}
```

### `status` 값

| 값 | 의미 |
|---|---|
| `Received` | 문의 접수됨(Inquiry만 생성됨) |
| `OrderCreated` | 제작 주문(WebsiteOrder) 생성됨 — 요구사항의 "Project 생성" 단계 |
| `JobCreated` | AI Job 생성됨(아직 실행 전, Queued) |
| `Running` | Worker가 실행 중 |
| `Completed` | Website 생성까지 완료 |
| `Failed` | 실패 또는 관리자에 의해 취소됨 |

`stages` 객체는 위 6개 값보다 더 세분화된 8개 항목(접수/Project 생성/AI Job 생성/Running/
Website 생성/Deploy/Completed/Failed)을 각각 `done`/`at`으로 보여준다 — 챗봇이 진행률 UI를
만들 때는 `stages`를, 단순 분기만 필요하면 `status`를 쓰면 된다.

### `error`

`status`가 `Failed`일 때만 값이 채워진다. Worker 실행 중 발생한 실제 오류 메시지(또는
관리자가 취소한 경우 "제작이 취소되었습니다.")를 그대로 담는다.

### `website` / Preview URL·Deploy URL 관련 중요 안내

> **이 저장소에는 아직 실제 배포 파이프라인이 없다.** Website Builder는 서버 로컬 디스크
> (`.generated-websites/`)에 프로젝트 파일을 생성할 뿐, 어딘가에 호스팅해 접속 가능한 URL을
> 발급하지 않는다. 따라서 `previewUrl`/`deployUrl`은 **현재 항상 `null`**이다.
>
> 계약(응답 스키마) 자체는 두 필드를 지금부터 포함해 두었으므로, 이후 실제 배포 파이프라인이
> 추가되어도 `cnbiz.ai.kr` 쪽 파싱 코드를 바꿀 필요 없이 값만 채워지기 시작한다. 지금
> 이 값들로 실제 웹사이트를 열어보고 싶다면(관리자 전용) `/developer/websites`에서 산출물
> 목록과 로컬 경로를 확인해야 한다 — 이 API는 외부에 서버 파일 경로를 노출하지 않는다.

### Error responses

| 상태 | 상황 |
|---|---|
| `401` | API Key 누락/불일치 |
| `404` | 존재하지 않는 `inquiryId` |
| `429` | 요청 제한 초과 |

---

## 5. 전체 시나리오 예시 (curl)

```bash
# 1) 문의 접수
curl -X POST https://cnbiz.kr/api/external/inquiries \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CHATBOT_API_KEY" \
  -d '{
    "contactName": "김대표",
    "email": "client@example.com",
    "requirements": "레스토랑 홈페이지 제작 문의"
  }'
# → { "success": true, "inquiryId": "inquiry-...", ... }

# 2) 상태 폴링 (몇 초 간격으로 반복)
curl https://cnbiz.kr/api/external/inquiries/inquiry-... \
  -H "x-api-key: $CHATBOT_API_KEY"
# → status가 "Completed" 또는 "Failed"가 될 때까지 반복
```

실제로는 `POST /api/external/inquiries`가 응답을 돌려줄 때 이미 Worker 실행까지 끝나 있는
경우가 대부분이다(동기 실행). 그래도 폴링 엔드포인트를 별도로 제공하는 이유는 (a) 관리자가
실패한 Job을 재시도했을 때처럼 상태가 나중에 바뀌는 경우, (b) 향후 비동기 처리로 전환될 때도
챗봇 쪽 코드를 바꾸지 않기 위함이다.

---

## 6. 구현 메모 (내부 참고용)

- `POST`: `apps/cnbiz-web/app/api/external/inquiries/route.ts` (기존, 무수정)
- `GET`: `apps/cnbiz-web/app/api/external/inquiries/[id]/route.ts` (신규)
- 상태 조합 로직: `apps/cnbiz-web/lib/external/status.ts` (신규) — 기존
  `lib/inquiries`·`lib/websiteOrders`·`lib/aiJobs`·`lib/websites` Registry의 조회 함수만
  조합한다. 새 저장소·새 필드를 추가하지 않았다.
- 인증은 `lib/auth/apiKey.ts`의 `verifyExternalApiKey()`를 그대로 재사용(신규 인증 코드 없음).
