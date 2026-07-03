import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const { projectName } = await request.json();

    if (!projectName) {
      return NextResponse.json(
        {
          success: false,
          message: "프로젝트 이름이 없습니다.",
        },
        { status: 400 }
      );
    }

    const projectPath = path.join(
      process.cwd(),
      "Projects",
      projectName
    );

    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        {
          success: false,
          message: "프로젝트가 존재하지 않습니다.",
        },
        { status: 404 }
      );
    }

    exec(`code "${projectPath}"`);

    return NextResponse.json({
      success: true,
      message: "프로젝트를 열었습니다.",
      project: projectName,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "프로젝트 열기 실패",
      },
      {
        status: 500,
      }
    );
  }
}