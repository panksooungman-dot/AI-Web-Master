import { describe, expect, it } from "vitest";
import { taskQueue, type AgentTask } from "../../lib/agents/taskQueue";

async function waitForSettled(id: string, timeoutMs = 5000): Promise<AgentTask> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const task = taskQueue.getTask(id);
    if (task && ["Success", "Failed", "Cancelled"].includes(task.status)) {
      return task;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Task ${id} did not settle within ${timeoutMs}ms`);
}

describe("AI Task Runner — retry() (lib/agents/taskQueue.ts)", () => {
  it("retry() returns null for an unknown task id", () => {
    expect(taskQueue.retry("does-not-exist")).toBeNull();
  });

  it("retry() returns null for a task that is not Failed (e.g. Success)", async () => {
    const task = taskQueue.enqueue("shell", "echo hi", { cwd: process.cwd() });
    const settled = await waitForSettled(task.id);

    expect(settled.status).toBe("Success");
    expect(taskQueue.retry(task.id)).toBeNull();
  });

  it("retry() re-enqueues a Failed task with the same agentId/prompt/context as a new task", async () => {
    // 존재하지 않는 agentId는 processNext()에서 즉시(동기적으로) Failed 처리된다.
    const original = taskQueue.enqueue("does-not-exist-agent", "some prompt", { cwd: process.cwd() });
    expect(original.status).toBe("Failed");

    const retried = taskQueue.retry(original.id);

    expect(retried).not.toBeNull();
    expect(retried?.id).not.toBe(original.id);
    expect(retried?.agentId).toBe(original.agentId);
    expect(retried?.prompt).toBe(original.prompt);

    // 원본 Task는 retry()로 인해 변경되지 않는다.
    expect(taskQueue.getTask(original.id)?.status).toBe("Failed");
  });
});
