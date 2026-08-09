import fs from "fs";
import os from "os";
import path from "path";
import { generateId } from "@/lib/id";
import { safeExtension, safeSlug } from "./extension";
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

      // supabaseStore.ts의 safeKey()와 동일하게 확장자를 URL에 남긴다 — lib/ai-analysis/
      // analysis.ts·lib/attachments/extractText.ts가 URL 확장자로 이미지/문서를 분류하므로,
      // 이게 없으면(수정 전 상태) 로컬 스토리지로 업로드된 파일은 vision/문서 파싱 어느 쪽으로도
      // 절대 분류되지 못했다(둘 다 조용히 스킵 — 에러 없이 그냥 반영되지 않는 실패였다).
      const slug = safeSlug(input.name);
      // 원본 파일명을 사람이 읽을 수 있는 형태로 URL에 남긴다 — lib/ai-analysis/score.ts의
      // LOGO_PATTERN이 URL 문자열로 "로고 첨부 여부"를 판단하므로(safeExtension 주석 참고).
      const query = slug ? `?name=${slug}` : "";

      return {
        url: `${siteOrigin()}/api/attachment-files/${id}${safeExtension(input.name)}${query}`,
        name: input.name,
        contentType: input.contentType,
        size: input.buffer.length,
      };
    },
  };
}

/** GET /api/attachment-files/[id](로컬 개발 전용 서빙 라우트)이 사용한다. 저장 시 확장자 없이
 * `id`만으로 키를 잡으므로, 여기서는 URL에 붙어 온 확장자를 떼어내고 원래 id로 되돌린다. */
export function readFsAttachment(
  idOrIdWithExtension: string,
  baseDir: string = DEFAULT_BASE_DIR
): { buffer: Buffer; contentType: string } | null {
  const id = idOrIdWithExtension.replace(/\.[a-zA-Z0-9]{1,8}$/, "");
  const manifestFile = manifestPath(baseDir, id);
  const file = dataPath(baseDir, id);
  if (!fs.existsSync(manifestFile) || !fs.existsSync(file)) return null;

  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8")) as Manifest;
  return { buffer: fs.readFileSync(file), contentType: manifest.contentType };
}
