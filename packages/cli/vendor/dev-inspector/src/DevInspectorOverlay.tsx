"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { EditPanel } from "./EditPanel";

/**
 * Visual Editor — 개발자 모드 요소 선택 + 화면 내 편집 오버레이.
 *
 * @cnbiz/dev-inspector 공유 패키지의 일부. 어떤 프로젝트든 코드를 복사하지
 * 않고 이 패키지를 설치한 뒤 다음만 하면 동일한 Visual Editor를 쓸 수 있다:
 *   1) 루트 레이아웃에 <DevInspectorOverlay />를 추가
 *   2) app/api/dev-inspector/{save-text,save-image,save-style}/route.ts에서
 *      이 패키지의 saveTextHandler / saveImageHandler / saveStyleHandler를
 *      POST로 재노출 (예: export { saveTextHandler as POST } from "@cnbiz/dev-inspector";)
 *   3) next.config에 transpilePackages: ["@cnbiz/dev-inspector"] 추가
 * `devmode` 명령은 새 프로젝트를 열 때 위 단계를 자동으로 수행한다
 * (scripts/ai-business-os.ps1의 Install-AIBizDevInspector 참고).
 *
 * 컴포넌트를 식별하는 data-component-id / data-component-file 마커는 수동으로
 * componentMarker()를 호출하거나, babel-plugin-component-marker를 통해
 * 빌드 시점에 자동으로 주입할 수 있다 — 두 방식 모두 이 오버레이는 동일하게 동작한다.
 *
 * 화면 왼쪽 아래 토글 버튼으로 개발 모드를 켜고 끌 수 있어 호스트(부모 프레임) 없이도
 * 독립적으로 동작한다. 동시에 부모 프레임이 있다면 postMessage로도 제어·동기화된다:
 *   host -> overlay : { source: "dev-inspector-host", type: "set-active", active: boolean }
 *   overlay -> host : { source: "dev-inspector", type: "active-changed", active: boolean }
 *   overlay -> host : { source: "dev-inspector", type: "select", componentId, componentFile, tagName }
 *   overlay -> host : { source: "dev-inspector", type: "text-saved" | "image-saved", success, reason? }
 *
 * 저장은 오버레이가 실행되는 페이지 자신의 API(/api/dev-inspector/save-*)를 직접 호출한다.
 * 즉 "어떤 프로젝트를 미리보고 있는가"와 무관하게, 미리보기 대상 프로젝트 자신의
 * 서버(process.cwd())에 파일을 쓰므로 항상 올바른 경로에 저장된다.
 *
 * 개발 빌드(NODE_ENV=development)에서만 동작하며 프로덕션에는 어떤 영향도 주지 않는다.
 *
 * DOM 요소 자체는 ref로만 보관하고(React state로 다루지 않음), 렌더링에 필요한
 * 값(컴포넌트명·파일 경로·좌표)만 state로 관리한다.
 */

const HOST_SOURCE = "dev-inspector-host";
const OVERLAY_SOURCE = "dev-inspector";

interface TaggedInfo {
  componentId: string;
  componentFile: string;
  tagName: string;
  rect: { top: number; left: number; width: number; height: number };
}

function resolveTagged(target: EventTarget | null): { el: HTMLElement; info: TaggedInfo } | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>("[data-component-id]");
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  return {
    el,
    info: {
      componentId: el.getAttribute("data-component-id") ?? "",
      componentFile: el.getAttribute("data-component-file") ?? "",
      tagName: el.tagName.toLowerCase(),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    },
  };
}

export function DevInspectorOverlay() {
  const [active, setActive] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<TaggedInfo | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<TaggedInfo | null>(null);
  const [editingText, setEditingText] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [selectionKey, setSelectionKey] = useState(0);
  const [editTargetEl, setEditTargetEl] = useState<HTMLElement | null>(null);

  // 컴포넌트(파일) 단위 식별 대상 — 호버/선택 박스, 저장할 파일 경로 판단에 사용
  const hoveredElRef = useRef<HTMLElement | null>(null);
  const selectedElRef = useRef<HTMLElement | null>(null);
  const selectedInfoRef = useRef<TaggedInfo | null>(null);
  // 실제로 클릭된 가장 안쪽 요소 — 텍스트/이미지/스타일 편집 대상(더 정밀한 범위)
  const editTargetElRef = useRef<HTMLElement | null>(null);
  const beforeTextRef = useRef<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const postToHost = useCallback((payload: Record<string, unknown>) => {
    window.parent?.postMessage({ source: OVERLAY_SOURCE, ...payload }, "*");
  }, []);

  const clearSelection = useCallback(() => {
    hoveredElRef.current = null;
    selectedElRef.current = null;
    editTargetElRef.current = null;
    setHoveredInfo(null);
    setSelectedInfo(null);
    setEditingText(false);
    setHasImage(false);
    setEditTargetEl(null);
  }, []);

  const startTextEdit = useCallback(() => {
    if (!editTargetElRef.current) return;
    beforeTextRef.current = editTargetElRef.current.innerText;
    setEditingText(true);
  }, []);

  const startImageEdit = useCallback(() => {
    if (!editTargetElRef.current && !selectedElRef.current) return;
    fileInputRef.current?.click();
  }, []);

  const toggleActive = useCallback(() => {
    setActive((prev) => {
      const next = !prev;
      if (!next) clearSelection();
      postToHost({ type: "active-changed", active: next });
      return next;
    });
  }, [clearSelection, postToHost]);

  useEffect(() => {
    selectedInfoRef.current = selectedInfo;
  }, [selectedInfo]);

  // 호스트로부터의 제어 메시지 수신 (호스트가 있을 때만 의미 있음, 없어도 무해)
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function handleMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string; active?: boolean } | null;
      if (!data || data.source !== HOST_SOURCE) return;

      if (data.type === "set-active") {
        setActive(Boolean(data.active));
        if (!data.active) clearSelection();
      }

      if (data.type === "edit-text") startTextEdit();
      if (data.type === "edit-image") startImageEdit();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [clearSelection, startTextEdit, startImageEdit]);

  // 호버 하이라이트 + 클릭 선택
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !active) return;

    function handleMouseMove(e: MouseEvent) {
      if (editingText) return;
      const resolved = resolveTagged(e.target);
      hoveredElRef.current = resolved?.el ?? null;
      setHoveredInfo(resolved?.info ?? null);
    }

    function handleClick(e: MouseEvent) {
      if (editingText) {
        // 편집 중에는 커서 배치 등 네이티브 상호작용은 유지하되,
        // 링크 이동 같은 기본 동작(navigation)만 막는다.
        if (editTargetElRef.current?.contains(e.target as Node)) {
          e.preventDefault();
        }
        return;
      }

      const resolved = resolveTagged(e.target);
      if (!resolved) return;

      e.preventDefault();
      e.stopPropagation();

      const leaf = e.target instanceof HTMLElement ? e.target : resolved.el;

      selectedElRef.current = resolved.el;
      editTargetElRef.current = leaf;
      setSelectedInfo(resolved.info);
      setEditingText(false);
      setHasImage(leaf.tagName === "IMG" || Boolean(resolved.el.querySelector("img")));
      setEditTargetEl(leaf);
      setSelectionKey((k) => k + 1);
      postToHost({
        type: "select",
        componentId: resolved.info.componentId,
        componentFile: resolved.info.componentFile,
        tagName: resolved.info.tagName,
      });
    }

    function refreshRects() {
      if (selectedElRef.current) {
        const rect = selectedElRef.current.getBoundingClientRect();
        setSelectedInfo((prev) =>
          prev
            ? { ...prev, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }
            : prev
        );
      }
      if (hoveredElRef.current) {
        const rect = hoveredElRef.current.getBoundingClientRect();
        setHoveredInfo((prev) =>
          prev
            ? { ...prev, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }
            : prev
        );
      }
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", refreshRects, true);
    window.addEventListener("resize", refreshRects);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("scroll", refreshRects, true);
      window.removeEventListener("resize", refreshRects);
    };
  }, [active, editingText, postToHost]);

  // 텍스트 인라인 편집 → blur 시 실제 소스 파일에 저장 시도
  useEffect(() => {
    if (!editingText || !editTargetElRef.current) return;

    const el = editTargetElRef.current;
    el.setAttribute("contenteditable", "true");
    el.focus();

    async function handleBlur() {
      el.removeAttribute("contenteditable");
      setEditingText(false);

      const before = beforeTextRef.current;
      const after = el.innerText;
      const file = selectedInfoRef.current?.componentFile;

      if (!file || before === after) {
        return;
      }

      try {
        const res = await fetch("/api/dev-inspector/save-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file, before, after }),
        });
        const data = (await res.json()) as { success: boolean; reason?: string };
        postToHost({ type: "text-saved", success: data.success, reason: data.reason, file });
        if (data.success) clearSelection();
      } catch {
        postToHost({ type: "text-saved", success: false, reason: "network-error", file });
      }
    }

    el.addEventListener("blur", handleBlur);
    return () => {
      el.removeEventListener("blur", handleBlur);
      el.removeAttribute("contenteditable");
    };
  }, [editingText, postToHost, clearSelection]);

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    const leaf = editTargetElRef.current;
    const img =
      leaf?.tagName === "IMG"
        ? (leaf as HTMLImageElement)
        : selectedElRef.current?.querySelector("img");

    const componentFile = selectedInfoRef.current?.componentFile;
    const previousSrc = img?.getAttribute("src") ?? "";

    if (file && img && previousSrc) {
      // 실제 <img> DOM 노드(ref로 얻은 raw host 요소)의 src를 직접 교체하는
      // 의도된 명령형 미리보기 갱신이다 — React state 불변성 규칙의 대상이 아니다.
      // eslint-disable-next-line react-hooks/immutability
      img.src = URL.createObjectURL(file);

      if (componentFile) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("componentFile", componentFile);
        formData.append("oldSrc", previousSrc);

        try {
          const res = await fetch("/api/dev-inspector/save-image", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as {
            success: boolean;
            reason?: string;
            newSrc?: string;
          };
          postToHost({
            type: "image-saved",
            success: data.success,
            reason: data.reason,
            newSrc: data.newSrc,
          });
          if (data.success) clearSelection();
        } catch {
          postToHost({ type: "image-saved", success: false, reason: "network-error" });
        }
      }
    } else if (file) {
      postToHost({ type: "image-saved", success: false, reason: "no-target-image" });
    }

    inputEl.value = "";
  }

  if (process.env.NODE_ENV !== "development") return null;

  const isSameRect = (a: TaggedInfo, b: TaggedInfo) =>
    a.rect.top === b.rect.top && a.rect.left === b.rect.left && a.rect.width === b.rect.width;

  const showHover =
    active &&
    !editingText &&
    hoveredInfo &&
    !(selectedInfo && isSameRect(hoveredInfo, selectedInfo));

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />

      <button type="button" onClick={toggleActive} style={toggleButtonStyle(active)}>
        {active ? "🎨 편집 모드 ON" : "🎨 편집 모드"}
      </button>

      {showHover && hoveredInfo && (
        <div
          style={{
            position: "fixed",
            top: hoveredInfo.rect.top,
            left: hoveredInfo.rect.left,
            width: hoveredInfo.rect.width,
            height: hoveredInfo.rect.height,
            pointerEvents: "none",
            zIndex: 2147483646,
            border: "2px solid rgba(59,130,246,0.6)",
            background: "rgba(59,130,246,0.08)",
          }}
        >
          <span style={hoverLabelStyle}>
            {hoveredInfo.componentId} · {hoveredInfo.componentFile}
          </span>
        </div>
      )}

      {active && selectedInfo && (
        <div
          style={{
            position: "fixed",
            top: selectedInfo.rect.top,
            left: selectedInfo.rect.left,
            width: selectedInfo.rect.width,
            height: selectedInfo.rect.height,
            pointerEvents: "none",
            zIndex: 2147483647,
            border: editingText ? "2px dashed #f59e0b" : "2px solid #2563eb",
            boxShadow: editingText ? "none" : "0 0 0 2px rgba(37,99,235,0.25)",
          }}
        >
          <span style={{ ...hoverLabelStyle, background: editingText ? "#f59e0b" : "#1d4ed8" }}>
            {editingText ? "텍스트 수정 중… (blur 시 저장)" : `선택됨 · ${selectedInfo.componentId}`}
          </span>
        </div>
      )}

      {active && selectedInfo && editTargetEl && (
        <EditPanel
          key={selectionKey}
          componentId={selectedInfo.componentId}
          componentFile={selectedInfo.componentFile}
          targetEl={editTargetEl}
          hasImage={hasImage}
          editingText={editingText}
          onRequestTextEdit={startTextEdit}
          onRequestImageEdit={startImageEdit}
          onClose={clearSelection}
        />
      )}
    </>
  );
}

const hoverLabelStyle: CSSProperties = {
  position: "absolute",
  top: -22,
  left: 0,
  background: "#2563eb",
  color: "#fff",
  fontSize: 11,
  fontFamily: "monospace",
  padding: "2px 6px",
  borderRadius: 4,
  whiteSpace: "nowrap",
};

function toggleButtonStyle(active: boolean): CSSProperties {
  return {
    position: "fixed",
    left: 16,
    bottom: 16,
    zIndex: 2147483647,
    padding: "8px 14px",
    borderRadius: 999,
    background: active ? "#2563eb" : "#374151",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };
}
