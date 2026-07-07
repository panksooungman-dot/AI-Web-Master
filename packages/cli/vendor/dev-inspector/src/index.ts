// 클라이언트(브라우저)에서도 안전하게 번들링되는 공개 API만 여기서 내보낸다.
// node:fs를 사용하는 서버 전용 코드(save-* 라우트 핸들러, resolveSafeSourcePath)는
// 절대 여기서 재노출하지 않는다 — 그러면 "use client" 컴포넌트(DevInspectorOverlay)와
// 같은 클라이언트 번들 그래프에 묶여 node:fs를 브라우저용으로 번들링하려다 실패한다.
// 서버 전용 API는 "@cnbiz/dev-inspector/src/server"에서 별도로 가져온다.
export { DevInspectorOverlay } from "./DevInspectorOverlay";
export { EditPanel } from "./EditPanel";
export { componentMarker, type ComponentMarker } from "./component-marker";
