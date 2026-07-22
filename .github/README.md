# .github

이 저장소의 GitHub 설정(CI 워크플로·PR 템플릿·코드 오너)을 모아둔 폴더입니다.

## workflows/

| 파일 | 트리거 | 목적 |
|---|---|---|
| `lint.yml` | push/PR → `main`, `develop` | ESLint 실행 (Code Quality) |
| `test.yml` | push/PR → `main`, `develop` | `npm ci` → `npm run build` → `npm test`(Vitest) → coverage 리포트 |
| `security.yml` | push/PR → `main`, `develop`, 매주 월요일 02:00 | `npm audit` + 저장소 내 하드코딩된 비밀키 패턴 스캔 |
| `docs.yml` | push/PR → `main`, `develop` | 필수 문서 존재 여부·빈 Markdown 파일 여부 검증 |
| `release.yml` | `v*` 태그 push | 릴리스 파이프라인 |

## 그 외 파일

- `PULL_REQUEST_TEMPLATE.md` — PR 생성 시 기본으로 채워지는 템플릿
- `CODEOWNERS` — 경로별 필수 리뷰어 지정
