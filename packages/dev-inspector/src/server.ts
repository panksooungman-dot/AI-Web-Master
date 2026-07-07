// 서버 전용(node:fs 사용) API 진입점. Route Handler(app/api/dev-inspector/*/route.ts)
// 에서만 import한다 — 클라이언트 컴포넌트가 있는 "@cnbiz/dev-inspector"(index.ts)와는
// 완전히 분리된 별도 엔트리다. 절대 두 파일을 합치지 않는다(합치면 Next.js가
// 클라이언트 번들에 node:fs를 포함시키려다 빌드가 깨진다).
export { resolveSafeSourcePath } from "./safe-source-path";
export { saveTextHandler } from "./routes/save-text";
export { saveImageHandler } from "./routes/save-image";
export { saveStyleHandler } from "./routes/save-style";
