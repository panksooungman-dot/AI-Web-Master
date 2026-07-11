import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { log, color } from "../../lib/log.js";
import { ask } from "../../lib/prompt.js";
import { DIVIDER, THIN_DIVIDER } from "../ui.js";
import * as actions from "../../commands/menu/actions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = path.join(__dirname, "..", "..", "config", "menu.json");

function getPackageVersion() {
  const pkgPath = path.join(__dirname, "..", "..", "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  return pkg.version;
}

const CLI_VERSION = getPackageVersion();

// menu.json 항목이 전이할 수 있는 State 이름 목록(SessionManager의
// states/ 폴더와 일치해야 한다).
const KNOWN_STATES = ["developmentOS", "project", "git", "settings"];

let cachedConfig = null;

// menu.json을 읽고, 각 항목이 가리키는 대상(action 함수 또는 state)이
// 실제로 존재하는지 미리 검증한다. 오타가 있어도 화면을 그리다가 실패하는
// 대신 시작 시점에 어떤 항목이 잘못됐는지 바로 알려준다.
function loadMenuConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw);

  for (const item of config.items) {
    const type = item.type || "action";

    if (type === "action") {
      if (item.state) {
        if (!KNOWN_STATES.includes(item.state)) {
          throw new Error(
            `menu.json의 "${item.label}"(state: "${item.state}")은(는) 존재하지 않는 state입니다. ` +
              `(가능한 값: ${KNOWN_STATES.join(", ")})`
          );
        }
      } else if (typeof actions[item.action] !== "function") {
        throw new Error(
          `menu.json의 "${item.label}"(action: "${item.action}")에 해당하는 핸들러가 없습니다. ` +
            `src/commands/menu/actions.js에 "${item.action}" 함수를 추가하고 module.exports에 등록하세요.`
        );
      }
    }

    if (type === "shell" && !item.command) {
      throw new Error(`menu.json의 "${item.label}" 항목은 type이 "shell"인데 command가 없습니다.`);
    }
  }

  return config;
}

// package.json의 name이 있으면 그 값을, 없으면 폴더 이름을 프로젝트명으로 쓴다.
function getCurrentProjectName(cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.name) return pkg.name;
    } catch {
      // package.json이 깨져있어도 메뉴 자체는 계속 떠야 하므로 무시하고 폴더명으로 대체
    }
  }
  return path.basename(cwd);
}

function printMenu(config) {
  const cwd = process.cwd();
  const projectName = getCurrentProjectName(cwd);

  console.log("");
  console.log(color(DIVIDER, "cyan"));
  console.log(`  ${color(config.title, "boldCyan")}   ${color(`v${CLI_VERSION}`, "gray")}`);
  console.log(color(DIVIDER, "cyan"));
  console.log(`  ${color("프로젝트", "gray")} : ${projectName}`);
  console.log(`  ${color("경로", "gray")}     : ${cwd}`);
  console.log(color(DIVIDER, "cyan"));

  const labelWidth = Math.max(...config.items.map((item) => item.label.length), config.exitLabel.length);

  for (const item of config.items) {
    const label = item.label.padEnd(labelWidth, " ");
    console.log(`  ${color(item.key, "boldYellow")}  ${item.icon}  ${label}  ${color(`(${item.command || "-"})`, "gray")}`);
  }
  console.log(
    `  ${color(config.exitKey, "boldYellow")}  🚪  ${config.exitLabel.padEnd(labelWidth, " ")}  ${color(`(${config.exitCommand || "-"})`, "gray")}`
  );

  console.log(color(THIN_DIVIDER, "gray"));
  console.log("  번호 선택");
  console.log(
    `  ${color("H", "boldYellow")} : 도움말   ${color("R", "boldYellow")} : 새로고침   ${color("Q", "boldYellow")} : 종료`
  );
  console.log(color(THIN_DIVIDER, "gray"));
  console.log("");
}

function printHelp(config) {
  console.log("");
  console.log(color("도움말", "boldCyan"));
  console.log(color(THIN_DIVIDER, "gray"));
  console.log("  숫자를 입력하면 해당 번호의 기능이 실행됩니다.");
  console.log("  간단한 기능은 끝나면 Enter를 눌러 메인 메뉴로 돌아옵니다.");
  console.log("  개발 시작·프로젝트 관리·Git 관리·설정은 각자의 화면으로 전환되며,");
  console.log("  그 화면에서 '0'을 선택해야 메인 메뉴로 돌아옵니다.");
  console.log("");
  for (const item of config.items) {
    console.log(`  ${item.key}  ${item.icon}  ${item.label}  (${item.command || "-"})`);
  }
  console.log(`  ${config.exitKey}  🚪  ${config.exitLabel}  (${config.exitCommand || "-"})`);
  console.log("");
  console.log("  단축키");
  console.log("    H : 이 도움말 표시");
  console.log("    R : menu.json을 다시 불러와 새로고침");
  console.log(`    Q : 종료 (${config.exitKey}과 동일)`);
  console.log(color(THIN_DIVIDER, "gray"));
  console.log("");
}

// type: "shell"인 항목은 코드를 전혀 추가하지 않고 menu.json만 수정해도
// 동작한다. type: "help"는 도움말 화면을 그린다. type: "action"(기본값)이면서
// "state"가 없는 항목은 actions.js에 정의된 1회성 함수를 실행한다("state"가
// 있는 항목은 이 함수까지 오지 않고 step()에서 바로 State 전이로 처리된다).
async function runItem(item, config) {
  const type = item.type || "action";

  if (type === "shell") {
    spawnSync(item.command, { stdio: "inherit", shell: true });
    return;
  }

  if (type === "help") {
    printHelp(config);
    return;
  }

  await actions[item.action]();
}

const state = {
  label: "Main Menu",

  async step(session) {
    if (!cachedConfig) {
      try {
        cachedConfig = loadMenuConfig();
      } catch (err) {
        log.error("menu", err.message);
        session.stop();
        return null;
      }
    }

    const config = cachedConfig;

    printMenu(config);
    const raw = await ask("선택 > ");
    const choice = raw.trim();
    const upper = choice.toUpperCase();

    if (upper === "Q" || choice === config.exitKey) {
      log.dim(`[menu] ${config.exitLabel}합니다.`);
      session.stop();
      return null;
    }

    if (upper === "R") {
      try {
        cachedConfig = loadMenuConfig();
        log.ok("새로고침", "menu.json을 다시 불러왔습니다.");
      } catch (err) {
        log.error("새로고침", err.message);
      }
      return "mainMenu";
    }

    if (!choice) return "mainMenu";

    // H는 menu.json에 type: "help" 항목이 있으면 그 항목을 고른 것과 동일하게
    // 처리한다. 그런 항목이 없어도 최소한의 안내를 볼 수 있도록 대체한다.
    let item;
    if (upper === "H") {
      item = config.items.find((i) => (i.type || "action") === "help");
      if (!item) {
        printHelp(config);
        await ask("계속하려면 Enter를 누르세요...");
        return "mainMenu";
      }
    } else {
      item = config.items.find((i) => i.key === choice);
      if (!item) {
        log.warn("menu", `알 수 없는 입력입니다: ${choice} (H/R/Q 또는 번호를 입력하세요)`);
        return "mainMenu";
      }
    }

    // 화면 전환: 메뉴를 다시 그리거나 다른 함수를 호출하는 대신, 다음 state
    // 이름만 반환한다. SessionManager의 루프가 다음 반복에서 그 State의
    // step()을 실행한다.
    if (item.state) {
      return item.state;
    }

    try {
      await runItem(item, config);
    } catch (err) {
      log.error(`${item.icon} ${item.label}`, err && err.message ? err.message : String(err));
    }

    await ask("\n계속하려면 Enter를 누르세요...");
    return "mainMenu";
  },
};

export default state;
