import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";
import type { Workflow, WorkflowStepDefinition } from "./types";

const COLLECTION = "workflows";

export async function listWorkflows(store: CollectionStore = getDefaultStore()): Promise<Workflow[]> {
  return store.list<Workflow>(COLLECTION);
}

export async function getWorkflow(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<Workflow | undefined> {
  const records = await store.list<Workflow>(COLLECTION);
  return records.find((workflow) => workflow.id === id);
}

export async function createWorkflow(
  name: string,
  description: string,
  steps: WorkflowStepDefinition[],
  store: CollectionStore = getDefaultStore()
): Promise<Workflow> {
  const record: Workflow = {
    id: generateId("workflow"),
    name,
    description,
    steps,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<Workflow>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
