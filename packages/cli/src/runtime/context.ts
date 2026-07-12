import { getOrCreateMemory } from "../memory/manager.js";
import type { RuntimeContext } from "./types.js";

export interface CreateRuntimeContextOptions {
  agentName: string;
  cwd?: string;
  variables?: Record<string, string>;
}

/**
 * 요구사항 5 — { project, cwd, timestamp, variables, memory } Runtime Context 생성.
 * Memory 조회/생성은 packages/cli/src/memory(Memory Manager)에 위임한다 — Memory System
 * 요구사항 9(Agent Runtime이 Memory Manager를 재사용해야 함)를 충족한다.
 */
export async function createRuntimeContext(
  options: CreateRuntimeContextOptions
): Promise<RuntimeContext> {
  const { agentName, cwd = process.cwd(), variables = {} } = options;

  const memoryRecord = await getOrCreateMemory(cwd, agentName, { context: { variables } });

  return {
    project: memoryRecord.context.project,
    cwd,
    timestamp: new Date().toISOString(),
    variables,
    memory: memoryRecord.steps[agentName]?.output ?? {}
  };
}
