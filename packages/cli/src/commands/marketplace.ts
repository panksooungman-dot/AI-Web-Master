import { Command } from "commander";
import { installCommand } from "./install.js";
import { removeCommand } from "./remove.js";
import { updateCommand } from "./update.js";
import { searchCommand } from "./search.js";
import { publishCommand } from "./publish.js";

/**
 * `ai marketplace <verb>` — 기존 flat 명령(`ai install`/`ai search`/`ai remove`/
 * `ai update`/`ai publish`)과 동일한 핸들러 함수를 그대로 호출하는 별도 진입점.
 * 로직은 각 핸들러에 단 하나만 존재하며(중복 없음), 두 CLI 표면 모두 그 함수를 공유한다.
 */
export function buildMarketplaceCommand(): Command {
  const marketplace = new Command("marketplace").description(
    "AI Business OS Marketplace 패키지(agent/workflow/skill) 관리"
  );

  marketplace
    .command("install")
    .argument("<name>", "Package name")
    .option("--type <type>", "agent | workflow | skill")
    .option("--json", "JSON 형식으로 출력")
    .description("마켓플레이스의 패키지를 현재 프로젝트에 설치")
    .action(async (name: string, options: { type?: string; json?: boolean }) => {
      await installCommand(name, options);
    });

  marketplace
    .command("remove")
    .argument("<name>", "Package name")
    .option("--type <type>", "agent | workflow | skill")
    .option("--json", "JSON 형식으로 출력")
    .description("설치된 패키지를 제거")
    .action(async (name: string, options: { type?: string; json?: boolean }) => {
      await removeCommand(name, options);
    });

  marketplace
    .command("update")
    .argument("[name]", "Package name (생략 시 설치된 패키지 + 업데이트 가능 여부 목록 표시)")
    .option("--type <type>", "agent | workflow | skill")
    .option("--all", "업데이트 가능한 설치된 패키지를 모두 갱신")
    .option("--json", "JSON 형식으로 출력")
    .description("설치된 패키지를 최신 버전으로 갱신")
    .action(async (name: string | undefined, options: { type?: string; all?: boolean; json?: boolean }) => {
      await updateCommand(name, options);
    });

  marketplace
    .command("search")
    .argument("[keyword]", "Search keyword (name/description 부분 일치)")
    .option("--type <type>", "agent | workflow | skill")
    .option("--json", "JSON 형식으로 출력")
    .description("마켓플레이스에 게시된 패키지 검색")
    .action(async (keyword: string | undefined, options: { type?: string; json?: boolean }) => {
      await searchCommand(keyword, options);
    });

  marketplace
    .command("publish")
    .argument("[name]", "Package name (생략 시 agents/·workflows/·skills/의 모든 로컬 패키지를 게시)")
    .option("--json", "JSON 형식으로 출력")
    .description("생성된 Agent/Workflow/Skill을 마켓플레이스에 게시")
    .action(async (name: string | undefined, options: { json?: boolean }) => {
      await publishCommand(name, options);
    });

  return marketplace;
}
