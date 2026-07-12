import { updateStep } from "../memory/manager.js";
import { getProviderManager } from "../providers/manager.js";
import { buildPrompt } from "../prompt/engine.js";
import type { AgentDefinition, ExecutionResult, RuntimeContext } from "./types.js";

export interface ExecuteAgentOptions {
  /** 명시적으로 요청된 provider id. 생략 시 providers.json의 default를 사용한다. */
  providerId?: string;
  /** Workflow Engine/Orchestrator가 채워주는 Prompt Engine 변수({{workflow}}/{{step}}/{{input}}/{{output}}) */
  workflow?: string;
  step?: string;
  input?: unknown;
  output?: unknown;
}

/**
 * Agent를 실행한다.
 * 1) Prompt Engine(buildPrompt)으로 system.md/user.md/examples.md를 렌더링·조합한다
 *    (요구사항: {{project}}/{{workflow}}/{{memory}}/{{step}}/{{input}}/{{output}} 지원).
 * 2) ProviderManager로 provider가 해석되면 실제 provider.chat()을 호출해 LLM 응답을 받고,
 *    해석되는 provider가 없으면(설정 없음) 기존 MVP 시뮬레이션으로 동작한다.
 * `--provider`로 명시적으로 요청된 provider가 실패하면 조용히 감추지 않고 그대로 전파한다.
 */
export async function executeAgent(
  agent: AgentDefinition,
  context: RuntimeContext,
  options: ExecuteAgentOptions = {}
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();

  const rendered = await buildPrompt(agent.dir, {
    ...context.variables,
    agent: agent.metadata.name,
    project: context.project,
    workflow: options.workflow,
    memory: context.memory,
    step: options.step ?? agent.metadata.name,
    input: options.input,
    output: options.output
  });

  const renderedPrompt = rendered.combined;
  const toolNote = agent.tools.length > 0 ? ` Tools available: ${agent.tools.map((tool) => tool.id).join(", ")}.` : "";

  const manager = getProviderManager(context.cwd);
  const resolvedProviderId = await manager.resolveProviderId(options.providerId);

  let output: string;
  let providerUsed: string | undefined;
  let modelUsed: string | undefined;

  if (resolvedProviderId) {
    try {
      const provider = await manager.getProvider(resolvedProviderId);
      const response = await provider.chat({
        messages: [
          { role: "system", content: renderedPrompt },
          {
            role: "user",
            content: context.variables.task ?? "Proceed with your role as defined in the system prompt."
          }
        ]
      });
      output = response.content;
      providerUsed = response.provider;
      modelUsed = response.model;
    } catch (error) {
      if (options.providerId) {
        // 사용자가 명시적으로 provider를 요청했다면 실패를 숨기지 않는다.
        throw error;
      }
      // 기본 provider가 설정돼 있었지만 실패한 경우(예: API 키 없음) — 기존 MVP 시뮬레이션으로 폴백.
      output = `[simulated] "${agent.metadata.name}" received a ${renderedPrompt.length}-char prompt.${toolNote} Provider "${resolvedProviderId}" unavailable (${error instanceof Error ? error.message : String(error)}) — execution simulated instead.`;
    }
  } else {
    output = `[simulated] "${agent.metadata.name}" received a ${renderedPrompt.length}-char prompt.${toolNote} No LLM connected yet — execution simulated successfully.`;
  }

  await updateStep(context.cwd, agent.metadata.name, agent.metadata.name, {
    status: "completed",
    input: { promptLength: renderedPrompt.length, tools: agent.tools.map((tool) => tool.id) },
    output: { message: output, lastRunAt: startedAt, provider: providerUsed, model: modelUsed }
  });

  const finishedAt = new Date().toISOString();

  return {
    success: true,
    agent: agent.metadata.name,
    startedAt,
    finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
    output,
    provider: providerUsed,
    model: modelUsed
  };
}
