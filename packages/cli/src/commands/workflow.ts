import { Command } from "commander";
import { workflowCreateCommand } from "./workflow-create.js";
import { workflowRunCommand } from "./workflow-run.js";

/**
 * `ai workflow <create|run> <name>` 명령을 구성한다.
 */
export function buildWorkflowCommand(): Command {
  const workflow = new Command("workflow").description("Workflow 생성 및 실행");

  workflow
    .command("create")
    .argument("<name>", "Workflow name")
    .description("새 Workflow 스캐폴딩 생성 (workflows/<name>)")
    .action(async (name: string) => {
      await workflowCreateCommand(name);
    });

  workflow
    .command("run")
    .argument("<name>", "Workflow name")
    .option("--resume", "중단된 실행 재개 (placeholder, 미구현)")
    .option("--retry", "실패한 단계 재시도 (placeholder, 미구현)")
    .option("--provider <id>", "LLM provider (anthropic|openai|gemini|ollama). 생략 시 기본 provider 또는 시뮬레이션")
    .description("Workflow 실행 — 각 단계의 Agent를 순차 실행")
    .action(async (name: string, options: { resume?: boolean; retry?: boolean; provider?: string }) => {
      await workflowRunCommand(name, options);
    });

  return workflow;
}
