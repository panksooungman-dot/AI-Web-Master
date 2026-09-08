"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { WireframeBoardView } from "@/components/developer/design/WireframeBoardView";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { WEBSITE_TYPES } from "@/lib/websites/types";
import type { WebsiteGenerationStatus, WebsiteRecord } from "@/lib/websites/registry";
import type { ScreenLayout, WireframeContent, WireframeRecord } from "@/lib/design/wireframe";

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

type WizardStep = "form" | "wireframe";

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

  const [step, setStep] = useState<WizardStep>("form");
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [wireframeId, setWireframeId] = useState<string | null>(null);
  const [wireframeContent, setWireframeContent] = useState<WireframeContent | null>(null);
  const [editingLayouts, setEditingLayouts] = useState<ScreenLayout[] | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    website: WebsiteRecord;
    output?: string;
    designPageCount?: number;
    designPageTotal?: number;
  } | null>(null);

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

  const resetWizard = () => {
    setStep("form");
    setWireframeId(null);
    setWireframeContent(null);
    setEditingLayouts(null);
    setPrepareError(null);
  };

  /**
   * "다음: 스토리보드 생성" — 기존 입력값(Business Type·Target Audience)만으로 Design Plan(Phase
   * 1)·Storyboard(Phase 2)·Wireframe(Phase 3)을 자동으로 연달아 생성한다. 관리자가 새로 입력할
   * 필드는 없다 — requirements는 이미 받은 값으로 결정론적으로 조립한다. 생성된 Wireframe은 바로
   * 편집 화면(WireframeBoardView, `/developer/design/wireframe`과 동일한 컴포넌트)으로 이어진다.
   */
  const handlePrepareDesign = async () => {
    if (!name.trim() || !businessType.trim() || !audience.trim() || isPreparing) {
      setSubmitError("Project Name·Business Type·Target Audience는 필수입니다.");
      return;
    }

    setIsPreparing(true);
    setPrepareError(null);
    setSubmitError(null);

    try {
      const requirements = `${businessType.trim()} 웹사이트를 제작합니다. 대상 고객: ${audience.trim()}.`;

      const planRes = await fetch("/api/design/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: name.trim(),
          projectType: businessType.trim(),
          targetUsers: audience.trim(),
          requirements,
        }),
      });
      const planJson = (await planRes.json()) as { success: boolean; plan?: { id: string }; error?: string };
      if (!planJson.success || !planJson.plan) {
        setPrepareError(planJson.error ?? "Design Plan 생성 실패");
        return;
      }

      const storyboardRes = await fetch("/api/design/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planJson.plan.id }),
      });
      const storyboardJson = (await storyboardRes.json()) as { success: boolean; storyboardId?: string; error?: string };
      if (!storyboardJson.success || !storyboardJson.storyboardId) {
        setPrepareError(storyboardJson.error ?? "Storyboard 생성 실패");
        return;
      }

      const wireframeRes = await fetch("/api/design/wireframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyboardId: storyboardJson.storyboardId }),
      });
      const wireframeJson = (await wireframeRes.json()) as {
        success: boolean;
        wireframeId?: string;
        wireframe?: WireframeRecord;
        error?: string;
      };
      if (!wireframeJson.success || !wireframeJson.wireframeId || !wireframeJson.wireframe) {
        setPrepareError(wireframeJson.error ?? "Wireframe 생성 실패");
        return;
      }

      setWireframeId(wireframeJson.wireframeId);
      setWireframeContent(wireframeJson.wireframe.content);
      setEditingLayouts(wireframeJson.wireframe.content.layouts.map((layout) => ({ ...layout })));
      setStep("wireframe");
    } catch (err) {
      setPrepareError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleChangeLayout = (index: number, next: ScreenLayout) => {
    setEditingLayouts((prev) => (prev ? prev.map((layout, i) => (i === index ? next : layout)) : prev));
  };

  /** "생성 시작" — 편집한 레이아웃을 Wireframe에 저장한 뒤, 그 Wireframe을 반영해 실제 코드를 생성한다. */
  const handleCreate = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setLastResult(null);

    try {
      if (wireframeId && editingLayouts && wireframeContent) {
        const saveRes = await fetch(`/api/design/wireframe/${wireframeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: { ...wireframeContent, layouts: editingLayouts } }),
        });
        const saveJson = (await saveRes.json()) as { success: boolean; error?: string };
        if (!saveJson.success) {
          setSubmitError(saveJson.error ?? "레이아웃 저장 실패");
          return;
        }
      }

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
          ...(wireframeId ? { wireframeId } : {}),
        }),
      });

      const data = (await res.json()) as {
        success: boolean;
        website?: WebsiteRecord;
        output?: string;
        error?: string;
        designPageCount?: number;
        designPageTotal?: number;
      };

      if (data.website) {
        setWebsites((prev) => [data.website as WebsiteRecord, ...prev]);
        setLastResult({
          website: data.website,
          output: data.output,
          designPageCount: data.designPageCount,
          designPageTotal: data.designPageTotal,
        });
      }

      if (!data.success) {
        setSubmitError(data.error ?? "생성 실패");
        return;
      }

      resetWizard();
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
        help={[
          "AI 의뢰 파이프라인을 통한 자동 생성과는 별개로, 관리자가 수동으로 사이트를 만드는 경로입니다.",
          "생성 버튼을 누르면 먼저 Storyboard·Wireframe을 자동으로 만들고, 그 레이아웃을 직접 손본 뒤 생성을 시작합니다.",
          "이 경로로 만든 사이트는 Workspace/Project·GitHub/Vercel 배포에 자동 연결되지 않습니다.",
        ]}
        actions={
          <Link href="/developer/deployment" className="text-xs text-blue-400 hover:underline self-center">
            Deployment →
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title={step === "form" ? "Create Website — 1. 기본 정보" : "Create Website — 2. Wireframe 편집"}>
          {step === "form" ? (
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
              {prepareError && <StatusMessage tone="error">{prepareError}</StatusMessage>}

              <button
                onClick={handlePrepareDesign}
                disabled={isPreparing}
                className="self-start rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isPreparing ? "Storyboard·Wireframe 생성 중..." : "다음: 스토리보드 생성 →"}
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
                  {typeof lastResult.designPageTotal === "number" && lastResult.designPageTotal > 0 && (
                    <p className="text-emerald-400">
                      Wireframe 레이아웃 반영: {lastResult.designPageTotal}개 페이지 중 {lastResult.designPageCount}개
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-gray-500">
                화면별 섹션 구성을 확인하고 필요하면 순서 변경·추가·삭제·컴포넌트 수정을 한 뒤 아래에서
                생성을 시작하세요.
              </p>

              {(editingLayouts ?? []).map((layout, i) => (
                <Card key={i} title={`${layout.screen} (${layout.path})`} variant="console">
                  <WireframeBoardView layout={layout} onChange={(next) => handleChangeLayout(i, next)} />
                </Card>
              ))}

              {submitError && <StatusMessage tone="error">{submitError}</StatusMessage>}

              <div className="flex items-center gap-2">
                <button
                  onClick={resetWizard}
                  disabled={isSubmitting}
                  className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors disabled:opacity-50"
                >
                  ← 처음으로
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "생성 중... (최대 1분 소요)" : "생성 시작"}
                </button>
              </div>
            </div>
          )}
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
