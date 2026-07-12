import { Command } from "commander";
import chalk from "chalk";
import { executeTool, listTools } from "../tools/manager.js";
import { ToolError } from "../tools/types.js";

/** 도구별 안전한(읽기 전용/무해한) 스모크 테스트 입력. CLI 전용 관심사이므로 tools/*.ts에는 두지 않는다. */
const SMOKE_TEST_INPUT: Record<string, unknown> = {
  filesystem: { action: "exists", path: "." },
  terminal: { command: process.platform === "win32" ? "echo ok" : "echo ok" },
  git: { args: ["--version"] },
  github: { action: "repo", owner: "octocat", repo: "Hello-World" },
  browser: { url: "https://example.com" },
  http: { method: "GET", url: "https://example.com" }
};

/** `ai tools list` */
async function toolsListCommand(): Promise<void> {
  const tools = listTools();
  tools.forEach((tool) => {
    console.log(`${tool.id} — ${tool.description}`);
  });
}

/** `ai tools test [id]` — 생략 시 등록된 모든 도구를 스모크 테스트한다. */
async function toolsTestCommand(id?: string): Promise<void> {
  const tools = listTools();
  const targets = id ? tools.filter((tool) => tool.id === id) : tools;

  if (id && targets.length === 0) {
    console.log(chalk.red(`❌ Unknown tool "${id}".`));
    process.exit(1);
  }

  let hadFailure = false;

  for (const tool of targets) {
    const input = SMOKE_TEST_INPUT[tool.id];

    try {
      await executeTool(tool.id, input);
      console.log(chalk.green(`✅ ${tool.id}: OK`));
    } catch (error) {
      hadFailure = true;
      if (error instanceof ToolError) {
        console.log(chalk.red(`❌ ${tool.id}: ${error.message}`));
      } else {
        console.log(chalk.red(`❌ ${tool.id}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  if (hadFailure) {
    process.exit(1);
  }
}

/** `ai tools <list|test>` 명령을 구성한다. */
export function buildToolsCommand(): Command {
  const tools = new Command("tools").description("Tool System 조회 및 테스트 (filesystem/terminal/git/github/browser/http)");

  tools
    .command("list")
    .description("등록된 도구 목록 출력")
    .action(async () => {
      await toolsListCommand();
    });

  tools
    .command("test")
    .argument("[id]", "Tool id (생략 시 전체 스모크 테스트)")
    .description("도구 실행 테스트")
    .action(async (id?: string) => {
      await toolsTestCommand(id);
    });

  return tools;
}
