import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const projectsDir = path.join(process.cwd(), "Projects");

    if (!fs.existsSync(projectsDir)) {
      return NextResponse.json([]);
    }

    const projects = fs
      .readdirSync(projectsDir)
      .filter((item) =>
        fs.statSync(path.join(projectsDir, item)).isDirectory()
      );

    return NextResponse.json(projects);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "프로젝트 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}