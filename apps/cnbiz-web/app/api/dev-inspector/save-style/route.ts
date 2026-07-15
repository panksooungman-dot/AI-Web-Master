// 실제 구현은 packages/dev-inspector(공유 패키지)의 서버 전용 엔트리에 있다. 얇은 재노출 wiring 파일.
export { saveStyleHandler as POST } from "@cnbiz/dev-inspector/src/server";
