"use client";

import { useState, type CSSProperties } from "react";

/**
 * Visual Editor의 화면 내 편집 패널.
 * DevInspectorOverlay가 선택한 요소(targetEl)를 넘겨주면, 색상·여백 변경은
 * 이 컴포넌트가 직접 /api/dev-inspector/save-style을 호출해 저장한다.
 * 텍스트·이미지 편집은 DevInspectorOverlay가 이미 가진 로직을 콜백으로 위임한다.
 */

interface EditPanelProps {
  componentId: string;
  componentFile: string;
  targetEl: HTMLElement;
  hasImage: boolean;
  editingText: boolean;
  onRequestTextEdit: () => void;
  onRequestImageEdit: () => void;
  onClose: () => void;
}

interface Notice {
  tone: "success" | "error";
  text: string;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#000000";
  return (
    "#" +
    [match[1], match[2], match[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function describeSaveFailure(reason: string | undefined): string {
  switch (reason) {
    case "not-found":
      return "원본 요소를 파일에서 찾지 못해 저장하지 못했습니다.";
    case "ambiguous":
      return "동일한 스타일의 요소가 여러 곳에 있어 자동 저장할 수 없습니다.";
    case "unsupported-style":
      return "이 요소의 style 속성 형식은 지원되지 않습니다.";
    case "invalid-file":
    case "invalid-request":
      return "저장할 수 없는 파일입니다.";
    default:
      return "저장에 실패했습니다.";
  }
}

export function EditPanel({
  componentId,
  componentFile,
  targetEl,
  hasImage,
  editingText,
  onRequestTextEdit,
  onRequestImageEdit,
  onClose,
}: EditPanelProps) {
  // 부모(DevInspectorOverlay)가 새로 선택할 때마다 key를 바꿔 이 컴포넌트를 통째로
  // 다시 마운트하므로, 초기값은 effect 없이 lazy state initializer로 한 번만 계산한다.
  const [textColor, setTextColor] = useState(() => rgbToHex(window.getComputedStyle(targetEl).color));
  const [bgColor, setBgColor] = useState(() =>
    rgbToHex(window.getComputedStyle(targetEl).backgroundColor)
  );
  const [margin, setMargin] = useState(
    () => Number.parseInt(window.getComputedStyle(targetEl).marginTop, 10) || 0
  );
  const [padding, setPadding] = useState(
    () => Number.parseInt(window.getComputedStyle(targetEl).paddingTop, 10) || 0
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveStyle(styles: Record<string, string>) {
    setSaving(true);
    try {
      const res = await fetch("/api/dev-inspector/save-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: componentFile, anchor: targetEl.className, styles }),
      });
      const data = (await res.json()) as { success: boolean; reason?: string };
      setNotice(
        data.success
          ? { tone: "success", text: "스타일이 파일에 저장되었습니다." }
          : { tone: "error", text: describeSaveFailure(data.reason) }
      );
    } catch {
      setNotice({ tone: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  function applyPreview(style: Partial<CSSStyleDeclaration>) {
    // 저장 API 응답 전, 화면에 즉시 반영하기 위한 명령형 미리보기 갱신.
    Object.assign(targetEl.style, style);
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontWeight: 700 }}>{componentId}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
            {componentFile}
          </div>
        </div>
        <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="편집 패널 닫기">
          ×
        </button>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onRequestTextEdit} style={actionButtonStyle(editingText)}>
            텍스트 수정
          </button>
          {hasImage && (
            <button type="button" onClick={onRequestImageEdit} style={actionButtonStyle(false)}>
              이미지 변경
            </button>
          )}
        </div>

        <div style={fieldRowStyle}>
          <label style={labelStyle}>텍스트 색상</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => {
              const value = e.target.value;
              setTextColor(value);
              applyPreview({ color: value });
              void saveStyle({ color: value });
            }}
            style={colorInputStyle}
          />
        </div>

        <div style={fieldRowStyle}>
          <label style={labelStyle}>배경 색상</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => {
              const value = e.target.value;
              setBgColor(value);
              applyPreview({ backgroundColor: value });
              void saveStyle({ backgroundColor: value });
            }}
            style={colorInputStyle}
          />
        </div>

        <div style={fieldRowStyle}>
          <label style={labelStyle}>바깥 여백 (px)</label>
          <input
            type="number"
            min={0}
            value={margin}
            onChange={(e) => {
              const value = Number(e.target.value);
              setMargin(value);
              applyPreview({ margin: `${value}px` });
            }}
            onBlur={() => void saveStyle({ margin: `${margin}px` })}
            style={numberInputStyle}
          />
        </div>

        <div style={fieldRowStyle}>
          <label style={labelStyle}>안쪽 여백 (px)</label>
          <input
            type="number"
            min={0}
            value={padding}
            onChange={(e) => {
              const value = Number(e.target.value);
              setPadding(value);
              applyPreview({ padding: `${value}px` });
            }}
            onBlur={() => void saveStyle({ padding: `${padding}px` })}
            style={numberInputStyle}
          />
        </div>

        {saving && <p style={{ color: "#9ca3af", margin: 0 }}>저장 중...</p>}
        {notice && (
          <p style={{ color: notice.tone === "success" ? "#34d399" : "#f87171", margin: 0 }}>
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  width: 300,
  maxHeight: "80vh",
  overflowY: "auto",
  zIndex: 2147483647,
  background: "#111827",
  color: "#e5e7eb",
  borderRadius: 12,
  border: "1px solid #374151",
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 13,
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderBottom: "1px solid #374151",
};

const closeButtonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#9ca3af",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
};

const fieldRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const labelStyle: CSSProperties = {
  color: "#9ca3af",
};

const colorInputStyle: CSSProperties = {
  width: 40,
  height: 28,
  padding: 0,
  border: "1px solid #374151",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer",
};

const numberInputStyle: CSSProperties = {
  width: 72,
  padding: "4px 6px",
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#1f2937",
  color: "#e5e7eb",
};

function actionButtonStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "6px 10px",
    borderRadius: 6,
    border: active ? "1px solid #2563eb" : "1px solid #374151",
    background: active ? "#2563eb" : "#1f2937",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  };
}
