import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { loadAgent } from "./loader.js";
import { createRuntimeContext } from "./context.js";
import { executeAgent } from "./executor.js";
import { RuntimeError, type ExecutionResult } from "./types.js";

export interface RunAgentOptions {
  cwd?: string;
  variables?: Record<string, string>;
  providerId?: string;
}

function runtimeRoot(cwd: string): string {
  return path.join(cwd, ".runtime");
}

function lockFile(cwd: string, name: string): string {
  return path.join(runtimeRoot(cwd), "locks", `${name}.lock`);
}

/** 요구사항 4 — 동일 Agent가 이미 실행 중이면 중복 실행을 막는다. */
async function acquireLock(cwd: string, name: string): Promise<void> {
  const file = lockFile(cwd, name);
  await fs.ensureDir(path.dirname(file));

  if (await fs.pathExists(file)) {
    throw new RuntimeError(
      "DUPLICATE_RUNTIME",
      `Agent "${name}" is already running (lock: ${file}). Wait for it to finish, or remove the file if it is stale.`
    );
  }

  await fs.writeJson(file, { pid: process.pid, startedAt: new Date().toISOString() }, { spaces: 2 });
}

async function releaseLock(cwd: string, name: string): Promise<void> {
  await fs.remove(lockFile(cwd, name));
}

async function appendLog(cwd: string, name: string, lines: string[]): Promise<void> {
  const logsDir = path.join(runtimeRoot(cwd), "logs");
  await fs.ensureDir(logsDir);

  const logFile = path.join(logsDir, `${name}.log`);
  const entry = lines.map((line) => `[${new Date().toISOString()}] ${line}`).join("\n") + "\n";
  await fs.appendFile(logFile, entry, "utf8");
}

async function appendHistory(cwd: string, record: Record<string, unknown>): Promise<void> {
  const historyFile = path.join(runtimeRoot(cwd), "history.json");
  await fs.ensureDir(path.dirname(historyFile));

  let history: Record<string, unknown>[] = [];

  if (await fs.pathExists(historyFile)) {
    try {
      const raw = await fs.readJson(historyFile);
      if (Array.isArray(raw)) {
        history = raw;
      }
    } catch {
      history = [];
    }
  }

  history.push(record);
  await fs.writeJson(historyFile, history, { spaces: 2 });
}

/**
 * `ai run <agent-name>` 전체 흐름을 담당하는 오케스트레이터.
 * loader(로드) → context(런타임 컨텍스트 생성) → executor(실행 시뮬레이션) → 로깅 순으로 진행하며
 * `.runtime/logs/<name>.log`·`.runtime/history.json`에 실행 기록을 남긴다.
 */
export async function runAgent(name: string, options: RunAgentOptions = {}): Promise<ExecutionResult> {
  const { cwd = process.cwd(), variables = {}, providerId } = options;

  await acquireLock(cwd, name);

  try {
    console.log(chalk.cyan("Loading agent..."));
    const agent = await loadAgent(name, cwd);
    await appendLog(cwd, name, ["Loading agent...", `Resolved: ${agent.dir}`]);

    console.log(chalk.cyan("Loading prompt..."));
    await appendLog(cwd, name, [`Loading prompt... (${agent.prompt.length} chars)`]);

    console.log(chalk.cyan("Creating runtime..."));
    const context = await createRuntimeContext({ agentName: agent.metadata.name, cwd, variables });
    await appendLog(cwd, name, [
      `Creating runtime... project=${context.project} timestamp=${context.timestamp}`
    ]);

    console.log(chalk.cyan("Executing..."));
    const result = await executeAgent(agent, context, { providerId });
    await appendLog(cwd, name, [`Executing... success=${result.success}`, result.output]);

    console.log(chalk.green("Done."));

    await appendHistory(cwd, {
      agent: agent.metadata.name,
      version: agent.metadata.version,
      success: result.success,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      durationMs: result.durationMs,
      cwd
    });

    return result;
  } finally {
    await releaseLock(cwd, name);
  }
}
