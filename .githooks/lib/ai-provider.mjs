// AI Provider abstraction for the PROJECT_STATUS.md SSOT sync hook.
//
// sync-project-status.mjs never talks to "Claude" directly — it only calls
// generateProjectStatusUpdate(prompt). Swapping the backing model (OpenAI,
// a local LLM, a different CLI) means editing only this file.
//
// Windows notes (both verified against the real CLI, not assumed):
//
// 1. `claude` resolves to an npm shim (claude.cmd). Node's spawn cannot exec
//    .cmd files directly without a shell (EINVAL), and shell:true with an
//    *args array* makes Node concatenate array elements with a bare space
//    and no quoting — an empty-string array element (needed for
//    `--tools ""`, our tool-disable flag) silently disappears, so tools
//    stay enabled. Fix: build ONE command-line string (with a literal `""`
//    token for the empty value) and pass it as spawn's first argument with
//    shell:true — the shell (cmd.exe here) then parses `""` as a genuine
//    empty argument.
//
// 2. With shell:true, the process spawn() gives us back is cmd.exe, not
//    claude itself — claude runs as cmd.exe's child. Node's own spawnSync
//    `timeout` option only signals the *immediate* child (cmd.exe); it does
//    not reliably bring down the grandchild claude/node process, which was
//    observed to survive as an orphan after a spawnSync timeout in testing.
//    Fix: use async spawn(), and on our own timer, kill the whole process
//    tree via `taskkill /T /F /PID <pid>` (same approach already used
//    elsewhere in this repo, e.g. lib/commandEngine/engine.ts).

import { spawn, execFileSync } from "node:child_process";

export class AIProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AIProviderError";
    this.code = code; // "NOT_FOUND" | "TIMEOUT" | "NONZERO_EXIT" | "EMPTY_OUTPUT" | "SPAWN_ERROR"
  }
}

const SAFE_TOKEN = /^[A-Za-z0-9_.-]+$/;

function sanitizeToken(value, fallback) {
  return SAFE_TOKEN.test(value) ? value : fallback;
}

const MODEL = sanitizeToken(process.env.SSOT_SYNC_MODEL || "sonnet", "sonnet");
const TIMEOUT_MS = Number(process.env.SSOT_SYNC_TIMEOUT_MS || 90000);
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
// NOTE: --max-budget-usd was tried and deliberately dropped — it caps
// *cumulative* spend (shared across whatever else this account/session has
// already spent that day via --print calls), not this single invocation.
// A fixed low cap here would intermittently fail commits for reasons
// completely unrelated to this hook. --tools "" (no agentic loop possible)
// plus the process-tree-kill timeout below are the real safety net.

function killProcessTree(pid) {
  if (!pid) return;
  try {
    execFileSync("taskkill", ["/T", "/F", "/PID", String(pid)], { stdio: "ignore" });
  } catch {
    // Already exited, or taskkill itself failed — nothing more we can do.
  }
}

/**
 * Sends `prompt` to the configured AI provider (Claude Code CLI, headless
 * print mode, tools fully disabled) and returns its raw text response.
 *
 * Resolves/rejects with AIProviderError for any transport-level failure
 * (CLI missing, timeout, non-zero exit, empty output). It does NOT validate
 * whether the response is well-formed JSON matching our section schema —
 * that is the caller's (sync-project-status.mjs's) responsibility, since it
 * is domain logic, not provider logic.
 */
export function generateProjectStatusUpdate(prompt) {
  // Single command-line string, not an args array — see file header note.
  // Only fixed/sanitized tokens are interpolated here; the actual prompt
  // content (diff, file contents) travels via stdin, never through this
  // command string, so there is no shell-injection surface from staged
  // file contents.
  const command = [
    "claude",
    "-p",
    '--tools ""',
    "--output-format text",
    "--no-session-persistence",
    `--model ${MODEL}`,
  ].join(" ");

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const child = spawn(command, { shell: true, windowsHide: true });

    const timer = setTimeout(() => {
      settle(() => {
        killProcessTree(child.pid);
        reject(
          new AIProviderError(
            "TIMEOUT",
            `claude CLI가 ${TIMEOUT_MS}ms 내에 응답하지 않아 프로세스 트리를 강제 종료했습니다.`
          )
        );
      });
    }, TIMEOUT_MS);

    let stdout = "";
    let stderr = "";
    let overflowed = false;

    child.stdout.on("data", (chunk) => {
      if (overflowed) return;
      stdout += chunk;
      if (stdout.length > MAX_OUTPUT_BYTES) {
        overflowed = true;
        settle(() => {
          killProcessTree(child.pid);
          reject(new AIProviderError("SPAWN_ERROR", "claude CLI 출력이 최대 크기를 초과했습니다."));
        });
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      settle(() => {
        if (err.code === "ENOENT") {
          reject(
            new AIProviderError(
              "NOT_FOUND",
              "claude CLI를 찾을 수 없습니다. Claude Code CLI가 설치·인증되어 있는지 확인하세요."
            )
          );
          return;
        }
        reject(new AIProviderError("SPAWN_ERROR", `claude CLI 실행 실패: ${err.message}`));
      });
    });

    child.on("close", (code) => {
      settle(() => {
        if (code !== 0) {
          const stderrText = stderr.trim();
          const notFound = /not recognized|찾을 수 없습니다|명령이|command not found/i.test(stderrText);
          if (notFound) {
            reject(
              new AIProviderError(
                "NOT_FOUND",
                "claude CLI를 찾을 수 없습니다. Claude Code CLI가 설치·인증되어 있는지 확인하세요."
              )
            );
            return;
          }
          reject(
            new AIProviderError(
              "NONZERO_EXIT",
              `claude CLI가 오류로 종료되었습니다 (exit ${code}): ${stderrText.slice(0, 500)}`
            )
          );
          return;
        }
        const output = stdout.trim();
        if (!output) {
          reject(
            new AIProviderError("EMPTY_OUTPUT", `claude CLI가 빈 응답을 반환했습니다. stderr: ${stderr.trim().slice(0, 500)}`)
          );
          return;
        }
        resolve(output);
      });
    });

    child.stdin.write(prompt, "utf-8");
    child.stdin.end();
  });
}
