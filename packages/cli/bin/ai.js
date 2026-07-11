#!/usr/bin/env node

import fs from "node:fs";

// shell/ai-function.ps1(PowerShell 함수 Wrapper)이 이 프로세스를 실행하기
// 전에 AI_PWSH_CWD_FILE 환경변수로 임시 파일 경로를 넘겨준다. 그 값이
// 있으면, 이 프로세스가 어떤 방식으로 종료되든(process.exit() 포함) 정확히
// "이 순간의 자기 자신의 작업 디렉터리"(menu()/pickProject()가 이미
// chdir해 둔 값)를 그 파일에 적어 놓는다. Wrapper 함수는 이 값을 읽어
// 자신의(=사용자가 보는 PowerShell 세션의) 위치를 Set-Location으로
// 옮긴다 — 자식 프로세스는 부모 셸의 cwd를 직접 바꿀 수 없으므로, 이 값을
// "넘겨주는" 것이 유일한 방법이다. 이 환경변수가 없으면(예: ai.cmd를
// 직접 실행하거나 PowerShell 함수 없이 쓰는 경우) 아무 동작도 하지 않는다.
const cwdExportFile = process.env.AI_PWSH_CWD_FILE;
if (cwdExportFile) {
  process.on("exit", () => {
    try {
      fs.writeFileSync(cwdExportFile, process.cwd(), "utf-8");
    } catch {
      // 실패해도 CLI 자체 동작에는 영향 없음 — Wrapper가 파일을 못 찾으면 이동을 건너뛸 뿐이다.
    }
  });
}

// 실제 CLI 구현(Commander 기반, src/index.ts → dist/index.js)을 실행한다.
await import("../dist/index.js");
