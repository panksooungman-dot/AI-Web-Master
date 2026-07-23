import { NextResponse } from "next/server";
import { createWorkflow } from "@/lib/workflows/registry";
import { workflowEngine } from "@/lib/workflows/engine";
import type { WorkflowStepDefinition } from "@/lib/workflows/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

function buildBootstrapSteps(
  projectName: string,
  description: string,
  workspaceName: string,
  workspacePath: string
): WorkflowStepDefinition[] {
  return [
    {
      id: "create-workspace",
      kind: "create-workspace",
      params: { name: workspaceName, path: workspacePath },
    },
    { id: "git-init", kind: "git-init", params: {} },
    {
      id: "generate-structure",
      kind: "generate-structure",
      params: { folders: "src,public" },
    },
    {
      id: "generate-readme",
      kind: "generate-readme",
      params: { projectName, description },
    },
    {
      id: "generate-package-json",
      kind: "generate-package-json",
      params: { projectName, description },
    },
    {
      id: "npm-install",
      kind: "run-terminal",
      params: { command: "npm install" },
    },
    {
      id: "git-commit",
      kind: "git-commit",
      params: { message: "Initial commit" },
    },
  ];
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
    }

    const name = stringField(body, "name");
    const description = stringField(body, "description");
    const workspaceName = stringField(body, "workspaceName");
    const workspacePath = stringField(body, "workspacePath");

    if (!name || !workspaceName || !workspacePath) {
      return NextResponse.json(
        { success: false, error: "name·workspaceName·workspacePath는 필수입니다." },
        { status: 400 }
      );
    }

    const steps = buildBootstrapSteps(name, description, workspaceName, workspacePath);
    const workflow = await createWorkflow(`New Project: ${name}`, `${name} 자동 생성 워크플로`, steps);
    const run = await workflowEngine.createRun(workflow.id, { cwd: workspacePath });

    return NextResponse.json({ success: true, workflow, run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
