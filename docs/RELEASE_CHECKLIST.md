# Release Checklist — AI Business OS v1.0.0

> 작성일: 2026-07-14 | 대상: `v1.0.0` Release Candidate
> 이 문서는 `docs/01_PMO/CHANGELOG.md`에 누적된 실 구현·실 검증 이력을 근거로, v1.0 출시 직전 저장소 정리·자동 검증 결과를 기록한다.

---

## 1. Repository Cleanup

| 항목 | 상태 | 비고 |
|------|------|------|
| `AI-Web-Master/` 중첩 복제본(broken gitlink, mode 160000) 제거 | ✅ 완료 | `.gitmodules` 없이 커밋되어 있던 자기 자신의 복제본. `tsc`/`lint`가 이 안의 파일까지 스캔하던 근본 원인이었음(이미 `tsconfig.json` exclude 재귀 패턴으로 우회 완료되어 있었으나, 원인 자체를 제거) |
| `docs.zip` · `docs_extract/`(70개 파일) 제거 | ✅ 완료 | `docs/`의 오래된 zip 스냅샷과 압축 해제본 — 실제 `docs/`와 내용 중복 |
| `tree.txt` · `structure.txt` · `apps-tree.txt` · `packages-tree.txt` · `typescript-files.txt` 제거 | ✅ 완료 | 이전 감사 세션의 디렉터리 덤프/`Get-ChildItem` 출력 텍스트 — 문서 아님 |
| `test-project/` 제거 | ✅ 완료 | CLI 테스트 중 생성된 스크래치 프로젝트 |
| `docs/{AGENT,CLI,PROJECT,DASHBOARD,WEBSITE_BUILDER,WORKFLOW}_AUDIT.md`, `PROJECT_STATUS*.md`, `REPOSITORY_AUDIT_COMPLETE.md`, `CODE_QUALITY.md`, `FEATURE_MATRIX.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, `TECH_DEBT.md`, `TODO_CURRENT.md`(14개) 제거 | ✅ 완료 | `docs/REPOSITORY_INDEX.md`가 이미 "이 파일들의 내용은 소스로 사용하지 않았다"고 명시한 대로 대체됨 |
| `backup.bat` · `start-wor.bat` 제거 | ✅ 완료 | Git pull/install/VS Code/dev 서버 실행을 수행하던 구식 배치 스크립트. `packages/cli`의 `ai devmode`/`ai deploy`, `scripts/setup.ps1`로 완전히 대체됨 |
| `docs/08_PLANS/상가분양센터/`(7개 파일, 936KB) | ⚠️ 보류 | CNBIZ/AI Business OS와 무관해 보이는 별도 고객사 자료로 추정 — **삭제하지 않고 원상 유지**. 소유권 확인 전까지 손대지 않기로 결정(Known Issues 참고) |
| `.gitignore` — `packages/cli/.playwright-mcp/` 추적 누락 수정 | ✅ 완료 | 루트만 `/.playwright-mcp/`로 앵커링되어 있어 `packages/cli/` 하위의 QA 로그 2개가 git에 커밋되어 있었음 → 패턴을 비앵커(`​.playwright-mcp/`)로 변경, 기존 추적 파일 untrack |
| `.gitignore` — CLI 웹사이트 템플릿의 `next-env.d.ts` 누락 수정 | ✅ 완료 | 루트의 비앵커 `next-env.d.ts` 규칙이 `packages/cli/src/templates/website/next-env.d.ts`(생성되는 모든 웹사이트에 필요한 실제 템플릿 소스 파일)까지 무시하고 있어, 신규 클론 환경에서는 이 파일이 없는 상태로 남을 수 있었음 → 예외 패턴 추가 후 tracked 전환 |
| `eslint.config.mjs` — `globalIgnores` 비재귀 패턴 수정 | ✅ 완료 | `apps/**`/`packages/**`/`next-env.d.ts` 등이 최상위 경로만 매칭하던 문제(REPOSITORY_INDEX.md Remaining TODO #6과 동일 원인)를 재귀 패턴(`**/apps/**` 등)으로 교체, `**/coverage/**` 무시 추가 |
| 생성 아티팩트(`node_modules`, `.next`, `dist`, `coverage`, `.generated-websites`, `.runtime`, `lib/data`) git 추적 여부 재확인 | ✅ 완료 | 저장소 전체 `git ls-files` 스캔 결과 위 두 건(playwright-mcp, next-env.d.ts) 외 추가 누락 없음 확인 |
| 루트 `app/{about,services,portfolio,contact}` (v1 레거시 CNBIZ 마케팅 페이지) | ⚠️ 보류 | `apps/cnbiz-web`(v2)로 대체되어 `WBS.md` 기준 2026-07-01부로 동결된 코드가 루트 Development OS 앱에 여전히 공존 중. 삭제 시 영향 범위가 크고(라우팅·섹션 컴포넌트 다수) 명시적 승인 이력이 없어 이번 릴리스에서는 **삭제하지 않음** — Known Issues·다음 작업으로 이관 |

---

## 2. Release Audit — 자동 검증 결과

모두 저장소 루트(`D:\ai-web-master`)에서 클린업 이후 재실행:

| 검증 | 명령 | 결과 |
|------|------|------|
| Type Check | `npx tsc --noEmit` | ✅ 통과 (0 errors) |
| Build (Development OS, 루트) | `npm run build` | ✅ 통과 — 정적/동적 라우트 전체 정상 생성, `Proxy (Middleware)` 정상 표시 |
| Build (CNBIZ Website v2) | `npm run build --workspace=apps/cnbiz-web` | ✅ 통과 — 9개 라우트 정상 생성 |
| Lint | `npm run lint` | ✅ 통과 (0 errors, 0 warnings — 사전 존재하던 `coverage/` 경고 1건은 이번 클린업으로 해소) |
| Test | `npm test` (`pretest`가 `packages/cli` 빌드 후 Vitest 실행) | ✅ **30개 파일 / 188개 테스트 전부 통과** |

- CLI(`@ai-business-os/cli`) 자체 빌드(`tsc` + 템플릿 복사)는 위 `npm test`의 `pretest` 단계에서 함께 검증됨(별도 실패 없음).
- 테스트 실행 로그에 보이는 `error: unknown command 'this-command-does-not-exist'`는 `tests/cli/startup.test.ts`가 "미등록 명령을 거부하는지" 의도적으로 검증하는 케이스의 정상 출력이며, 테스트는 통과(실패 아님).

---

## 3. Documentation

| 항목 | 상태 |
|------|------|
| `README.md` — Features/Installation/CLI Usage/Dashboard/Website Builder/Marketplace/AI Platform 반영 재작성 | ✅ 완료 |
| `docs/RELEASE_NOTES_v1.0.md` 신규 작성 | ✅ 완료 |
| `docs/REPOSITORY_INDEX.md` v1.0 기준 갱신(완료 모듈 표기) | ✅ 완료 |

---

## 4. Version

| 패키지 | 이전 | 변경 | 비고 |
|--------|------|------|------|
| `ai-web-master`(루트, Development OS 모노레포 엔트리) | `0.1.0` | **`1.0.0`** | AI Business OS v1.0 릴리스 대표 버전 |
| `@ai-business-os/cli`(`packages/cli`) | `1.1.0` | 변경 없음 | 이미 1.0을 넘어 독립적으로 버저닝되어 있어 하향 조정하지 않음 |
| `apps/cnbiz-web`, `packages/{design-system,ui,utils,layout-primitives,dev-inspector}` | `0.1.0` | 변경 없음 | CNBIZ 고객사 납품물·내부 공유 패키지로 AI Business OS 제품 자체의 버전과 무관, `private` 미배포 패키지 |

---

## 5. Final Verification

세부 결과는 `docs/RELEASE_NOTES_v1.0.md`의 "Known Issues" 및 대화 종료 시 최종 보고를 참고.

---

## 부록 — 이번 릴리스 준비에서 손대지 않은 항목(의도적 보류)

- `docs/08_PLANS/상가분양센터/` — 소유권 미확인, 삭제하지 않음
- 루트 `app/{about,services,portfolio,contact}`(v1 레거시 CNBIZ 마케팅 페이지) — 대규모 변경이라 이번 stabilization 범위에서 제외
- `Remaining TODO`에 이미 기록된 장기 결정 필요 항목(Marketplace 온라인 Provider, Agent Runtime/Workflow Engine 이원화 등)은 이번 릴리스에서 다루지 않음(신규 기능 추가 금지 원칙)
