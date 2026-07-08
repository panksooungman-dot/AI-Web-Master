const path = require("node:path");
const { log } = require("../lib/log");
const { getStatusSummary, run } = require("../lib/git");
const { ask } = require("../lib/prompt");

async function deploy(args) {
  const cwd = args.path ? path.resolve(args.path) : process.cwd();
  const branch = args.branch || "main";

  log.title("AI Business OS - Deploy");
  console.log("");

  const status = getStatusSummary(cwd);
  if (!status.branch) {
    log.error("deploy", `Git 저장소가 아닙니다: ${cwd}`);
    return;
  }

  if (status.branch !== branch) {
    log.warn("deploy", `현재 브랜치(${status.branch})가 대상 브랜치(${branch})와 다릅니다.`);
    const answer = await ask(`${branch} 브랜치로 전환할까요? (y/N): `);
    if (answer.toLowerCase() === "y") {
      run(cwd, ["checkout", branch]);
    } else {
      log.dim("[deploy] 취소되었습니다.");
      return;
    }
  }

  if (status.changed > 0) {
    log.error("deploy", "커밋되지 않은 변경사항이 있습니다. 먼저 커밋하세요.");
    return;
  }

  log.info(`[deploy] ${branch} 브랜치를 원격에 push 합니다.`);
  const answer = await ask("계속할까요? (y/N): ");
  if (answer.toLowerCase() !== "y") {
    log.dim("[deploy] 취소되었습니다.");
    return;
  }

  const push = run(cwd, ["push", "origin", branch]);
  if (push.ok) {
    log.ok("deploy", "push 완료.");
  } else {
    log.error("deploy", push.stderr || "push 실패");
  }
}

module.exports = { deploy };
