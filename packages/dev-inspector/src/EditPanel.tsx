"use client";

import { useState, type CSSProperties } from "react";

/**
 * Visual Editor의 화면 내 편집 패널.
 * DevInspectorOverlay가 선택한 요소(targetEl)를 넘겨주면, 색상·여백 변경은
 * 이 컴포넌트가 직접 /api/dev-inspector/save-style을 호출해 저장한다.
 * 텍스트·이미지 편집은 DevInspectorOverlay가 이미 가진 로직을 콜백으로 위임한다.
 * "코드 에디터에서 열기"는 화면에는 감춘 파일 경로를 /api/dev-inspector/open-in-editor로
 * 절대 경로로 변환해 받아 vscode:// URI로 이동한다(레이블만으로는 코드를 찾기 어렵다는
 * 피드백에 대응 — VS Code가 로컬에 설치·URI 핸들러 등록돼 있어야 동작한다).
 *
 * "AI로 수정 요청"은 버튼·애니메이션처럼 색상/여백 편집으로는 안 되는 구조적 변경을
 * 자연어로 요청하는 기능이다. 색상·여백과 달리 AI가 파일 전체를 다시 쓰는 것이라 실수로
 * 파일이 깨질 위험이 있어, 응답을 즉시 저장하지 않고 "변경 전 / AI 제안" 미리보기를 먼저
 * 보여준 뒤 사용자가 "적용"을 눌러야만 /api/dev-inspector/save-file로 실제 저장된다.
 */

interface EditPanelProps {
  /** 비개발자에게 보여줄 이름(componentMarker의 label, 없으면 componentId) — 파일 경로는
   *  저장 요청에만 쓰고 화면에는 노출하지 않는다. */
  displayLabel: string;
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

function describeOpenEditorFailure(reason: string | undefined): string {
  switch (reason) {
    case "invalid-file":
      return "코드 파일을 찾지 못했습니다.";
    default:
      return "코드 에디터를 여는 중 오류가 발생했습니다.";
  }
}

function describeAiEditFailure(reason: string | undefined): string {
  switch (reason) {
    case "not-configured":
      return "AI 수정 기능이 설정되지 않았습니다(ANTHROPIC_API_KEY 필요).";
    case "invalid-file":
      return "코드 파일을 찾지 못했습니다.";
    case "provider-error":
    case "empty-response":
      return "AI가 응답하지 못했습니다. 다시 시도해주세요.";
    case "network-error":
      return "네트워크 오류로 요청이 실패했습니다.";
    default:
      return "AI 수정 요청이 실패했습니다.";
  }
}

interface AiProposal {
  originalContent: string;
  proposedContent: string;
}

export function EditPanel({
  displayLabel,
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
  const [openingEditor, setOpeningEditor] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiRequesting, setAiRequesting] = useState(false);
  const [aiProposal, setAiProposal] = useState<AiProposal | null>(null);
  const [aiApplying, setAiApplying] = useState(false);

  async function requestAiEdit() {
    if (!aiInstruction.trim() || aiRequesting) return;
    setAiRequesting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/dev-inspector/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: componentFile, instruction: aiInstruction }),
      });
      const data = (await res.json()) as {
        success: boolean;
        originalContent?: string;
        proposedContent?: string;
        reason?: string;
      };
      if (data.success && data.proposedContent && data.originalContent) {
        setAiProposal({ originalContent: data.originalContent, proposedContent: data.proposedContent });
      } else {
        setNotice({ tone: "error", text: describeAiEditFailure(data.reason) });
      }
    } catch {
      setNotice({ tone: "error", text: "AI 수정 요청 중 오류가 발생했습니다." });
    } finally {
      setAiRequesting(false);
    }
  }

  async function applyAiProposal() {
    if (!aiProposal || aiApplying) return;
    setAiApplying(true);
    try {
      const res = await fetch("/api/dev-inspector/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: componentFile, content: aiProposal.proposedContent }),
      });
      const data = (await res.json()) as { success: boolean; reason?: string };
      if (data.success) {
        setAiProposal(null);
        setAiInstruction("");
        // 파일 전체가 바뀌었으므로 색상/여백 편집처럼 DOM을 직접 미리보기할 수 없다 —
        // 새로고침해 Next.js가 새 파일 내용으로 다시 렌더링하도록 한다.
        window.location.reload();
      } else {
        setNotice({ tone: "error", text: describeSaveFailure(data.reason) });
      }
    } catch {
      setNotice({ tone: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setAiApplying(false);
    }
  }

  async function openInEditor() {
    setOpeningEditor(true);
    try {
      const res = await fetch(`/api/dev-inspector/open-in-editor?file=${encodeURIComponent(componentFile)}`);
      const data = (await res.json()) as { success: boolean; editorUrl?: string; reason?: string };
      if (data.success && data.editorUrl) {
        window.location.href = data.editorUrl;
      } else {
        setNotice({ tone: "error", text: describeOpenEditorFailure(data.reason) });
      }
    } catch {
      setNotice({ tone: "error", text: "코드 에디터를 여는 중 오류가 발생했습니다." });
    } finally {
      setOpeningEditor(false);
    }
  }

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
    <div style={aiProposal ? { ...panelStyle, width: 640 } : panelStyle}>
      <div style={headerStyle}>
        <div style={{ fontWeight: 700 }}>{displayLabel}</div>
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

        <button
          type="button"
          onClick={() => void openInEditor()}
          disabled={openingEditor}
          style={openEditorButtonStyle}
        >
          {openingEditor ? "여는 중..." : "💻 코드 에디터에서 열기"}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={labelStyle}>🤖 AI로 수정 요청 (버튼·애니메이션 등)</label>
          <textarea
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder="예: 이 버튼에 마우스 올렸을 때 살짝 커지는 애니메이션 추가해줘"
            rows={3}
            disabled={aiRequesting || Boolean(aiProposal)}
            style={textareaStyle}
          />
          <button
            type="button"
            onClick={() => void requestAiEdit()}
            disabled={aiRequesting || !aiInstruction.trim() || Boolean(aiProposal)}
            style={{ ...openEditorButtonStyle, opacity: aiRequesting || !aiInstruction.trim() ? 0.6 : 1 }}
          >
            {aiRequesting ? "AI가 수정하는 중..." : "AI에게 요청"}
          </button>
        </div>

        {aiProposal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>변경 전</label>
              <pre style={codePreviewStyle}>{aiProposal.originalContent}</pre>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>AI 제안 (변경 후)</label>
              <pre style={{ ...codePreviewStyle, borderColor: "#2563eb" }}>{aiProposal.proposedContent}</pre>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => void applyAiProposal()}
                disabled={aiApplying}
                style={{ ...actionButtonStyle(true), opacity: aiApplying ? 0.6 : 1 }}
              >
                {aiApplying ? "적용 중..." : "적용"}
              </button>
              <button
                type="button"
                onClick={() => setAiProposal(null)}
                disabled={aiApplying}
                style={actionButtonStyle(false)}
              >
                취소
              </button>
            </div>
          </div>
        )}

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

const textareaStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#1f2937",
  color: "#e5e7eb",
  fontFamily: "inherit",
  fontSize: 12,
  resize: "vertical",
};

const codePreviewStyle: CSSProperties = {
  margin: 0,
  maxHeight: 220,
  overflow: "auto",
  padding: 8,
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#0b1220",
  color: "#d1d5db",
  fontFamily: "monospace",
  fontSize: 11,
  whiteSpace: "pre",
};

const openEditorButtonStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #374151",
  background: "#1f2937",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
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
