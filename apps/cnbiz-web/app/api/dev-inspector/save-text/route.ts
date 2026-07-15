// 실제 구현은 packages/dev-inspector(공유 패키지)의 서버 전용 엔트리에 있다.
// Next.js 라우팅은 파일이 실제로 존재해야 하므로, 이 파일은 얇은 재노출 wiring 파일이다.
// `devmode`는 새 프로젝트를 열 때 이런 형태의 파일 3개(save-text/save-image/save-style)를
// 자동으로 생성한다 (scripts/ai-business-os.ps1의 Install-AIBizDevInspector 참고).
export { saveTextHandler as POST } from "@cnbiz/dev-inspector/src/server";
