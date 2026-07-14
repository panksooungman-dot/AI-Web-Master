# docs/09_WORK_HISTORY

AI Business OS의 **작업 이력·프로젝트 컨텍스트**를 관리하는 폴더입니다.

> 이전에 사용하던 `docs/09_BUILD_LOG/`는 더 이상 사용하지 않습니다. `09` 슬롯은 이제 이 폴더(Work History)가 공식 구조입니다.

---

## Purpose

- AI(Claude Code)가 세션이 바뀌어도 프로젝트를 바로 이어갈 수 있도록 컨텍스트를 보존합니다.
- `startday`(PowerShell) / `/endday`(Claude Code) 명령이 이 폴더의 문서를 읽고 씁니다.

---

## 구성 파일

| 파일 | 역할 | 갱신 방식 |
|------|------|-----------|
| `CURRENT_CONTEXT.md` | 현재 프로젝트 상태 스냅샷(진행 중 작업·다음 작업·결정사항) | **덮어쓰기** — 항상 최신 상태만 유지, 과거 이력을 쌓지 않음 |
| `WORK_HISTORY.md` | 날짜별 작업 이력 | **append** — 기존 기록을 절대 삭제하지 않음 |
| `sessions/MM-DD.md` | 일일 세션 상세 기록(목표·완료 작업·결정사항·인수인계) | 해당 날짜 파일이 있으면 업데이트, 없으면 신규 생성 |

---

## 사용 흐름

```
하루 시작
    │
    ▼
startday (PowerShell)
  - CURRENT_CONTEXT.md 읽기
  - 가장 최근 sessions/MM-DD.md 읽기
  - Project / Current Status / Yesterday / Today's Priority / Health Check 출력
    │
    ▼
작업 진행 (Claude Code)
    │
    ▼
/endday (Claude Code 슬래시 명령)
  - CURRENT_CONTEXT.md 갱신 (덮어쓰기)
  - WORK_HISTORY.md 갱신 (append)
  - sessions/MM-DD.md 생성·갱신
  - 내일 TODO 생성, Health Check 실행
  - Git 작업은 하지 않음
    │
    ▼
exit (PowerShell)
  - Git Status 확인 → Commit → Push
```

**원칙**: `/endday`는 문서 정리만 담당하고 Git 작업을 하지 않습니다. Git commit/push는 PowerShell `exit`가 전담합니다.

---

## 관련 명령

- `.claude/commands/endday.md` — Claude Code 전용 `/endday` 슬래시 명령 정의
- `scripts/ai-business-os.ps1` — PowerShell `startday`/`health`/`sync`/`exit` 등 명령 정의
- `scripts/setup.ps1` — 신규 PC에서 이 명령들을 1회 자동 구성하는 셋업 스크립트
