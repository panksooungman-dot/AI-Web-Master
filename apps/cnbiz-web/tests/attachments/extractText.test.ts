import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// pdf-parse/mammoth/word-extractor 자체의 파싱 정확도는 각 라이브러리의 몫이다 — 여기서는
// lib/attachments/extractText.ts가 이 세 라이브러리를 올바른 시그니처로 호출하고, fetch 실패·
// 빈 텍스트·상한 초과를 우리 쪽 규칙대로 처리하는지만 검증한다.
vi.mock("pdf-parse", () => ({
  default: vi.fn(async (buffer: Buffer) => ({ text: buffer.toString("utf-8") })),
}));
vi.mock("mammoth", () => ({
  default: { extractRawText: vi.fn(async (input: { buffer: Buffer }) => ({ value: input.buffer.toString("utf-8") })) },
}));
vi.mock("word-extractor", () => ({
  default: vi.fn().mockImplementation(() => ({
    extract: vi.fn(async (buffer: Buffer) => ({ getBody: () => buffer.toString("utf-8") })),
  })),
}));

import {
  MAX_CHARS_PER_DOCUMENT,
  MAX_DOCUMENTS,
  extractDocumentTexts,
  isDocumentUrl,
} from "../../lib/attachments/extractText";

function textResponse(body: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  } as unknown as Response;
}

describe("isDocumentUrl()", () => {
  it("recognizes pdf/doc/docx/txt regardless of case and query strings", () => {
    expect(isDocumentUrl("https://x/y/file.PDF")).toBe(true);
    expect(isDocumentUrl("https://x/y/file.docx?token=abc")).toBe(true);
    expect(isDocumentUrl("https://x/y/file.doc")).toBe(true);
    expect(isDocumentUrl("https://x/y/file.txt")).toBe(true);
  });

  it("rejects images and extensionless URLs", () => {
    expect(isDocumentUrl("https://x/y/file.png")).toBe(false);
    expect(isDocumentUrl("https://x/y/api/attachment-files/attachment-abc-123")).toBe(false);
  });
});

describe("extractDocumentTexts()", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns [] for undefined/empty uploadedFiles without calling fetch", async () => {
    expect(await extractDocumentTexts(undefined)).toEqual([]);
    expect(await extractDocumentTexts([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("extracts text for pdf/docx/doc/txt via their respective libraries", async () => {
    fetchMock.mockImplementation(async (url: string) => textResponse(`content of ${url}`));

    const results = await extractDocumentTexts([
      "https://x/a.pdf",
      "https://x/b.docx",
      "https://x/c.doc",
      "https://x/d.txt",
    ]);

    expect(results).toHaveLength(4);
    for (const result of results) {
      expect(result.error).toBeUndefined();
      expect(result.text).toBe(`content of ${result.url}`);
    }
  });

  it("skips non-document URLs (e.g. images) without fetching them", async () => {
    fetchMock.mockImplementation(async () => textResponse("irrelevant"));

    const results = await extractDocumentTexts(["https://x/logo.png", "https://x/spec.txt"]);

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://x/spec.txt");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps processing at MAX_DOCUMENTS even if more document URLs are attached", async () => {
    fetchMock.mockImplementation(async () => textResponse("ok"));
    const urls = Array.from({ length: MAX_DOCUMENTS + 2 }, (_, i) => `https://x/doc-${i}.txt`);

    const results = await extractDocumentTexts(urls);

    expect(results).toHaveLength(MAX_DOCUMENTS);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_DOCUMENTS);
  });

  it("reports (not throws) when fetch resolves with a non-ok status", async () => {
    fetchMock.mockImplementation(async () => textResponse("", false, 404));

    const [result] = await extractDocumentTexts(["https://x/missing.txt"]);

    expect(result.text).toBeUndefined();
    expect(result.error).toMatch(/404/);
  });

  it("reports (not throws) when fetch itself rejects", async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error("network down");
    });

    const [result] = await extractDocumentTexts(["https://x/unreachable.txt"]);

    expect(result.text).toBeUndefined();
    expect(result.error).toMatch(/network down/);
  });

  it("reports an error instead of empty text for content with no extractable text", async () => {
    fetchMock.mockImplementation(async () => textResponse("   \n  "));

    const [result] = await extractDocumentTexts(["https://x/blank.txt"]);

    expect(result.text).toBeUndefined();
    expect(result.error).toMatch(/추출된 텍스트가 없습니다/);
  });

  it("truncates text longer than MAX_CHARS_PER_DOCUMENT and marks it as truncated", async () => {
    const longText = "a".repeat(MAX_CHARS_PER_DOCUMENT + 500);
    fetchMock.mockImplementation(async () => textResponse(longText));

    const [result] = await extractDocumentTexts(["https://x/long.txt"]);

    expect(result.text).toBeDefined();
    expect(result.text!.length).toBeLessThan(longText.length);
    expect(result.text!.startsWith("a".repeat(MAX_CHARS_PER_DOCUMENT))).toBe(true);
    expect(result.text).toMatch(/이하 생략/);
  });
});
