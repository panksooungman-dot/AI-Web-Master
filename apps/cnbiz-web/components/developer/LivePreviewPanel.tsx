"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/developer/Card";
import { componentMarker } from "@/lib/dev/component-marker";

interface LivePreviewPanelProps {
  workspacePath: string;
  /**
   * 실제 배포된 사이트 URL(예: Vercel 프로덕션 URL). 지정하면 이 URL을 그대로 미리보기로
   * 띄운다. 미지정 시의 기존 동작(항상 http://localhost:3000)은 로컬에서 `ai devmode`로 같은
   * 컴퓨터에 dev 서버를 띄워둔 워크스페이스를 여는 시나리오에만 유효하다 — AI 의뢰로 자동
   * 생성된 고객 프로젝트를 배포된 사이트(www.cnbiz.kr 등 원격)에서 열면 이 localhost는 관리자
   * 자신의 컴퓨터를 가리키므로 항상 연결 실패한다(2026-08-06 확인된 문제). 편집 모드(Visual
   * Editor)는 로컬 dev 서버에 주입되는 dev-inspector 오버레이가 있어야 동작하므로, 배포된
   * 사이트에는 적용되지 않아 이 경우 숨긴다.
   */
  deployedUrl?: string | null;
}

const LOCAL_PREVIEW_ORIGIN = "http://localhost:3000";
const HOST_SOURCE = "dev-inspector-host";
const OVERLAY_SOURCE = "dev-inspector";

function toVsCodeUri(absolutePath: string): string {
  return `vscode://file/${absolutePath.replace(/\\/g, "/")}`;
}

export function LivePreviewPanel({ workspacePath, deployedUrl }: LivePreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isRemote = Boolean(deployedUrl);
  const previewOrigin = deployedUrl || LOCAL_PREVIEW_ORIGIN;

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

  // deployedUrl === null: 호출자가 "고객 프로젝트인데 아직 배포된 URL이 없다"고 명시적으로
  // 전달한 경우 — localhost로 시도해봤자 항상 실패하므로 iframe 자체를 그리지 않는다.
  if (deployedUrl === null) {
    return (
      <Card
        title="실시간 미리보기"
        className="mb-6"
        {...componentMarker("LivePreviewPanel", "components/developer/LivePreviewPanel.tsx")}
      >
        <p className="text-sm text-gray-500">
          아직 배포된 사이트가 없습니다. 배포가 완료되면(GitHub/Vercel 파이프라인) 이 화면에서
          실제 배포된 사이트를 바로 확인할 수 있습니다.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title={isRemote ? "실시간 미리보기" : "실시간 미리보기 (Visual Editor)"}
      className="mb-6"
      {...componentMarker("LivePreviewPanel", "components/developer/LivePreviewPanel.tsx")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500 font-mono break-all">
            {previewOrigin}
            {!isRemote && currentPath}
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
          {!isRemote && (
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
          )}
          <a
            href={toVsCodeUri(workspacePath)}
            className="inline-block rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            VS Code에서 프로젝트 열기
          </a>
        </div>
      </div>

      {!isRemote && (
        <p className="text-xs text-gray-500 mb-3">
          편집 모드를 켜고 미리보기 화면에서 요소를 클릭하면, 화면 오른쪽 아래에 편집 패널이
          나타납니다. 텍스트·이미지·색상·여백을 그 자리에서 바로 수정하고 저장할 수 있습니다.
        </p>
      )}

      <div
        className="rounded-lg overflow-hidden border border-gray-800 bg-white"
        style={{ height: 600 }}
      >
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={previewOrigin}
          title="실시간 미리보기"
          className="w-full h-full"
        />
      </div>
    </Card>
  );
}
