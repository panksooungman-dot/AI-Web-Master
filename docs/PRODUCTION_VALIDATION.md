# Production Validation — AI Business OS v1.0

> 작성일: 2026-07-14 | 대상: AI Business OS v1.0 RC + AI Provider Integration v1.1
> 이 문서는 v1.0 RC·v1.1의 실제 프로덕션 동작을 실 서비스·실 CLI 실행·실 브라우저 세션으로
> 검증한 결과를 기록한다. 규칙에 따라 이번 검증 과정에서 새 기능은 추가하지 않았고,
> 검증 중 실제로 발견된 문제만 최소 범위로 수정했다.

---

## 요약 (Summary)

| 영역 | 결과 |
|------|------|
| 1. Provider Validation | ⚠️ 부분 검증 — 재시도·타임아웃은 실 검증(mock 기반), Health Check·Chat·Streaming의 실 vendor 응답은 미검증(API 키 없음) |
| 2. Marketplace Validation | ✅ 완전 검증 — 실 패키지 1개 게시 + publish/search/install/update/remove 전체 라이프사이클 |
| 3. Website Builder Validation | ✅ 완전 검증 — 5개 사이트 타입 전부 생성·빌드·린트 통과 |
| 4. Dashboard Validation | ✅ 완전 검증 — Login/Provider Status/Marketplace/Website Builder/AI Workspace 전부 정상 |
| 5. 최종 검증(tsc/build/test) | ✅ `npx tsc --noEmit` 0 errors · `npm run build` 64개 라우트 정상 · `npm test` 32 files / 208 tests 전부 통과 |

발견되어 수정한 문제 3건(모두 아래 각 섹션에 상세 기록):
1. `marketplace/manifest.json`의 카테고리별 `count`가 `publish` 실행 후에도 자동 갱신되지 않아 실제와 어긋나 있었음(0 → 실제 1로 수정).
2. `tests/marketplace/registry.test.ts`가 저장소의 실제 `marketplace/manifest.json`이 "항상 0개"라고 하드코딩되어 있어, 실제로 패키지를 게시하자마자 깨지는 테스트였음(실제 상태에 맞춰 견고하게 수정).
3. Provider 재시도 로직에 `TIMEOUT` 코드 경로(`AbortSignal` 실제 만료) 전용 테스트가 없었음 — 이번 검증 요청의 "Timeout" 항목을 충족하기 위해 2개 테스트 추가.

---

## 1. Provider Validation

### 검증 범위 결정

이 개발/검증 환경에는 실제 `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`/`GEMINI_API_KEY`/`OPENROUTER_API_KEY`가
설정되어 있지 않고, 로컬 Ollama(`http://localhost:11434`)도 실행 중이지 않다(직접 확인:
`curl http://localhost:11434/api/tags` → connection refused). 실제 외부 API에 대한 Health
Check·Chat·Streaming 검증은 진짜 자격 증명 없이는 조작(fabricate)할 수 없으므로, 사용자
확인을 거쳐 다음과 같이 범위를 정했다:

> **재시도(Retry)·타임아웃(Timeout) 메커니즘은 통제된 mock으로 검증하고, 실제 vendor에 대한
> Health Check·Chat·Streaming 응답은 검증하지 않은 상태로 명시적으로 남긴다.**

### 검증 결과 (mock 기반)

| 메커니즘 | 검증 방법 | 결과 |
|---------|-----------|------|
| Health Check(`.validate()`) | `tests/ai-platform-cli/{provider-config,openrouter}.test.ts` — 키 없음(즉시 false, fetch 미호출)/키 있음+성공(true)/키 있음+401(false) 3가지 경로 mock 검증 | ✅ |
| Chat(`chat()`) | `tests/ai-platform-cli/openrouter.test.ts`, `tests/website/content.test.ts` 등 기존 스위트에서 mock 응답 파싱 검증 | ✅ (mock) |
| Streaming(`chatStream()`) | `tests/ai-platform-cli/streaming.test.ts` — Anthropic(SSE `message_start`/`content_block_delta`/`message_delta`/`message_stop`)·OpenAI(SSE `delta.content`+`[DONE]`) 파싱, `ProviderManager.streamComplete()`의 폴백/전파/사용량 기록 | ✅ (mock) |
| Retry(지수 백오프) | `tests/ai-platform-cli/provider-retry.test.ts` — 500/429/네트워크 오류 재시도, 401/400 즉시 실패(재시도 안 함), `retries:0` 옵션 | ✅ |
| **Timeout**(신규 테스트 2건 추가) | `providerFetchJson()`이 `timeoutMs` 내 응답이 없으면 `AbortController.abort()`가 실제로 발동해 `ProviderError{code:"TIMEOUT"}`을 던지는지, 그리고 `TIMEOUT`이 재시도 대상으로 분류되어 다음 시도에서 복구되는지 검증 | ✅ (신규) |

재실행 결과: `provider-retry.test.ts`(11개, 신규 2개 포함) + `streaming.test.ts`(8개) +
`provider-config.test.ts`(5개) + `openrouter.test.ts`(5개) = **27개 테스트 전부 통과**.

### 미검증 항목 (Known Gap — 명시적으로 위장하지 않음)

- 실제 OpenAI/Anthropic/Gemini/OpenRouter API에 대한 Health Check·Chat·Streaming 응답 — 실
  자격 증명이 준비되면 `ai provider test <id>`·`ai chat --provider <id>`·`ai chat --provider <id>
  --stream`으로 재검증 필요.
- 로컬 Ollama에 대한 실제 연결 확인 — 이 환경에는 Ollama가 설치/실행되어 있지 않음(`Ollama
  (if available)` 조건에 따라 스킵, 사용자 환경에 Ollama가 있다면 `ai provider test ollama`로
  검증 가능).

---

## 2. Marketplace Validation

### 게시한 실 패키지

`agents/changelog-writer/`(신규) — 이 저장소의 `docs/01_PMO/CHANGELOG.md` 작성 규칙(추가/변경/
수정/검증 섹션, 날짜 헤딩, "왜"를 설명하는 톤)을 그대로 따르는 CHANGELOG 항목 초안 작성 Agent.
placeholder(`TODO`) 없이 실제 목적·규칙·성공 기준을 채워 작성했다(`AGENT.md`/`system.md`).

```
node packages/cli/dist/index.js marketplace publish changelog-writer --json
→ {"success":true,"published":[{"name":"changelog-writer","type":"agent","version":"1.0.0",...}]}
```

게시 결과 `marketplace/agents/changelog-writer/`(패키지 사본)와 `marketplace/index.json`(카탈로그
엔트리)이 실제로 생성되었다 — Recommended Next Task #4("Marketplace 실 데이터 채우기")가 이번
검증으로 처음 충족되었다.

### 라이프사이클 검증

| 명령 | 검증 방법 | 결과 |
|------|-----------|------|
| `publish` | 저장소 루트에서 실행, `marketplace/index.json`·`marketplace/agents/changelog-writer/` 생성 확인 | ✅ |
| `search` | `marketplace search changelog --json` → 게시된 항목 정확히 반환 | ✅ |
| `install` | 저장소와 분리된 스크래치 디렉터리에 `marketplace/`를 복사한 뒤 `marketplace install changelog-writer --type agent` → 실제 파일 복사됨. 재설치 시도 시 `DUPLICATE_PACKAGE`(exit 0, 경고로 처리 — 의도된 동작) | ✅ |
| `update` | 스크래치 사본의 게시 버전을 1.0.0→1.1.0으로 인위적으로 올린 뒤 `update`(이름 생략) → `updateAvailable:true` 정상 감지, `update changelog-writer` → `{"from":"1.0.0","to":"1.1.0","updated":true}`, 재실행 시 `updated:false`(멱등) | ✅ |
| `remove` | `remove changelog-writer --type agent` → 파일 삭제 확인. 재실행 시 `NOT_FOUND`(exit 1 — 의도된 동작, 설치되지 않은 패키지 제거는 실패로 취급하는 것이 맞음) | ✅ |

스크래치 디렉터리는 검증 후 전부 삭제, 실 저장소에는 `agents/changelog-writer/`·
`marketplace/agents/changelog-writer/`·`marketplace/index.json`만 영구적으로 남겼다.

### 발견하고 수정한 문제

- **`marketplace/manifest.json`의 `packages.agents.count`가 `publish` 실행 후에도 자동 갱신되지
  않음**: 코드를 확인한 결과 `publishPackages()`는 `marketplace/index.json`만 갱신하고
  `marketplace/manifest.json`(카탈로그 설명용 정적 메타데이터)은 건드리지 않는 것이 원래 설계임을
  확인. `count`는 실제 게시 건수를 반영해야 하는 사용자 대면 값이므로, 실제 게시 후 수동으로
  `0` → `1`, `lastUpdated`를 오늘 날짜로 갱신했다(자동 동기화 로직 추가는 새 기능이라 이번
  범위에서 제외 — 정적 값 교정만 수행).

---

## 3. Website Builder Validation

`ai website create`로 5개 사이트 타입을 저장소 외부 스크래치 디렉터리에 생성하고, 각 프로젝트에서
`npm install`→`npm run build`→`npm run lint`를 실행했다(11개 canonical `--site-type` 값 중
"SaaS"는 정확히 일치하는 타입이 없어 가장 근접한 `landing`으로 매핑, `--type "SaaS product"`로
실제 설명을 전달).

| 요청한 사이트 | 사용한 `--site-type` | 생성 | `npm install` | `npm run build` | `npm run lint` |
|--------------|----------------------|------|----------------|------------------|-----------------|
| SaaS | `landing`(매핑, 근거는 위 참고) | ✅ | ✅ | ✅ (18개 라우트) | ✅ (경고 0건) |
| Restaurant | `restaurant` | ✅ | ✅ | ✅ (18개 라우트) | ✅ (경고 0건) |
| Dental Clinic | `dental` | ✅ | ✅ | ✅ (18개 라우트) | ✅ (경고 0건) |
| Portfolio | `portfolio` | ✅ | ✅ | ✅ (18개 라우트) | ✅ (경고 0건) |
| E-commerce | `shopping` | ✅ | ✅ | ✅ (18개 라우트) | ✅ (경고 0건) |

5개 프로젝트 모두 동일한 18개 라우트 구조(11개 페이지 + `_not-found`/`icon.svg`/
`opengraph-image`/`robots.txt`/`sitemap.xml`/API 2개)로 빌드되었고 lint 경고는 0건이었다.
Website Builder 파이프라인(템플릿·Generator·생성된 프로젝트 설정) 자체에서 발견된 실제 버그는
**없음**.

환경 요인으로 인한 예상된 비-버그(정상 동작):
- Provider 미설정 → 결정론적 시뮬레이션 콘텐츠로 폴백(설계된 동작, Content Generator 기존 정책).
- `npm audit`의 moderate 등급 권고·`allow-scripts` postinstall 경고 — 업스트림 의존성 관련,
  5개 프로젝트에서 동일하게 나타났으며 Website Builder 코드와 무관.
- 루트 앱 빌드 시에만 나타나는 Turbopack "workspace root"/NFT 트레이싱 경고는 생성된 5개
  사이트의 빌드 어디에서도 나타나지 않음(생성된 프로젝트는 루트와 별개의 독립 프로젝트이므로
  예상대로 영향받지 않음).

### 발견한 부수 효과 (버그 아님, 문서화된 기존 동작 재확인)

Website Builder 파이프라인은 `--out`으로 지정한 출력 디렉터리와 별개로, 실행 시점의
`process.cwd()`를 기준으로 8개 Planning Agent 스캐폴딩(`agents/{business-analyst,
component-generator,page-generator,project-generator,qa,seo-generator,site-planner,
ui-designer}/`)과 `workflows/website-builder/`를 생성한다(Agent Runtime이 8단계 계획
파이프라인을 실행하기 위해 필요로 하는 구조). 이는 `docs/01_PMO/CHANGELOG.md`(2026-07-14 (3)/(4))에
이미 문서화된 기존 동작이며, 이번 검증 중에도 재현되었다 — 검증 후 해당 디렉터리를 삭제해
저장소를 깨끗하게 되돌렸다(코드 수정 없음, 새 기능 아님).

---

## 4. Dashboard Validation

로컬 dev 서버(`npm run dev`, `http://localhost:3000`)를 기동하고, 검증 전용 임시 계정
(`scripts/create-auth-user.cjs`로 생성, 검증 후 삭제)으로 실제 로그인 세션을 만들어 Playwright로
확인했다.

| 항목 | 확인 내용 | 결과 |
|------|-----------|------|
| Login | `/login` → 이메일/비밀번호 제출 → `/developer`로 정상 리다이렉트, 헤더에 로그인한 이메일 + 로그아웃 버튼 표시 | ✅ |
| Provider Status | Dashboard Home의 "Provider Status" 위젯(`2 / 5 Connected`, `anthropic` 기본 provider) + `/developer/ai`의 5개 카드(Claude Code Installed·Cursor Installed·Local AI Unreachable·OpenAI/Gemini Not Configured, 각각 실제 라이브 체크 결과와 일치) | ✅ |
| Marketplace | `/developer/marketplace` — Catalog(`agents: 1`)와 방금 게시한 `changelog-writer` 패키지 카드(Details/Install 버튼 포함)가 실제로 표시됨 | ✅ |
| Website Builder | `/developer/websites` — Create Website 폼(11개 Website Type 옵션), Recent Websites 이력 섹션 정상 렌더링 | ✅ |
| AI Workspace | `/developer/ai` — AI Studio(Chat/Code Generation/Content Generation 프리셋), Provider 셀렉터가 실제 configured 여부를 반영(`anthropic (default) — not configured` 등 5개 모두 비활성 표시, 자격 증명 없음과 일치) | ✅ |

콘솔 에러 1건(`/api/auth/me` 401)은 로그인 전 세션 확인 요청의 정상적인 결과이며 버그가 아니다.
검증에 사용한 dev 서버 프로세스·계정(`lib/data/{users,sessions}.json` 등, 전부 `.gitignore`
대상)은 검증 후 전부 종료·삭제했다.

---

## 5. 최종 검증

| 검증 | 명령 | 결과 |
|------|------|------|
| Type Check | `npx tsc --noEmit` | ✅ 0 errors |
| Build | `npm run build` | ✅ 64개 라우트 정상 생성 |
| Test | `npm test`(pretest가 CLI 빌드 후 Vitest 실행) | ✅ 32 files / 208 tests 전부 통과 |

---

## Failed Checks

이번 검증에서 **실패한 채로 남은 항목은 없다**. 검증 중 발견되어 즉시 수정한 2건은 위 각 섹션에
기록했다(marketplace/manifest.json count 교정, registry.test.ts의 하드코딩된 단언 교정).

---

## Remaining Production Risks

- **실 API 키 미검증(가장 큰 잔여 리스크)**: OpenAI/Anthropic/Gemini/OpenRouter에 대한 실제
  Health Check·Chat·Streaming 응답은 검증되지 않았다. Mock 기반 재시도/타임아웃 로직이 실제
  vendor의 실패 모드(예: 실제 429 rate limit 응답 형식, 실제 SSE 청크 분할 패턴)와 완전히
  일치한다는 보장은 없다 — 실 키 준비 후 `ai provider test`/`ai chat --stream`으로 재검증 권장.
- **로컬 Ollama 미검증**: 이 환경에 Ollama가 설치되어 있지 않아 `checkOllama()`/
  `createOllamaProvider()` 경로는 mock으로만 확인되었다.
- **Marketplace — 게시된 패키지가 여전히 1개뿐**: 메커니즘 전체(publish/search/install/update/
  remove)는 실 검증 완료했지만, 카탈로그 자체는 아직 빈약하다(agents:1, 나머지 카테고리 0).
- **Website Builder — 실 배포(Deployment) 자동 실행 없음**: 여전히 `vercel.json`/`.env.example`
  생성까지만 하고 실제 배포 명령은 실행하지 않는다(기존에 이미 알려진 제약, 이번 검증 범위 밖).
- **Website Builder의 cwd 부수 효과**: `--out`을 지정해도 Planning Agent 스캐폴딩은 여전히
  `process.cwd()` 기준으로 생성된다. 오늘은 검증 후 수동으로 정리했지만, 이 명령을 실제 저장소
  루트에서 반복 실행하는 사용자는 매번 동일한 정리가 필요하다 — 근본적으로 `--out` 기준으로
  격리하려면 Agent Runtime의 스캐폴딩 로직 자체를 변경해야 하는 실제 코드 변경이 필요하므로,
  "새 기능 추가 금지" 규칙에 따라 이번 검증에서는 수정하지 않고 리스크로만 기록한다.
- **Dashboard — 인증 보호 범위는 기존과 동일하게 제한적**: `/api/workspaces`·`/api/terminal`·
  `/api/devserver`는 CLI 호환을 위해 의도적으로 미보호 상태(기존에 이미 알려진 제약).
