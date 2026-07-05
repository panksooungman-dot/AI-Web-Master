# scripts

**자동화 스크립트**를 보관합니다. 반복 개발·운영 작업을 코드로 실행합니다 (Automation First).

---

## Purpose

- 수동 반복 작업을 스크립트로 대체합니다.
- CI/CD와 로컬 개발 환경에서 **동일한 명령**을 실행합니다.
- 에이전트·스킬 워크플로의 실행 엔진 역할을 합니다.

---

## Current State

현재 스크립트 파일은 없습니다. Phase 1–2에서 아래 자동화를 추가할 예정입니다.

---

## Planned Automation Scripts

### Documentation

| 스크립트 (예정) | 용도 |
|-----------------|------|
| `scaffold-context.mjs` | `docs/06_TEMPLATES/context-template.md` → `docs/07_KNOWLEDGE/` |
| `scaffold-plan.mjs` | `docs/06_TEMPLATES/plan-template.md` → `docs/08_PLANS/` |
| `scaffold-review.mjs` | `docs/06_TEMPLATES/review-template.md` → PR/빌드 기록 |

### Development

| 스크립트 (예정) | 용도 |
|-----------------|------|
| `scaffold-feature.mjs` | Plan 기반 `src/` + `app/` 스캐폴딩 |
| `validate-docs.mjs` | Context→Plan→Build 문서 체인 검증 |
| `check-architecture.mjs` | 계층 의존성 방향 검사 |

### Quality

| 스크립트 (예정) | 용도 |
|-----------------|------|
| `ci-local.mjs` | lint + build + test (CI와 동일) |
| `pre-commit-docs.mjs` | Plan 없는 `src/` 변경 경고 |

### AI / Cursor

| 스크립트 (예정) | 용도 |
|-----------------|------|
| `export-skills.mjs` | `docs/05_AI/skills/` → Cursor Skills 동기화 |
| `agent-handoff.mjs` | Plan 승인 시 Builder용 컨텍스트 패키징 |

---

## Integration

| 소비자 | 연동 방식 |
|--------|-----------|
| `package.json` | `"scripts": { "scaffold:plan": "node scripts/..." }` |
| GitHub Actions | `npm run ci:local` |
| Cursor Hooks | `create-hook` 스킬로 이벤트 트리거 |
| Documenter | `docs/09_BUILD_LOG/` 에 스크립트 사용법 기록 |

---

## Workflow

```
1. 수동 반복 작업 식별
2. scripts/ 에 스크립트 추가
3. package.json 또는 CI에 등록
4. docs/09_BUILD_LOG/ 에 사용법 문서화
```

---

## Rules

- 스크립트는 **멱등(idempotent)** 하게 작성합니다.
- 실패 시 명확한 exit code와 로그를 출력합니다.
- 시크릿·토큰은 환경 변수로만 주입합니다.
- 새 스크립트 추가 시 Documenter가 `docs/09_BUILD_LOG/` 에 기록합니다.

**원칙**: 사람 개입을 최소화하고, 복구 경로를 명확히 합니다.
