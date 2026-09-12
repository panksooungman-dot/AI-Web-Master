import path from "node:path";
import JSZip from "jszip";

/**
 * "2단계" — DOCX/PPTX/XLSX/PDF에서 순수 텍스트를 뽑아 lib/inquiries/extractContact.ts(자동
 * 채우기)와 lib/ai-analysis/prompts.ts(AI Analysis)가 이미지·코드 파일과 동일하게 소비할 수
 * 있도록 한다. DOCX/PPTX/XLSX는 전부 ZIP + XML(Office Open XML) 구조라는 사실에 기반해,
 * 별도의 무거운 오피스 파싱 라이브러리(예: officeparser — OCR용 tesseract.js를 무조건
 * 끌고 들어와 이 용도에는 과함) 대신 jszip 하나로 직접 필요한 XML만 읽어 텍스트 노드를
 * 추출한다. 완벽한 서식 재현이 아니라 "AI가 읽고 연락처를 찾을 수 있는 정도"의 텍스트면
 * 충분하다는 판단.
 *
 * HWP(.hwp/.hwpx)는 이 방식이 통하지 않는다 — 검증된 오픈소스 파서가 사실상 없어(후보
 * hwp.js는 0.0.3 초기 단계) 이번 범위에서 제외했다(사용자 확인, 2026-09-12).
 *
 * 레거시 바이너리 형식(.doc/.xls/.ppt — OLE Compound File, ZIP이 아님)도 이 방식으로는
 * 읽을 수 없다. 이 함수들은 그런 입력에 대해 안전하게 빈 문자열을 반환한다(예외를 던져
 * 업로드 자체를 막지 않음).
 */

const MAX_EXTRACTED_CHARS = 50_000;
const MAX_PDF_PAGES = 30;

function truncate(text: string): string {
  return text.length > MAX_EXTRACTED_CHARS ? text.slice(0, MAX_EXTRACTED_CHARS) : text;
}

/** XML 텍스트 노드 안의 &amp;·&lt;·&gt;·&quot;·&apos; 이스케이프만 최소한으로 복원한다
 *  (완전한 XML 파서가 아니라 텍스트 추출용 최소 구현). */
function unescapeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** `<tag ...>내용</tag>` 형태에서 내용만 전부 뽑아낸다(같은 태그 이름의 self-closing 태그는
 *  텍스트가 없으므로 자연히 매치되지 않는다). */
function extractTagText(xml: string, tagLocalName: string): string[] {
  const pattern = new RegExp(`<(?:\\w+:)?${tagLocalName}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${tagLocalName}>`, "g");
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    if (match[1]) matches.push(unescapeXmlEntities(match[1]));
  }
  return matches;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) return "";

  // 단락(<w:p>) 단위로 잘라 문단 구분을 살리고, 각 단락 안의 텍스트 런(<w:t>)만 이어붙인다.
  const paragraphs = documentXml.split(/<\/w:p>/).map((chunk) => extractTagText(chunk, "w:t").join(""));
  return truncate(paragraphs.filter((p) => p.trim().length > 0).join("\n"));
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numOf = (name: string) => Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return numOf(a) - numOf(b);
    });

  const slideTexts: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    const texts = extractTagText(xml, "a:t");
    if (texts.length > 0) slideTexts.push(texts.join(" "));
  }
  return truncate(slideTexts.join("\n\n"));
}

async function extractXlsxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // 공유 문자열 테이블(xl/sharedStrings.xml) — 문자열 셀은 실제 값 대신 이 테이블의 인덱스만
  // 갖고 있다. <si> 하나당 문자열 하나(서식이 섞이면 <t>가 여러 개일 수 있어 이어붙인다).
  const sharedStringsXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siBlocks = sharedStringsXml.split(/<\/si>/);
    for (const block of siBlocks) {
      const texts = extractTagText(block, "t");
      if (texts.length > 0) sharedStrings.push(texts.join(""));
    }
  }

  const sheetFiles = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numOf = (name: string) => Number(name.match(/sheet(\d+)\.xml$/)?.[1] ?? 0);
      return numOf(a) - numOf(b);
    });

  const rows: string[] = [];
  for (const name of sheetFiles) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;

    const rowBlocks = xml.split(/<\/row>/);
    for (const rowXml of rowBlocks) {
      const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
      const cellValues: string[] = [];
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellPattern.exec(rowXml)) !== null) {
        const attrs = cellMatch[1];
        const inner = cellMatch[2];
        const isSharedString = /\bt="s"/.test(attrs);
        const isInlineString = /\bt="inlineStr"/.test(attrs);
        if (isSharedString) {
          const index = Number(inner.match(/<v>(\d+)<\/v>/)?.[1]);
          if (Number.isFinite(index) && sharedStrings[index]) cellValues.push(sharedStrings[index]);
        } else if (isInlineString) {
          cellValues.push(extractTagText(inner, "t").join(""));
        } else {
          const value = inner.match(/<v>([^<]*)<\/v>/)?.[1];
          if (value) cellValues.push(unescapeXmlEntities(value));
        }
      }
      if (cellValues.length > 0) rows.push(cellValues.join(" | "));
    }
  }

  return truncate(rows.join("\n"));
}

/** pdfjs-dist 패키지 자신의 설치 위치를 기준으로 standard_fonts/cmaps 디렉터리 경로를
 *  구한다 — npm workspaces 호이스팅 여부와 무관하게 항상 실제 설치 위치를 가리킨다.
 *
 *  일반 `require.resolve()`는 여기서 쓸 수 없다 — Next.js 서버 코드는 Turbopack으로
 *  번들링되는데, 번들 안에서 `require.resolve()`는 실제 파일 경로 대신 번들러 내부 모듈
 *  ID(정수)를 돌려준다(2026-09-12 프로덕션 빌드에서 실제 재현: "The `path` argument must
 *  be of type string. Received type number"). `process.getBuiltinModule("module")`는
 *  번들러가 손대지 않는 진짜 Node.js `module` 내장 모듈을 그대로 돌려주므로, 그걸로 만든
 *  `createRequire()`의 `resolve()`는 번들 여부와 무관하게 항상 실제 디스크 경로를 반환한다
 *  (pdfjs-dist 자신도 @napi-rs/canvas를 불러올 때 동일한 방식을 쓴다).
 *
 *  next.config.ts의 outputFileTracingIncludes가 이 두 디렉터리를 프로덕션 번들에 함께
 *  포함해야 실제로 읽을 수 있다(빠지면 fs.readFile이 조용히 실패해 폰트/CJK 텍스트가
 *  깨지거나 잘리는 문제로 이어진다). */
function pdfjsAssetDir(subdir: "standard_fonts" | "cmaps"): string {
  const nodeRequire = (process.getBuiltinModule("module") as typeof import("node:module")).createRequire(
    import.meta.url,
  );
  const pkgJsonPath = nodeRequire.resolve("pdfjs-dist/package.json");
  return path.join(path.dirname(pkgJsonPath), subdir) + path.sep;
}

let pdfjsWorkerReady: Promise<void> | null = null;

/**
 * pdfjs는 실제 Worker 스레드가 없는 환경(Node)에서 "가짜 워커"를 만들 때 자기 자신을
 * `import(workerSrc)`로 한 번 더 동적 로드한다(pdfjs 소스의 `/*webpackIgnore: true*[/]`
 * 주석은 webpack 전용 관례라 Turbopack이 인식하지 못해, 이 호출이 실제 파일이 아니라
 * 번들러의 가상 모듈 경로로 잘못 풀려 실패한다 — 2026-09-12 Turbopack dev 서버에서 실제
 * 재현: "Cannot find package '[project]'..."). pdfjs 자신은 `globalThis.pdfjsWorker.
 * WorkerMessageHandler`가 이미 있으면 그 동적 import를 아예 건너뛰므로, 워커 모듈을 (일반
 * 정적 import라 번들러가 정상적으로 처리하는) 이 파일 상단에서 미리 로드해 채워 넣는다.
 */
async function ensurePdfjsWorkerReady(): Promise<void> {
  if (!pdfjsWorkerReady) {
    pdfjsWorkerReady = import("pdfjs-dist/legacy/build/pdf.worker.mjs").then((worker) => {
      (globalThis as { pdfjsWorker?: { WorkerMessageHandler: unknown } }).pdfjsWorker = {
        WorkerMessageHandler: worker.WorkerMessageHandler,
      };
    });
  }
  return pdfjsWorkerReady;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdfjs-dist는 브라우저 전용 API(DOMMatrix 등)를 일부 참조하므로, Node의 "legacy" 빌드를
  // 사용한다 — 렌더링은 하지 않고 텍스트만 뽑으므로 canvas 등 추가 의존성은 필요 없다.
  await ensurePdfjsWorkerReady();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    // standardFontDataUrl 없이는 내장 폰트 없는 표준 14 폰트(Helvetica 등)의 글리프 폭을
    // 못 구해 텍스트가 중간에서 잘리는 것을 실제로 재현했다. cMapUrl/cMapPacked은 한글처럼
    // CID(복합) 폰트를 쓰는 PDF에서 텍스트가 깨지지 않게 하기 위함.
    standardFontDataUrl: pdfjsAssetDir("standard_fonts"),
    cMapUrl: pdfjsAssetDir("cmaps"),
    cMapPacked: true,
  });

  const doc = await loadingTask.promise;
  try {
    const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();
      if (text) pageTexts.push(text);
    }
    return truncate(pageTexts.join("\n\n"));
  } finally {
    await doc.destroy();
  }
}

const EXTRACTORS: Record<string, (buffer: Buffer) => Promise<string>> = {
  ".docx": extractDocxText,
  ".pptx": extractPptxText,
  ".xlsx": extractXlsxText,
  ".pdf": extractPdfText,
};

export const OFFICE_TEXT_EXTENSIONS = new Set(Object.keys(EXTRACTORS));

/** 지원하지 않는 확장자이거나 파싱에 실패하면 빈 문자열을 반환한다 — 첨부파일 저장 자체는
 *  절대 막지 않는다(lib/ai-analysis/vision.ts 등 이 저장소의 다른 최선노력형 AI 기능과
 *  동일한 원칙). */
export async function extractOfficeText(ext: string, buffer: Buffer): Promise<string> {
  const extractor = EXTRACTORS[ext];
  if (!extractor) return "";
  try {
    return await extractor(buffer);
  } catch (error) {
    console.error("[officeText] extraction failed", ext, error);
    return "";
  }
}
