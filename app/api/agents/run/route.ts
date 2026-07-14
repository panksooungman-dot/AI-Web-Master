import { NextResponse } from "next/server";
import { taskQueue } from "@/lib/agents/taskQueue";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
    }

    const agentId = stringField(body, "agentId");
    const prompt = stringField(body, "prompt");
    const cwd = stringField(body, "cwd");
    const workspaceId = stringField(body, "workspaceId") || undefined;
    const workspaceName = stringField(body, "workspaceName") || undefined;

    if (!agentId || !prompt || !cwd) {
      return NextResponse.json(
        { success: false, error: "agentId·prompt·cwd는 필수입니다." },
        { status: 400 }
      );
    }

    const task = taskQueue.enqueue(agentId, prompt, { cwd, workspaceId, workspaceName });

    const actor = await getCurrentActorEmail();
    recordAuditEvent({ action: "ai.task", actor, success: true, detail: `Agent "${agentId}" 작업 큐 등록` });
    incrementMetric("aiTaskCount");

    return NextResponse.json({ success: true, task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
