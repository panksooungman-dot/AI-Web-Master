// pdfjs-dist는 legacy/build/pdf.mjs·pdf.d.mts는 타입을 제공하지만, 워커 번들
// legacy/build/pdf.worker.mjs는 타입 선언이 없다 — lib/uploads/officeText.ts가 이 모듈을
// import()해 WorkerMessageHandler export만 꺼내 쓰므로 최소한만 선언한다.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}
