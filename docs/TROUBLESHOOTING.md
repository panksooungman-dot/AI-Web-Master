# TROUBLESHOOTING — 문제 해결 가이드

> AI Business OS v1.0

---

## 로그인 / 권한 (RBAC)

### `/developer` 또는 `/admin`에서 "403 접근 권한이 없습니다"가 표시됩니다

로그인은 됐지만 현재 계정의 역할(Role)이 해당 영역에 접근할 수 없는 상태입니다. `docs/ADMIN_GUIDE.md`의 접근 매트릭스를 확인하고, 운영자에게 역할 변경을 요청하세요.

```bash
node scripts/set-user-role.cjs <email> developer   # 또는 admin / super_admin
```

### v1.0으로 업그레이드한 뒤 갑자기 대시보드에 들어갈 수 없습니다

v1.0 이전(RBAC 도입 이전)에 만든 계정은 역할 정보가 없어 **자동으로 `user`(최소 권한)로 취급**됩니다 — 보안 기본값이지 버그가 아닙니다. 아래로 역할을 부여하세요.

```bash
node scripts/set-user-role.cjs <기존-계정-이메일> developer
```

### API 요청이 401을 반환합니다

로그인 세션이 없거나 만료된 상태입니다(세션은 7일 후 만료). 다시 로그인하세요. `curl`/스크립트로 API를 직접 호출한다면 로그인 API(`POST /api/auth/login`)로 받은 세션 쿠키(`ai_session`)를 함께 보내야 합니다.

### 로그인 후 원하는 페이지가 아니라 다른 곳으로 이동합니다

`?redirect=` 없이 로그인하면 역할에 따라 기본 페이지로 이동합니다: `developer`/`super_admin` → `/developer`, `admin` → `/admin`, `user` → `/`. 특정 페이지로 가려다 로그인했다면(`/login?redirect=...`) 그 페이지로 정확히 돌아갑니다.

### `/admin`에 로그인해서 들어갔는데 404가 뜹니다

정상입니다 — v1.0에는 `/admin` 아래 실제 페이지가 아직 없습니다(보호 로직만 미리 구현됨). `docs/ADMIN_GUIDE.md` 2번을 참고하세요.

### 계정을 새로 만들 수 없습니다 (회원가입 페이지가 동작하지 않음)

의도된 설계입니다 — 회원가입 API가 없습니다. 서버 콘솔에서 `node scripts/create-auth-user.cjs <email> <password> [role]`로만 계정을 생성할 수 있습니다.

### 비밀번호를 잊어버렸습니다

비밀번호 재설정 기능(이메일 발송 등)은 아직 구현되어 있지 않습니다. 서버 콘솔 접근 권한이 있는 운영자가 `lib/data/users.json`에서 해당 계정을 삭제한 뒤 `create-auth-user.cjs`로 동일 이메일·새 비밀번호·기존 역할로 다시 생성하는 방법뿐입니다.

---

## 설치 / 빌드

### `npm install` 후 `npm run dev`가 안 됩니다

Node.js 버전을 확인하세요(LTS 권장). `node -v`가 너무 오래된 버전이면 Next.js 16이 정상 동작하지 않을 수 있습니다.

### `npm run build`가 실패합니다

```bash
npx tsc --noEmit   # 타입 오류를 먼저 확인
npm run lint       # ESLint 오류 확인
```

두 명령이 모두 통과하는지 먼저 확인한 뒤 빌드를 재시도하세요.

### `npm test`가 `packages/cli` 빌드 단계에서 실패합니다

`npm test`의 `pretest` 훅이 `packages/cli`를 먼저 빌드합니다. `packages/cli` 디렉터리에서 `npm run build`를 단독으로 실행해 어떤 파일에서 실패하는지 확인하세요.

### 특정 테스트가 간헐적으로(재실행 시 통과) 실패합니다

`tests/agents/taskQueue-retry.test.ts`, `tests/providers/status.test.ts` 등 타이밍/실 네트워크 호출에 의존하는 일부 테스트는 환경에 따라 드물게 타임아웃할 수 있습니다. 동일 파일만 단독으로 재실행해 통과하면 실 코드 문제가 아닙니다.

---

## Website Builder

### `POST /api/websites` 또는 Design Automation의 Website Builder 단계가 "packages/cli가 아직 빌드되지 않았습니다" 오류를 반환합니다

```bash
npm run build --workspace=@ai-business-os/cli
```

먼저 CLI를 빌드해야 대시보드에서 `ai website create`를 실행할 수 있습니다.

### 생성된 웹사이트 콘텐츠가 전부 기본 문구(플레이스홀더)입니다

AI Provider가 설정되지 않았거나 연결에 실패하면 결정론적 기본 콘텐츠로 자동 폴백합니다(오류가 아님, 화면에 "Simulated" 배지로 표시됩니다). `docs/INSTALL.md` 5번의 환경 변수(`ANTHROPIC_API_KEY` 등)를 설정하세요.

---

## Design Automation

### Figma Export 또는 Website Builder 연동이 409를 반환합니다

대상 Review가 아직 승인(Approve)되지 않았습니다. `/developer/design/review`에서 먼저 승인하세요.

### Figma Import/Export가 "simulated: true"로만 표시됩니다

`FIGMA_API_TOKEN` 환경 변수가 없거나 Figma API 호출에 실패한 경우입니다. 콘텐츠 자체는 항상 정상적으로 생성되며(결정론적 폴백), 토큰을 설정하면 실제 Figma API 결과로 대체됩니다.

---

## CLI (`ai` 명령)

### 설치 후에도 `ai` 명령을 찾을 수 없습니다

새 PowerShell 창을 열어보세요(PATH가 새로 열린 세션부터 반영됩니다). 그래도 안 되면 `Get-Command ai -All`로 PATH 상에 여러 버전이 있는지 확인하고, `packages/cli/install.ps1`을 다시 실행하세요.

### `ai --version`이 예상보다 낮은 버전을 표시합니다

설치 스크립트는 로컬 클론에 있는 코드를 그대로 패키징합니다 — 저장소를 최신으로 pull한 뒤 재설치하세요.

---

## 그 밖의 문제

`docs/REPOSITORY_INDEX.md`(저장소 전체 구현 현황)와 `docs/01_PMO/CHANGELOG.md`(변경 이력)에서 관련 기능이 실제로 어떻게 구현·검증되었는지 확인할 수 있습니다. 알려진 제약사항은 `docs/RELEASE_NOTES_v1.0.md`의 "Known Issues"를 참고하세요.
