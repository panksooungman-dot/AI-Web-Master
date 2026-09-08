import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { getJob } from "@/lib/jobs/registry";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job || job.status !== "done" || !job.finalPath) {
    return NextResponse.json({ success: false, error: "완성된 영상이 없습니다." }, { status: 404 });
  }

  const fileStat = await stat(job.finalPath).catch(() => null);
  if (!fileStat) {
    return NextResponse.json({ success: false, error: "결과 파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const nodeStream = createReadStream(job.finalPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  const downloadName = `${job.originalFilename.replace(/\.[^./]+$/, "")}_edited.mp4`;

  return new NextResponse(webStream, {
    headers: {
      "content-type": "video/mp4",
      "content-length": String(fileStat.size),
      "content-disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
    },
  });
}
