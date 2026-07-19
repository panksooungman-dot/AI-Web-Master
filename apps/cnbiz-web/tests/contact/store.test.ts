import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { saveContactSubmission } from "../../lib/contact/store";
import type { ContactSubmissionInput } from "../../lib/contact/types";

const INPUT: ContactSubmissionInput = {
  name: "Jane",
  phone: "010-1234-5678",
  email: "jane@example.com",
  message: "홈페이지 제작 문의드립니다.",
};

describe("Contact Store — lib/contact/store.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "contact-store-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("saveContactSubmission() assigns id/submittedAt and persists via CollectionStore", async () => {
    const record = await saveContactSubmission(INPUT, store);

    expect(record.id).toBeTruthy();
    expect(record.submittedAt).toBeTruthy();
    expect(record.name).toBe("Jane");

    const raw = JSON.parse(
      fs.readFileSync(path.join(baseDir, "contact-submissions.json"), "utf-8")
    );
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(record.id);
  });

  it("saveContactSubmission() appends to existing submissions without overwriting them", async () => {
    const first = await saveContactSubmission(INPUT, store);
    const second = await saveContactSubmission({ ...INPUT, name: "Other" }, store);

    const raw = JSON.parse(
      fs.readFileSync(path.join(baseDir, "contact-submissions.json"), "utf-8")
    );
    expect(raw.map((r: { id: string }) => r.id)).toEqual([first.id, second.id]);
  });
});
