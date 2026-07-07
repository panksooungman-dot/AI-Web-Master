"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/developer/Card";
import { componentMarker } from "@/lib/dev/component-marker";

interface LivePreviewPanelProps {
  workspacePath: string;
}

const PREVIEW_ORIGIN = "http://localhost:3000";
const HOST_SOURCE = "dev-inspector-host";
const OVERLAY_SOURCE = "dev-inspector";

function toVsCodeUri(absolutePath: string): string {
  return `vscode://file/${absolutePath.replace(/\\/g, "/")}`;
}

export function LivePreviewPanel({ workspacePath }: LivePreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [inspectMode, setInspectMode] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [reloadKey, setReloadKey] = useState(0);

  const postToOverlay = useCallback((payload: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage({ source: HOST_SOURCE, ...payload }, "*");
  }, []);

  // 화면 내 Visual Editor(EditPanel)의 편집 모드 토글과 상태를 동기화
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string; active?: boolean } | null;
      if (!data || data.source !== OVERLAY_SOURCE) return;

      if (data.type === "active-changed") {
        setInspectMode(Boolean(data.active));
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // 편집 모드 on/off를 iframe에 전달 (새로고침 후에도 상태 재전송)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendActiveState = () => postToOverlay({ type: "set-active", active: inspectMode });

    sendActiveState();
    iframe.addEventListener("load", sendActiveState);
    return () => iframe.removeEventListener("load", sendActiveState);
  }, [inspectMode, reloadKey, postToOverlay]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const pathPoll = window.setInterval(() => {
      try {
        const path = iframe.contentWindow?.location.pathname;
        if (path) setCurrentPath(path);
      } catch {
        // cross-origin navigation, ignore
      }
    }, 500);

    return () => window.clearInterval(pathPoll);
  }, [reloadKey]);

  return (
    <Card
      title="실시간 미리보기 (Visual Editor)"
      className="mb-6"
      {...componentMarker("LivePreviewPanel", "components/developer/LivePreviewPanel.tsx")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 font-mono">
            {PREVIEW_ORIGIN}
            {currentPath}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            새로고침
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInspectMode((prev) => !prev)}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              inspectMode
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700"
            }`}
          >
            {inspectMode ? "편집 모드: ON" : "편집 모드: OFF"}
          </button>
          <a
            href={toVsCodeUri(workspacePath)}
            className="inline-block rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            VS Code에서 프로젝트 열기
          </a>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        편집 모드를 켜고 미리보기 화면에서 요소를 클릭하면, 화면 오른쪽 아래에 편집 패널이
        나타납니다. 텍스트·이미지·색상·여백을 그 자리에서 바로 수정하고 저장할 수 있습니다.
      </p>

      <div
        className="rounded-lg overflow-hidden border border-gray-800 bg-white"
        style={{ height: 600 }}
      >
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={PREVIEW_ORIGIN}
          title="실시간 미리보기"
          className="w-full h-full"
        />
      </div>
    </Card>
  );
}
