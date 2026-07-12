import { Command } from "commander";
import { createAgentCommand } from "./create-agent.js";
import { createWorkflowCommand } from "./create-workflow.js";
import { createSkillCommand } from "./create-skill.js";

/**
 * `ai create <agent|workflow|skill> <name>` 명령을 구성한다.
 * 새 Generator 추가 시 이 파일에 서브커맨드 한 줄만 추가하면 된다.
 */
export function buildCreateCommand(): Command {
  const create = new Command("create").description("Agent / Workflow / Skill 스캐폴딩 생성");

  create
    .command("agent")
    .argument("<name>", "Agent name")
    .description("새 Agent 스캐폴딩 생성 (agents/<name>)")
    .action(async (name: string) => {
      await createAgentCommand(name);
    });

  create
    .command("workflow")
    .argument("<name>", "Workflow name")
    .description("새 Workflow 스캐폴딩 생성 (workflows/<name>)")
    .action(async (name: string) => {
      await createWorkflowCommand(name);
    });

  create
    .command("skill")
    .argument("<name>", "Skill name")
    .description("새 Skill 스캐폴딩 생성 (skills/<name>)")
    .action(async (name: string) => {
      await createSkillCommand(name);
    });

  return create;
}
