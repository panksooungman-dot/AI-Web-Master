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

function describeError(err) {
  return err && err.message ? err.message : String(err);
}

async function menu() {
  let config;
  try {
    config = loadMenuConfig();
  } catch (err) {
    log.error("menu", err.message);
    return;
  }

  // 액션 함수 안에서 await로 감싸지 못한 콜백·타이머 등에서 예외가 나면
  // try/catch로는 잡히지 않고 Node가 기본적으로 프로세스 전체를 죽인다.
  // 메뉴는 "하나의 기능이 실패해도 운영 환경 자체는 죽지 않아야" 하므로,
  // 메뉴 루프가 실행되는 동안에만 이를 감지해 즉시 로그로 남기고 메인
  // 메뉴로 복귀시킨다(루프 밖의 단일 명령 실행, 예: `ai doctor`에는
  // 영향을 주지 않도록 루프 종료 시 반드시 해제한다). 어떤 항목 실행
  // 중이었는지는 currentLabel로 추적한다 — 예외가 비동기로 늦게
  // 발생해도(예: setImmediate) 시점에 상관없이 즉시 보고된다.
  let currentLabel = "menu";
  const captureUnexpectedError = (err) => {
    log.error(currentLabel, `예상치 못한 오류: ${describeError(err)}`);
  };
  process.on("uncaughtException", captureUnexpectedError);
  process.on("unhandledRejection", captureUnexpectedError);

  try {
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

      currentLabel = `${item.icon} ${item.label}`;
      try {
        await runItem(item);
      } catch (err) {
        log.error(currentLabel, describeError(err));
      }

      await ask("\n계속하려면 Enter를 누르세요...");
    }
  } finally {
    process.off("uncaughtException", captureUnexpectedError);
    process.off("unhandledRejection", captureUnexpectedError);
  }

  // readline이 매 질문마다 process.stdin을 flowing 모드로 전환해두기 때문에,
  // 인터페이스를 전부 닫아도 stdin 핸들이 이벤트 루프를 계속 붙잡고 있어
  // 종료 메시지만 찍히고 셸로 돌아가지 못하는 경우가 있다(특히 실제
  // 터미널에서 두드러짐). 메뉴를 나가는 것은 이 프로그램의 마지막 동작이므로
  // 명시적으로 프로세스를 종료해 반드시 셸로 돌아가도록 보장한다.
  process.exit(0);
}

module.exports = { menu, loadMenuConfig };
