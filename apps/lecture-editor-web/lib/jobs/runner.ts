import { spawn } from "node:child_process";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { appendLog, getJob, jobWorkDir, saveJob, setStatus } from "./registry";

function pythonBin(): string {
  return process.env.LECTURE_EDITOR_PYTHON || "python3";
}

function editorDir(): string {
  // 배포 시에는 LECTURE_EDITOR_DIR을 반드시 설정한다(.env.example 참고).
  // 이 fallback은 로컬 개발 편의용이며, process.cwd() 동적 경로 조합이 Next.js 빌드 시
  // 파일 트레이싱을 혼란스럽게 만들 수 있어 turbopackIgnore로 명시적으로 표시한다.
  return (
    process.env.LECTURE_EDITOR_DIR ||
    path.join(/* turbopackIgnore: true */ process.cwd(), "..", "lecture-auto-editor")
  );
}

function whisperModel(): string {
  return process.env.WHISPER_MODEL || "small";
}

/** apps/lecture-auto-editor/output 폴더 안에 source.edl.json / source.review.txt를 만들도록
 * 원본 파일을 항상 "source<확장자>"로 고정 저장한다(analyze.py의 _stem_paths와 맞물리는 규칙) —
 * 사용자가 올린 원본 파일명(공백·특수문자·한글 등)이 CLI 인자/경로에 그대로 들어가는 걸 피한다. */
export function fixedSourceFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename) || ".mp4";
  return `source${ext}`;
}

function outputDir(jobId: string): string {
  return path.join(jobWorkDir(jobId), "output");
}

function edlPath(jobId: string, sourceFilename: string): string {
  const stem = path.basename(sourceFilename, path.extname(sourceFilename));
  return path.join(outputDir(jobId), `${stem}.edl.json`);
}

function reviewPath(jobId: string, sourceFilename: string): string {
  const stem = path.basename(sourceFilename, path.extname(sourceFilename));
  return path.join(outputDir(jobId), `${stem}.review.txt`);
}

function finalPath(jobId: string): string {
  return path.join(jobWorkDir(jobId), "final.mp4");
}

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], jobId: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin(), ["-m", "lecture_editor", ...args], {
      cwd: editorDir(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      void appendLog(jobId, text.trim());
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function readTextIfExists(p: string): Promise<string | undefined> {
  try {
    return await readFile(p, "utf-8");
  } catch {
    return undefined;
  }
}

/** 업로드 직후 자동으로 analyze -> render까지 실행한다. */
export async function processNewJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  try {
    await setStatus(jobId, "analyzing");
    const analyzeResult = await runCli(
      ["analyze", job.sourcePath, "--out-dir", outputDir(jobId), "--lang", "ko", "--model", whisperModel()],
      jobId,
    );
    if (analyzeResult.code !== 0) {
      throw new Error(`음성 분석 실패:\n${analyzeResult.stderr || analyzeResult.stdout}`);
    }

    const sourceFilename = path.basename(job.sourcePath);
    const edl = edlPath(jobId, sourceFilename);
    const review = reviewPath(jobId, sourceFilename);

    const current = await getJob(jobId);
    if (!current) return;
    current.edlPath = edl;
    current.reviewPath = review;
    current.reviewText = await readTextIfExists(review);
    await saveJob(current);

    await setStatus(jobId, "rendering");
    const renderResult = await runCli(["render", edl, "--out", finalPath(jobId)], jobId);
    if (renderResult.code !== 0) {
      throw new Error(`렌더링 실패:\n${renderResult.stderr || renderResult.stdout}`);
    }

    const done = await getJob(jobId);
    if (!done) return;
    done.finalPath = finalPath(jobId);
    done.status = "done";
    await saveJob(done);
  } catch (err) {
    await setStatus(jobId, "error", err instanceof Error ? err.message : String(err));
  }
}

/** 자연어 수정 지시를 반영하고 다시 렌더링한다. */
export async function processRevision(jobId: string, instruction: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job || !job.edlPath) return;

  try {
    await setStatus(jobId, "revising");
    const reviseResult = await runCli(["revise", job.edlPath, instruction], jobId);
    if (reviseResult.code !== 0) {
      throw new Error(`수정 반영 실패:\n${reviseResult.stderr || reviseResult.stdout}`);
    }

    const sourceFilename = path.basename(job.sourcePath);
    const review = reviewPath(jobId, sourceFilename);
    const afterRevise = await getJob(jobId);
    if (!afterRevise) return;
    afterRevise.reviewText = await readTextIfExists(review);
    afterRevise.revisions.push({
      instruction,
      appliedAt: new Date().toISOString(),
      summary: reviseResult.stdout.trim(),
    });
    await saveJob(afterRevise);

    await setStatus(jobId, "rendering");
    const renderResult = await runCli(["render", job.edlPath, "--out", finalPath(jobId)], jobId);
    if (renderResult.code !== 0) {
      throw new Error(`렌더링 실패:\n${renderResult.stderr || renderResult.stdout}`);
    }

    const done = await getJob(jobId);
    if (!done) return;
    done.finalPath = finalPath(jobId);
    done.status = "done";
    await saveJob(done);
  } catch (err) {
    await setStatus(jobId, "error", err instanceof Error ? err.message : String(err));
  }
}
