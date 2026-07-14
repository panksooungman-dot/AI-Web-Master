"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";

interface PlansResponse {
  plans: DesignPlanRecord[];
}

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

export default function DesignRequirementsPage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [requirements, setRequirements] = useState("");
  const [targetUsers, setTargetUsers] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadPlans = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/design/requirements")
      .then((res) => res.json())
      .then((json: PlansResponse) => {
        setPlans(json.plans ?? []);
        setSelectedId((current) => current ?? json.plans?.[0]?.id ?? null);
      })
      .catch(() => setLoadError("Design Plan 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(loadPlans);
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/design/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, projectType, requirements, targetUsers }),
      });
      const json = (await res.json()) as { success: boolean; plan?: DesignPlanRecord; error?: string };

      if (!json.success || !json.plan) {
        setSubmitError(json.error ?? "생성 실패");
        return;
      }

      setPlans((prev) => [json.plan!, ...prev]);
      setSelectedId(json.plan.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selected = plans.find((plan) => plan.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        icon="📐"
        title="Design — Requirements"
        description="Design Automation Phase 1: Requirement Analysis·Feature List·Site Map·User Flow·Screen List를 자동 생성합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Generate Design Plan">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Bright Smile Dental"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Project Type</label>
              <input
                type="text"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder="치과 웹사이트"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Users</label>
              <input
                type="text"
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                placeholder="지역 주민, 30~50대"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Customer Requirements</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다."
                rows={4}
                className={inputClass}
              />
            </div>

            {submitError && <StatusMessage tone="error">{submitError}</StatusMessage>}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !projectName || !requirements}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Generating..." : "Generate"}
            </button>
          </div>
        </Card>

        <Card
          title="History"
          actions={
            <button onClick={loadPlans} className="text-xs text-blue-400 hover:underline">
              Refresh
            </button>
          }
        >
          {isLoading ? (
            <LoadingText />
          ) : loadError ? (
            <StatusMessage tone="error">{loadError}</StatusMessage>
          ) : plans.length === 0 ? (
            <p className="text-sm text-gray-500">아직 생성된 Design Plan이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {plans.map((plan) => (
                <li key={plan.id}>
                  <button
                    onClick={() => setSelectedId(plan.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedId === plan.id ? "bg-blue-600/20 border border-blue-600" : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{plan.input.projectName}</span>
                      {plan.simulated && <Badge tone="warning">Simulated</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(plan.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Requirement Analysis">
            <p className="text-sm text-gray-300 mb-3">{selected.content.requirementAnalysis.projectSummary}</p>
            <p className="text-xs font-semibold text-gray-500 mb-1">Functional Requirements</p>
            <ul className="list-disc list-inside text-sm text-gray-300 mb-3">
              {selected.content.requirementAnalysis.functionalRequirements.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-gray-500 mb-1">Non-Functional Requirements</p>
            <ul className="list-disc list-inside text-sm text-gray-300 mb-3">
              {selected.content.requirementAnalysis.nonFunctionalRequirements.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-gray-500 mb-1">Business Rules</p>
            <ul className="list-disc list-inside text-sm text-gray-300">
              {selected.content.requirementAnalysis.businessRules.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Card>

          <Card title="Feature List">
            <ul className="flex flex-col gap-2">
              {selected.content.featureList.map((feature, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-200">{feature.name}</p>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>
                  <Badge
                    tone={feature.priority === "High" ? "danger" : feature.priority === "Medium" ? "warning" : "neutral"}
                  >
                    {feature.priority}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Site Map">
            <ul className="flex flex-col gap-1 text-sm">
              {selected.content.siteMap.map((node, i) => (
                <li key={i}>
                  <span className="font-mono text-xs text-gray-500">{node.path}</span>{" "}
                  <span className="text-gray-200">{node.title}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="User Flow">
            {selected.content.userFlows.map((flow, i) => (
              <div key={i} className="mb-3">
                <p className="text-sm font-semibold text-gray-200 mb-1">{flow.name}</p>
                <ol className="text-xs text-gray-400 flex flex-col gap-1">
                  {flow.steps.map((step) => (
                    <li key={step.step}>
                      {step.step}. {step.screen} — {step.action} → {step.next}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </Card>

          <Card title="Screen List" className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selected.content.screenList.map((screen, i) => (
                <div key={i} className="rounded border border-gray-800 p-3">
                  <p className="text-sm font-semibold text-gray-200">{screen.name}</p>
                  <p className="font-mono text-xs text-gray-500 mb-1">{screen.path}</p>
                  <p className="text-xs text-gray-400 mb-2">{screen.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {screen.components.map((component) => (
                      <Badge key={component} tone="accent">
                        {component}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
