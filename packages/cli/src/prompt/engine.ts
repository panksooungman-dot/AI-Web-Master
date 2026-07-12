import { loadPromptSet } from "./loader.js";
import { renderPromptTemplate } from "./renderer.js";
import type { PromptVariables, RenderedPrompt } from "./types.js";

export { loadPromptSet } from "./loader.js";
export { renderPromptTemplate } from "./renderer.js";

/**
 * Prompt Engine 진입점 — Agent Runtime·Workflow Engine·Orchestrator가 공통으로 재사용한다.
 * agentDir의 system.md(필수)·user.md·examples.md(선택)를 읽어 변수를 치환하고
 * 하나의 최종 프롬프트로 합친다: system → (## Examples) → user.
 */
export async function buildPrompt(agentDir: string, variables: PromptVariables): Promise<RenderedPrompt> {
  const promptSet = await loadPromptSet(agentDir);

  const system = renderPromptTemplate(promptSet.system, variables);
  const examples = renderPromptTemplate(promptSet.examples, variables);
  const user = renderPromptTemplate(promptSet.user, variables);

  const parts = [system];

  if (examples.trim().length > 0) {
    parts.push(`## Examples\n\n${examples}`);
  }

  if (user.trim().length > 0) {
    parts.push(user);
  }

  return {
    system,
    user,
    examples,
    combined: parts.join("\n\n"),
    metadata: promptSet.metadata
  };
}
