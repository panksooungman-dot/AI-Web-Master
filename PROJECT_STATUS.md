# AI Business OS - PROJECT STATUS

## 프로젝트 개요
AI 기반 홈페이지 제작 및 운영 플랫폼

---

## 전체 진행률
0% (Claude Code가 분석 후 업데이트)

---

## ✅ 완료된 기능

- 

---

## 🚧 진행 중인 기능

- 

---

## ⏳ 예정된 기능

- 

---

## 최근 완료 작업

- 

---

## 다음 작업 우선순위

1.
2.
3.

---

## Git 커밋

### 모든 변경사항 한 번에 커밋

```bash
git add -A
git commit -m "feat: 작업 내용"
git push origin main
```

### 진행률 자동 업데이트 (Claude Code)

```text
현재 프로젝트 전체를 분석해서 PROJECT_STATUS.md를 업데이트해줘.

실제 구현된 코드만 기준으로 작성하고,
완료 / 진행 중 / 미구현 기능을 구분해서
전체 진행률과 다음 작업 우선순위를 업데이트해줘.
```

## Git 커밋 방법

### 모든 변경사항 한 번에 커밋

```bash
git status
git add -A
git commit -m "feat: 업데이트 내용"
git push origin main
```

### 한 줄로 실행

```bash
git add -A && git commit -m "feat: 업데이트 내용" && git push origin main
```

### 커밋 메시지 예시

```bash
feat: 의뢰 접수 페이지 구현
feat: AI 홈페이지 생성 기능 추가
feat: 고객 대시보드 구현
fix: 관리자 로그인 오류 수정
docs: 프로젝트 진행률 업데이트
refactor: 코드 구조 개선
```

### 작업 순서

1. 기능 개발
2. PROJECT_STATUS.md 진행률 업데이트
3. `git add -A`
4. `git commit -m "작업 내용"`
5. `git push origin main`

---

# 개발 작업 규칙 (Working Rules)

## Single Source of Truth

- PROJECT_STATUS.md를 프로젝트의 Single Source of Truth(SSOT)로 사용한다.

## 구현 규칙

- 이미 구현된 기능은 수정·재구현·리팩터링하지 않는다.
- PROJECT_STATUS.md에서 "미구현" 또는 "일부 구현"으로 표시된 항목만 작업한다.
- 작업 전에 기존 코드의 재사용 여부를 먼저 확인한다.
- 새로운 Domain, API, Registry, Auth, RBAC, Website Builder를 생성하는 것은 금지한다.

## 작업 절차

1. PROJECT_STATUS.md 확인
2. 기존 코드 검색
3. 기존 구현 재사용 여부 확인
4. 필요한 경우에만 구현
5. PROJECT_STATUS.md 업데이트
6. 테스트
7. Git Commit

## 구현 금지

다음은 이미 구현되어 있으므로 새로 만들지 않는다.

- Domain Registry
- CollectionStore
- CRUD API
- Authentication
- RBAC
- Website Builder
- External Inquiry Orchestration
- Notification(Email)