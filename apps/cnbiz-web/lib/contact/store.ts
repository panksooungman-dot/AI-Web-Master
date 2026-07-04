import fs from "fs";
import path from "path";
import type { ContactSubmissionInput, ContactSubmissionRecord } from "./types";

const STORE_PATH = path.join(process.cwd(), "lib", "data", "contact-submissions.json");

function ensureStoreFile(): void {
  const dir = path.dirname(STORE_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, "[]", "utf-8");
  }
}

function readSubmissions(): ContactSubmissionRecord[] {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContactSubmissionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveContactSubmission(input: ContactSubmissionInput): ContactSubmissionRecord {
  const record: ContactSubmissionRecord = {
    id: `contact-${Date.now()}`,
    ...input,
    submittedAt: new Date().toISOString(),
  };

  const submissions = readSubmissions();
  submissions.push(record);
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(submissions, null, 2), "utf-8");

  return record;
}
