import type { NextConfig } from "next";

// 이 앱은 Vercel이 아니라 의뢰자 서버(VPS)에 `next build && next start`로 직접 배포한다.
// 영상 업로드·ffmpeg·Whisper 처리는 서버리스 실행시간 제한에 맞지 않기 때문
// (apps/lecture-auto-editor의 실제 처리 엔진을 이 웹앱이 백그라운드로 실행한다).
const nextConfig: NextConfig = {
  // 업로드 API 라우트가 대용량 영상 파일(GB 단위)을 스트리밍으로 직접 처리하므로
  // Route Handler 기본 바디 파서를 쓰지 않는다(app/api/jobs/route.ts에서 busboy로 직접 스트림 처리).
};

export default nextConfig;
