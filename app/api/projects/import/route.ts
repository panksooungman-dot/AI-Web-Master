import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { createWorkspace } from "@/lib/workspaces/registry";
import { createProject } from "@/lib/projects/registry";
import { detectProjectHealth } from "@/lib/projects/detect";

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

    const name = stringField(body, "name");
    const company = stringField(body, "company");
    const folderPath = stringField(body, "folderPath");
    const gitRemoteUrl = stringField(body, "gitRemoteUrl");

    if (!name || !company || !folderPath) {
      return NextResponse.json(
        { success: false, error: "Project Name·Company·Folder Path는 필수입니다." },
        { status: 400 }
      );
    }

    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      return NextResponse.json(
        { success: false, error: "존재하는 폴더 경로를 입력하세요." },
        { status: 400 }
      );
    }

    const detection = await detectProjectHealth(folderPath);

    // Registers the existing folder as-is — createWorkspace's mkdirSync is a
    // no-op for a path that already exists, so nothing is copied or created.
    const workspace = createWorkspace(path.basename(folderPath), folderPath);

    const project = createProject({
      name,
      company,
      type: detection.framework ?? "Imported Project",
      description: "",
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspacePath: workspace.path,
      imported: true,
      gitRemoteUrl: gitRemoteUrl || undefined,
    });

    return NextResponse.json({ success: true, project, workspace, detection });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
