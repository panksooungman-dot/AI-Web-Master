import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { JobRecord, JobStatus } from "./types";

function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

export function jobsDir(): string {
  return path.join(dataDir(), "jobs");
}

export function jobWorkDir(id: string): string {
  return path.join(jobsDir(), id);
}

function jobFilePath(id: string): string {
  return path.join(jobWorkDir(id), "job.json");
}

export function newJobId(): string {
  return randomUUID();
}

export async function createJob(id: string, originalFilename: string, sourcePath: string): Promise<JobRecord> {
  await mkdir(jobWorkDir(id), { recursive: true });
  const now = new Date().toISOString();
  const job: JobRecord = {
    id,
    originalFilename,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    sourcePath,
    revisions: [],
    logs: [{ at: now, text: "업로드 완료, 처리 대기 중" }],
  };
  await saveJob(job);
  return job;
}

export async function saveJob(job: JobRecord): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await mkdir(jobWorkDir(job.id), { recursive: true });
  await writeFile(jobFilePath(job.id), JSON.stringify(job, null, 2), "utf-8");
}

export async function getJob(id: string): Promise<JobRecord | null> {
  try {
    const raw = await readFile(jobFilePath(id), "utf-8");
    return JSON.parse(raw) as JobRecord;
  } catch {
    return null;
  }
}

export async function listJobs(): Promise<JobRecord[]> {
  try {
    const ids = await readdir(jobsDir());
    const jobs = await Promise.all(ids.map((id) => getJob(id)));
    return jobs
      .filter((j): j is JobRecord => j !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function appendLog(id: string, text: string): Promise<void> {
  const job = await getJob(id);
  if (!job) return;
  job.logs.push({ at: new Date().toISOString(), text });
  await saveJob(job);
}

export async function setStatus(id: string, status: JobStatus, error?: string): Promise<void> {
  const job = await getJob(id);
  if (!job) return;
  job.status = status;
  if (error) job.error = error;
  await saveJob(job);
}
