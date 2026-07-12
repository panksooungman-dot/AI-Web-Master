import { getTool, listToolIds } from "./registry.js";
import { ToolError, type Tool } from "./types.js";

export interface ToolSummary {
  id: string;
  name: string;
  description: string;
}

/**
 * Tool 등록/로드를 담당하는 재사용 계층 — Agent Runtime·Workflow Engine·Orchestrator가
 * 이 매니저 하나만 알면 되고, 도구별 세부 로직은 tools/<vendor>.ts 안에만 존재한다.
 */
export function listTools(): ToolSummary[] {
  return listToolIds().map((id) => {
    const tool = getTool(id) as Tool;
    return { id: tool.id, name: tool.name, description: tool.description };
  });
}

/** agent.json의 "tools" 배열을 실제 Tool 인스턴스로 해석한다. 알 수 없는 id는 오류. */
export function loadTools(toolIds: string[]): Tool[] {
  return toolIds.map((id) => {
    const tool = getTool(id);
    if (!tool) {
      throw new ToolError("NOT_FOUND", id, `Unknown tool "${id}". Available: ${listToolIds().join(", ")}`);
    }
    return tool;
  });
}

export async function executeTool(id: string, input: unknown): Promise<unknown> {
  const tool = getTool(id);
  if (!tool) {
    throw new ToolError("NOT_FOUND", id, `Unknown tool "${id}". Available: ${listToolIds().join(", ")}`);
  }
  return tool.execute(input);
}
