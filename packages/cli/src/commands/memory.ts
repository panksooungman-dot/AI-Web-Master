import { Command } from "commander";
import {
  memoryClearCommand,
  memoryExportCommand,
  memoryListCommand,
  memoryShowCommand
} from "../memory/commands.js";

/** `ai memory <list|show|clear|export>` 명령을 구성한다. */
export function buildMemoryCommand(): Command {
  const memory = new Command("memory").description("Workflow/Agent 실행 메모리 조회 및 관리");

  memory
    .command("list")
    .description("저장된 메모리 목록 출력 (.runtime/memory/*.json)")
    .action(async () => {
      await memoryListCommand();
    });

  memory
    .command("show")
    .argument("<workflow>", "Workflow/Agent name")
    .description("메모리 내용을 pretty JSON으로 출력")
    .action(async (workflow: string) => {
      await memoryShowCommand(workflow);
    });

  memory
    .command("clear")
    .argument("<workflow>", "Workflow/Agent name")
    .description("메모리 삭제")
    .action(async (workflow: string) => {
      await memoryClearCommand(workflow);
    });

  memory
    .command("export")
    .argument("<workflow>", "Workflow/Agent name")
    .description("메모리를 .runtime/exports/memory-<name>.json으로 내보내기")
    .action(async (workflow: string) => {
      await memoryExportCommand(workflow);
    });

  return memory;
}
