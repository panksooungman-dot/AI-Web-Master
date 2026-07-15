// 실제 구현은 packages/dev-inspector(공유 패키지)의 서버 전용 엔트리로 이동했다.
// 기존 import 경로를 그대로 유지하기 위한 얇은 재노출 shim이다.
export { resolveSafeSourcePath } from "@cnbiz/dev-inspector/src/server";
