import fs from "fs-extra";
import path from "path";
import { loadPromptSet } from "../prompt/engine.js";
import { PromptError } from "../prompt/types.js";
import { loadTools } from "../tools/manager.js";
import { listToolIds } from "../tools/registry.js";
import { RuntimeError, type AgentDefinition, type AgentMetadata } from "./types.js";

const REQUIRED_FILES = ["agent.json", "config.json"];
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const REQUIRED_METADATA_FIELDS = ["name", "type", "version", "description", "author", "createdAt"] as const;

/** agents/<name> 를 우선 찾고, 없으면 marketplace/agents/<name> 로 폴백한다. */
async function resolveAgentDir(name: string, cwd: string): Promise<string> {
  const localDir = path.join(cwd, "agents", name);
  if (await fs.pathExists(localDir)) {
    return localDir;
  }

  const marketplaceDir = path.join(cwd, "marketplace", "agents", name);
  if (await fs.pathExists(marketplaceDir)) {
    return marketplaceDir;
  }

  throw new RuntimeError(
    "NOT_FOUND",
    `Agent "${name}" was not found in agents/${name} or marketplace/agents/${name}.`
  );
}

function validateAgentMetadata(raw: unknown, sourceHint: string): AgentMetadata {
  if (typeof raw !== "object" || raw === null) {
    throw new RuntimeError("INVALID_METADATA", `Invalid agent.json at ${sourceHint}: not a JSON object`);
  }

  const metadata = raw as Record<string, unknown>;
  const missing = REQUIRED_METADATA_FIELDS.filter((field) => {
    const value = metadata[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new RuntimeError(
      "INVALID_METADATA",
      `Invalid agent.json at ${sourceHint}: missing/empty field(s) ${missing.join(", ")}`
    );
  }

  if (metadata.type !== "agent") {
    throw new RuntimeError(
      "INVALID_METADATA",
      `Invalid agent.json at ${sourceHint}: type must be "agent" (got "${String(metadata.type)}")`
    );
  }

  const version = metadata.version as string;
  if (!VERSION_PATTERN.test(version)) {
    throw new RuntimeError(
      "INVALID_VERSION",
      `Invalid agent.json at ${sourceHint}: version "${version}" must be semver (x.y.z)`
    );
  }

  const rawTools = metadata.tools;
  let tools: string[] = [];

  if (rawTools !== undefined) {
    const knownTools = listToolIds();
    const isStringArray = Array.isArray(rawTools) && rawTools.every((tool) => typeof tool === "string");

    if (!isStringArray) {
      throw new RuntimeError("INVALID_METADATA", `Invalid agent.json at ${sourceHint}: "tools" must be a string array`);
    }

    const unknown = (rawTools as string[]).filter((tool) => !knownTools.includes(tool));
    if (unknown.length > 0) {
      throw new RuntimeError(
        "INVALID_METADATA",
        `Invalid agent.json at ${sourceHint}: unknown tool(s) ${unknown.join(", ")}. Available: ${knownTools.join(", ")}`
      );
    }

    tools = rawTools as string[];
  }

  return {
    name: metadata.name as string,
    type: "agent",
    version,
    description: metadata.description as string,
    author: metadata.author as string,
    createdAt: metadata.createdAt as string,
    tools
  };
}

async function readRuntimeConfig(file: string): Promise<Record<string, unknown>> {
  let raw: unknown;

  try {
    raw = await fs.readJson(file);
  } catch (error) {
    throw new RuntimeError(
      "INVALID_METADATA",
      `Invalid config.json at ${file}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new RuntimeError("INVALID_METADATA", `Invalid config.json at ${file}: must be a JSON object`);
  }

  return raw as Record<string, unknown>;
}

/**
 * agents/<name> 또는 marketplace/agents/<name> 에서 agent.json·config.json을 로드하고
 * 검증한다. 프롬프트 파일(system.md 등) 존재 확인·로드는 Prompt Engine(loadPromptSet)에
 * 위임하고, 선언된 tools는 Tool System(loadTools)으로 실제 Tool 인스턴스로 해석한다 —
 * 둘 다 재사용이며 중복 구현하지 않는다.
 */
export async function loadAgent(name: string, cwd: string = process.cwd()): Promise<AgentDefinition> {
  const dir = await resolveAgentDir(name, cwd);

  const missingFiles = [];
  for (const file of REQUIRED_FILES) {
    if (!(await fs.pathExists(path.join(dir, file)))) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    throw new RuntimeError(
      "MISSING_FILE",
      `Agent "${name}" is missing required file(s) in ${dir}: ${missingFiles.join(", ")}`
    );
  }

  const agentJsonPath = path.join(dir, "agent.json");
  const rawMetadata = await fs.readJson(agentJsonPath);
  const metadata = validateAgentMetadata(rawMetadata, agentJsonPath);

  let promptSet;
  try {
    promptSet = await loadPromptSet(dir);
  } catch (error) {
    if (error instanceof PromptError && error.code === "MISSING_FILE") {
      throw new RuntimeError("MISSING_FILE", `Agent "${name}" is missing required file(s) in ${dir}: system.md`);
    }
    throw error;
  }

  const config = await readRuntimeConfig(path.join(dir, "config.json"));
  const tools = loadTools(metadata.tools);

  return { name: metadata.name, dir, metadata, prompt: promptSet.system, config, tools };
}
