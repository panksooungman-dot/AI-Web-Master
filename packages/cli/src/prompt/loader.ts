import fs from "fs-extra";
import path from "path";
import { PromptError, type PromptSet } from "./types.js";
import { validatePromptMetadata } from "./validator.js";

async function readOptionalText(file: string): Promise<string> {
  if (!(await fs.pathExists(file))) {
    return "";
  }
  return fs.readFile(file, "utf8");
}

/**
 * agentDir(agents/<name> 또는 marketplace/agents/<name>)에서 system.md(필수)·
 * user.md·examples.md(선택, 없으면 빈 문자열)·prompt.json(선택, 버전 메타데이터)을 읽는다.
 * Agent Runtime의 loader.ts가 이 함수를 재사용해 프롬프트 파일 존재 여부를 검증한다.
 */
export async function loadPromptSet(agentDir: string): Promise<PromptSet> {
  const systemFile = path.join(agentDir, "system.md");

  if (!(await fs.pathExists(systemFile))) {
    throw new PromptError("MISSING_FILE", `Prompt not found: ${systemFile}`);
  }

  const system = await fs.readFile(systemFile, "utf8");
  const user = await readOptionalText(path.join(agentDir, "user.md"));
  const examples = await readOptionalText(path.join(agentDir, "examples.md"));

  const metadataFile = path.join(agentDir, "prompt.json");
  let rawMetadata: unknown = null;

  if (await fs.pathExists(metadataFile)) {
    rawMetadata = await fs.readJson(metadataFile);
  }

  const metadata = validatePromptMetadata(rawMetadata, metadataFile);

  return { system, user, examples, metadata };
}
