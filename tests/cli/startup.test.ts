import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * `packages/cli/bin/ai.js`는 `../dist/index.js`(tsc 빌드 산출물, gitignore 대상)를
 * 실행하므로, 이 테스트를 돌리려면 사전에 `npm run build --workspace=@ai-business-os/cli`가
 * 실행되어 있어야 한다(루트 `npm test`는 `pretest` 스크립트로 이를 자동 수행한다).
 * dist가 없으면 "빌드 안 됨"을 명확히 알리기 위해 실패시키지 않고 skip한다.
 */
const CLI_BIN = path.resolve(__dirname, "../../packages/cli/bin/ai.js");
const CLI_DIST_ENTRY = path.resolve(__dirname, "../../packages/cli/dist/index.js");
const distExists = existsSync(CLI_DIST_ENTRY);

function runCli(args: string[]): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [CLI_BIN, ...args], {
      encoding: "utf-8",
      timeout: 10_000
    });
    return { stdout, status: 0 };
  } catch (error) {
    const err = error as { stdout?: string; status?: number };
    return { stdout: err.stdout ?? "", status: err.status ?? 1 };
  }
}

describe.skipIf(!distExists)("CLI startup (packages/cli/bin/ai.js)", () => {
  it("--version prints the CLI version and exits 0", () => {
    const { stdout, status } = runCli(["--version"]);

    expect(status).toBe(0);
    // package.json 버전(1.1.0) 또는 buildInfo 커밋 접미사(+<hash>)가 붙은 형태를 허용한다.
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+(\+[0-9a-f]+)?$/);
  });

  it("--help lists the top-level commands actually registered in src/index.ts", () => {
    const { stdout, status } = runCli(["--help"]);

    expect(status).toBe(0);
    expect(stdout).toContain("AI Business OS Command Line Interface");
    for (const command of ["menu", "project", "devmode", "website", "workflow", "doctor"]) {
      expect(stdout).toContain(command);
    }
  });

  it("rejects an unknown command instead of silently doing nothing", () => {
    const { status } = runCli(["this-command-does-not-exist"]);

    expect(status).not.toBe(0);
  });
});
