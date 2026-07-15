"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { StatusMessage } from "@/components/developer/StatusMessage";
import type { ImportResult } from "@/lib/backup/registry";

export default function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    window.location.href = "/api/backup/export";
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const bundle: unknown = JSON.parse(text);

      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });
      const json = (await res.json()) as ImportResult;

      setImportResult(json);
      if (!json.success) {
        setError(json.error ?? "Import 실패");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "올바른 JSON 파일이 아닙니다.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon="💾"
        title="Backup"
        description="Provider 설정(configuration)·Prompt·Workflow를 하나의 JSON으로 내보내고, 복원합니다."
      />

      {error && <StatusMessage tone="error" className="mb-4">{error}</StatusMessage>}
      {importResult?.success && (
        <StatusMessage tone="success" className="mb-4">
          Import 완료 — configuration: {importResult.imported.configuration ? "복원됨" : "없음"}, prompts:{" "}
          {importResult.imported.prompts}개, workflows: {importResult.imported.workflows}개
        </StatusMessage>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card title="Export">
          <p className="text-sm text-gray-400 mb-3">
            현재 Provider 설정·Prompt Library·Workflow 정의를 JSON 파일로 다운로드합니다.
          </p>
          <button
            onClick={handleExport}
            className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm transition-colors"
          >
            Export Backup
          </button>
        </Card>

        <Card title="Import">
          <p className="text-sm text-gray-400 mb-3">
            Export한 JSON 파일을 선택하면 configuration/prompts/workflows를 복원합니다(있는 섹션만 복원, 기존 값은 덮어씀).
          </p>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {isImporting ? "Importing..." : "Import Backup"}
          </button>
        </Card>
      </div>
    </div>
  );
}
