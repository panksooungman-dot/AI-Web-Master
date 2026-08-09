import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsAttachmentStore, readFsAttachment } from "../../lib/storage/fsStore";

describe("fs Attachment Store — lib/storage/fsStore.ts", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "fsStore-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("returns a URL carrying the original extension and a readable name slug (score.ts's LOGO_PATTERN depends on this)", async () => {
    const store = createFsAttachmentStore(baseDir);
    const stored = await store.save({
      name: "Company Logo.png",
      contentType: "image/png",
      buffer: Buffer.from("fake-image-bytes"),
    });

    expect(stored.url).toMatch(/\.png\?name=company-logo$/);
  });

  it("round-trips: the id+extension segment in the returned URL can be read back to the original bytes", async () => {
    const store = createFsAttachmentStore(baseDir);
    const original = Buffer.from("hello world");
    const stored = await store.save({ name: "notes.txt", contentType: "text/plain", buffer: original });

    // 서빙 라우트가 실제로 받는 것은 쿼리 스트링을 뗀 경로 세그먼트뿐이다
    // (app/api/attachment-files/[id]/route.ts의 context.params.id).
    const pathOnly = new URL(stored.url).pathname;
    const idSegment = pathOnly.split("/").pop()!;

    const attachment = readFsAttachment(idSegment, baseDir);

    expect(attachment).not.toBeNull();
    expect(attachment!.buffer.toString("utf-8")).toBe("hello world");
    expect(attachment!.contentType).toBe("text/plain");
  });

  it("omits the ?name= query entirely when nothing safe survives slugification (e.g. Korean-only filename)", async () => {
    const store = createFsAttachmentStore(baseDir);
    const stored = await store.save({ name: "회사소개.pdf", contentType: "application/pdf", buffer: Buffer.from("x") });

    expect(stored.url).not.toContain("?name=");
    expect(stored.url).toMatch(/\.pdf$/);
  });
});
