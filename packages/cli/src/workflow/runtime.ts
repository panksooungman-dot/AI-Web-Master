import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { loadWorkflow } from "./loader.js";
import { executeStep, stepLabel } from "./executor.js";
import { WorkflowError, type StepResult, type WorkflowRunResult } from "./types.js";
import { getOrCreateMemory, loadMemory, updateStep as updateMemoryStep } from "../memory/manager.js";

export interface RunWorkflowOptions {
  cwd?: string;
  variables?: Record<string, string>;
  providerId?: string;
}

function runtimeRoot(cwd: string): string {
  return path.join(cwd, ".runtime", "workflow");
}

function lockFile(cwd: string, name: string): string {
  return path.join(runtimeRoot(cwd), "locks", `${name}.lock`);
}

/** 요구사항 4 — 동일 Workflow가 이미 실행 중이면 중복 실행을 막는다. */
async function acquireLock(cwd: string, name: string): Promise<void> {
  const file = lockFile(cwd, name);
  await fs.ensureDir(path.dirname(file));

  if (await fs.pathExists(file)) {
    throw new WorkflowError(
      "DUPLICATE_RUNTIME",
      `Workflow "${name}" is already running (lock: ${file}). Wait for it to finish, or remove the file if it is stale.`
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

async function appendHistory(cwd: string, record: WorkflowRunResult): Promise<void> {
  const historyFile = path.join(runtimeRoot(cwd), "history.json");
  await fs.ensureDir(path.dirname(historyFile));

  let history: WorkflowRunResult[] = [];

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
 * `ai workflow run <name>` 오케스트레이터.
 * loader(로드) → 각 step 순차 실행(executor) → 로깅 순으로 진행하며
 * `.runtime/workflow/logs/<name>.log`·`.runtime/workflow/history.json`에 기록한다.
 * Stop on error: 한 단계가 실패하면 이후 단계를 실행하지 않고 즉시 중단한다.
 */
export async function runWorkflow(name: string, options: RunWorkflowOptions = {}): Promise<WorkflowRunResult> {
  const { cwd = process.cwd(), variables = {}, providerId } = options;

  await acquireLock(cwd, name);

  const startedAt = new Date().toISOString();
  const steps: StepResult[] = [];
  let success = true;

  try {
    console.log(chalk.cyan("Loading workflow..."));
    const workflow = await loadWorkflow(name, cwd);
    await appendLog(cwd, name, [
      "Loading workflow...",
      `Resolved: ${workflow.dir}`,
      `Steps: ${workflow.steps.length}`
    ]);

    // Memory System 요구사항 5 — Workflow Memory 확보(없으면 생성)
    await getOrCreateMemory(cwd, workflow.name, { version: workflow.version, context: { variables } });

    // Prompt Engine {{input}}/{{output}} 체이닝 — 이전 단계의 output이 다음 단계의 input이 된다.
    let previousOutput: unknown;

    for (let index = 0; index < workflow.steps.length; index += 1) {
      const step = workflow.steps[index];
      const label = stepLabel(step);

      console.log(chalk.cyan(`Running ${label}...`));

      // 요구사항 5 — 단계 실행 전 memory 로드
      await loadMemory(cwd, workflow.name);

      const result = await executeStep(index, step, cwd, variables, providerId, workflow.name, previousOutput);
      steps.push(result);
      previousOutput = { message: result.output, simulated: result.simulated };

      // 요구사항 5 — 단계 실행 후 output 저장
      await updateMemoryStep(cwd, workflow.name, step.agent, {
        status: result.status === "success" ? "completed" : "failed",
        input: {},
        output: { message: result.output, simulated: result.simulated },
        error: result.error
      });

      await appendLog(cwd, name, [
        `Running ${label}... status=${result.status}${result.simulated ? " (simulated)" : ""}`,
        result.output || result.error || ""
      ]);

      if (result.status === "failed") {
        success = false;
        console.log(chalk.red(`❌ Step "${label}" failed: ${result.error ?? "unknown error"}`));
        break;
      }
    }

    console.log(success ? chalk.green("Workflow complete.") : chalk.red("Workflow stopped due to an error."));

    const finishedAt = new Date().toISOString();
    const runResult: WorkflowRunResult = {
      workflow: workflow.name,
      version: workflow.version,
      success,
      startedAt,
      finishedAt,
      durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
      steps
    };

    await appendHistory(cwd, runResult);
    return runResult;
  } finally {
    await releaseLock(cwd, name);
  }
}

/**
 * 요구사항 7 — Resume/Retry placeholder.
 * 이번 MVP에서는 실행 이력만 남기며 실제 재개/재시도 로직은 아직 구현하지 않는다.
 */
export async function resumeWorkflow(name: string): Promise<never> {
  throw new WorkflowError("NOT_IMPLEMENTED", `Resume is not implemented yet for workflow "${name}" (placeholder).`);
}

export async function retryWorkflow(name: string): Promise<never> {
  throw new WorkflowError("NOT_IMPLEMENTED", `Retry is not implemented yet for workflow "${name}" (placeholder).`);
}
