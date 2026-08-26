"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { InquiryRecord, InquiryStatus } from "@/lib/inquiries/types";
import { INQUIRY_STATUSES } from "@/lib/inquiries/types";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";
import type { AiJobRecord } from "@/lib/aiJobs/types";
import type { ProjectRecord } from "@/lib/projects/registry";
import type { EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import type { ContractRecord } from "@/lib/contracts/types";
import type { ProposalRecord } from "@/lib/proposals/types";
import type { LaunchRequestRecord } from "@/lib/launchRequests/types";
import { LAUNCH_REQUEST_CATALOG } from "@/lib/launchRequests/catalog";

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  New: "신규",
  Qualified: "검토됨",
  Converted: "전환됨",
  Rejected: "반려",
};

const INQUIRY_STATUS_TONES: Record<InquiryStatus, BadgeTone> = {
  New: "info",
  Qualified: "warning",
  Converted: "success",
  Rejected: "danger",
};

const AI_JOB_STATUS_LABELS: Record<AiJobRecord["status"], string> = {
  Queued: "대기 중",
  Running: "실행 중",
  Success: "성공",
  Failed: "실패",
  Cancelled: "취소됨",
};

const AI_JOB_STATUS_TONES: Record<AiJobRecord["status"], BadgeTone> = {
  Queued: "info",
  Running: "warning",
  Success: "success",
  Failed: "danger",
  Cancelled: "neutral",
};

interface EditForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  budget: string;
  siteType: string;
  requirements: string;
}

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [inquiry, setInquiry] = useState<InquiryRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [websiteOrder, setWebsiteOrder] = useState<WebsiteOrderRecord | null>(null);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [specifications, setSpecifications] = useState<SpecificationRecord[]>([]);
  const [timelines, setTimelines] = useState<TimelineRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [launchRequests, setLaunchRequests] = useState<LaunchRequestRecord[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isGeneratingLaunchRequest, setIsGeneratingLaunchRequest] = useState(false);
  const [launchRequestError, setLaunchRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [isGeneratingSpecification, setIsGeneratingSpecification] = useState(false);
  const [specificationError, setSpecificationError] = useState<string | null>(null);
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/inquiries/${params.id}`)
      .then((res) => res.json())
      .then(async (data: { inquiry?: InquiryRecord; error?: string }) => {
        if (!data.inquiry) {
          setLoadError(data.error ?? "의뢰를 찾을 수 없습니다.");
          return;
        }
        setInquiry(data.inquiry);

        const [
          clientResult,
          orderResult,
          jobsResult,
          estimatesResult,
          specificationsResult,
          timelinesResult,
          contractsResult,
          proposalsResult,
          launchRequestsResult,
        ] = await Promise.all([
          data.inquiry.clientId
            ? fetch(`/api/clients/${data.inquiry.clientId}`).then((res) => res.json())
            : Promise.resolve(null),
          data.inquiry.websiteOrderId
            ? fetch(`/api/website-orders/${data.inquiry.websiteOrderId}`).then((res) => res.json())
            : Promise.resolve(null),
          fetch("/api/ai-jobs").then((res) => res.json()),
          fetch("/api/estimates").then((res) => res.json()),
          fetch("/api/specifications").then((res) => res.json()),
          fetch("/api/timeline").then((res) => res.json()),
          fetch("/api/contracts").then((res) => res.json()),
          fetch("/api/proposals").then((res) => res.json()),
          fetch("/api/launch-requests").then((res) => res.json()),
        ]);

        setClient(clientResult?.client ?? null);
        const order: WebsiteOrderRecord | null = orderResult?.websiteOrder ?? null;
        setWebsiteOrder(order);

        if (order?.projectId) {
          fetch(`/api/projects/${order.projectId}`)
            .then((res) => res.json())
            .then((projectResult: { project?: ProjectRecord }) => setProject(projectResult.project ?? null))
            .catch(() => setProject(null));
        } else {
          setProject(null);
        }

        const allJobs: AiJobRecord[] = jobsResult?.aiJobs ?? [];
        const linkedJobs = data.inquiry.websiteOrderId
          ? allJobs
              .filter((job) => job.websiteOrderId === data.inquiry!.websiteOrderId)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          : [];
        setAiJobs(linkedJobs);

        const allEstimates: EstimateRecord[] = estimatesResult?.estimates ?? [];
        setEstimates(allEstimates.filter((estimate) => estimate.inquiryId === data.inquiry!.id));

        const allSpecifications: SpecificationRecord[] = specificationsResult?.specifications ?? [];
        setSpecifications(allSpecifications.filter((spec) => spec.inquiryId === data.inquiry!.id));

        const allTimelines: TimelineRecord[] = timelinesResult?.timelines ?? [];
        setTimelines(allTimelines.filter((timeline) => timeline.inquiryId === data.inquiry!.id));

        const allContracts: ContractRecord[] = contractsResult?.contracts ?? [];
        setContracts(allContracts.filter((contract) => contract.inquiryId === data.inquiry!.id));

        const allProposals: ProposalRecord[] = proposalsResult?.proposals ?? [];
        setProposals(allProposals.filter((proposal) => proposal.inquiryId === data.inquiry!.id));

        const allLaunchRequests: LaunchRequestRecord[] = launchRequestsResult?.launchRequests ?? [];
        setLaunchRequests(allLaunchRequests.filter((lr) => lr.inquiryId === data.inquiry!.id));
      })
      .catch(() => setLoadError("의뢰를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleStatusChange(status: InquiryStatus) {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/inquiries/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: { success: boolean; inquiry?: InquiryRecord; error?: string } = await res.json();

      if (!data.success || !data.inquiry) {
        setUpdateError(data.error ?? "상태 변경에 실패했습니다.");
        return;
      }

      setInquiry(data.inquiry);
    } catch {
      setUpdateError("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }

  function startEdit() {
    if (!inquiry) return;
    setEditForm({
      companyName: inquiry.companyName,
      contactName: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone,
      industry: inquiry.industry ?? "",
      budget: inquiry.budget ?? "",
      siteType: inquiry.siteType,
      requirements: inquiry.requirements,
    });
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditForm(null);
    setSaveError(null);
  }

  async function handleSaveEdit() {
    if (!editForm) return;

    if (!editForm.companyName.trim() || !editForm.contactName.trim()) {
      setSaveError("회사명과 담당자명은 비울 수 없습니다.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/inquiries/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data: { success: boolean; inquiry?: InquiryRecord; error?: string } = await res.json();

      if (!data.success || !data.inquiry) {
        setSaveError(data.error ?? "수정에 실패했습니다.");
        return;
      }

      setInquiry(data.inquiry);
      setIsEditing(false);
      setEditForm(null);
    } catch {
      setSaveError("수정 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReanalyze() {
    if (!inquiry) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch(`/api/inquiries/${params.id}/analyze`, { method: "POST" });
      const data: { success: boolean; inquiry?: InquiryRecord; error?: string } = await res.json();

      if (!data.success || !data.inquiry) {
        setAnalyzeError(data.error ?? "재분석에 실패했습니다.");
        return;
      }

      setInquiry(data.inquiry);
    } catch {
      setAnalyzeError("재분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDelete() {
    if (!inquiry) return;
    if (!window.confirm(`"${inquiry.companyName || inquiry.contactName}" 의뢰를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/inquiries/${params.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      router.push("/developer/inquiries");
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  // 새 실행 로직을 만들지 않고 기존 POST /api/ai-jobs/[id]/run(lib/aiJobs/worker.ts의
  // processJob() 재사용)을 그대로 호출한다 — Failed Job은 관리자가 재실행, Queued Job은
  // AI Business OS Rewiring Phase 2부터 이 호출이 곧 "AI Generate Workflow 실행 승인"이다:
  // POST /api/inquiries(app/api/inquiries/route.ts)가 더 이상 AiJob을 자동 실행하지 않고
  // Queued 상태로만 만들어두므로, 관리자가 AI 분석 결과를 확인한 뒤 여기서 직접 실행을
  // 트리거해야 Website Builder가 실제로 돈다. "고객 프로젝트" 등록은 별도 승인 액션이 아니라
  // processJob() 성공 후 triggerWorkspaceProvisioning()이 자동으로 수행한다(아래 "5. Project
  // Workspace" 배지 참고) — 이 핸들러는 기존 run 호출만 그대로 수행한다.
  async function handleRunJob(jobId: string) {
    setRunningJobId(jobId);
    setRunError(null);

    try {
      const res = await fetch(`/api/ai-jobs/${jobId}/run`, { method: "POST" });
      const data: { success: boolean; error?: string } = await res.json();
      if (!data.success) {
        setRunError(data.error ?? "AI Job 실행에 실패했습니다.");
      }
      load();
    } catch {
      setRunError("AI Job 실행 중 오류가 발생했습니다.");
    } finally {
      setRunningJobId(null);
    }
  }

  // 기술 견적서 자동 생성 — AI Analysis Engine의 inquiry.analysis를 입력으로 사용하는 별도
  // 서비스(lib/estimates)를 호출한다. Customer Inquiry Pipeline(processJob() 등)과는 완전히
  // 무관한 독립 기능이라 AiJob 실행이나 승인 상태와 관계없이 언제든 생성할 수 있다.
  async function handleGenerateEstimate() {
    if (!inquiry) return;

    setIsGeneratingEstimate(true);
    setEstimateError(null);

    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      });
      const data: { success: boolean; estimate?: EstimateRecord; error?: string } = await res.json();

      if (!data.success || !data.estimate) {
        setEstimateError(data.error ?? "견적서 생성에 실패했습니다.");
        return;
      }

      setEstimates((prev) => [data.estimate!, ...prev]);
    } catch {
      setEstimateError("견적서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingEstimate(false);
    }
  }

  // 기능 명세서 자동 생성 — AI Analysis Engine의 inquiry.analysis를 입력으로 사용하는 별도
  // 서비스(lib/specifications)를 호출한다. handleGenerateEstimate()와 완전히 동일한 패턴 —
  // Customer Inquiry Pipeline(processJob() 등)과는 무관한 독립 기능이다.
  async function handleGenerateSpecification() {
    if (!inquiry) return;

    setIsGeneratingSpecification(true);
    setSpecificationError(null);

    try {
      const res = await fetch("/api/specifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      });
      const data: { success: boolean; specification?: SpecificationRecord; error?: string } = await res.json();

      if (!data.success || !data.specification) {
        setSpecificationError(data.error ?? "기능 명세서 생성에 실패했습니다.");
        return;
      }

      setSpecifications((prev) => [data.specification!, ...prev]);
    } catch {
      setSpecificationError("기능 명세서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingSpecification(false);
    }
  }

  // 프로젝트 일정 자동 생성 — 이미 생성된 기술 견적서·기능 명세서를 입력으로 사용하는 별도
  // 서비스(lib/timeline)를 호출한다. handleGenerateEstimate()/handleGenerateSpecification()와
  // 완전히 동일한 패턴 — Customer Inquiry Pipeline(processJob() 등)과는 무관한 독립 기능이다.
  async function handleGenerateTimeline() {
    if (!inquiry) return;

    setIsGeneratingTimeline(true);
    setTimelineError(null);

    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      });
      const data: { success: boolean; timeline?: TimelineRecord; error?: string } = await res.json();

      if (!data.success || !data.timeline) {
        setTimelineError(data.error ?? "프로젝트 일정 생성에 실패했습니다.");
        return;
      }

      setTimelines((prev) => [data.timeline!, ...prev]);
    } catch {
      setTimelineError("프로젝트 일정 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingTimeline(false);
    }
  }

  // 계약서 자동 생성 — 이미 생성된 기술 견적서·기능 명세서·프로젝트 일정을 입력으로 사용하는
  // 별도 서비스(lib/contracts)를 호출한다. handleGenerateTimeline()과 완전히 동일한 패턴 —
  // Customer Inquiry Pipeline(processJob() 등)과는 무관한 독립 기능이다.
  async function handleGenerateContract() {
    if (!inquiry) return;

    setIsGeneratingContract(true);
    setContractError(null);

    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      });
      const data: { success: boolean; contract?: ContractRecord; error?: string } = await res.json();

      if (!data.success || !data.contract) {
        setContractError(data.error ?? "계약서 생성에 실패했습니다.");
        return;
      }

      setContracts((prev) => [data.contract!, ...prev]);
    } catch {
      setContractError("계약서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingContract(false);
    }
  }

  // 제안서 자동 생성 — 이미 생성된 기술 견적서·기능 명세서·프로젝트 일정·계약서를 입력으로
  // 사용하는 별도 서비스(lib/proposals)를 호출한다. handleGenerateContract()와 완전히 동일한
  // 패턴 — Customer Inquiry Pipeline(processJob() 등)과는 무관한 독립 기능이다.
  async function handleGenerateProposal() {
    if (!inquiry) return;

    setIsGeneratingProposal(true);
    setProposalError(null);

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: inquiry.id }),
      });
      const data: { success: boolean; proposal?: ProposalRecord; error?: string } = await res.json();

      if (!data.success || !data.proposal) {
        setProposalError(data.error ?? "제안서 생성에 실패했습니다.");
        return;
      }

      setProposals((prev) => [data.proposal!, ...prev]);
    } catch {
      setProposalError("제안서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingProposal(false);
    }
  }

  function toggleLaunchRequestService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  }

  // 정보 요청서 생성 — AI 생성 체인(견적서~제안서)과 달리 AI를 호출하지 않는다. 관리자가 위
  // 체크박스로 고른 서비스만 lib/launchRequests에 저장하고, 실제 API 키 입력·전달은 별도 공개
  // 페이지(app/launch-request/[id])에서 의뢰자가 직접 수행한다(서버에는 저장하지 않음).
  async function handleGenerateLaunchRequest() {
    if (!inquiry || selectedServiceIds.length === 0) return;

    setIsGeneratingLaunchRequest(true);
    setLaunchRequestError(null);

    try {
      const services = selectedServiceIds.map((serviceId) => {
        const catalogItem = LAUNCH_REQUEST_CATALOG.find((item) => item.id === serviceId);
        return { serviceId, required: catalogItem?.defaultRequired ?? false };
      });

      const res = await fetch("/api/launch-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: inquiry.id, services }),
      });
      const data: { success: boolean; launchRequest?: LaunchRequestRecord; error?: string } = await res.json();

      if (!data.success || !data.launchRequest) {
        setLaunchRequestError(data.error ?? "정보 요청서 생성에 실패했습니다.");
        return;
      }

      setLaunchRequests((prev) => [data.launchRequest!, ...prev]);
      setSelectedServiceIds([]);
    } catch {
      setLaunchRequestError("정보 요청서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingLaunchRequest(false);
    }
  }

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !inquiry) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "의뢰를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/inquiries" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← AI 의뢰 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/developer/inquiries" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← AI 의뢰 목록
      </Link>

      <PageHeader
        title={inquiry.companyName || inquiry.contactName}
        description={`${inquiry.contactName} · ${inquiry.industry || inquiry.siteType || "업종/유형 미상"} · ${inquiry.source === "chatbot" ? "CNBIZ.AI.KR 챗봇" : "수동 등록"}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={INQUIRY_STATUS_TONES[inquiry.status]}>{INQUIRY_STATUS_LABELS[inquiry.status]}</Badge>
            {!isEditing && (
              <button
                onClick={startEdit}
                className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                수정
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        }
      />

      {deleteError && <StatusMessage tone="error" className="mb-4">{deleteError}</StatusMessage>}

      {isEditing && editForm ? (
        <Card title="의뢰 정보 수정" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">회사명</span>
              <input
                value={editForm.companyName}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">담당자명</span>
              <input
                value={editForm.contactName}
                onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">이메일</span>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">연락처</span>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">업종</span>
              <input
                value={editForm.industry}
                onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">예산</span>
              <input
                value={editForm.budget}
                onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">유형/사이트 타입</span>
              <input
                value={editForm.siteType}
                onChange={(e) => setEditForm({ ...editForm, siteType: e.target.value })}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-gray-500">상담 요약 / 요구사항</span>
              <textarea
                value={editForm.requirements}
                onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
                rows={5}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
          </div>

          {saveError && <StatusMessage tone="error" className="mt-4">{saveError}</StatusMessage>}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={isSaving}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="고객 정보" className="lg:col-span-1">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-gray-500">이메일</dt>
              <dd className="text-gray-200">{inquiry.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">연락처</dt>
              <dd className="text-gray-200">{inquiry.phone || "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">업종</dt>
              <dd className="text-gray-200">{inquiry.industry || "-"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">예산</dt>
              <dd className="text-gray-200">{inquiry.budget || "협의 가능"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">접수일</dt>
              <dd className="text-gray-200">{new Date(inquiry.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>

        <Card title="AI 상담 내용" className="lg:col-span-2">
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">상담 요약</p>
              <p className="text-gray-200 whitespace-pre-wrap break-words">{inquiry.requirements || "-"}</p>
            </div>

            {inquiry.survey && Object.keys(inquiry.survey).length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">설문 응답</p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(inquiry.survey).map(([question, answer]) => (
                    <div key={question} className="rounded border border-gray-800 bg-gray-950 px-3 py-2">
                      <dt className="text-xs text-gray-500">{question}</dt>
                      <dd className="text-gray-200 break-words">{String(answer)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {inquiry.uploadedFiles && inquiry.uploadedFiles.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">첨부파일</p>
                <ul className="flex flex-col gap-1">
                  {inquiry.uploadedFiles.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline break-all"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {inquiry.referenceUrls && inquiry.referenceUrls.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">참고 사이트</p>
                <ul className="flex flex-col gap-1">
                  {inquiry.referenceUrls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline break-all"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {inquiry.codeSnippets && inquiry.codeSnippets.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">첨부 코드 파일</p>
                <ul className="flex flex-col gap-2">
                  {inquiry.codeSnippets.map((snippet) => (
                    <li key={snippet.filename} className="rounded border border-gray-800 bg-gray-950 px-3 py-2">
                      <p className="text-xs text-gray-500 mb-1">{snippet.filename}</p>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-300">
                        {snippet.content.slice(0, 2000)}
                      </pre>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
      )}

      <Card
        title="AI 분석"
        className="mb-6"
        actions={
          <button
            onClick={handleReanalyze}
            disabled={isAnalyzing}
            className="rounded bg-purple-700 hover:bg-purple-600 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? "재분석 중..." : "재분석"}
          </button>
        }
      >
        {analyzeError && <StatusMessage tone="error" className="mb-4">{analyzeError}</StatusMessage>}
        {!inquiry.analysis ? (
          <p className="text-gray-500 text-sm">
            아직 분석되지 않았습니다{inquiry.source === "chatbot" ? " (챗봇 접수 직후 자동 실행되며, 실패한 경우 여기에 표시되지 않습니다)" : ""}.
          </p>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-gray-500 mb-1">Completeness</p>
                <Badge
                  tone={
                    inquiry.analysis.completeness >= 80
                      ? "success"
                      : inquiry.analysis.completeness >= 50
                        ? "warning"
                        : "danger"
                  }
                >
                  {inquiry.analysis.completeness}점
                </Badge>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Business Type</p>
                <Badge tone="accent">{inquiry.analysis.detectedBusinessType}</Badge>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Confidence</p>
                <Badge tone="neutral">{Math.round(inquiry.analysis.confidence * 100)}%</Badge>
              </div>
              {inquiry.analyzedAt && (
                <div>
                  <p className="text-gray-500 mb-1">분석 시각</p>
                  <p className="text-gray-300">{new Date(inquiry.analyzedAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-gray-500 mb-1">Summary</p>
              <p className="text-gray-200 whitespace-pre-wrap break-words">{inquiry.analysis.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 mb-1">Recommended Pages</p>
                <div className="flex flex-wrap gap-1.5">
                  {inquiry.analysis.recommendedPages.map((page) => (
                    <Badge key={page} tone="info">
                      {page}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Recommended Functions</p>
                <div className="flex flex-wrap gap-1.5">
                  {inquiry.analysis.recommendedFunctions.map((fn) => (
                    <Badge key={fn} tone="purple">
                      {fn}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-gray-500 mb-1">Missing Items ({inquiry.analysis.missingItems.length}건)</p>
              {inquiry.analysis.missingItems.length === 0 ? (
                <p className="text-emerald-400">부족한 자료가 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {inquiry.analysis.missingItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-start gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
                    >
                      <Badge tone={item.required ? "danger" : "warning"} className="shrink-0">
                        {item.required ? "필수" : "권장"}
                      </Badge>
                      <div>
                        <p className="text-gray-200 font-semibold">{item.title}</p>
                        <p className="text-gray-400 text-xs">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card
        title="기술 견적서"
        className="mb-6"
        actions={
          <button
            onClick={handleGenerateEstimate}
            disabled={!inquiry.analysis || isGeneratingEstimate}
            className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isGeneratingEstimate ? "생성 중..." : "견적서 생성"}
          </button>
        }
      >
        {!inquiry.analysis ? (
          <p className="text-gray-500 text-sm">AI 분석이 완료된 후 견적서를 생성할 수 있습니다.</p>
        ) : estimates.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 생성된 견적서가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {estimates.map((estimate) => (
              <Link
                key={estimate.id}
                href={`/developer/estimates/${estimate.id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 hover:border-purple-600 transition-colors"
              >
                <Badge tone="purple">
                  {estimate.result.priceRangeMin.toLocaleString()}~{estimate.result.priceRangeMax.toLocaleString()}원
                </Badge>
                <span className="text-xs text-gray-400">{estimate.result.timelineWeeks}주 예상</span>
                {estimate.simulated && <Badge tone="warning">Simulated</Badge>}
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(estimate.createdAt).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
        {estimateError && <StatusMessage tone="error" className="mt-3">{estimateError}</StatusMessage>}
      </Card>

      <Card
        title="기능 명세서"
        className="mb-6"
        actions={
          <button
            onClick={handleGenerateSpecification}
            disabled={!inquiry.analysis || isGeneratingSpecification}
            className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isGeneratingSpecification ? "생성 중..." : "기능 명세서 생성"}
          </button>
        }
      >
        {!inquiry.analysis ? (
          <p className="text-gray-500 text-sm">AI 분석이 완료된 후 기능 명세서를 생성할 수 있습니다.</p>
        ) : specifications.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 생성된 기능 명세서가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {specifications.map((specification) => (
              <Link
                key={specification.id}
                href={`/developer/specifications/${specification.id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 hover:border-purple-600 transition-colors"
              >
                <Badge tone="purple">페이지 {specification.result.pages.length}종</Badge>
                <span className="text-xs text-gray-400">기능 {specification.result.features.length}종</span>
                {specification.simulated && <Badge tone="warning">Simulated</Badge>}
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(specification.createdAt).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
        {specificationError && <StatusMessage tone="error" className="mt-3">{specificationError}</StatusMessage>}
      </Card>

      <Card
        title="프로젝트 일정"
        className="mb-6"
        actions={
          <button
            onClick={handleGenerateTimeline}
            disabled={!inquiry.analysis || estimates.length === 0 || specifications.length === 0 || isGeneratingTimeline}
            className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isGeneratingTimeline ? "생성 중..." : "프로젝트 일정 생성"}
          </button>
        }
      >
        {!inquiry.analysis ? (
          <p className="text-gray-500 text-sm">AI 분석이 완료된 후 프로젝트 일정을 생성할 수 있습니다.</p>
        ) : estimates.length === 0 || specifications.length === 0 ? (
          <p className="text-gray-500 text-sm">기술 견적서와 기능 명세서를 먼저 생성해야 프로젝트 일정을 만들 수 있습니다.</p>
        ) : timelines.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 생성된 프로젝트 일정이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {timelines.map((timeline) => (
              <Link
                key={timeline.id}
                href={`/developer/timeline/${timeline.id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 hover:border-purple-600 transition-colors"
              >
                <Badge tone="purple">총 {timeline.result.totalDurationWeeks}주</Badge>
                <span className="text-xs text-gray-400">Phase {timeline.result.phases.length}개</span>
                {timeline.simulated && <Badge tone="warning">Simulated</Badge>}
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(timeline.createdAt).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
        {timelineError && <StatusMessage tone="error" className="mt-3">{timelineError}</StatusMessage>}
      </Card>

      <Card
        title="계약서"
        className="mb-6"
        actions={
          <button
            onClick={handleGenerateContract}
            disabled={
              !inquiry.analysis ||
              estimates.length === 0 ||
              specifications.length === 0 ||
              timelines.length === 0 ||
              isGeneratingContract
            }
            className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isGeneratingContract ? "생성 중..." : "계약서 생성"}
          </button>
        }
      >
        {!inquiry.analysis ? (
          <p className="text-gray-500 text-sm">AI 분석이 완료된 후 계약서를 생성할 수 있습니다.</p>
        ) : estimates.length === 0 || specifications.length === 0 || timelines.length === 0 ? (
          <p className="text-gray-500 text-sm">
            기술 견적서·기능 명세서·프로젝트 일정을 먼저 생성해야 계약서를 만들 수 있습니다.
          </p>
        ) : contracts.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 생성된 계약서가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/developer/contracts/${contract.id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 hover:border-purple-600 transition-colors"
              >
                <Badge tone="purple">
                  {contract.result.contractAmount.amount.toLocaleString()}
                  {contract.result.contractAmount.currency}
                </Badge>
                {contract.simulated && <Badge tone="warning">Simulated</Badge>}
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(contract.createdAt).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
        {contractError && <StatusMessage tone="error" className="mt-3">{contractError}</StatusMessage>}
      </Card>

      <Card
        title="제안서"
        className="mb-6"
        actions={
          <button
            onClick={handleGenerateProposal}
            disabled={
              !inquiry.analysis ||
              estimates.length === 0 ||
              specifications.length === 0 ||
              timelines.length === 0 ||
              contracts.length === 0 ||
              isGeneratingProposal
            }
            className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isGeneratingProposal ? "생성 중..." : "제안서 생성"}
          </button>
        }
      >
        {!inquiry.analysis ? (
          <p className="text-gray-500 text-sm">AI 분석이 완료된 후 제안서를 생성할 수 있습니다.</p>
        ) : estimates.length === 0 || specifications.length === 0 || timelines.length === 0 || contracts.length === 0 ? (
          <p className="text-gray-500 text-sm">
            기술 견적서·기능 명세서·프로젝트 일정·계약서를 먼저 생성해야 제안서를 만들 수 있습니다.
          </p>
        ) : proposals.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 생성된 제안서가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {proposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/developer/proposals/${proposal.id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 hover:border-purple-600 transition-colors"
              >
                <Badge tone="purple">
                  {proposal.result.cost.amount.toLocaleString()}
                  {proposal.result.cost.currency}
                </Badge>
                {proposal.simulated && <Badge tone="warning">Simulated</Badge>}
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date(proposal.createdAt).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
        {proposalError && <StatusMessage tone="error" className="mt-3">{proposalError}</StatusMessage>}
      </Card>

      <Card title="정보 요청서" className="mb-6">
        <p className="text-gray-500 text-sm mb-3">
          개발 착수 후 의뢰자에게 계정 생성·API 키 발급을 요청해야 할 항목을 선택하세요. 선택한
          항목만 정보 요청서에 포함되며, 실제 키 값은 의뢰자가 아래에서 생성되는 공개 링크에서
          직접 입력하고 이 시스템에는 저장되지 않습니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {LAUNCH_REQUEST_CATALOG.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm cursor-pointer hover:border-purple-600 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedServiceIds.includes(item.id)}
                onChange={() => toggleLaunchRequestService(item.id)}
                className="mt-0.5"
              />
              <span>
                <span className="font-semibold text-gray-200">
                  {item.icon} {item.name}
                </span>
                <Badge tone={item.defaultRequired ? "warning" : "neutral"} className="ml-2">
                  {item.defaultRequired ? "필수" : "선택"}
                </Badge>
                <span className="block text-xs text-gray-500 mt-0.5">{item.summary}</span>
              </span>
            </label>
          ))}
        </div>
        <button
          onClick={handleGenerateLaunchRequest}
          disabled={selectedServiceIds.length === 0 || isGeneratingLaunchRequest}
          className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {isGeneratingLaunchRequest ? "생성 중..." : `정보 요청서 생성 (${selectedServiceIds.length}개 항목)`}
        </button>
        {launchRequestError && <StatusMessage tone="error" className="mt-3">{launchRequestError}</StatusMessage>}

        {launchRequests.length > 0 && (
          <div className="flex flex-col gap-2 mt-4">
            {launchRequests.map((lr) => (
              <Link
                key={lr.id}
                href={`/developer/launch-requests/${lr.id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 hover:border-purple-600 transition-colors"
              >
                <Badge tone="purple">{lr.services.length}개 항목</Badge>
                <span className="text-xs text-gray-500 ml-auto">{new Date(lr.createdAt).toLocaleString()}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card title="파이프라인 진행 상황" className="mb-6">
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">1. Inquiry 접수</Badge>
            <span className="text-gray-600">→</span>
            <Badge tone={client ? "accent" : "neutral"}>2. Client {client ? client.companyName || client.contactName : "생성 전"}</Badge>
            <span className="text-gray-600">→</span>
            <Badge tone={websiteOrder ? "accent" : "neutral"}>
              3. WebsiteOrder {websiteOrder ? websiteOrder.status : "생성 전"}
            </Badge>
            <span className="text-gray-600">→</span>
            <Badge tone={aiJobs.length > 0 ? "accent" : "neutral"}>
              4. AiJob(Website Builder) {aiJobs.length > 0 ? `${aiJobs.length}건` : "생성 전"}
            </Badge>
            <span className="text-gray-600">→</span>
            {project ? (
              <Link href={`/projects/${project.id}`}>
                <Badge tone="accent">5. Project Workspace {project.name}</Badge>
              </Link>
            ) : (
              <Badge tone="neutral">5. Project Workspace 생성 전</Badge>
            )}
          </div>

          {aiJobs.length === 0 ? (
            <p className="text-gray-500">아직 연결된 AI Job이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {aiJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
                >
                  <Badge tone={AI_JOB_STATUS_TONES[job.status]} className="w-20 text-center">
                    {AI_JOB_STATUS_LABELS[job.status]}
                  </Badge>
                  <span className="font-mono text-xs text-gray-500">{job.id}</span>
                  <span className="text-xs text-gray-400">{job.type}</span>
                  {job.error && <span className="text-xs text-red-400 truncate">{job.error}</span>}
                  <div className="sm:ml-auto">
                    {(job.status === "Failed" || job.status === "Queued") && (
                      <button
                        onClick={() => handleRunJob(job.id)}
                        disabled={runningJobId === job.id}
                        className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {runningJobId === job.id
                          ? "실행 중..."
                          : job.status === "Failed"
                            ? "재실행"
                            : "승인 및 생성"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {runError && <StatusMessage tone="error">{runError}</StatusMessage>}
        </div>
      </Card>

      <Card title="상태 변경">
        <div className="flex flex-wrap gap-2">
          {INQUIRY_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating || status === inquiry.status}
              className={`rounded px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                status === inquiry.status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {INQUIRY_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        {updateError && <StatusMessage tone="error" className="mt-3">{updateError}</StatusMessage>}
      </Card>
    </div>
  );
}
