import { getPrompt, getLatestVersion } from "./registry";
import { taskQueue, type AgentTask } from "@/lib/agents/taskQueue";
import { sessionManager } from "@/lib/agents/session";
import type { AgentContext } from "@/lib/agents/types";

function resolveContent(promptId: string, version?: number): string {
  const prompt = getPrompt(promptId);
  if (!prompt) throw new Error("프롬프트를 찾을 수 없습니다.");

  const versionRecord = version
    ? prompt.versions.find((entry) => entry.version === version)
    : getLatestVersion(prompt);

  if (!versionRecord) throw new Error("해당 버전을 찾을 수 없습니다.");

  return versionRecord.content;
}

export function executePrompt(
  promptId: string,
  agentId: string,
  context: AgentContext,
  version?: number
): AgentTask {
  const content = resolveContent(promptId, version);
  return taskQueue.enqueue(agentId, content, context);
}

export function executePromptInSession(
  promptId: string,
  sessionId: string,
  agentId: string,
  version?: number
): AgentTask {
  const content = resolveContent(promptId, version);
  return sessionManager.runInSession(sessionId, agentId, content);
}
