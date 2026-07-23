import { taskQueue, type AgentTask } from "./taskQueue";
import { generateId } from "@/lib/id";

export interface AiSession {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspacePath: string;
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  workspaceId: string;
  workspaceName: string;
  workspacePath: string;
}

function createSessionId(): string {
  return generateId("session");
}

class SessionManager {
  private sessions = new Map<string, AiSession>();

  createSession(input: CreateSessionInput): AiSession {
    const now = new Date().toISOString();

    const session: AiSession = {
      id: createSessionId(),
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      workspacePath: input.workspacePath,
      taskIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);

    return session;
  }

  getSession(id: string): AiSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): AiSession[] {
    return Array.from(this.sessions.values()).sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : -1
    );
  }

  getHistory(id: string): AgentTask[] {
    const session = this.sessions.get(id);
    if (!session) return [];

    return session.taskIds
      .map((taskId) => taskQueue.getTask(taskId))
      .filter((task): task is AgentTask => Boolean(task));
  }

  runInSession(sessionId: string, agentId: string, prompt: string): AgentTask {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("세션을 찾을 수 없습니다.");
    }

    const task = taskQueue.enqueue(agentId, prompt, {
      cwd: session.workspacePath,
      workspaceId: session.workspaceId,
      workspaceName: session.workspaceName,
    });

    session.taskIds.push(task.id);
    session.updatedAt = new Date().toISOString();

    return task;
  }
}

export const sessionManager = new SessionManager();
