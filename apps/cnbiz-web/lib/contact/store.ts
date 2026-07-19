import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import type { ContactSubmissionInput, ContactSubmissionRecord } from "./types";

const COLLECTION = "contact-submissions";

/**
 * Was a direct fs.readFileSync/writeFileSync against process.cwd()/lib/data — that path is
 * read-only in Vercel's build output, so production Contact submissions were never durably
 * saved. Routed through CollectionStore/getDefaultStore() like every other registry (requests,
 * projects, etc.) so this now lands in Supabase's app_collections table in production and falls
 * back to the fs store locally, same as everything else.
 */
export async function saveContactSubmission(
  input: ContactSubmissionInput,
  store: CollectionStore = getDefaultStore()
): Promise<ContactSubmissionRecord> {
  const record: ContactSubmissionRecord = {
    id: `contact-${Date.now()}`,
    ...input,
    submittedAt: new Date().toISOString(),
  };

  const submissions = await store.list<ContactSubmissionRecord>(COLLECTION);
  submissions.push(record);
  await store.replaceAll(COLLECTION, submissions);

  return record;
}
