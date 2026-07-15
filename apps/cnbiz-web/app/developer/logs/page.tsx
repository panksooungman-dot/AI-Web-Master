"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";

type LogCategory = "Terminal" | "Git" | "AI" | "System";
type LogStatus = "Success" | "Error" | "Info" | "Warning";
type FilterOption = "All" | LogCategory | "Errors";

interface LogItem {
  id: string;
  timestamp: string;
  category: LogCategory;
  message: string;
  status: LogStatus;
}

interface LogsResponse {
  logs: LogItem[];
}

const CATEGORY_TONES: Record<LogCategory, BadgeTone> = {
  Terminal: "accent",
  Git: "orange",
  AI: "purple",
  System: "neutral",
};

const STATUS_TONES: Record<LogStatus, BadgeTone> = {
  Success: "success",
  Error: "danger",
  Info: "info",
  Warning: "warning",
};

const FILTERS: FilterOption[] = ["All", "Terminal", "Git", "AI", "System", "Errors"];

export default function LogsManagerPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");

  const loadLogs = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/logs")
      .then((res) => res.json())
      .then((data: LogsResponse) => setLogs(data.logs ?? []))
      .catch(() => setLoadError("로그를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(() => loadLogs());
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      activeFilter === "All"
        ? true
        : activeFilter === "Errors"
          ? log.status === "Error"
          : log.category === activeFilter;
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRefresh = () => {
    loadLogs();
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        icon="📋"
        title="Logs Manager"
        description="Development OS의 모든 작업 로그를 확인합니다."
        actions={
          <>
            <button
              onClick={handleRefresh}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleClear}
              disabled={logs.length === 0}
              className="rounded bg-red-600/80 hover:bg-red-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              Clear Logs
            </button>
            <button
              onClick={handleExport}
              disabled={logs.length === 0}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              Export
            </button>
          </>
        }
      />

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="w-full sm:max-w-sm rounded bg-gray-900 border border-gray-700 px-4 py-2 outline-none focus:border-green-500"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full border px-4 py-1 text-sm font-semibold transition-colors ${
              activeFilter === filter
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : filteredLogs.length === 0 ? (
        <p className="text-gray-500">표시할 로그가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                {log.timestamp}
              </span>

              <Badge tone={CATEGORY_TONES[log.category]} className="w-24 text-center">
                {log.category}
              </Badge>

              <p className="flex-1 text-sm text-gray-200 break-all">{log.message}</p>

              <Badge tone={STATUS_TONES[log.status]}>{log.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
