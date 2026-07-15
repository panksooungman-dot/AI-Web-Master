import { getAgent } from "./registry";
import type { AgentContext, AgentOutput } from "./types";
import { eventBus } from "@/lib/events/eventBus";

export type TaskStatus = "Queued" | "Running" | "Success" | "Failed" | "Cancelled";

export interface AgentTask {
  id: string;
  agentId: string;
  prompt: string;
  context: AgentContext;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: AgentOutput | null;
}

function createTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

class TaskQueue {
  private tasks = new Map<string, AgentTask>();
  private pending: string[] = [];
  private controllers = new Map<string, AbortController>();
  private processing = false;

  enqueue(agentId: string, prompt: string, context: AgentContext): AgentTask {
    const task: AgentTask = {
      id: createTaskId(),
      agentId,
      prompt,
      context,
      status: "Queued",
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      result: null,
    };

    this.tasks.set(task.id, task);
    this.pending.push(task.id);

    eventBus.emit("agent", "task.queued", { taskId: task.id, agentId });

    void this.processNext();

    return task;
  }

  getTask(id: string): AgentTask | undefined {
    return this.tasks.get(id);
  }

  listTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
  }

  /**
   * 실패한 Task와 동일한 agentId/prompt/context로 새 Task를 큐에 등록한다.
   * 새 실행 로직 없이 기존 enqueue()를 재사용하며, 원본 Task는 변경하지 않는다.
   * Failed 상태가 아닌 Task는 재시도 대상이 아니므로 null을 반환한다.
   */
  retry(id: string): AgentTask | null {
    const task = this.tasks.get(id);
    if (!task || task.status !== "Failed") return null;

    return this.enqueue(task.agentId, task.prompt, task.context);
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === "Queued") {
      task.status = "Cancelled";
      task.finishedAt = new Date().toISOString();
      this.pending = this.pending.filter((taskId) => taskId !== id);
      eventBus.emit("agent", "task.cancelled", { taskId: id });
      return true;
    }

    if (task.status === "Running") {
      this.controllers.get(id)?.abort();
      return true;
    }

    return false;
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;

    const nextId = this.pending.shift();
    if (!nextId) return;

    const task = this.tasks.get(nextId);
    if (!task || task.status !== "Queued") {
      void this.processNext();
      return;
    }

    this.processing = true;
    task.status = "Running";
    task.startedAt = new Date().toISOString();
    task.progress = 10;

    const controller = new AbortController();
    this.controllers.set(task.id, controller);

    eventBus.emit("agent", "task.started", { taskId: task.id, agentId: task.agentId });


    try {
      const agent = getAgent(task.agentId);

      if (!agent) {
        task.status = "Failed";
        task.result = {
          success: false,
          output: "",
          error: `등록되지 않은 Agent: ${task.agentId}`,
        };
      } else {
        task.progress = 50;

        const result = await agent.run({
          prompt: task.prompt,
          context: task.context,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          task.status = "Cancelled";
        } else {
          task.status = result.success ? "Success" : "Failed";
          task.result = result;
          task.progress = 100;
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        task.status = "Cancelled";
      } else {
        task.status = "Failed";
        task.result = {
          success: false,
          output: "",
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        };
      }
    } finally {
      task.finishedAt = new Date().toISOString();
      this.controllers.delete(task.id);

      eventBus.emit(
        "agent",
        task.status === "Success"
          ? "task.completed"
          : task.status === "Cancelled"
          ? "task.cancelled"
          : "task.failed",
        { taskId: task.id, agentId: task.agentId }
      );

      this.processing = false;
      void this.processNext();
    }
  }
}

export const taskQueue = new TaskQueue();
