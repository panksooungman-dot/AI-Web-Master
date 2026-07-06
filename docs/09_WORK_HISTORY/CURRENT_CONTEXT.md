# CURRENT_CONTEXT

> AI Business OS 현재 프로젝트 상태
> AI는 작업 시작 시 이 문서를 가장 먼저 읽고 프로젝트를 이어서 진행한다.

---

# 프로젝트 정보

- 프로젝트명 : AI Business OS
- 현재 프로젝트 : CNBIZ Website
- 개발 환경 : Claude Code + VS Code
- 현재 단계 : AI Business OS Terminal v1 / Work History 시스템 v1

---

# 프로젝트 목표

- 반복 작업 최소화
- AI와 사람이 함께 개발하는 환경 구축
- 프로젝트 컨텍스트 자동 관리
- 유지보수가 쉬운 Development OS 구축

---

# 현재 상태

## 완료

- AI Business OS Terminal 구축 (PowerShell Profile, health/startday/endday/sync/release/deploy/docs 명령)
- exit Workflow 구현 (Git Status 확인 → Commit → Push, Pager 문제 해결)
- CLAUDE.md 운영 규칙 작성
- WBS 문서 정리
- Work History 폴더 구조(`docs/09_WORK_HISTORY/`) 생성 — CURRENT_CONTEXT.md · WORK_HISTORY.md · sessions/
- **`/endday` Claude Code 슬래시 명령 구현** (`.claude/commands/endday.md`)
  - Git 작업(add/commit/push)을 전혀 수행하지 않도록 역할 분리 — Git은 PowerShell `exit`가 전담
  - CURRENT_CONTEXT.md는 덮어쓰기(항상 최신 상태만 유지), WORK_HISTORY.md는 날짜별 append(기존 기록 보존)로 갱신 방식을 명확히 구분
  - TODO 생성 우선순위(진행 중 → 미완료 → 신규) 규칙 반영
  - Health Check 항목(CURRENT_CONTEXT 최신 여부·WORK_HISTORY 갱신 여부·Session 저장 여부·WBS 최신 여부·Git Push 여부(참고용)) 반영
  - 실제 실행으로 문서 3종(CURRENT_CONTEXT·WORK_HISTORY·session) 정상 갱신 테스트 완료
- **`startday` 명령 재구현** (`scripts/ai-business-os.ps1`) — CURRENT_CONTEXT.md와 최근 session을 읽어 Project·Current Status·Yesterday·Today's Priority·Health Check 출력. PowerShell 실제 실행 테스트 완료
- **`setup.ps1` 신규 구현** — 새 PC 1회 실행으로 PowerShell Profile 연결, 명령 등록 확인, 프로젝트 폴더/Git/Claude Code/PATH 확인까지 자동화. 실제 실행 테스트 완료(Git Commit/Push 없음)
- **`docs/09_BUILD_LOG` 폐기, `docs/09_WORK_HISTORY`를 공식 구조로 확정** — 폴더·README.md 삭제, 프로젝트 전체(README.md·src/README.md·scripts/README.md·docs/05_AI/*·docs/06_TEMPLATES/*·docs/08_PLANS/*·DOCUMENT_INDEX.md)의 `09_BUILD_LOG` 참조를 `09_WORK_HISTORY`로 갱신, `docs/09_WORK_HISTORY/README.md`를 실제 구조에 맞게 재작성

---

## 현재 진행 중

- 없음

---

# 다음 작업

1. `/endday`를 며칠간 실사용하며 문서 포맷·TODO 생성 기준 미세조정
2. `docs/09_BUILD_LOG` 삭제(및 참조 갱신) 커밋 여부 확인 — 현재 uncommitted 상태

---

# 중요 결정사항

- WBS를 프로젝트(CNBIZ Website) 기준 문서로 사용한다.
- CURRENT_CONTEXT는 AI 인수인계 문서이며, 항상 "지금 상태 스냅샷"만 담는다 — 과거 이력을 쌓지 않고 매번 최신 내용으로 교체한다.
- WORK_HISTORY는 날짜별 이력을 append하며 기존 기록을 삭제하지 않는다.
- 작업 종료는 두 단계로 분리한다 — `/endday`(Claude Code, 문서 정리 전담) → PowerShell `exit`(Git commit/push 전담).
- 간단한 수정은 VS Code에서 직접 수정한다.
- 복잡한 수정은 Claude에게 요청한다.

---

# 현재 문서 구조

```
docs/

00_COMPANY
01_PMO
02_DESIGN
03_DEVELOPMENT
04_OPERATIONS
05_AI
06_TEMPLATES
07_KNOWLEDGE
08_PLANS
09_WORK_HISTORY
99_ARCHIVE
```

---

# AI 작업 시작 순서

1. CURRENT_CONTEXT.md 확인
2. CLAUDE.md 확인
3. WBS.md 확인
4. 현재 작업 이어서 진행
5. 완료 후 `/endday`로 CURRENT_CONTEXT.md 등 문서 정리

---

# AI 인수인계

`/endday`(Claude Code) · `startday`(PowerShell) · `setup.ps1` 구현이 모두 완료되었고, `docs/09_BUILD_LOG`는 폐기되어 `docs/09_WORK_HISTORY`가 "09" 슬롯의 공식 구조로 확정되었다.

- Git 작업은 `/endday`·`setup.ps1`에서 절대 하지 않는다. Git commit/push는 PowerShell `exit`에서 진행한다.
- `docs/09_BUILD_LOG` 삭제 및 전체 참조 갱신은 아직 커밋되지 않은 상태다 — 다음 `exit` 시 커밋 대상에 포함하면 된다.
- 다음 단계는 `/endday` 실사용 피드백 반영이다.

---

# Last Update

2026-07-06
