export interface AgentContext {
  cwd: string;
  workspaceId?: string;
  workspaceName?: string;
}

export interface AgentInput {
  prompt: string;
  context: AgentContext;
  signal?: AbortSignal;
}

export interface AgentOutput {
  success: boolean;
  output: string;
  error?: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  isAvailable(): Promise<boolean>;
  run(input: AgentInput): Promise<AgentOutput>;
}
