import mammoth from "mammoth";
import PdfParse from "pdf-parse";
import WordExtractor from "word-extractor";
import { extensionOf, isDocumentUrl } from "./classify";

export { isDocumentUrl };

/** 확장자별 실제 파싱 로직 — "이 확장자가 문서인가"의 판단 자체는 lib/attachments/classify.ts가
 * 담당하고, 여기서는 이미 문서로 분류된 URL을 실제로 어떻게 텍스트로 바꿀지만 다룬다. */
const DOCUMENT_EXTRACTORS: Record<string, (buffer: Buffer) => Promise<string>> = {
  ".pdf": async (buffer) => (await PdfParse(buffer)).text,
  ".docx": async (buffer) => (await mammoth.extractRawText({ buffer })).value,
  ".doc": async (buffer) => (await new WordExtractor().extract(buffer)).getBody(),
  ".txt": async (buffer) => buffer.toString("utf-8"),
};

// 이미지의 MAX_IMAGE_BYTES(5MB)/MAX_IMAGES(6장, packages/cli/src/commands/chat.ts)와 동일한
// 목적의 안전장치 — 문서 하나가 프롬프트 전체를 지배하거나, 첨부파일이 많을 때 컨텍스트가
// 무한정 커지는 것을 막는다. 테스트가 실제 상한값을 기준으로 검증할 수 있도록 export한다.
export const MAX_CHARS_PER_DOCUMENT = 8000;
export const MAX_DOCUMENTS = 5;

export interface ExtractedDocument {
  url: string;
  /** 성공 시 텍스트, 실패 시 undefined. */
  text?: string;
  /** 실패 시에만 존재 — fetch 실패, 확장자 미지원, 파싱 오류 등. */
  error?: string;
}

function truncate(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_CHARS_PER_DOCUMENT) return trimmed;
  return `${trimmed.slice(0, MAX_CHARS_PER_DOCUMENT)}\n...(이하 생략, 원문이 더 깁니다)`;
}

/**
 * 문서 URL 하나를 fetch해 텍스트를 추출한다. 실패(fetch 실패, 빈 본문, 파싱 오류)해도 예외를
 * 던지지 않고 error 필드로 보고한다 — packages/cli/src/commands/chat.ts의 resolveImages()와
 * 동일하게, 첨부파일 하나가 깨져 있다고 나머지 문서·이미지까지 포함한 전체 분석이 시뮬레이션
 * 폴백으로 떨어지는 것은 과한 실패 모드다.
 */
async function extractOne(url: string): Promise<ExtractedDocument> {
  const ext = extensionOf(url);
  const extractor = DOCUMENT_EXTRACTORS[ext];
  if (!extractor) return { url, error: `지원하지 않는 문서 형식입니다 (${ext || "확장자 없음"})` };

  let buffer: Buffer;
  try {
    const response = await fetch(url);
    if (!response.ok) return { url, error: `문서를 가져오지 못했습니다 (${response.status})` };
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    return { url, error: `문서 fetch 실패: ${error instanceof Error ? error.message : String(error)}` };
  }

  try {
    const text = await extractor(buffer);
    if (!text.trim()) return { url, error: "문서에서 추출된 텍스트가 없습니다 (스캔 이미지형 PDF 등)" };
    return { url, text: truncate(text) };
  } catch (error) {
    return { url, error: `문서 파싱 실패: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** uploadedFiles 중 문서로 분류된 URL만 골라(최대 MAX_DOCUMENTS개) 병렬로 텍스트를 추출한다. */
export async function extractDocumentTexts(uploadedFiles: string[] | undefined): Promise<ExtractedDocument[]> {
  if (!uploadedFiles) return [];
  const documentUrls = uploadedFiles.filter(isDocumentUrl).slice(0, MAX_DOCUMENTS);
  return Promise.all(documentUrls.map(extractOne));
}
