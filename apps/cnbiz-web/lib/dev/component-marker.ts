// 실제 구현은 packages/dev-inspector(공유 패키지)로 이동했다. 이미 25개 이상의
// 컴포넌트가 `@/lib/dev/component-marker`를 import하고 있어, 그 경로를 그대로
// 유지하기 위한 얇은 재노출 shim이다.
export { componentMarker, type ComponentMarker } from "@cnbiz/dev-inspector";
