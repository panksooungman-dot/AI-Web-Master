"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { WEBSITE_TYPES } from "@/lib/websites/types";
import type { WebsiteGenerationStatus, WebsiteRecord } from "@/lib/websites/registry";

const STATUS_TONES: Record<WebsiteGenerationStatus, BadgeTone> = {
  Success: "success",
  Failed: "danger",
};

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  return slug || "website";
}

export default function WebsiteBuilderPage() {
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [audience, setAudience] = useState("");
  const [brand, setBrand] = useState("");
  const [language, setLanguage] = useState("Korean");
  const [siteType, setSiteType] = useState<string>(WEBSITE_TYPES[0].id);
  const [outDir, setOutDir] = useState("");
  const [outDirTouched, setOutDirTouched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ website: WebsiteRecord; output?: string } | null>(null);

  const loadWebsites = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/websites")
      .then((res) => res.json())
      .then((data: { websites: WebsiteRecord[] }) => setWebsites(data.websites ?? []))
      .catch(() => setLoadError("Generation History를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(loadWebsites);
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!outDirTouched) {
      setOutDir(`./${slugify(value)}`);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !businessType.trim() || !audience.trim() || isSubmitting) {
      setSubmitError("Project Name·Business Type·Target Audience는 필수입니다.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          businessType: businessType.trim(),
          audience: audience.trim(),
          brand: brand.trim(),
          language: language.trim(),
          siteType,
          outDir: outDir.trim(),
        }),
      });

      const data = (await res.json()) as { success: boolean; website?: WebsiteRecord; output?: string; error?: string };

      if (data.website) {
        setWebsites((prev) => [data.website as WebsiteRecord, ...prev]);
        setLastResult({ website: data.website, output: data.output });
      }

      if (!data.success) {
        setSubmitError(data.error ?? "생성 실패");
        return;
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon="🌐"
        title="Website Builder"
        description="AI Business OS CLI의 Website Builder(ai website create)를 대시보드에서 실행합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Create Website">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Bright Smile Dental"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Business Type</label>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="dental clinic"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Audience</label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="local families"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Brand (optional)</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="비워두면 Project Name 사용"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Language</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Website Type</label>
                <select value={siteType} onChange={(e) => setSiteType(e.target.value)} className={inputClass}>
                  {WEBSITE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Output Path</label>
              <input
                type="text"
                value={outDir}
                onChange={(e) => {
                  setOutDirTouched(true);
                  setOutDir(e.target.value);
                }}
                placeholder="./bright-smile-dental"
                className={inputClass}
              />
            </div>

            {submitError && <StatusMessage tone="error">{submitError}</StatusMessage>}

            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="self-start rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "생성 중... (최대 1분 소요)" : "Create Website"}
            </button>

            {lastResult && (
              <div className="rounded border border-gray-800 bg-gray-900 p-3 text-xs">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={STATUS_TONES[lastResult.website.status]}>{lastResult.website.status}</Badge>
                  <span className="text-gray-400 font-mono break-all">{lastResult.website.outDir}</span>
                </div>
                {lastResult.website.simulatedContent && (
                  <p className="text-yellow-500">
                    LLM Provider 미연결 — 콘텐츠는 결정론적 기본값으로 생성되었습니다.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title="Website Types">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {WEBSITE_TYPES.map((t) => (
              <li key={t.id} className="rounded border border-gray-800 px-3 py-2 text-gray-300">
                {t.label}
                <span className="ml-1 text-xs text-gray-500">({t.id})</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Recent Websites / Generation History">
        {isLoading ? (
          <LoadingText />
        ) : loadError ? (
          <StatusMessage tone="error">{loadError}</StatusMessage>
        ) : websites.length === 0 ? (
          <p className="text-sm text-gray-500">아직 생성된 웹사이트가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {websites.map((site) => (
              <li
                key={site.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-800 p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-gray-200">{site.name}</p>
                  <p className="text-xs text-gray-500 font-mono break-all">{site.outDir}</p>
                  <p className="text-xs text-gray-600">{new Date(site.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {site.simulatedContent && <Badge tone="warning">Simulated</Badge>}
                  <Badge tone={STATUS_TONES[site.status]}>{site.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
