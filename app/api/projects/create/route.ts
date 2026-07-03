import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const { projectName } = await request.json();

    if (!projectName || projectName.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "프로젝트 이름을 입력하세요.",
        },
        { status: 400 }
      );
    }

    const projectsRoot = path.join(process.cwd(), "Projects");
    const projectPath = path.join(projectsRoot, projectName);

    // Projects 폴더가 없으면 생성
    if (!fs.existsSync(projectsRoot)) {
      fs.mkdirSync(projectsRoot, { recursive: true });
    }

    // 이미 존재하는 프로젝트인지 확인
    if (fs.existsSync(projectPath)) {
      return NextResponse.json(
        {
          success: false,
          message: "이미 존재하는 프로젝트입니다.",
        },
        { status: 409 }
      );
    }

    // 프로젝트 폴더 생성
    fs.mkdirSync(projectPath, { recursive: true });

    // 기본 폴더 생성
    const folders = [
      "app",
      "components",
      "public",
      "lib",
      "styles",
      "hooks",
      "types",
    ];

    folders.forEach((folder) => {
      fs.mkdirSync(path.join(projectPath, folder), {
        recursive: true,
      });
    });

    // README 생성
    fs.writeFileSync(
      path.join(projectPath, "README.md"),
      `# ${projectName}

Created by AI-WEB-MASTER
`
    );

    // .gitignore 생성
    fs.writeFileSync(
      path.join(projectPath, ".gitignore"),
      `node_modules
.next
.env
`
    );

    return NextResponse.json({
      success: true,
      message: "프로젝트가 생성되었습니다.",
      project: projectName,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "프로젝트 생성 실패",
      },
      {
        status: 500,
      }
    );
  }
}