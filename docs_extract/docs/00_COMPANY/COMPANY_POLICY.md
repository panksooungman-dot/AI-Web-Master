# Company Policy

AI Dev OS 운영 전반에 적용되는 회사 차원의 정책 문서입니다.

---

## 1. Purpose

- **적용 대상**: 이 저장소에서 작업하는 모든 AI 에이전트와 Human Lead
- **적용 범위**: 저장소 내 모든 문서·코드·설정 작업
- 본 문서는 상위 원칙과 승인 권한을 정의하며, 구체적 실행 규칙은 각 영역 전용 문서를 따릅니다.

---

## 2. Core Operating Principles

| 원칙 | 설명 |
|------|------|
| **AI First** | AI 에이전트를 개발 프로세스의 기본 작업 단위로 둔다 |
| **Automation First** | 반복 작업은 자동화하고, 사람은 검토·판단에 집중한다 |
| **Documentation First** | 코드보다 의도와 맥락을 먼저 문서로 남긴다 |
| **Reuse Before Rewrite** | 기존 자산을 우선 재사용하고 동일 패턴을 새로 만들지 않는다 |
| **Explain Before Coding** | 구현 전 접근 방식·대안·영향 범위를 설명한다 |
| **Think Before Coding** | 요구사항과 기존 문서·코드를 이해한 뒤에만 작업한다 |

---

## 3. Approval Authority Matrix

| 행위 유형 | 승인 필요 | 승인권자 |
|-----------|-----------|----------|
| `package.json` 수정 | Yes | Human Lead |
| 신규 라이브러리·패키지 설치 | Yes | Human Lead |
| 환경 변수(`.env.local` 등) 추가·변경 | Yes | Human Lead |
| 데이터베이스 스키마 변경 | Yes | Human Lead |
| 배포 설정 변경 | Yes | Human Lead |
| 기존 문서 삭제·이름 변경 | Yes | Human Lead |
| 신규 문서 생성 | Yes | Human Lead |
| Git Commit | Yes | Human Lead |
| Git Push / PR Merge | Yes | Human Lead |
| Plan 범위 내 코드 구현 | No | Builder 권한 |
| Plan 문서 작성 | No | Planner 권한 (승인은 Build 착수 전 Human Lead) |

승인 없이 위 행위를 실행하지 않는 것을 원칙으로 합니다.

---

## 4. Engineering Policy

- 저장소 전체에 브랜치 기반 워크플로 원칙을 적용하며, 주 배포 브랜치에 대한 직접 반영은 지양한다.
- 커밋·변경 이력은 의도(Why)가 드러나도록 남긴다.
- 승인되지 않은 프로덕션 배포는 진행하지 않는다.
- 검증 절차(훅, 린트, 빌드 등)를 임의로 우회하지 않는다.

세부 실행 규칙(브랜치 명명, 커밋 메시지 형식 등)은 영역별 전용 문서를 따릅니다.

---

## 5. Security & Confidentiality Policy

- 자격 증명·API 키 등 시크릿 값은 어떤 문서에도 기록하지 않는다.
- 머신 로컬 설정 파일(`.env.local` 등)은 버전 관리에 포함하지 않는다.
- 자격 증명 노출이 발견되면 즉시 보고하고, 노출된 값은 회전(rotate)한다.
- 외부 서비스 연동 시 최소 권한 원칙을 따른다.

---

## 6. Client Engagement Policy

- 확인되지 않은 사실 정보(수치, 연혁, 연락처 등)는 임의로 지어내지 않는다.
- 미확정 정보는 명시적으로 TODO 상태로 표기하고, 자료 수령 후 갱신한다.
- 콘텐츠는 검증된 사실을 기준으로 작성하며, 과장된 표현을 지양한다.

---

## 7. Documentation Policy

- 모든 신규 기능·결정·정책 변경은 문서화를 우선한다.
- 문서는 상태(Active/Draft/Archived)를 명확히 유지한다.
- 신규 문서는 `DOCUMENT_INDEX.md`에 등록한다.

---

*관리: Human Lead*
