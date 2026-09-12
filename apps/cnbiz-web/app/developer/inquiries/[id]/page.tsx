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
import type { WebsiteOrderRecord, WebsiteOrderStatus } from "@/lib/websiteOrders/types";
import { WEBSITE_ORDER_STATUSES } from "@/lib/websiteOrders/types";
import type { AiJobRecord } from "@/lib/aiJobs/types";
import type { DeploymentStatus, WebsiteRecord } from "@/lib/websites/registry";
import type { WebsitePreviewShareRecord } from "@/lib/websites/preview-share";
import type { ProjectRecord } from "@/lib/projects/registry";
import type { EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import type { ContractRecord } from "@/lib/contracts/types";
import type { ProposalRecord } from "@/lib/proposals/types";
import type { LaunchRequestCustomItem, LaunchRequestRecord } from "@/lib/launchRequests/types";
import { LAUNCH_REQUEST_CATALOG, getRecommendedServiceIds } from "@/lib/launchRequests/catalog";
import { WEBSITE_TYPES } from "@/lib/websites/types";

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

// '주문 관리'(구 /developer/website-orders) 화면을 이 파이프라인 카드로 완전히 흡수하며
// 그대로 옮겨온 라벨 — 별도 페이지에서 쓰던 값과 동일하게 유지한다.
const ORDER_STATUS_LABELS: Record<WebsiteOrderStatus, string> = {
  Requested: "접수",
  InProgress: "처리중",
  Review: "검수",
  Delivered: "납품완료",
  Cancelled: "취소",
};

const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  NotStarted: "배포 전",
  PreviewReady: "미리보기 준비됨",
  Success: "운영 배포 완료",
  Failed: "배포 실패",
  NotConfigured: "배포 미설정",
};

const DEPLOYMENT_STATUS_TONES: Record<DeploymentStatus, BadgeTone> = {
  NotStarted: "neutral",
  PreviewReady: "warning",
  Success: "success",
  Failed: "danger",
  NotConfigured: "neutral",
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
  // 2026-09-12 — Missing Items(AI 분석 카드) 중 초기 접수 이후에는 이 화면에서 채울 방법이
  // 아예 없던 3개 텍스트 항목. 줄바꿈/쉼표로 구분된 문자열로 편집하고 저장 시 배열로 변환한다
  // (회사 로고는 파일 업로드라 별도 상태로 관리 — logoFile 등 참고).
  referenceUrls: string;
  brandColor: string;
  domain: string;
}

const BRAND_COLOR_SURVEY_KEY = "브랜드컬러";
const DOMAIN_SURVEY_KEY = "도메인";

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [inquiry, setInquiry] = useState<InquiryRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [isUploadingExtraFiles, setIsUploadingExtraFiles] = useState(false);
  const [extraFilesUploadError, setExtraFilesUploadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [websiteOrder, setWebsiteOrder] = useState<WebsiteOrderRecord | null>(null);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [promotingWebsiteId, setPromotingWebsiteId] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [previewShares, setPreviewShares] = useState<Record<string, WebsitePreviewShareRecord>>({});
  const [sharingWebsiteId, setSharingWebsiteId] = useState<string | null>(null);
  const [previewShareError, setPreviewShareError] = useState<string | null>(null);
  const [copiedPreviewShareId, setCopiedPreviewShareId] = useState<string | null>(null);
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [specifications, setSpecifications] = useState<SpecificationRecord[]>([]);
  const [timelines, setTimelines] = useState<TimelineRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [launchRequests, setLaunchRequests] = useState<LaunchRequestRecord[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isGeneratingLaunchRequest, setIsGeneratingLaunchRequest] = useState(false);
  const [launchRequestError, setLaunchRequestError] = useState<string | null>(null);
  // 카탈로그(catalog.ts)에 없는 프로젝트 고유 요청 항목. "추가" 버튼으로 하나씩 담아두었다가
  // 정보 요청서 생성 시 함께 전송한다(2026-09-12 — 카탈로그 외 항목도 요청할 수 있어야 한다는 요청).
  const [customItems, setCustomItems] = useState<LaunchRequestCustomItem[]>([]);
  const [customItemDraft, setCustomItemDraft] = useState<LaunchRequestCustomItem>({ name: "", description: "" });
  // 계약서/제안서 카드와 시각적으로 통일하기 위해 항목 선택 체크박스는 기본적으로 접어두고,
  // "새 정보 요청서 작성" 클릭 시에만 펼친다(2026-09-12 — "제안서처럼만 만들어달라"는 피드백).
  const [showLaunchRequestPicker, setShowLaunchRequestPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [orderUpdateError, setOrderUpdateError] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
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
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

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
        setSelectedServiceIds(getRecommendedServiceIds(data.inquiry.siteType));

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

        if (order && order.websiteIds.length > 0) {
          Promise.all(
            order.websiteIds.map((websiteId) =>
              fetch(`/api/websites/${websiteId}`)
                .then((res) => res.json())
                .then((result: { website?: WebsiteRecord }) => result.website ?? null)
            )
          )
            .then((results) => setWebsites(results.filter((w): w is WebsiteRecord => w !== null)))
            .catch(() => setWebsites([]));
        } else {
          setWebsites([]);
        }

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

  async function handleOrderStatusChange(status: WebsiteOrderStatus) {
    if (!websiteOrder) return;

    setIsUpdatingOrder(true);
    setOrderUpdateError(null);

    try {
      const res = await fetch(`/api/website-orders/${websiteOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data: { success: boolean; websiteOrder?: WebsiteOrderRecord; error?: string } = await res.json();

      if (!data.success || !data.websiteOrder) {
        setOrderUpdateError(data.error ?? "주문 상태 변경에 실패했습니다.");
        return;
      }

      setWebsiteOrder(data.websiteOrder);
    } catch {
      setOrderUpdateError("주문 상태 변경 중 오류가 발생했습니다.");
    } finally {
      setIsUpdatingOrder(false);
    }
  }

  // "미리보기 확인 후 운영 배포" — 자동 생성 직후에는 항상 Preview 배포까지만 진행되고
  // (lib/deployment/pipeline.ts), 관리자가 이 버튼으로 실제 화면을 확인한 뒤 명시적으로
  // 확정해야만 운영 도메인에 반영되고 고객에게도 알림이 나간다(lib/deployment/promote.ts).
  async function handlePromoteWebsite(websiteId: string) {
    setPromotingWebsiteId(websiteId);
    setPromoteError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/promote`, { method: "POST" });
      const data: { success: boolean; error?: string } = await res.json();
      if (!data.success) {
        setPromoteError(data.error ?? "운영 배포 확정에 실패했습니다.");
        return;
      }
      load();
    } catch {
      setPromoteError("운영 배포 확정 중 오류가 발생했습니다.");
    } finally {
      setPromotingWebsiteId(null);
    }
  }

  // "의뢰자한테 실제화면으로 보여줘야지 의뢰자도 이해를 할 수가 있지" — Preview 배포(실제로
  // 동작하는 화면)를 로그인 없이 열리는 링크로 의뢰자에게 공유해 승인/수정요청을 받는다.
  async function handleSharePreview(websiteId: string) {
    setSharingWebsiteId(websiteId);
    setPreviewShareError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/preview-share`, { method: "POST" });
      const data: { success: boolean; share?: WebsitePreviewShareRecord; error?: string } = await res.json();
      if (!data.success || !data.share) {
        setPreviewShareError(data.error ?? "공유 링크 생성에 실패했습니다.");
        return;
      }
      setPreviewShares((prev) => ({ ...prev, [websiteId]: data.share! }));
    } catch {
      setPreviewShareError("공유 링크 생성 중 오류가 발생했습니다.");
    } finally {
      setSharingWebsiteId(null);
    }
  }

  async function handleCopyPreviewShareLink(shareId: string) {
    const url = `${window.location.origin}/preview-review/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPreviewShareId(shareId);
      setTimeout(() => setCopiedPreviewShareId(null), 2000);
    } catch {
      // 클립보드 권한이 없는 환경 — 링크는 화면에 그대로 표시되어 있으므로 수동 복사 가능.
    }
  }

  function startEdit() {
    if (!inquiry) return;
    const brandColor = inquiry.survey?.[BRAND_COLOR_SURVEY_KEY];
    const domain = inquiry.survey?.[DOMAIN_SURVEY_KEY];
    setEditForm({
      companyName: inquiry.companyName,
      contactName: inquiry.contactName,
      email: inquiry.email,
      phone: inquiry.phone,
      industry: inquiry.industry ?? "",
      budget: inquiry.budget ?? "",
      siteType: inquiry.siteType,
      requirements: inquiry.requirements,
      referenceUrls: (inquiry.referenceUrls ?? []).join("\n"),
      brandColor: typeof brandColor === "string" ? brandColor : "",
      domain: typeof domain === "string" ? domain : "",
    });
    setSaveError(null);
    setLogoFile(null);
    setLogoUploadError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditForm(null);
    setSaveError(null);
    setLogoFile(null);
    setLogoUploadError(null);
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
        body: JSON.stringify({
          companyName: editForm.companyName,
          contactName: editForm.contactName,
          email: editForm.email,
          phone: editForm.phone,
          industry: editForm.industry,
          budget: editForm.budget,
          siteType: editForm.siteType,
          requirements: editForm.requirements,
          referenceUrls: editForm.referenceUrls
            .split(/[\n,]+/)
            .map((url) => url.trim())
            .filter(Boolean),
          brandColor: editForm.brandColor,
          domain: editForm.domain,
        }),
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

  // "회사 로고"는 파일 첨부라 나머지 텍스트 필드(handleSaveEdit)와 달리 즉시 업로드한다 —
  // score.ts의 company_logo 체크는 uploadedFiles 중 파일명에 "logo"가 포함된 항목만 인정하므로,
  // 관리자가 고른 원본 파일명이 이를 만족하지 않으면 업로드 전에 "logo-" 접두사를 붙여 보정한다.
  async function handleUploadLogo() {
    if (!logoFile) return;

    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const fileToUpload = /logo/i.test(logoFile.name)
        ? logoFile
        : new File([logoFile], `logo-${logoFile.name}`, { type: logoFile.type });

      const uploadBody = new FormData();
      uploadBody.append("file", fileToUpload);
      const uploadRes = await fetch("/api/inquiries/upload", { method: "POST", body: uploadBody });
      const uploadData: { success: boolean; url?: string; error?: string } = await uploadRes.json();

      if (!uploadData.success || !uploadData.url) {
        setLogoUploadError(uploadData.error ?? "로고 업로드에 실패했습니다.");
        return;
      }

      const patchRes = await fetch(`/api/inquiries/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addUploadedFiles: [uploadData.url] }),
      });
      const patchData: { success: boolean; inquiry?: InquiryRecord; error?: string } = await patchRes.json();

      if (!patchData.success || !patchData.inquiry) {
        setLogoUploadError(patchData.error ?? "로고 등록에 실패했습니다.");
        return;
      }

      setInquiry(patchData.inquiry);
      setLogoFile(null);
    } catch {
      setLogoUploadError("로고 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  // 로고 외 참고 이미지·자료 파일을 여러 개 한 번에 업로드한다. handleUploadLogo와 달리
  // 파일명을 보정하지 않는다("logo" 접두사를 붙이면 score.ts의 company_logo 체크를 오염시킴).
  // /api/inquiries/upload는 파일 하나만 받으므로 순차 업로드 후 한 번의 PATCH로 모아 등록한다.
  async function handleUploadExtraFiles() {
    if (extraFiles.length === 0) return;

    setIsUploadingExtraFiles(true);
    setExtraFilesUploadError(null);

    try {
      const urls: string[] = [];
      for (const file of extraFiles) {
        const uploadBody = new FormData();
        uploadBody.append("file", file);
        const uploadRes = await fetch("/api/inquiries/upload", { method: "POST", body: uploadBody });
        const uploadData: { success: boolean; url?: string; error?: string } = await uploadRes.json();

        if (!uploadData.success || !uploadData.url) {
          setExtraFilesUploadError(`"${file.name}" 업로드 실패: ${uploadData.error ?? "알 수 없는 오류"}`);
          return;
        }
        urls.push(uploadData.url);
      }

      const patchRes = await fetch(`/api/inquiries/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addUploadedFiles: urls }),
      });
      const patchData: { success: boolean; inquiry?: InquiryRecord; error?: string } = await patchRes.json();

      if (!patchData.success || !patchData.inquiry) {
        setExtraFilesUploadError(patchData.error ?? "자료 등록에 실패했습니다.");
        return;
      }

      setInquiry(patchData.inquiry);
      setExtraFiles([]);
    } catch {
      setExtraFilesUploadError("자료 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingExtraFiles(false);
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

  // "새 AI Job 생성" — 이미 Success로 끝난 AiJob은 재실행 버튼이 없고(handleRunJob은 Success
  // Job을 걸러냄), 생성된 산출물(outDir)도 os.tmpdir() 기준이라 서버리스 인스턴스가 재활용되면
  // 사라진다(lib/paths/repoRoot.ts). GITHUB_TOKEN/VERCEL_TOKEN을 뒤늦게 설정한 경우처럼, 이미
  // 끝난 주문을 다시 생성+배포하려면 새 AiJob을 만들어 처음부터 다시 실행해야 한다.
  async function handleRegenerateWebsite() {
    if (!websiteOrder) return;

    setIsRegenerating(true);
    setRegenerateError(null);

    try {
      const res = await fetch(`/api/website-orders/${websiteOrder.id}/regenerate`, { method: "POST" });
      const data: { success: boolean; error?: string } = await res.json();
      if (!data.success) {
        setRegenerateError(data.error ?? "새 AI Job 생성에 실패했습니다.");
        return;
      }
      load();
    } catch {
      setRegenerateError("새 AI Job 생성 중 오류가 발생했습니다.");
    } finally {
      setIsRegenerating(false);
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

  // 견적서·기능명세서·프로젝트 일정을 의뢰자에게 SOLAPI 문자로 공유 — /api/website-orders/[id]/share가
  // 공개 링크(/quote/[token])를 발급/재사용하고 client.phone으로 발송한다.
  async function handleShareWithCustomer() {
    if (!websiteOrder) return;

    setIsSharing(true);
    setShareMessage(null);

    try {
      const res = await fetch(`/api/website-orders/${websiteOrder.id}/share`, { method: "POST" });
      const data: { success: boolean; shareUrl?: string; error?: string } = await res.json();

      if (!data.success) {
        setShareMessage({ tone: "error", text: data.error ?? "문자 발송에 실패했습니다." });
        return;
      }

      setShareMessage({ tone: "success", text: `문자를 발송했습니다. (${data.shareUrl})` });
    } catch {
      setShareMessage({ tone: "error", text: "문자 발송 중 오류가 발생했습니다." });
    } finally {
      setIsSharing(false);
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

  function toggleLaunchRequestPicker() {
    if (!showLaunchRequestPicker && selectedServiceIds.length === 0 && inquiry) {
      setSelectedServiceIds(getRecommendedServiceIds(inquiry.siteType));
    }
    setShowLaunchRequestPicker((prev) => !prev);
  }

  function addCustomLaunchRequestItem() {
    const name = customItemDraft.name.trim();
    if (!name) return;
    setCustomItems((prev) => [...prev, { name, description: customItemDraft.description.trim() }]);
    setCustomItemDraft({ name: "", description: "" });
  }

  function removeCustomLaunchRequestItem(index: number) {
    setCustomItems((prev) => prev.filter((_, i) => i !== index));
  }

  // 정보 요청서 생성 — AI 생성 체인(견적서~제안서)과 달리 AI를 호출하지 않는다. 관리자가 위
  // 체크박스로 고른 서비스(+ 직접 추가한 항목)만 lib/launchRequests에 저장하고, 실제 API 키
  // 입력·전달은 별도 공개 페이지(app/launch-request/[id])에서 의뢰자가 직접 수행한다(서버에는
  // 저장하지 않음).
  async function handleGenerateLaunchRequest() {
    if (!inquiry || (selectedServiceIds.length === 0 && customItems.length === 0)) return;

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
        body: JSON.stringify({ inquiryId: inquiry.id, services, customItems }),
      });
      const data: { success: boolean; launchRequest?: LaunchRequestRecord; error?: string } = await res.json();

      if (!data.success || !data.launchRequest) {
        setLaunchRequestError(data.error ?? "정보 요청서 생성에 실패했습니다.");
        return;
      }

      setLaunchRequests((prev) => [data.launchRequest!, ...prev]);
      setSelectedServiceIds([]);
      setCustomItems([]);
      setShowLaunchRequestPicker(false);
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
                className="flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <svg
                  className="h-3.5 w-3.5"
                  aria-hidden
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586Z"
                  />
                </svg>
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
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">브랜드 컬러</span>
              <input
                value={editForm.brandColor}
                onChange={(e) => setEditForm({ ...editForm, brandColor: e.target.value })}
                placeholder="예: #005BAC"
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-gray-500">도메인</span>
              <input
                value={editForm.domain}
                onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                placeholder="예: cnbiz.kr"
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-gray-500">참고 사이트(줄바꿈 또는 쉼표로 여러 개 입력)</span>
              <textarea
                value={editForm.referenceUrls}
                onChange={(e) => setEditForm({ ...editForm, referenceUrls: e.target.value })}
                rows={2}
                placeholder={"https://example.com\nhttps://example2.com"}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200 outline-none focus:border-blue-600"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <span className="text-sm text-gray-500">회사 로고</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-300"
              />
              <button
                onClick={handleUploadLogo}
                disabled={!logoFile || isUploadingLogo}
                className="rounded bg-purple-700 hover:bg-purple-600 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isUploadingLogo ? "업로드 중..." : "로고 업로드"}
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              다른 텍스트 필드와 달리 선택 즉시 업로드되어 첨부파일에 추가됩니다(저장 버튼과 무관).
            </p>
            {logoUploadError && <StatusMessage tone="error" className="mt-1">{logoUploadError}</StatusMessage>}
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <span className="text-sm text-gray-500">추가 자료(참고 이미지·서비스 사진 등)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                multiple
                onChange={(e) => setExtraFiles(Array.from(e.target.files ?? []))}
                className="text-sm text-gray-300"
              />
              <button
                onClick={handleUploadExtraFiles}
                disabled={extraFiles.length === 0 || isUploadingExtraFiles}
                className="rounded bg-purple-700 hover:bg-purple-600 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isUploadingExtraFiles ? "업로드 중..." : `자료 업로드${extraFiles.length > 0 ? ` (${extraFiles.length}개)` : ""}`}
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              로고와 마찬가지로 선택 즉시 업로드되어 첨부파일에 추가됩니다(저장 버튼과 무관). 여러 개를
              한 번에 선택할 수 있습니다.
            </p>
            {extraFilesUploadError && <StatusMessage tone="error" className="mt-1">{extraFilesUploadError}</StatusMessage>}
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
        title="고객 공유"
        className="mb-6"
        actions={
          <button
            onClick={handleShareWithCustomer}
            disabled={!websiteOrder || !client?.phone || estimates.length === 0 || isSharing}
            className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isSharing ? "발송 중..." : "문자로 공유"}
          </button>
        }
      >
        {estimates.length === 0 ? (
          <p className="text-gray-500 text-sm">기술 견적서를 먼저 생성하면 의뢰자에게 문자로 공유할 수 있습니다.</p>
        ) : !client?.phone ? (
          <p className="text-gray-500 text-sm">고객사 연락처(전화번호)가 없어 문자를 보낼 수 없습니다.</p>
        ) : (
          <p className="text-gray-500 text-sm">
            {client.companyName || client.contactName}님({client.phone})에게 로그인 없이 열람 가능한 문서 링크를
            문자로 발송합니다. 견적서·기능 명세서·프로젝트 일정 중 생성된 것만 한 페이지에 표시됩니다.
          </p>
        )}
        {shareMessage && (
          <StatusMessage tone={shareMessage.tone} className="mt-3">
            {shareMessage.text}
          </StatusMessage>
        )}
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

      <Card
        title="정보 요청서"
        className="mb-6"
        actions={
          <button
            onClick={toggleLaunchRequestPicker}
            className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            {showLaunchRequestPicker ? "취소" : "새 정보 요청서 작성"}
          </button>
        }
      >
        {showLaunchRequestPicker ? (
          <>
            <p className="text-gray-500 text-sm mb-3">
              개발 착수 후 의뢰자에게 계정 생성·API 키 발급을 요청해야 할 항목을 선택하세요. 선택한
              항목만 정보 요청서에 포함되며, 실제 키 값은 의뢰자가 아래에서 생성되는 공개 링크에서
              직접 입력하고 이 시스템에는 저장되지 않습니다.
            </p>
            <p className="text-xs text-gray-600 mb-3">
              {inquiry.siteType
                ? `"${WEBSITE_TYPES.find((t) => t.id === inquiry.siteType)?.label ?? inquiry.siteType}" 유형에 맞춰 아래 항목이 미리 체크되어 있습니다 —`
                : "아래 항목은 기본값(도메인)만 미리 체크되어 있습니다 —"}{" "}
              실제 필요 여부는 프로젝트마다 다르므로 자유롭게 추가·해제 후 생성하세요.{" "}
              <button
                type="button"
                onClick={() => setSelectedServiceIds(getRecommendedServiceIds(inquiry.siteType))}
                className="text-purple-400 hover:underline"
              >
                추천 항목으로 초기화
              </button>
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

            <div className="rounded border border-gray-800 bg-gray-950 p-3 mb-3">
              <p className="text-sm font-semibold text-gray-200 mb-1">직접 추가</p>
              <p className="text-xs text-gray-500 mb-2">
                위 목록에 없는 이 프로젝트만의 요청 사항(예: 네이버 지도 API 키)이 있으면 이름과
                설명을 적어 추가하세요. 안내 문구·설정 방법은 자동으로 생기지 않고 여기 적은 설명이
                그대로 의뢰자에게 전달됩니다.
              </p>
              {customItems.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {customItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm"
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-gray-200">{item.name}</span>
                        {item.description && (
                          <span className="block text-xs text-gray-500 mt-0.5">{item.description}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomLaunchRequestItem(index)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={customItemDraft.name}
                  onChange={(e) => setCustomItemDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="항목 이름 (예: 네이버 지도 API)"
                  className="flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-purple-600"
                />
                <input
                  type="text"
                  value={customItemDraft.description}
                  onChange={(e) => setCustomItemDraft((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="설명 (선택)"
                  className="flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={addCustomLaunchRequestItem}
                  disabled={!customItemDraft.name.trim()}
                  className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  추가
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateLaunchRequest}
              disabled={(selectedServiceIds.length === 0 && customItems.length === 0) || isGeneratingLaunchRequest}
              className="rounded bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isGeneratingLaunchRequest
                ? "생성 중..."
                : `정보 요청서 생성 (${selectedServiceIds.length + customItems.length}개 항목)`}
            </button>
            {launchRequestError && <StatusMessage tone="error" className="mt-3">{launchRequestError}</StatusMessage>}
          </>
        ) : launchRequests.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 생성된 정보 요청서가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {launchRequests.map((lr) => (
              <Link
                key={lr.id}
                href={`/developer/launch-requests/${lr.id}`}
                className="flex flex-wrap items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 hover:border-purple-600 transition-colors"
              >
                <Badge tone="purple">{lr.services.length + (lr.customItems?.length ?? 0)}개 항목</Badge>
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

          {websiteOrder && (
            <div className="rounded border border-gray-800 bg-gray-950 px-3 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">주문 상태</p>
              <div className="flex flex-wrap gap-2">
                {WEBSITE_ORDER_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleOrderStatusChange(status)}
                    disabled={isUpdatingOrder || status === websiteOrder.status}
                    className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      status === websiteOrder.status
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              {orderUpdateError && <StatusMessage tone="error" className="mt-2">{orderUpdateError}</StatusMessage>}

              <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                산출물(Website)
              </p>
              {websiteOrder.websiteIds.length === 0 ? (
                <p className="text-xs text-gray-500">아직 생성된 웹사이트 산출물이 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {websiteOrder.websiteIds.map((websiteId) => {
                    const website = websites.find((w) => w.id === websiteId);
                    if (!website) {
                      return (
                        <Badge key={websiteId} tone="neutral">
                          {websiteId}
                        </Badge>
                      );
                    }

                    return (
                      <div
                        key={websiteId}
                        className="flex flex-col gap-1.5 rounded border border-gray-800 bg-gray-900 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={DEPLOYMENT_STATUS_TONES[website.deploymentStatus ?? "NotStarted"]}>
                            {DEPLOYMENT_STATUS_LABELS[website.deploymentStatus ?? "NotStarted"]}
                          </Badge>
                          {website.deployment?.url && (
                            <a
                              href={website.deployment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              {website.deploymentStatus === "Success" ? "운영 사이트 보기" : "미리보기 화면 확인"} →
                            </a>
                          )}
                        </div>

                        {website.deploymentStatus === "PreviewReady" && (
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handlePromoteWebsite(websiteId)}
                                disabled={promotingWebsiteId === websiteId}
                                className="rounded bg-green-700 hover:bg-green-600 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {promotingWebsiteId === websiteId ? "배포 확정 중..." : "미리보기 확인함 — 운영 배포 확정"}
                              </button>
                              <button
                                onClick={() => handleSharePreview(websiteId)}
                                disabled={sharingWebsiteId === websiteId}
                                className="rounded bg-purple-700 hover:bg-purple-600 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {sharingWebsiteId === websiteId
                                  ? "링크 생성 중..."
                                  : previewShares[websiteId]
                                    ? "공유 링크 다시 보기"
                                    : "의뢰자에게 실제 화면 공유"}
                              </button>
                            </div>
                            <p className="mt-1 text-[11px] text-gray-500">
                              위 링크로 실제 화면을 먼저 확인하세요. 확정 전까지는 운영 도메인·고객 알림에 전혀 반영되지 않습니다.
                            </p>

                            {previewShares[websiteId] && (
                              <div className="mt-2 flex flex-col gap-1 rounded border border-gray-800 bg-gray-950 px-2 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <code className="rounded bg-black px-2 py-1 text-[11px] text-blue-300">
                                    {`${typeof window !== "undefined" ? window.location.origin : ""}/preview-review/${previewShares[websiteId].id}`}
                                  </code>
                                  <button
                                    onClick={() => handleCopyPreviewShareLink(previewShares[websiteId].id)}
                                    className="rounded bg-gray-700 hover:bg-gray-600 px-2 py-0.5 text-[11px] transition-colors"
                                  >
                                    {copiedPreviewShareId === previewShares[websiteId].id ? "복사됨!" : "복사"}
                                  </button>
                                  <Badge
                                    tone={
                                      previewShares[websiteId].status === "approved"
                                        ? "success"
                                        : previewShares[websiteId].status === "revision_requested"
                                          ? "warning"
                                          : "neutral"
                                    }
                                  >
                                    {previewShares[websiteId].status === "approved"
                                      ? "승인됨"
                                      : previewShares[websiteId].status === "revision_requested"
                                        ? "수정 요청됨"
                                        : "응답 대기 중"}
                                  </Badge>
                                </div>
                                {previewShares[websiteId].comment && (
                                  <p className="text-[11px] text-gray-400">
                                    의뢰자 의견: &ldquo;{previewShares[websiteId].comment}&rdquo;
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {promoteError && <StatusMessage tone="error" className="mt-2">{promoteError}</StatusMessage>}
              {previewShareError && <StatusMessage tone="error" className="mt-2">{previewShareError}</StatusMessage>}
            </div>
          )}

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

          {websiteOrder && !aiJobs.some((job) => job.status === "Queued" || job.status === "Running") && (
            <div>
              <button
                onClick={handleRegenerateWebsite}
                disabled={isRegenerating}
                className="rounded bg-purple-700 hover:bg-purple-600 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isRegenerating ? "생성 중..." : "새 AI Job 생성 (재생성)"}
              </button>
              <p className="mt-1 text-[11px] text-gray-500">
                배포 토큰(GITHUB_TOKEN/VERCEL_TOKEN)을 새로 설정했거나, 옛 산출물이 만료되어 다시
                생성·배포해야 할 때 사용합니다. Queued로 생성되며, 목록에 뜨면 &ldquo;승인 및
                생성&rdquo;을 눌러 실행하세요.
              </p>
              {regenerateError && <StatusMessage tone="error" className="mt-2">{regenerateError}</StatusMessage>}
            </div>
          )}
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
