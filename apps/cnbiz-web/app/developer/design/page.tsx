"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { DesignChainStepper } from "@/components/developer/design/DesignChainStepper";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import Link from "next/link";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { InquiryRecord } from "@/lib/inquiries/types";
import { BRAND_COLOR_SURVEY_KEY, DOMAIN_SURVEY_KEY } from "@/lib/inquiries/editPatch";
import { WEBSITE_TYPES } from "@/lib/websites/types";

interface PlansResponse {
  plans: DesignPlanRecord[];
}

/**
 * Inquiry의 상담 요약(requirements)에, 그 화면에서만 확인 가능한 브랜드 컬러·도메인·참고 사이트를
 * 덧붙인다 — Design Plan 생성 AI는 이 자유 텍스트(customerRequirements)만 읽으므로, 구조화된
 * 필드로 따로 넘기는 대신 여기서 한 번만 합쳐서 전달한다. 값이 없는 항목은 줄 자체를 만들지
 * 않는다(지어내지 않음).
 */
function buildRequirementsFromInquiry(inquiry: InquiryRecord): string {
  const lines = [inquiry.requirements.trim()];

  const brandColor = inquiry.survey?.[BRAND_COLOR_SURVEY_KEY];
  if (typeof brandColor === "string" && brandColor.trim()) {
    lines.push(`브랜드 컬러: ${brandColor.trim()}`);
  }

  const domain = inquiry.survey?.[DOMAIN_SURVEY_KEY];
  if (typeof domain === "string" && domain.trim()) {
    lines.push(`도메인: ${domain.trim()}`);
  }

  if (inquiry.referenceUrls && inquiry.referenceUrls.length > 0) {
    lines.push(`참고 사이트: ${inquiry.referenceUrls.join(", ")}`);
  }

  return lines.filter(Boolean).join("\n");
}

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

// useSearchParams()(?inquiryId= 읽기용)는 Suspense 경계 없이 쓰면 정적 생성이 실패한다
// (Next.js "should be wrapped in a suspense boundary") — 실제 폼은 그대로 두고 얇은 래퍼만 추가.
export default function DesignRequirementsPage() {
  return (
    <Suspense fallback={<LoadingText />}>
      <DesignRequirementsPageInner />
    </Suspense>
  );
}

function DesignRequirementsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");

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

  // ?inquiryId=로 들어오면 그 의뢰의 정보로 폼을 미리 채운다(2026-09-12 — Design 체인이 의뢰
  // 정보와 전혀 연결되지 않아 매번 재입력해야 한다는 지적). 채워진 값은 여전히 자유롭게 수정
  // 가능하고, projectId로 원본 의뢰를 함께 기록해 어느 의뢰에서 시작됐는지 추적 가능하게 한다.
  const [linkedInquiry, setLinkedInquiry] = useState<{ id: string; companyName: string } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isAutoContinuing, setIsAutoContinuing] = useState(false);
  const [autoContinueError, setAutoContinueError] = useState<string | null>(null);

  useEffect(() => {
    if (!inquiryId) return;

    fetch(`/api/inquiries/${inquiryId}`)
      .then((res) => res.json())
      .then((json: { inquiry?: InquiryRecord; error?: string }) => {
        if (!json.inquiry) {
          setLinkError(json.error ?? "의뢰를 불러오지 못했습니다.");
          return;
        }
        const inquiry = json.inquiry;
        const typeLabel = WEBSITE_TYPES.find((t) => t.id === inquiry.siteType)?.label ?? inquiry.siteType;

        setProjectName(inquiry.companyName || inquiry.contactName);
        setProjectType(typeLabel);
        setRequirements(buildRequirementsFromInquiry(inquiry));
        setLinkedInquiry({ id: inquiry.id, companyName: inquiry.companyName || inquiry.contactName });
      })
      .catch(() => setLinkError("의뢰를 불러오지 못했습니다."));
    // inquiryId는 페이지 진입 시 한 번만 반영하면 되고, 이후 admin이 폼을 수정해도 다시
    // 덮어쓰지 않아야 하므로 의도적으로 한 번만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlans = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/design/requirements")
      .then((res) => res.json())
      .then((json: PlansResponse) => {
        const allPlans = json.plans ?? [];
        setPlans(allPlans);
        // ?inquiryId=로 들어온 경우, 이 의뢰와 무관한 시스템 전체의 최신 Design Plan을 자동
        // 선택해 보여주면(예: 완전히 다른 프로젝트의 옛 기록) 이 의뢰의 결과인 것처럼 오인될
        // 수 있다 — 이 의뢰에 연결된(input.projectId === inquiryId) 기록으로만 범위를 좁힌다.
        const scoped = inquiryId ? allPlans.filter((plan) => plan.input.projectId === inquiryId) : allPlans;
        setSelectedId((current) => current ?? scoped[0]?.id ?? null);
      })
      .catch(() => setLoadError("Design Plan 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(loadPlans);
    // loadPlans는 마운트 시 1회만 실행하면 된다. inquiryId(searchParams)는 페이지 진입 시점의
    // 값으로 고정되어 이후 바뀌지 않으므로(위 inquiryId 로드 effect와 동일한 전제) loadPlans를
    // 의존성으로 추가해 재실행할 필요가 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Design Plan에 이어 Storyboard까지 생성하고 그 화면으로 이동한다. 실패해도 방금 만든 Design
   * Plan은 이미 저장되어 있으므로 되돌리지 않고, 이 화면에 에러만 표시해 admin이 Storyboard
   * 화면에서 수동으로 다시 시도할 수 있게 한다(자동 연결이 실패했다고 이미 만든 결과물까지
   * 잃게 하지 않는다).
   */
  const autoGenerateStoryboard = async (planId: string) => {
    setIsAutoContinuing(true);
    setAutoContinueError(null);

    try {
      const res = await fetch("/api/design/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };

      if (!json.success) {
        setAutoContinueError(json.error ?? "Storyboard 자동 생성에 실패했습니다.");
        return;
      }

      router.push("/developer/design/storyboard");
    } catch {
      setAutoContinueError("Storyboard 자동 생성 중 오류가 발생했습니다.");
    } finally {
      setIsAutoContinuing(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/design/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          projectType,
          requirements,
          targetUsers,
          ...(linkedInquiry ? { projectId: linkedInquiry.id } : {}),
        }),
      });
      const json = (await res.json()) as { success: boolean; plan?: DesignPlanRecord; error?: string };

      if (!json.success || !json.plan) {
        setSubmitError(json.error ?? "생성 실패");
        return;
      }

      setPlans((prev) => [json.plan!, ...prev]);
      setSelectedId(json.plan.id);

      // 의뢰에서 시작된 흐름이면 Storyboard까지 이어서 만든다("Design 시작" 버튼 하나로
      // 처음부터 다시 입력하지 않고 Storyboard까지 도달하게 해달라는 요청, 2026-09-12).
      // 일반적인(의뢰와 무관한) 수동 생성까지 확장하지는 않는다 — 그 경우엔 admin이 이
      // 화면에 남아 결과를 먼저 검토하고 싶을 수 있어, 기존처럼 수동으로 다음 단계로
      // 넘어가는 흐름을 유지한다.
      if (linkedInquiry) {
        await autoGenerateStoryboard(json.plan.id);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selected = plans.find((plan) => plan.id === selectedId) ?? null;
  // History 목록도 위 자동 선택과 동일한 기준으로 범위를 좁힌다 — 그래야 목록에 뜨는 항목과
  // 자동 선택되는 항목이 항상 일치하고, 의뢰와 무관한 옛 기록이 나열되지 않는다.
  const historyPlans = inquiryId ? plans.filter((plan) => plan.input.projectId === inquiryId) : plans;

  return (
    <div>
      <DesignChainStepper />
      <PageHeader
        icon="📐"
        title="Design — Requirements"
        description="Design Automation Phase 1: Requirement Analysis·Feature List·Site Map·User Flow·Screen List를 자동 생성합니다."
        help={[
          "Design Automation 7단계 파이프라인의 시작점입니다 — Storyboard → Wireframe → Prototype → Claude Design → Review → Sync 순서로 이어집니다.",
          "각 단계 화면 상단의 이전/다음 단계 링크로 이동할 수 있습니다.",
          "Phase 9(Website Builder 연동)에서 완료된 Design을 실제 사이트 생성에 연결합니다.",
        ]}
        actions={
          <div className="flex items-center gap-4">
            <Link href="/developer/deployment" className="text-xs text-blue-400 hover:underline">
              Deployment →
            </Link>
            <Link href="/developer/design/storyboard" className="text-xs text-blue-400 hover:underline self-center">
              Storyboard →
            </Link>
          </div>
        }
      />

      {linkedInquiry && (
        <StatusMessage tone="success" className="mb-6">
          🔗 의뢰 &quot;{linkedInquiry.companyName}&quot;의 정보로 아래 항목을 미리 채웠습니다. 필요하면
          자유롭게 수정한 뒤 생성하세요.
        </StatusMessage>
      )}
      {linkError && <StatusMessage tone="error" className="mb-6">{linkError}</StatusMessage>}

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
            {autoContinueError && (
              <StatusMessage tone="error">
                Design Plan은 생성됐지만 Storyboard 자동 생성에 실패했습니다: {autoContinueError} — 아래
                History에서 방금 만든 Plan을 확인하고, Storyboard 화면에서 직접 생성해주세요.
              </StatusMessage>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isAutoContinuing || !projectName || !requirements}
              className="flex items-center justify-center gap-2 rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {(isSubmitting || isAutoContinuing) && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {isSubmitting
                ? "Generating..."
                : isAutoContinuing
                  ? "Storyboard로 이어서 생성 중..."
                  : linkedInquiry
                    ? "Generate → Storyboard로 자동 이동"
                    : "Generate"}
            </button>
            {(isSubmitting || isAutoContinuing) && (
              <p className="text-xs text-gray-500">
                AI가 실제로 내용을 생성하는 중이라 최대 1~2분 정도 걸릴 수 있습니다. 이 화면을
                벗어나지 말고 잠시 기다려 주세요 — 버튼을 여러 번 누르지 않아도 됩니다.
              </p>
            )}
          </div>
        </Card>

        <Card
          title={linkedInquiry ? `History (${linkedInquiry.companyName})` : "History"}
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
          ) : historyPlans.length === 0 ? (
            <p className="text-sm text-gray-500">
              {linkedInquiry
                ? "이 의뢰로 아직 생성된 Design Plan이 없습니다. 위에서 Generate를 눌러 만들어보세요."
                : "아직 생성된 Design Plan이 없습니다."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {historyPlans.map((plan) => (
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
