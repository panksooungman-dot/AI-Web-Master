import { NextResponse } from "next/server";
import { createWorkflow, listWorkflows } from "@/lib/workflows/registry";
import type { WorkflowStepDefinition, WorkflowStepKind } from "@/lib/workflows/types";

const VALID_KINDS: WorkflowStepKind[] = [
  "create-workspace",
  "run-terminal",
  "git-init",
  "ai-prompt",
  "git-commit",
  "git-push",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

function parseSteps(value: unknown): WorkflowStepDefinition[] | null {
  if (!Array.isArray(value)) return null;

  const steps: WorkflowStepDefinition[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const item: unknown = value[index];
    if (!isRecord(item)) return null;

    const kind = item.kind;
    if (typeof kind !== "string" || !VALID_KINDS.includes(kind as WorkflowStepKind)) {
      return null;
    }

    const params = isRecord(item.params) ? item.params : {};
    const stringParams: Record<string, string> = {};

    for (const [key, paramValue] of Object.entries(params)) {
      if (typeof paramValue === "string") stringParams[key] = paramValue;
    }

    steps.push({
      id: typeof item.id === "string" && item.id ? item.id : `step-${index}`,
      kind: kind as WorkflowStepKind,
      params: stringParams,
    });
  }

  return steps;
}

export async function GET() {
  return NextResponse.json({ workflows: listWorkflows() });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
    }

    const name = stringField(body, "name");
    const description = stringField(body, "description");
    const steps = parseSteps(body.steps);

    if (!name || !steps || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: "name과 최소 1개 이상의 steps가 필요합니다." },
        { status: 400 }
      );
    }

    const workflow = createWorkflow(name, description, steps);

    return NextResponse.json({ success: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
