import { NextResponse } from "next/server";
import { resolveSafeSourcePath } from "../safe-source-path";

/**
 * Visual Editor의 "코드 에디터에서 열기" 버튼용 API. 화면에는 컴포넌트의 사람이 읽는
 * 이름(label)만 보이고 파일 경로는 감춰져 있지만(2026-08-24 라벨 개선), "이 요소가 실제
 * 어느 파일인지 코드 에디터로 바로 찾아가고 싶다"는 요청은 여전히 남아있어, 클릭 한 번으로
 * VS Code가 정확한 파일을 열도록 연결한다.
 *
 * vscode:// URI 프로토콜(https://code.visualstudio.com/docs/configure/command-line#_opening-vs-code-with-urls)은
 * 절대 경로가 필요하므로, resolveSafeSourcePath()(save-* 핸들러와 동일한 경로 탈출 방지
 * 검증)로 상대 경로를 프로젝트 루트(process.cwd()) 기준 절대 경로로 변환해 돌려준다.
 */
export async function openInEditorHandler(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, reason: "disabled" }, { status: 403 });
  }

  const url = new URL(request.url);
  const file = url.searchParams.get("file");

  if (typeof file !== "string" || !file) {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const absolutePath = resolveSafeSourcePath(file);
  if (!absolutePath) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  return NextResponse.json({ success: true, editorUrl: `vscode://file/${absolutePath}` });
}
