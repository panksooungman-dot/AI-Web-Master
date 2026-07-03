export type WorkflowStepKind =
  | "create-workspace"
  | "run-terminal"
  | "git-init"
  | "ai-prompt"
  | "git-commit"
  | "git-push";

export interface WorkflowStepDefinition {
  id: string;
  kind: WorkflowStepKind;
  params: Record<string, string>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStepDefinition[];
  createdAt: string;
}

export type WorkflowRunStatus =
  | "Pending"
  | "Running"
  | "Paused"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type StepRunStatus =
  | "Pending"
  | "Running"
  | "Success"
  | "Failed"
  | "Cancelled";

export interface StepExecutionRecord {
  stepId: string;
  kind: WorkflowStepKind;
  status: StepRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  logs: string[];
  result: { success: boolean; output: string; error?: string } | null;
}

export interface WorkflowContext {
  cwd: string;
  workspaceId?: string;
  workspaceName?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  currentStepIndex: number;
  context: WorkflowContext;
  steps: StepExecutionRecord[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
