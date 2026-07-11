import { SessionManager } from "../../session/SessionManager.js";

// `ai`/`ai menu`의 진입점. 실제 대화형 루프·화면 전환 로직은 전부
// SessionManager(State 기반 구조, src/session/)로 옮겨졌다 — 이 함수는
// 세션을 만들고 실행하는 얇은 어댑터일 뿐이다.
async function menu() {
  const session = new SessionManager();
  await session.run();
}

export { menu };
