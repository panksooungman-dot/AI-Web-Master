import type { Agent } from "./types";
import { shellAgent } from "./implementations/shellAgent";
import { claudeCodeAgent } from "./implementations/claudeCodeAgent";
import { cursorAgent } from "./implementations/cursorAgent";

const agents = new Map<string, Agent>([
  [shellAgent.id, shellAgent],
  [claudeCodeAgent.id, claudeCodeAgent],
  [cursorAgent.id, cursorAgent],
]);

export function getAgent(id: string): Agent | undefined {
  return agents.get(id);
}

export function listAgents(): Agent[] {
  return Array.from(agents.values());
}

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

export async function listAgentSummaries(): Promise<AgentSummary[]> {
  return Promise.all(
    listAgents().map(async (agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      available: await agent.isAvailable(),
    }))
  );
}
