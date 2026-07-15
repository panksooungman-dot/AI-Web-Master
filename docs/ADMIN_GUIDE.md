# ADMIN_GUIDE — 관리자 가이드

> AI Business OS v1.0 · RBAC(Role-Based Access Control) · 계정/역할 운영 안내
> 대상: 계정을 발급·관리하고 대시보드 접근 권한을 통제하는 운영자

---

## 1. 역할(Role) 모델

이 저장소는 v1.0부터 4개의 역할을 지원합니다(`lib/auth/types.ts`의 `Role`).

| 역할 | 설명 |
|------|------|
| `user` | 기본값. 로그인은 가능하지만 대시보드(`/developer`)·관리자 영역(`/admin`) 모두 접근 불가 |
| `developer` | `/developer`(Development OS 대시보드) 접근 가능 |
| `admin` | `/admin`(관리자 영역) 접근 가능. **주의**: v1.0에는 `/admin`에 실제 화면이 아직 없습니다(2번 참고) |
| `super_admin` | `/developer`와 `/admin` 모두 접근 가능 |

### 접근 매트릭스

| 역할 | `/developer/**` | `/admin/**` |
|------|:---:|:---:|
| `user` | 403 | 403 |
| `admin` | 403 | ✅ |
| `developer` | ✅ | 403 |
| `super_admin` | ✅ | ✅ |

이 매트릭스는 `lib/auth/rbac.ts`의 `roleCanAccessArea()`에 코드로 정의되어 있으며, `tests/auth/rbac.test.ts`가 4개 역할 × 2개 영역 전 조합을 검증합니다.

---

## 2. `/admin`에 대한 중요 안내

**v1.0 시점에는 `/admin/**` 아래에 실제 페이지가 없습니다.** 이번 릴리스는 "새 애플리케이션 기능을 추가하지 않는다"는 원칙에 따라, `/admin`에 대한 **보호 로직만** 미리 구현했습니다 — 라우트 자체는 아직 존재하지 않습니다.

- `admin`/`super_admin` 역할로 로그인해 `/admin`에 접속하면, 접근 자체는 허용되지만(403이 아님) 페이지가 없어 Next.js의 404가 표시됩니다. 이는 정상입니다.
- 향후 실제 관리자 화면(`/admin/**`)이 추가되면, 이 문서의 접근 매트릭스가 코드 변경 없이 즉시 적용됩니다.
- API 쪽도 동일합니다 — `/api/admin/**` 경로를 만들면 자동으로 "admin 영역" 보호가 적용됩니다(`lib/auth/rbac.ts`의 `resolveProtectedArea()` 참고).

현재 계정·백업·감사 로그 등 실질적인 "운영자용" 화면은 모두 `/developer/**` 아래(Health·Backup·Audit Log·Metrics·Settings)에 있으며, 이 화면들은 `developer`/`super_admin` 역할로 접근합니다.

---

## 3. 계정 관리

### 계정 생성

```bash
node scripts/create-auth-user.cjs <email> <password> [role]
```

- `role` 생략 시 `user`(최소 권한)로 생성됩니다 — 대시보드 접근이 필요한 계정은 반드시 역할을 명시하세요.
- 허용값: `user` | `admin` | `developer` | `super_admin`

```bash
node scripts/create-auth-user.cjs new-dev@example.com "비밀번호" developer
```

### 역할 변경 (승격/강등)

```bash
node scripts/set-user-role.cjs <email> <role>
```

```bash
node scripts/set-user-role.cjs new-dev@example.com super_admin
```

역할을 변경해도 **기존 세션은 즉시 갱신되지 않습니다** — 이미 로그인되어 있던 세션은 브라우저 요청마다 서버가 그 시점의 role을 다시 조회하므로(`resolveSessionUser()`), 실제로는 다음 요청부터 곧바로 새 역할이 적용됩니다. 다만 클라이언트가 캐시한 화면 상태를 정리하려면 로그아웃 후 재로그인을 권장합니다.

### 회원가입(Signup) API는 없습니다

의도적인 설계입니다 — 계정은 서버 콘솔 접근 권한이 있는 사람만 위 스크립트로 생성할 수 있습니다.

---

## 4. 레거시 계정(v1.0 업그레이드 시 주의)

RBAC 이전에 생성된 계정 레코드(`role` 필드가 없는 경우)는 **`user`로 취급됩니다**(`lib/auth/users.ts`의 `toPublicUser()` — 최소 권한 기본값, 보안 기본값). 즉 v1.0 이전 버전에서 대시보드를 쓰던 계정이 있다면, 업그레이드 직후에는 대시보드 접근이 막힙니다.

**업그레이드 직후 반드시 수행**:

```bash
node scripts/set-user-role.cjs <기존-계정-이메일> developer
```

(또는 `super_admin`, 필요에 따라)

---

## 5. 세션/보안 메커니즘

- 세션은 `crypto.randomBytes(32)` 토큰 + `httpOnly` 쿠키(`ai_session`)로 관리됩니다(`lib/auth/session.ts`).
- 세션 유효기간은 7일(`SESSION_TTL_MS`)이며, 만료된 세션은 조회 시점에 자동 정리됩니다.
- 비밀번호는 `crypto.scryptSync` + salt로 해시되어 저장되며 평문으로 저장되지 않습니다.
- 로그인 실패 시 "이메일이 존재하지 않음"과 "비밀번호 오류"를 구분하지 않는 동일한 오류 메시지를 반환합니다(계정 존재 여부 노출 방지).
- 모든 로그인 시도(`auth.login`)와 Design/Website/Marketplace 등의 주요 실행 이벤트는 `/developer/audit-log`에 기록됩니다.

---

## 6. 라우트/API 보호 범위

### 역할로 보호되는 것 (`lib/auth/rbac.ts`)

- 페이지: `/developer/**` (developer/super_admin), `/admin/**` (admin/super_admin — 2번 참고)
- API: `/api/**`의 사실상 전부(예: `/api/design/**`, `/api/websites`, `/api/agents/**`, `/api/metrics`, `/api/marketplace/**` 등) — `/developer` 영역과 동일한 규칙으로 보호됩니다.

### 로그인만 필요한 것 (역할 무관)

- `/projects/**` 및 `/api/projects/**` — 이번 RBAC 범위 밖으로 유지했습니다(어떤 역할이든 로그인만 하면 접근 가능, 기존 동작과 동일).

### 로그인 없이도 열려 있는 것 (의도적 예외)

| 경로 | 사유 |
|------|------|
| `/api/auth/**` | 로그인 자체를 위해 반드시 열려 있어야 함 |
| `/api/workspaces`, `/api/terminal`, `/api/devserver/**` | `packages/cli`(`ai devmode` 등)가 브라우저 세션 없이 직접 호출하는 것으로 문서화된 기존 예외(`docs/01_PMO/CHANGELOG.md` 2026-07-14 항목) — 이번 하드닝에서도 재검토 없이 그대로 유지했습니다 |
| `/`, `/about`, `/services`, `/portfolio`, `/contact`, `/login`, `/signup` | 공개 마케팅 페이지 |

이 예외 목록을 바꾸려면 `lib/auth/rbac.ts`의 `UNGATED_API_PREFIXES`를 수정하세요 — 단, `/api/workspaces`·`/api/terminal`·`/api/devserver`를 보호로 전환하면 CLI 연동이 깨질 수 있습니다.

---

## 7. 운영 화면 (모두 `/developer/**` 아래, developer/super_admin 전용)

| 화면 | 경로 | 용도 |
|------|------|------|
| Audit Log | `/developer/audit-log` | 로그인·Marketplace·Website 생성·AI Task·Design 파이프라인 등 전체 감사 이력 |
| Error Report | `/developer/errors` | Audit Log 중 실패(success:false)만 필터링 |
| Metrics | `/developer/metrics` | 누적 카운터(Build/Website 생성/AI Task/Design 파이프라인 각 단계 등) |
| Health | `/developer/health` | Git 상태·디스크 사용량, Build/Test/Coverage 수동 실행 |
| Backup | `/developer/backup` | 데이터 내보내기/가져오기 |
| Settings | `/developer/settings` | Git 사용자 정보, Terminal 기본값, AI 경로 등 |

---

## 8. 문제 해결

역할 관련 문제(403, 로그인 후 이상한 페이지로 이동 등)는 `docs/TROUBLESHOOTING.md`를 참고하세요.
