import { NextResponse } from "next/server";
import { eventBus, type EngineEvent } from "@/lib/events/eventBus";

type LogCategory = "Terminal" | "Git" | "AI" | "System";
type LogStatus = "Success" | "Error" | "Info" | "Warning";

interface LogItem {
  id: string;
  timestamp: string;
  category: LogCategory;
  message: string;
  status: LogStatus;
}

const CATEGORY_MAP: Record<EngineEvent["category"], LogCategory> = {
  terminal: "Terminal",
  git: "Git",
  agent: "AI",
  workflow: "System",
};

function field(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key] : String(payload[key] ?? "");
}

function describe(event: EngineEvent): { message: string; status: LogStatus } {
  const { type, payload } = event;

  switch (type) {
    case "command.success":
      return { message: `명령 실행: ${field(payload, "command")}`, status: "Success" };
    case "command.failed":
      return { message: `명령 실행 실패: ${field(payload, "command")}`, status: "Error" };
    case "task.queued":
      return { message: `Task 대기열 등록 (${field(payload, "agentId")})`, status: "Info" };
    case "task.started":
      return { message: `Task 시작됨 (${field(payload, "agentId")})`, status: "Info" };
    case "task.completed":
      return { message: `Task 완료됨 (${field(payload, "agentId")})`, status: "Success" };
    case "task.failed":
      return { message: `Task 실패 (${field(payload, "agentId")})`, status: "Error" };
    case "task.cancelled":
      return { message: `Task 취소됨 (${field(payload, "agentId")})`, status: "Warning" };
    case "run.created":
      return { message: "워크플로 실행 생성됨", status: "Info" };
    case "run.started":
      return { message: "워크플로 실행 시작됨", status: "Info" };
    case "run.completed":
      return { message: "워크플로 실행 완료됨", status: "Success" };
    case "run.failed":
      return { message: "워크플로 실행 실패", status: "Error" };
    case "run.cancelled":
      return { message: "워크플로 실행 취소됨", status: "Warning" };
    case "run.paused":
      return { message: "워크플로 일시정지됨", status: "Warning" };
    case "run.resumed":
      return { message: "워크플로 재개됨", status: "Info" };
    case "run.retry":
      return { message: `워크플로 Step 재시도: ${field(payload, "stepId")}`, status: "Info" };
    case "step.started":
      return { message: `Step 시작: ${field(payload, "kind")}`, status: "Info" };
    case "step.finished": {
      const stepStatus = field(payload, "status");
      const status: LogStatus =
        stepStatus === "Success" ? "Success" : stepStatus === "Cancelled" ? "Warning" : "Error";
      return { message: `Step 종료 (${field(payload, "stepId")}): ${stepStatus}`, status };
    }
    default:
      return { message: type, status: "Info" };
  }
}

export async function GET() {
  const logs: LogItem[] = eventBus
    .getHistory()
    .slice()
    .reverse()
    .map((event) => {
      const { message, status } = describe(event);

      return {
        id: event.id,
        timestamp: event.timestamp,
        category: CATEGORY_MAP[event.category],
        message,
        status,
      };
    });

  return NextResponse.json({ logs });
}
