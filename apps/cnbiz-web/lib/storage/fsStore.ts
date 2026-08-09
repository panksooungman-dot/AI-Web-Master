import fs from "fs";
import os from "os";
import path from "path";
import { generateId } from "@/lib/id";
import type { AttachmentInput, AttachmentStore, StoredAttachment } from "./types";

/**
 * lib/db/fsStore.ts와 동일한 이유로 os.tmpdir() 기반이다 — process.cwd()는 배포 산출물의
 * 읽기 전용 경로일 수 있다. 로컬 개발/테스트 전용이며, 프로덕션에서는 getDefaultAttachmentStore()가
 * Supabase Storage가 설정된 경우에만 이 store를 피해간다(설정 안 됐으면 fail-fast, 아래 index.ts).
 */
const DEFAULT_BASE_DIR = path.join(os.tmpdir(), "cnbiz-web", "attachments");

interface Manifest {
  name: string;
  contentType: string;
  size: number;
}

function manifestPath(baseDir: string, id: string): string {
  return path.join(baseDir, `${id}.json`);
}

function dataPath(baseDir: string, id: string): string {
  return path.join(baseDir, id);
}

/** Vercel이 매 요청마다 실제 서비스 중인 배포의 호스트를 VERCEL_URL로 넣어준다 — 커스텀 도메인
 * alias 전파를 기다릴 필요 없이 항상 지금 이 인스턴스를 정확히 가리킨다. 로컬 dev는 fallback. */
function siteOrigin(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function createFsAttachmentStore(baseDir: string = DEFAULT_BASE_DIR): AttachmentStore {
  return {
    async save(input: AttachmentInput): Promise<StoredAttachment> {
      fs.mkdirSync(baseDir, { recursive: true });

      const id = generateId("attachment");
      const manifest: Manifest = { name: input.name, contentType: input.contentType, size: input.buffer.length };

      fs.writeFileSync(dataPath(baseDir, id), input.buffer);
      fs.writeFileSync(manifestPath(baseDir, id), JSON.stringify(manifest), "utf-8");

      return {
        url: `${siteOrigin()}/api/attachment-files/${id}`,
        name: input.name,
        contentType: input.contentType,
        size: input.buffer.length,
      };
    },
  };
}

/** GET /api/attachment-files/[id](로컬 개발 전용 서빙 라우트)이 사용한다. */
export function readFsAttachment(
  id: string,
  baseDir: string = DEFAULT_BASE_DIR
): { buffer: Buffer; contentType: string } | null {
  const manifestFile = manifestPath(baseDir, id);
  const file = dataPath(baseDir, id);
  if (!fs.existsSync(manifestFile) || !fs.existsSync(file)) return null;

  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8")) as Manifest;
  return { buffer: fs.readFileSync(file), contentType: manifest.contentType };
}
