const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { log } = require("../../lib/log");
const { ask } = require("../../lib/prompt");
const actions = require("./actions");

const CONFIG_PATH = path.join(__dirname, "..", "..", "config", "menu.json");

// menu.json을 읽고, 각 항목이 가리키는 액션이 실제로 존재하는지 미리
// 검증한다. 설정 파일에 오타가 있어도 메뉴를 그리다가 실패하는 대신
// 시작 시점에 어떤 항목이 잘못됐는지 바로 알려준다.
function loadMenuConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw);

  for (const item of config.items) {
    const type = item.type || "action";

    if (type === "action" && typeof actions[item.action] !== "function") {
      throw new Error(
        `menu.json의 "${item.label}"(action: "${item.action}")에 해당하는 핸들러가 없습니다. ` +
          `src/commands/menu/actions.js에 "${item.action}" 함수를 추가하고 module.exports에 등록하세요.`
      );
    }

    if (type === "shell" && !item.command) {
      throw new Error(`menu.json의 "${item.label}" 항목은 type이 "shell"인데 command가 없습니다.`);
    }
  }

  return config;
}

function printMenu(config) {
  console.log("");
  console.log(config.title);
  console.log("");
  console.log("==================================");
  for (const item of config.items) {
    console.log(`${item.key}. ${item.icon} ${item.label}`);
  }
  console.log(`${config.exitKey}. ${config.exitLabel}`);
  console.log("==================================");
  console.log("");
}

// type: "shell"인 항목은 코드를 전혀 추가하지 않고 menu.json만 수정해도
// 동작한다(예: 단순 명령 실행). type: "action"(기본값)인 항목은
// actions.js에 정의된 함수를 실행한다.
async function runItem(item) {
  const type = item.type || "action";

  if (type === "shell") {
    spawnSync(item.command, { stdio: "inherit", shell: true });
    return;
  }

  await actions[item.action]();
}

async function menu() {
  let config;
  try {
    config = loadMenuConfig();
  } catch (err) {
    log.error("menu", err.message);
    return;
  }

  let running = true;

  while (running) {
    printMenu(config);
    const choice = await ask("번호를 입력하세요: ");

    if (choice === config.exitKey) {
      log.dim(`[menu] ${config.exitLabel}합니다.`);
      break;
    }

    if (!choice) continue;

    const item = config.items.find((i) => i.key === choice);
    if (!item) {
      log.warn("menu", `알 수 없는 번호입니다: ${choice}`);
      continue;
    }

    try {
      await runItem(item);
    } catch (err) {
      log.error(`${item.icon} ${item.label}`, err && err.message ? err.message : String(err));
    }

    await ask("\n계속하려면 Enter를 누르세요...");
  }
}

module.exports = { menu, loadMenuConfig };
