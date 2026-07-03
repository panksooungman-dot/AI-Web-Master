import fs from "fs";
import path from "path";
import type { Workflow, WorkflowStepDefinition } from "./types";

const REGISTRY_PATH = path.join(process.cwd(), "lib", "data", "workflows.json");

function ensureRegistryFile(): void {
  const dir = path.dirname(REGISTRY_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(REGISTRY_PATH, "[]", "utf-8");
  }
}

function readRegistry(): Workflow[] {
  ensureRegistryFile();

  try {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Workflow[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(records: Workflow[]): void {
  ensureRegistryFile();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export function listWorkflows(): Workflow[] {
  return readRegistry();
}

export function getWorkflow(id: string): Workflow | undefined {
  return readRegistry().find((workflow) => workflow.id === id);
}

export function createWorkflow(
  name: string,
  description: string,
  steps: WorkflowStepDefinition[]
): Workflow {
  const record: Workflow = {
    id: `workflow-${Date.now()}`,
    name,
    description,
    steps,
    createdAt: new Date().toISOString(),
  };

  const records = readRegistry();
  records.push(record);
  writeRegistry(records);

  return record;
}
