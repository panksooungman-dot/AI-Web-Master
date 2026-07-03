import fs from "fs";
import path from "path";
import { getWorkflow } from "./registry";
import { createWorkspace } from "@/lib/workspaces/registry";
import { taskQueue, type AgentTask } from "@/lib/agents/taskQueue";
import { eventBus } from "@/lib/events/eventBus";
import type {
  StepExecutionRecord,
  WorkflowContext,
  WorkflowRun,
  WorkflowStepDefinition,
} from "./types";

interface StepOutcome {
  success: boolean;
  output: string;
  error?: string;
  nextCwd?: string;
  nextWorkspaceId?: string;
  nextWorkspaceName?: string;
  cancelled?: boolean;
}

function createRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeForShell(value: string): string {
  return value.replace(/"/g, '\\"');
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  return slug || "new-project";
}

function toStepOutcome(task: AgentTask): StepOutcome {
  if (task.status === "Cancelled") {
    return { success: false, output: "", error: "취소되었습니다.", cancelled: true };
  }

  return {
    success: task.result?.success ?? false,
    output: task.result?.output ?? "",
    error: task.result?.error,
  };
}

/** Waits for an already-enqueued agent task to reach a terminal state, by
 * subscribing to the existing Event Bus rather than polling. */
function waitForTask(taskId: string): Promise<AgentTask> {
  return new Promise((resolve) => {
    const existing = taskQueue.getTask(taskId);

    if (existing && existing.status !== "Queued" && existing.status !== "Running") {
      resolve(existing);
      return;
    }

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.category !== "agent") return;

      const payload = event.payload as { taskId?: string };
      if (payload.taskId !== taskId) return;

      if (
        event.type !== "task.completed" &&
        event.type !== "task.failed" &&
        event.type !== "task.cancelled"
      ) {
        return;
      }

      unsubscribe();

      const task = taskQueue.getTask(taskId);
      if (task) resolve(task);
    });
  });
}

class WorkflowEngine {
  private runs = new Map<string, WorkflowRun>();
  private pending: string[] = [];
  private processing = false;
  private paused = new Set<string>();
  private cancelled = new Set<string>();
  private activeStepTaskId = new Map<string, string>();

  createRun(workflowId: string, context: WorkflowContext): WorkflowRun {
    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      throw new Error("워크플로를 찾을 수 없습니다.");
    }

    const run: WorkflowRun = {
      id: createRunId(),
      workflowId,
      status: "Pending",
      currentStepIndex: 0,
      context: { ...context },
      steps: workflow.steps.map((step) => ({
        stepId: step.id,
        kind: step.kind,
        status: "Pending",
        startedAt: null,
        finishedAt: null,
        durationMs: null,
        logs: [],
        result: null,
      })),
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
    };

    this.runs.set(run.id, run);
    this.pending.push(run.id);

    eventBus.emit("workflow", "run.created", { runId: run.id, workflowId });

    void this.processNext();

    return run;
  }

  getRun(id: string): WorkflowRun | undefined {
    return this.runs.get(id);
  }

  listRuns(): WorkflowRun[] {
    return Array.from(this.runs.values()).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
  }

  pause(id: string): boolean {
    const run = this.runs.get(id);
    if (!run || run.status !== "Running") return false;

    this.paused.add(id);
    return true;
  }

  resume(id: string): boolean {
    const run = this.runs.get(id);
    if (!run || run.status !== "Paused") return false;

    this.paused.delete(id);
    run.status = "Running";
    this.pending.push(id);

    eventBus.emit("workflow", "run.resumed", { runId: id });

    void this.processNext();

    return true;
  }

  cancel(id: string): boolean {
    const run = this.runs.get(id);
    if (!run) return false;

    if (
      run.status === "Completed" ||
      run.status === "Failed" ||
      run.status === "Cancelled"
    ) {
      return false;
    }

    if (run.status === "Pending") {
      run.status = "Cancelled";
      run.finishedAt = new Date().toISOString();
      this.pending = this.pending.filter((runId) => runId !== id);
      eventBus.emit("workflow", "run.cancelled", { runId: id });
      return true;
    }

    if (run.status === "Paused") {
      run.status = "Cancelled";
      run.finishedAt = new Date().toISOString();
      this.paused.delete(id);
      eventBus.emit("workflow", "run.cancelled", { runId: id });
      return true;
    }

    this.cancelled.add(id);

    const taskId = this.activeStepTaskId.get(id);
    if (taskId) taskQueue.cancel(taskId);

    return true;
  }

  retryStep(id: string): boolean {
    const run = this.runs.get(id);
    if (!run || run.status !== "Failed") return false;

    const stepRecord = run.steps[run.currentStepIndex];
    if (!stepRecord) return false;

    stepRecord.status = "Pending";
    stepRecord.startedAt = null;
    stepRecord.finishedAt = null;
    stepRecord.durationMs = null;
    stepRecord.logs = [];
    stepRecord.result = null;

    run.status = "Pending";
    this.pending.push(id);

    eventBus.emit("workflow", "run.retry", { runId: id, stepId: stepRecord.stepId });

    void this.processNext();

    return true;
  }

  private async executeStep(
    run: WorkflowRun,
    step: WorkflowStepDefinition
  ): Promise<StepOutcome> {
    if (step.kind === "create-workspace") {
      const workspace = createWorkspace(step.params.name, step.params.path);
      return {
        success: true,
        output: `Workspace 생성됨: ${workspace.path}`,
        nextCwd: workspace.path,
        nextWorkspaceId: workspace.id,
        nextWorkspaceName: workspace.name,
      };
    }

    if (step.kind === "generate-structure") {
      const folders = (step.params.folders || "src")
        .split(",")
        .map((folder) => folder.trim())
        .filter(Boolean);

      for (const folder of folders) {
        fs.mkdirSync(path.join(run.context.cwd, folder), { recursive: true });
      }

      return { success: true, output: `폴더 생성됨: ${folders.join(", ")}` };
    }

    if (step.kind === "generate-readme") {
      const projectName = step.params.projectName || "New Project";
      const description = step.params.description || "";
      const content = `# ${projectName}\n\n${description}\n`;

      fs.writeFileSync(path.join(run.context.cwd, "README.md"), content, "utf-8");

      return { success: true, output: "README.md 생성됨" };
    }

    if (step.kind === "generate-package-json") {
      const projectName = step.params.projectName || "New Project";
      const description = step.params.description || "";

      const packageJson = {
        name: slugify(projectName),
        version: "0.1.0",
        description,
        private: true,
        scripts: {},
      };

      fs.writeFileSync(
        path.join(run.context.cwd, "package.json"),
        JSON.stringify(packageJson, null, 2),
        "utf-8"
      );

      return { success: true, output: "package.json 생성됨" };
    }

    const command = this.resolveCommand(step);
    const agentId = step.kind === "ai-prompt" ? step.params.agentId || "claude-code" : "shell";

    const task = taskQueue.enqueue(agentId, command, run.context);
    this.activeStepTaskId.set(run.id, task.id);

    const finished = await waitForTask(task.id);
    this.activeStepTaskId.delete(run.id);

    return toStepOutcome(finished);
  }

  private resolveCommand(step: WorkflowStepDefinition): string {
    switch (step.kind) {
      case "run-terminal":
        return step.params.command;
      case "git-init":
        return "git init";
      case "ai-prompt":
        return step.params.prompt;
      case "git-commit": {
        const message = escapeForShell(step.params.message || "Workflow commit");
        return `git add -A; git commit -m "${message}"`;
      }
      case "git-push":
        return "git push";
      default:
        return "";
    }
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;

    const runId = this.pending.shift();
    if (!runId) return;

    const run = this.runs.get(runId);
    if (!run || run.status === "Cancelled") {
      void this.processNext();
      return;
    }

    this.processing = true;
    run.status = "Running";
    if (!run.startedAt) run.startedAt = new Date().toISOString();

    eventBus.emit("workflow", "run.started", { runId: run.id });

    const workflow = getWorkflow(run.workflowId);

    while (run.currentStepIndex < run.steps.length) {
      if (this.cancelled.has(run.id)) {
        run.status = "Cancelled";
        break;
      }

      if (this.paused.has(run.id)) {
        run.status = "Paused";
        eventBus.emit("workflow", "run.paused", { runId: run.id });
        break;
      }

      const stepRecord: StepExecutionRecord = run.steps[run.currentStepIndex];
      const stepDef = workflow?.steps[run.currentStepIndex];

      if (!workflow || !stepDef) {
        stepRecord.status = "Failed";
        run.status = "Failed";
        break;
      }

      stepRecord.status = "Running";
      stepRecord.startedAt = new Date().toISOString();

      eventBus.emit("workflow", "step.started", {
        runId: run.id,
        stepId: stepRecord.stepId,
        kind: stepRecord.kind,
      });

      const startMs = Date.now();

      try {
        const outcome = await this.executeStep(run, stepDef);

        stepRecord.result = {
          success: outcome.success,
          output: outcome.output,
          error: outcome.error,
        };
        stepRecord.logs.push(outcome.output || outcome.error || "");

        if (outcome.cancelled || this.cancelled.has(run.id)) {
          stepRecord.status = "Cancelled";
          run.status = "Cancelled";
        } else if (outcome.success) {
          stepRecord.status = "Success";
          if (outcome.nextCwd) run.context.cwd = outcome.nextCwd;
          if (outcome.nextWorkspaceId) run.context.workspaceId = outcome.nextWorkspaceId;
          if (outcome.nextWorkspaceName) run.context.workspaceName = outcome.nextWorkspaceName;
        } else {
          stepRecord.status = "Failed";
          run.status = "Failed";
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 오류";
        stepRecord.result = { success: false, output: "", error: message };
        stepRecord.status = "Failed";
        run.status = "Failed";
      } finally {
        stepRecord.finishedAt = new Date().toISOString();
        stepRecord.durationMs = Date.now() - startMs;

        eventBus.emit("workflow", "step.finished", {
          runId: run.id,
          stepId: stepRecord.stepId,
          status: stepRecord.status,
        });
      }

      if (stepRecord.status !== "Success") break;

      run.currentStepIndex += 1;
    }

    if (run.status === "Running" && run.currentStepIndex >= run.steps.length) {
      run.status = "Completed";
    }

    if (run.status === "Completed" || run.status === "Failed" || run.status === "Cancelled") {
      run.finishedAt = new Date().toISOString();
      eventBus.emit("workflow", `run.${run.status.toLowerCase()}`, { runId: run.id });
    }

    this.cancelled.delete(run.id);
    this.processing = false;
    void this.processNext();
  }
}

export const workflowEngine = new WorkflowEngine();
