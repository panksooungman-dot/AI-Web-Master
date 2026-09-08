import { NextRequest, NextResponse } from "next/server";
import Busboy from "busboy";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import path from "node:path";

import { createJob, jobWorkDir, listJobs, newJobId } from "@/lib/jobs/registry";
import { fixedSourceFilename, processNewJob } from "@/lib/jobs/runner";

// child_process·fs 스트림을 쓰므로 반드시 Node 런타임(Edge 아님).
export const runtime = "nodejs";

export async function GET() {
  const jobs = await listJobs();
  return NextResponse.json({ jobs });
}

interface UploadResult {
  originalFilename: string;
  sourcePath: string;
}

/** multipart/form-data로 올라오는 대용량 영상 파일을 메모리에 버퍼링하지 않고
 * 디스크로 바로 스트리밍 저장한다(수백 MB~GB 파일 대응). */
async function receiveUpload(request: NextRequest, dir: string): Promise<UploadResult> {
  const contentType = request.headers.get("content-type") || "";
  if (!request.body) {
    throw new Error("업로드된 파일이 없습니다.");
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const bb = Busboy({ headers: { "content-type": contentType } });
    let originalFilename = "";
    let sourcePath = "";
    let fileWriteDone: Promise<void> | null = null;
    let settled = false;

    bb.on("file", (_name, file, info) => {
      originalFilename = info.filename;
      sourcePath = path.join(dir, fixedSourceFilename(info.filename));
      const writeStream = createWriteStream(sourcePath);
      fileWriteDone = new Promise((res, rej) => {
        writeStream.on("finish", res);
        writeStream.on("error", rej);
      });
      file.pipe(writeStream);
    });

    bb.on("error", (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    });

    bb.on("close", async () => {
      if (settled) return;
      try {
        if (fileWriteDone) await fileWriteDone;
        if (!sourcePath) throw new Error("업로드된 영상 파일을 찾지 못했습니다.");
        settled = true;
        resolve({ originalFilename, sourcePath });
      } catch (err) {
        settled = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    Readable.fromWeb(request.body as WebReadableStream).pipe(bb);
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ success: false, error: "multipart/form-data 형식이 아닙니다." }, { status: 400 });
  }

  const id = newJobId();
  const dir = jobWorkDir(id);
  await mkdir(dir, { recursive: true });

  let upload: UploadResult;
  try {
    upload = await receiveUpload(request, dir);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "업로드 처리 중 오류가 발생했습니다." },
      { status: 400 },
    );
  }

  const job = await createJob(id, upload.originalFilename, upload.sourcePath);

  // 처리는 백그라운드에서 진행 — 응답은 즉시 반환하고 클라이언트는 상태를 폴링한다.
  void processNewJob(id);

  return NextResponse.json({ success: true, job });
}
