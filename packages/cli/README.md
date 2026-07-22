# @ai-business-os/cli

`ai` — AI Business OS의 전역 CLI. 어떤 컴퓨터·어떤 프로젝트에서도 동작하는 Node.js 기반
CLI로, 프로젝트 스캐폴딩·개발 서버 연결·Website Builder·Agent/Prompt/Task 실행 등을
제공합니다.

## 설치

저장소 루트 `README.md`의 "AI Business OS CLI 설치" 섹션을 참고하세요
(`packages/cli/install.ps1` 또는 `packages/cli/Setup.cmd`로 원커맨드 설치).

## 주요 명령

```bash
ai                 # 대화형 메뉴 (프로젝트 선택 → 개발 시작/Git/설정 등)
ai new             # 새 프로젝트 스캐폴딩
ai devmode         # VS Code + dev 서버 + Visual Editor 연결
ai deploy          # 브랜치 확인 후 push
ai doctor          # Git/Node/npm/VS Code/Claude Code 설치 상태 점검
ai website create  # Website Builder v2 — 11페이지 Next.js 사이트 생성
ai marketplace ...  # 패키지 install/remove/update/search/publish
ai chat / ai prompt / ai task  # AI Platform v1 (Provider 연동 실행)
```

전체 명령 목록은 `ai --help` 또는 저장소 루트 `README.md`를 참고하세요.

## 개발

```bash
npm run build   # tsc + templates/config 복사 (dist/)
npm test         # Vitest (저장소 루트에서 실행)
```

## 구조

- `src/commands/` — CLI 명령 진입점
- `src/providers/` — AI Provider 연동(Anthropic/OpenAI/Gemini/Ollama/OpenRouter)
- `src/website/` — Website Builder v2
- `src/templates/` — 스캐폴딩 템플릿(`{{var}}` 치환, 컴파일 대상 아님)
