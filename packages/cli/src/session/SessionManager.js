import { log } from "../lib/log.js";
import { selectSessionProject } from "../commands/menu/projectSelect.js";
import mainMenuState from "./states/mainMenuState.js";
import developmentOSState from "./states/developmentOSState.js";
import projectState from "./states/projectState.js";
import gitState from "./states/gitState.js";
import settingsState from "./states/settingsState.js";

const STATES = {
  mainMenu: mainMenuState,
  developmentOS: developmentOSState,
  project: projectState,
  git: gitState,
  settings: settingsState,
};

function describeError(err) {
  return err && err.message ? err.message : String(err);
}

/**
 * CLI 대화형 세션 전체를 관리하는 상태 기계(State Machine).
 *
 * 이전 구조(메뉴 기반): 메인 메뉴 루프가 항목을 실행하고, 그 항목이
 * 필요하면(Dev Mode 등) 자기만의 while 루프를 또 만들어 화면을 그렸다
 * (루프 안에 루프가 중첩됨, 화면 전환 = 함수를 다시 호출).
 *
 * 이 구조(State 기반): 루프는 이 클래스의 run() 하나뿐이다. 각 화면은
 * `states/`의 State 모듈로 분리되어 있고, 매 반복마다 현재 `this.state`에
 * 해당하는 모듈의 step()을 한 번만 호출한다. 화면 전환은 step()이 다음
 * state 이름을 반환하는 것으로 끝난다(`this.state = next`) — 함수를
 * 다시 부르거나 새 루프를 만들지 않는다.
 */
class SessionManager {
  constructor() {
    this.state = "mainMenu";
    // State 간 공유 데이터(예: developmentOS가 기억하는 devmode() 결과).
    // 각 State 모듈이 필요한 키를 이 객체에 자유롭게 두고 읽는다.
    this.context = {};
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  async run() {
    let currentLabel = "session";

    // 메뉴 기반 구조에서 쓰던 것과 동일한 안전망 — 화면(State) 함수 안에서
    // await로 감싸지 못한 예외가 나도 프로세스 전체가 죽지 않도록 한다.
    const captureUnexpectedError = (err) => {
      log.error(currentLabel, `예상치 못한 오류: ${describeError(err)}`);
    };
    process.on("uncaughtException", captureUnexpectedError);
    process.on("unhandledRejection", captureUnexpectedError);

    try {
      currentLabel = "프로젝트 선택";
      await selectSessionProject();

      while (this.running) {
        const screen = STATES[this.state];

        if (!screen) {
          log.error("session", `알 수 없는 state입니다: ${this.state}`);
          this.state = "mainMenu";
          continue;
        }

        currentLabel = screen.label || this.state;

        try {
          const next = await screen.step(this);
          if (next) this.state = next;
        } catch (err) {
          log.error(currentLabel, describeError(err));
        }
      }
    } finally {
      process.off("uncaughtException", captureUnexpectedError);
      process.off("unhandledRejection", captureUnexpectedError);
    }

    // readline이 매 질문마다 stdin을 flowing 모드로 전환해두므로, 세션을
    // 나가는 시점에 명시적으로 프로세스를 종료해 셸로 확실히 돌아가게 한다
    // (menu()가 하던 것과 동일한 이유).
    process.exit(0);
  }
}

export { SessionManager };
