# INSTALL — 설치 가이드

> AI Business OS v1.0 · Development OS(대시보드) + AI Business OS CLI(`ai` 명령) 설치 안내
> 대상: 이 저장소를 로컬/사내 서버에 처음 설치·구동하는 운영자

---

## 1. 요구 사항

| 항목 | 버전/비고 |
|------|-----------|
| Node.js | LTS 권장 (18 이상) |
| npm | Node.js에 포함된 버전 |
| OS | Windows 10(21H2 이상) / 11 권장 — CLI 설치 스크립트가 `winget`으로 Git/Node.js/VS Code를 자동 설치. macOS/Linux에서도 Development OS 자체(`npm run dev`)는 동작하나 `packages/cli`의 PowerShell 설치 스크립트(`install.ps1`, `Setup.cmd`)는 Windows 전용 |
| Git | 저장소 클론 및 GitHub Manager 기능에 필요 |

---

## 2. Development OS(대시보드) 설치

```bash
git clone <repository-url> ai-web-master
cd ai-web-master
npm install
```

`npm install`은 npm workspaces 모노레포 전체(`app/`·`lib/`·`components/`, `apps/cnbiz-web`, `packages/*`)의 의존성을 한 번에 설치합니다.

### 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 Development OS가 실행됩니다.

- `/`, `/about`, `/services`, `/portfolio`, `/contact`, `/login` 등은 로그인 없이 접근 가능합니다.
- `/developer/**`, `/projects/**`는 로그인이 필요하며, `/developer/**`는 **RBAC 역할(Role)**에 따라 추가로 제한됩니다 — 아래 3번, 그리고 `docs/ADMIN_GUIDE.md`를 참고하세요.

### 프로덕션 빌드

```bash
npm run build
npm start
```

빌드 전 확인:

```bash
npx tsc --noEmit   # 타입 체크
npm run lint       # ESLint
npm test           # Vitest 전체 테스트 (packages/cli 자동 빌드 후 실행)
```

---

## 3. 최초 계정 생성 (RBAC)

이 저장소에는 회원가입(Signup) API가 없습니다 — 계정은 오직 서버 콘솔에서 스크립트로만 생성합니다. v1.0부터 모든 계정은 4개 역할(Role) 중 하나를 가집니다: `user` · `admin` · `developer` · `super_admin`. 역할별 접근 범위는 `docs/ADMIN_GUIDE.md`를 참고하세요.

```bash
node scripts/create-auth-user.cjs <email> <password> [role]
```

- `role`을 생략하면 기본값은 `user`입니다(대시보드 접근 불가, 최소 권한).
- 대시보드(`/developer/**`)에 처음 들어갈 관리자 계정은 반드시 `developer` 또는 `super_admin`으로 생성하세요.

```bash
# 예시 — 대시보드 전체를 사용할 최초 관리자 계정
node scripts/create-auth-user.cjs owner@example.com "강력한 비밀번호" super_admin
```

이후 [http://localhost:3000/login](http://localhost:3000/login)에서 로그인하면 역할에 맞는 화면(`developer`/`super_admin` → `/developer`, `admin` → `/admin`, `user` → `/`)으로 자동 이동합니다.

기존 계정의 역할을 바꿔야 한다면:

```bash
node scripts/set-user-role.cjs <email> <role>
```

---

## 4. AI Business OS CLI(`ai` 명령) 전역 설치

Development OS와 별개로, 어떤 컴퓨터·어떤 프로젝트에서도 쓸 수 있는 전역 CLI가 `packages/cli`에 있습니다.

**더블클릭(권장, Windows)**: `packages/cli/Setup.cmd`

**PowerShell**:
```powershell
.\packages\cli\install.ps1
```

Git·Node.js·VS Code 설치 확인(없으면 winget으로 자동 설치) → `npm install -g`로 `ai` 명령 전역 등록 → 세션 PATH 즉시 반영 → `ai doctor`로 최종 점검까지 자동 수행됩니다.

```powershell
ai doctor      # 설치 상태 점검
ai new         # 새 프로젝트 생성
ai devmode     # VS Code + npm run dev + 브라우저 미리보기 자동 연결
```

제거: `npm uninstall -g @cnbiz/ai-business-os-cli`

---

## 5. 환경 변수 (선택)

`.env.local`(git 미추적)에 아래 값을 설정하면 관련 기능이 활성화됩니다. 설정하지 않아도 앱은 정상 동작하며(시뮬레이션/폴백), 실 기능만 비활성화됩니다.

| 변수 | 용도 |
|------|------|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` | AI Platform(`ai chat`, `ai prompt execute`, AI Studio)의 실제 Provider 연결 |
| `FIGMA_API_TOKEN` | Design Automation의 Figma Import/Export 실 연동 |

---

## 6. 다음 단계

- 대시보드 사용법: `docs/USER_GUIDE.md`
- 계정·역할·운영 관리: `docs/ADMIN_GUIDE.md`
- 문제 해결: `docs/TROUBLESHOOTING.md`
