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
import type { DesignPlanJobRecord } from "@/lib/design/generationJob";
import type { InquiryRecord } from "@/lib/inquiries/types";
import { WEBSITE_TYPES } from "@/lib/websites/types";

interface PlansResponse {
  plans: DesignPlanRecord[];
}

/**
 * Inquiry의 상담 요약(requirements)에, 그 화면(/developer/inquiries/[id])에서만 확인 가능한
 * 상담 설문 전체(브랜드 컬러·도메인·희망 제작물·희망 기능 등, survey에 있는 모든 질문-답변)·
 * 참고 사이트·예산·첨부 자료를 덧붙인다 — Design Plan 생성 AI는 이 자유 텍스트
 * (customerRequirements)만 읽으므로, 구조화된 필드로 따로 넘기는 대신 여기서 한 번만 합쳐서
 * 전달한다. 값이 없는 항목은 줄 자체를 만들지 않는다(지어내지 않음).
 *
 * survey는 브랜드컬러·도메인 두 키만 하드코딩해 골라 쓰던 것을(2026-09-12), 의뢰 상세
 * 페이지가 실제로 표시하는 것과 동일하게 전체를 순회하도록 바꿨다 — "희망 제작물"·"희망 기능"
 * 등 그 이후 추가된 설문 항목이 계속 누락되고 있었다(2026-09-14 실사용 지적).
 *
 * AI 분석 결과(inquiry.analysis)는 새로 지어내는 값이 아니라, 의뢰 상세 페이지의 "AI 분석 결과"
 * 카드가 이미 계산해 저장해 둔 요약·추천 페이지·추천 기능·Missing Items다 — Design Plan 생성에
 * 실질적으로 도움이 되는데도 지금까지는 이 화면에 전혀 반영되지 않고 있었다(2026-09-14 실사용 지적).
 *
 * 첨부된 코드 파일(codeSnippets)의 실제 내용은 넣지 않는다 — Design Plan은 화면/UX 설계용이라
 * 원본 코드를 읽어도 도움이 안 되고, 파일당 최대 2000자까지 들어갈 수 있어 프롬프트만 불필요하게
 * 길어진다(2026-09-14 논의). 첨부 자료(uploadedFiles)와 동일하게 "몇 건 있다"는 사실과 확인
 * 위치만 안내한다.
 */
function buildRequirementsFromInquiry(inquiry: InquiryRecord): string {
  const lines = [inquiry.requirements.trim()];

  if (inquiry.analysis) {
    if (inquiry.analysis.summary && inquiry.analysis.summary.trim()) {
      lines.push(`AI 분석 요약: ${inquiry.analysis.summary.trim()}`);
    }
    if (inquiry.analysis.recommendedPages.length > 0) {
      lines.push(`AI 추천 페이지: ${inquiry.analysis.recommendedPages.join(", ")}`);
    }
    if (inquiry.analysis.recommendedFunctions.length > 0) {
      lines.push(`AI 추천 기능: ${inquiry.analysis.recommendedFunctions.join(", ")}`);
    }
    if (inquiry.analysis.missingItems.length > 0) {
      const items = inquiry.analysis.missingItems
        .map((item) => `${item.title}(${item.required ? "필수" : "권장"})`)
        .join(", ");
      lines.push(`AI 분석 미비 항목: ${items}`);
    }
  }

  if (inquiry.survey) {
    for (const [question, answer] of Object.entries(inquiry.survey)) {
      if (typeof answer === "string" && answer.trim()) {
        lines.push(`${question}: ${answer.trim()}`);
      }
    }
  }

  if (inquiry.referenceUrls && inquiry.referenceUrls.length > 0) {
    lines.push(`참고 사이트: ${inquiry.referenceUrls.join(", ")}`);
  }

  if (inquiry.budget && inquiry.budget.trim()) {
    lines.push(`예산: ${inquiry.budget.trim()}`);
  }

  // 첨부 이미지(로고·사진 등) 자체를 텍스트 프롬프트에 담을 수는 없지만(이 화면의 AI는 이미지를
  // 보지 않음), 참고할 자료가 있다는 사실만은 넘겨 디자이너/AI가 별도로 확인하도록 안내한다.
  if (inquiry.uploadedFiles && inquiry.uploadedFiles.length > 0) {
    lines.push(`첨부 자료: ${inquiry.uploadedFiles.length}건 (의뢰 상세 페이지에서 확인 필요)`);
  }

  // 코드 파일 내용 자체는 담지 않는다(위 doc-comment 참고) — 건수와 확인 위치만 안내.
  if (inquiry.codeSnippets && inquiry.codeSnippets.length > 0) {
    lines.push(`첨부 코드 파일: ${inquiry.codeSnippets.length}건 (의뢰 상세 페이지에서 확인 필요)`);
  }

  return lines.filter(Boolean).join("\n");
}

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

/**
 * fetch 요청부터 JSON 파싱까지 안전하게 처리한다. 이 화면의 Generate/Storyboard 자동 생성은 AI
 * 호출이 최대 2분 걸릴 수 있는데(providers/provider.ts), app/api/design/{requirements,
 * storyboard}/route.ts의 maxDuration은 Vercel 모든 플랜이 지원하는 상한인 60초로 고정돼 있어
 * 실패할 수 있는 지점이 두 곳이다.
 *
 * 1) fetch() 자체가 예외를 던지는 경우 — 서버가 아직 응답조차 하지 못한 채 네트워크 연결이
 *    끊기거나(모바일에서 흔함) 요청이 중단된 경우로, 브라우저가 "Failed to fetch" 같은 원시
 *    메시지를 던진다. 서버 오류 페이지 문제(2)를 fetch()-throw 시 res 자체가 없어 구분하지
 *    못해 res.json() 파싱 실패만 다루던 이전 버전에서는 이 경로가 그대로 새어나가고 있었다
 *    (2026-09-14 실사용 보고 — Generate 버튼 클릭 후 "Failed to fetch"가 그대로 노출된 사례,
 *    앞선 "Unexpected token..." 수정과 같은 날 발견된 별개 지점).
 * 2) fetch()는 성공했지만 응답이 정상 JSON이 아닌 경우(Vercel 함수 실행 시간 초과로 인한
 *    플랫폼 오류 페이지 등) — res.json()이 "Unexpected token 'A', "An error o"... is not
 *    valid JSON" 같은 원시 JS 파싱 오류를 던진다.
 *
 * 두 경우 모두 관리자에게 원인을 전혀 알 수 없는 메시지로 노출되고 있었으므로, 하나의 헬퍼로
 * 묶어 동일한 안내 메시지로 통일한다 — 근본적인 시간 제한 자체를 늘리는 수정은 아니다(Vercel
 * 요금제에 따라 그 상한 자체가 60초로 고정돼 있을 수 있음).
 */
async function fetchAndParseJson<T>(url: string, init: RequestInit | undefined, failureMessage: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(failureMessage);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(res.ok ? "응답을 해석할 수 없습니다." : failureMessage);
  }
}

/**
 * 의뢰의 siteType별 Customer Requirements 예시 문구(placeholder). 실제 사실이 아닌, 그 업종에서
 * 흔히 나오는 요구사항 카테고리 예시일 뿐이다 — 특정 의뢰의 실제 요구사항을 지어내는 것이 아님
 * (2026-09-12, "치과" 예시가 레스토랑 의뢰에도 항상 그대로 뜨던 문제 개선).
 */
const REQUIREMENTS_EXAMPLE_BY_SITE_TYPE: Record<string, string> = {
  website: "회사 소개, 서비스 안내, 문의하기가 필요합니다.",
  landing: "제품 소개, 신청·구매 유도, 후기 노출이 필요합니다.",
  portfolio: "작업물 소개, 이력, 연락처 안내가 필요합니다.",
  corporate: "회사 소개, 사업 영역, 연혁, 채용 안내가 필요합니다.",
  agency: "포트폴리오, 서비스 소개, 상담 문의가 필요합니다.",
  dental: "온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다.",
  hospital: "진료과 안내, 예약 문의, 오시는 길 안내가 필요합니다.",
  restaurant: "예약 문의, 대표 메뉴 안내, 오시는 길 안내가 필요합니다.",
  shopping: "상품 소개, 온라인 결제, 배송 안내가 필요합니다.",
  blog: "글 목록, 카테고리 분류, 구독 알림이 필요합니다.",
  education: "강의 소개, 수강 신청, 커리큘럼 안내가 필요합니다.",
};
const DEFAULT_REQUIREMENTS_EXAMPLE = "예약 문의, 서비스 소개, 오시는 길 안내가 필요합니다.";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [requirements, setRequirements] = useState("");
  const [targetUsers, setTargetUsers] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ?inquiryId=로 들어오면 그 의뢰의 정보로 폼을 미리 채운다(2026-09-12 — Design 체인이 의뢰
  // 정보와 전혀 연결되지 않아 매번 재입력해야 한다는 지적). 채워진 값은 여전히 자유롭게 수정
  // 가능하고, projectId로 원본 의뢰를 함께 기록해 어느 의뢰에서 시작됐는지 추적 가능하게 한다.
  const [linkedInquiry, setLinkedInquiry] = useState<{
    id: string;
    companyName: string;
    siteType?: string;
  } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLoadingLinkedInquiry, setIsLoadingLinkedInquiry] = useState(false);
  const [isAutoContinuing, setIsAutoContinuing] = useState(false);
  const [autoContinueError, setAutoContinueError] = useState<string | null>(null);

  // 사이드바 "디자인 → Design" 메뉴는 특정 의뢰와 연결되지 않은 범용 경로(/developer/design,
  // inquiryId 없음)라 지금까지는 이 화면에서 의뢰를 고를 방법이 전혀 없었다 — 자동 채움을
  // 쓰려면 반드시 의뢰 상세 페이지의 "Design 시작" 버튼을 거쳐야 했다(2026-09-14 실사용 지적:
  // "디자인 부분에서도 정보추출이 가능해야지 직관적으로 사용할 수 있으면 편할 것 같다"). 이
  // 화면 자체에서 의뢰를 검색·선택할 수 있는 목록을 추가해, 어느 경로로 들어와도 동일하게
  // 자동 채움을 쓸 수 있게 한다.
  const [inquiryOptions, setInquiryOptions] = useState<InquiryRecord[]>([]);
  const [isLoadingInquiryOptions, setIsLoadingInquiryOptions] = useState(false);
  const [inquiryOptionsError, setInquiryOptionsError] = useState<string | null>(null);
  const [inquirySearch, setInquirySearch] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoadingInquiryOptions(true);
      setInquiryOptionsError(null);
      fetch("/api/inquiries")
        .then((res) => res.json())
        .then((json: { inquiries?: InquiryRecord[] }) => setInquiryOptions(json.inquiries ?? []))
        .catch(() => setInquiryOptionsError("의뢰 목록을 불러오지 못했습니다."))
        .finally(() => setIsLoadingInquiryOptions(false));
    });
    // 목록은 마운트 시 1회만 불러오면 된다 — 새로 접수된 의뢰까지 반영하려면 페이지를 새로고침.
  }, []);

  /**
   * 기존엔 실패 이유(네트워크 오류·인증 만료로 인한 HTML 응답·실제 404 등)를 구분하지 않고
   * 전부 "의뢰를 불러오지 못했습니다."로만 표시해, 실제 원인을 알 수도 재시도할 수도
   * 없었다(2026-09-14 실사용 보고). res.ok·JSON 파싱 성공 여부를 구분해 더 구체적인
   * 메시지를 보여주고, 페이지를 벗어나지 않고 다시 시도할 수 있는 버튼을 추가했다.
   *
   * id를 인자로 받도록 바꿔(기존엔 URL의 inquiryId만 읽음) 위 의뢰 선택 목록에서 클릭한
   * 의뢰도 동일한 로직으로 불러올 수 있게 했다.
   */
  function loadLinkedInquiry(id: string) {
    setIsLoadingLinkedInquiry(true);
    setLinkError(null);

    fetchAndParseJson<{ inquiry?: InquiryRecord; error?: string }>(
      `/api/inquiries/${id}`,
      undefined,
      "요청이 실패했습니다. 네트워크 연결을 확인하거나, 로그인 세션이 만료됐을 수 있습니다."
    )
      .then((json) => {
        if (!json.inquiry) {
          throw new Error(json.error ?? "의뢰를 찾을 수 없습니다.");
        }
        const inquiry = json.inquiry;
        const typeLabel = WEBSITE_TYPES.find((t) => t.id === inquiry.siteType)?.label ?? inquiry.siteType;
        // 의뢰 상세 페이지의 "업종"(industry, 예: "한정식 전문점")은 siteType 라벨(예: "레스토랑")보다
        // 구체적인 실제 정보라, 있으면 함께 적어 Project Type을 더 정확하게 채운다.
        const projectTypeValue =
          inquiry.industry && inquiry.industry.trim() ? `${typeLabel} (${inquiry.industry.trim()})` : typeLabel;

        setProjectName(inquiry.companyName || inquiry.contactName);
        setProjectType(projectTypeValue);
        setRequirements(buildRequirementsFromInquiry(inquiry));
        setLinkedInquiry({
          id: inquiry.id,
          companyName: inquiry.companyName || inquiry.contactName,
          siteType: inquiry.siteType,
        });
      })
      .catch((err) => {
        setLinkError(err instanceof Error ? err.message : "네트워크 오류로 의뢰를 불러오지 못했습니다.");
      })
      .finally(() => setIsLoadingLinkedInquiry(false));
  }

  useEffect(() => {
    if (!inquiryId) return;
    queueMicrotask(() => loadLinkedInquiry(inquiryId));
    // inquiryId는 페이지 진입 시 한 번만 반영하면 되고, 이후 admin이 폼을 수정해도 다시
    // 덮어쓰지 않아야 하므로 의도적으로 한 번만 실행한다. "다시 시도" 버튼이 이후 재실행을
    // 담당한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 아래 "의뢰에서 정보 불러오기" 목록에서 클릭했을 때 — URL도 함께 갱신해(History 범위·
   * placeholder 등 searchParams 기반 값이 전부 자연스럽게 새 의뢰 기준으로 바뀌도록) "Design
   * 시작" 버튼으로 들어온 것과 동일한 상태로 만든다.
   *
   * `selectedId`도 새 의뢰 기준으로 다시 계산한다 — 이 화면은 URL만 바뀌고(같은 경로,
   * searchParams만 변경) 컴포넌트 자체는 리마운트되지 않으므로, 이전에 선택돼 있던 완전히
   * 무관한 의뢰의 Design Plan이 `selectedId`에 그대로 남아있었다. 그 결과 History 카드는
   * "이 의뢰로 생성된 Plan 없음"을 정확히 보여주면서도, 바로 아래 Requirement Analysis 등에는
   * 이전 의뢰(예: 전혀 다른 업종의 테스트 기록)의 내용이 계속 표시되는 버그가 있었다(2026-09-14
   * 실사용 보고 — "사색찬미한정식"을 선택했는데 무관한 업종의 예전 기록이 뜬 사례).
   * loadPlans()의 최초 마운트 시 선택 로직과 동일한 기준(scoped[0] 우선, 없으면 null)을 쓴다.
   */
  function handlePickInquiry(id: string) {
    router.replace(`/developer/design?inquiryId=${id}`, { scroll: false });
    loadLinkedInquiry(id);
    const scoped = plans.filter((plan) => plan.input.projectId === id);
    setSelectedId(scoped[0]?.id ?? null);
  }

  /** "다른 의뢰 선택"— 이미 채워진 값은 지우지 않는다(비교하거나 새 의뢰로 덮어쓰고 싶을 수
   * 있어서). 목록만 다시 펼친다. */
  function handleUnlinkInquiry() {
    setLinkedInquiry(null);
    setLinkError(null);
    router.replace("/developer/design", { scroll: false });
  }

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

  /** History 목록의 "삭제" 버튼. app/developer/proposals/page.tsx의 handleDelete()와 동일한 패턴. */
  async function handleDeletePlan(plan: DesignPlanRecord) {
    if (!window.confirm(`"${plan.input.projectName}" Design Plan을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(plan.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/design/requirements/${plan.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setPlans((prev) => prev.filter((item) => item.id !== plan.id));
      setSelectedId((current) => (current === plan.id ? null : current));
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

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
      const json = await fetchAndParseJson<{ success: boolean; error?: string }>(
        "/api/design/storyboard",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        },
        "네트워크 연결이 끊겼거나 서버 응답 시간이 초과됐습니다. 잠시 후 Storyboard 화면에서 다시 시도해주세요."
      );

      if (!json.success) {
        setAutoContinueError(json.error ?? "Storyboard 자동 생성에 실패했습니다.");
        return;
      }

      router.push("/developer/design/storyboard");
    } catch (err) {
      console.error("[design/storyboard] auto-generate failed", err);
      // 예전에는 parseJsonOrThrow/fetchAndParseJson이 던진 구체적인 안내 메시지를 무시하고
      // 항상 이 고정 문구만 보여줬다 — handleSubmit()의 기존 패턴(err.message 우선 사용)과
      // 통일한다.
      setAutoContinueError(err instanceof Error ? err.message : "Storyboard 자동 생성 중 오류가 발생했습니다.");
    } finally {
      setIsAutoContinuing(false);
    }
  };

  /**
   * Job이 Success/Failed에 도달할 때까지 몇 초 간격으로 상태를 확인한다. POST .../jobs/[id]/run
   * 자체가 오래 걸리는 요청이라 브라우저 쪽에서 끊기기 쉬운데(모바일 와이파이 전환, 탭 전환
   * 등), 그 fetch가 실패해도 서버는 이미 시작한 생성을 계속 진행하므로 이 폴링이 최종 결과를
   * 그대로 회수한다 — 연속으로 여러 번 폴링 자체가 안 될 때만("정말 네트워크가 끊겼다") 포기한다.
   */
  async function pollDesignPlanJob(
    jobId: string
  ): Promise<{ status: "Success"; plan: DesignPlanRecord } | { status: "Failed"; error: string }> {
    const POLL_INTERVAL_MS = 3000;
    const MAX_CONSECUTIVE_POLL_FAILURES = 10;
    let consecutiveFailures = 0;

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let json: { success: boolean; job?: DesignPlanJobRecord; plan?: DesignPlanRecord | null; error?: string };
      try {
        const res = await fetch(`/api/design/requirements/jobs/${jobId}`);
        json = await res.json();
        consecutiveFailures = 0;
      } catch {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          return {
            status: "Failed",
            error: "네트워크 연결이 불안정해 진행 상태를 확인할 수 없습니다. 잠시 후 History에서 결과를 확인해주세요.",
          };
        }
        continue;
      }

      if (!json.success || !json.job) {
        return { status: "Failed", error: json.error ?? "Job 조회에 실패했습니다." };
      }
      if (json.job.status === "Success" && json.plan) {
        return { status: "Success", plan: json.plan };
      }
      if (json.job.status === "Failed") {
        return { status: "Failed", error: json.job.error ?? "생성에 실패했습니다." };
      }
      // Queued/Running — 계속 폴링한다.
    }
  }

  /**
   * 요청 즉시 응답하는 Job 생성(POST .../jobs) → 실제 생성을 수행하는 별도 요청(POST
   * .../jobs/[id]/run, 최대 270초 소요 가능) → 폴링(GET .../jobs/[id])으로 결과 회수, 3단계로
   * 나눈 구조. 예전에는 이 전체를 하나의 fetch로 처리해, Vercel 함수 실행 시간 제한이나 그
   * 사이의 네트워크 끊김이 그대로 "생성 실패"로 이어졌다(2026-09-14 실사용 — Customer
   * Requirements가 아주 긴 입력에서 "네트워크 연결이 끊겼거나 서버 응답 시간이 초과됐습니다"
   * 반복 발생). run 요청은 실패해도 무시한다(catch로 삼킴) — 서버가 이미 처리를 시작했다면
   * 폴링이 최종 결과를 그대로 가져온다.
   */
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createJson = await fetchAndParseJson<{ success: boolean; job?: DesignPlanJobRecord; error?: string }>(
        "/api/design/requirements/jobs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName,
            projectType,
            requirements,
            targetUsers,
            ...(linkedInquiry ? { projectId: linkedInquiry.id } : {}),
          }),
        },
        "네트워크 연결이 끊겼거나 서버 응답 시간이 초과됐습니다. 잠시 후 다시 시도해주세요."
      );

      if (!createJson.success || !createJson.job) {
        setSubmitError(createJson.error ?? "생성 실패");
        return;
      }

      const jobId = createJson.job.id;
      fetch(`/api/design/requirements/jobs/${jobId}/run`, { method: "POST" }).catch(() => {
        // 무시한다 — 이 요청이 끊겨도 서버 쪽 처리는 계속되고, 아래 폴링이 최종 결과를 가져온다.
      });

      const result = await pollDesignPlanJob(jobId);
      if (result.status === "Failed") {
        setSubmitError(result.error);
        return;
      }

      const plan = result.plan;
      setPlans((prev) => [plan, ...prev]);
      setSelectedId(plan.id);

      // 의뢰에서 시작된 흐름이면 Storyboard까지 이어서 만든다("Design 시작" 버튼 하나로
      // 처음부터 다시 입력하지 않고 Storyboard까지 도달하게 해달라는 요청, 2026-09-12).
      // 일반적인(의뢰와 무관한) 수동 생성까지 확장하지는 않는다 — 그 경우엔 admin이 이
      // 화면에 남아 결과를 먼저 검토하고 싶을 수 있어, 기존처럼 수동으로 다음 단계로
      // 넘어가는 흐름을 유지한다.
      if (linkedInquiry) {
        await autoGenerateStoryboard(plan.id);
      }
    } catch (err) {
      console.error("[design/requirements] generate failed", err);
      setSubmitError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 필수 항목이 비어있으면 버튼이 조용히 비활성화되는데, 특히 ?inquiryId= 자동 채움 시 원본
  // 의뢰의 요구사항이 비어있으면 placeholder 예시 문구만 보이고 실제로는 빈 칸이라 사용자가
  // "버튼이 안 눌린다"고 오인하기 쉽다(2026-09-12 실사용 보고). 어떤 항목이 비었는지 명시적으로
  // 안내한다.
  //
  // 서버(app/api/design/requirements/route.ts)는 projectName·projectType·requirements·
  // targetUsers 4개를 전부 필수로 요구하는데, 이 목록은 원래 2개(Project Name·Customer
  // Requirements)만 검사하고 있었다 — loadLinkedInquiry()가 Target Users는 애초에 자동 채우지
  // 않는데도(그 자리엔 항상 placeholder 예시 문구만 보임) 버튼은 활성 상태로 남아있어, 클릭하면
  // "projectName, projectType, requirements, targetUsers는 모두 필수입니다"라는 서버의 일반
  // 오류만 뜨고 실제로 무엇이 비어있는지는 알 수 없었다(2026-09-14 실사용 재현 — 사색찬미한정식
  // 의뢰로 자동 채움 후 Generate를 눌렀을 때 재현). 서버가 실제로 요구하는 4개 필드 전부를
  // 여기서도 검사해 버튼을 미리 막고, 정확히 무엇이 비었는지 안내한다.
  const missingFields = [
    !projectName && "Project Name",
    !projectType && "Project Type",
    !requirements && "Customer Requirements",
    !targetUsers && "Target Users",
  ].filter(Boolean) as string[];

  const requirementsPlaceholder = linkedInquiry?.siteType
    ? (REQUIREMENTS_EXAMPLE_BY_SITE_TYPE[linkedInquiry.siteType] ?? DEFAULT_REQUIREMENTS_EXAMPLE)
    : DEFAULT_REQUIREMENTS_EXAMPLE;

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
        // StatusMessage는 <p>로 렌더링되므로(HTML은 <p> 안에 블록 요소를 허용하지 않음) 내부에
        // <div>를 두면 하이드레이션 오류가 난다 — 전부 인라인 요소(span/button)로만 구성한다.
        <StatusMessage tone="success" className="mb-6">
          <span className="mr-3">
            🔗 의뢰 &quot;{linkedInquiry.companyName}&quot;의 정보로 아래 항목을 미리 채웠습니다. 필요하면
            자유롭게 수정한 뒤 생성하세요.
          </span>
          <button type="button" onClick={handleUnlinkInquiry} className="text-xs underline hover:no-underline">
            다른 의뢰 선택
          </button>
        </StatusMessage>
      )}
      {linkError && (
        <StatusMessage tone="error" className="mb-6">
          {linkError}{" "}
          {inquiryId && (
            <button
              type="button"
              onClick={() => loadLinkedInquiry(inquiryId)}
              disabled={isLoadingLinkedInquiry}
              className="underline hover:no-underline disabled:opacity-50"
            >
              {isLoadingLinkedInquiry ? "다시 시도 중..." : "다시 시도"}
            </button>
          )}
        </StatusMessage>
      )}

      {!linkedInquiry && (
        <Card title="🔗 의뢰에서 정보 불러오기 (선택)" className="mb-6">
          <p className="text-xs text-gray-500 mb-3">
            의뢰를 선택하면 회사명·유형·상담 내용·AI 분석 결과가 아래 항목에 자동으로 채워집니다.
            건너뛰고 직접 입력해도 됩니다.
          </p>
          <input
            type="text"
            value={inquirySearch}
            onChange={(e) => setInquirySearch(e.target.value)}
            placeholder="회사명 또는 담당자명 검색"
            className={`${inputClass} mb-3`}
          />
          {isLoadingInquiryOptions ? (
            <LoadingText />
          ) : inquiryOptionsError ? (
            <StatusMessage tone="error">{inquiryOptionsError}</StatusMessage>
          ) : (
            (() => {
              const query = inquirySearch.trim().toLowerCase();
              const matches = (
                query
                  ? inquiryOptions.filter((inquiry) =>
                      `${inquiry.companyName} ${inquiry.contactName}`.toLowerCase().includes(query)
                    )
                  : inquiryOptions
              ).slice(0, 20);

              if (matches.length === 0) {
                return (
                  <p className="text-sm text-gray-500">
                    {query ? "검색 결과가 없습니다." : "등록된 의뢰가 없습니다."}
                  </p>
                );
              }

              return (
                <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {matches.map((inquiry) => (
                    <li key={inquiry.id}>
                      <button
                        type="button"
                        onClick={() => handlePickInquiry(inquiry.id)}
                        className="w-full text-left rounded px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <span className="font-semibold text-gray-200">
                          {inquiry.companyName || inquiry.contactName}
                        </span>{" "}
                        <span className="text-xs text-gray-500">
                          {WEBSITE_TYPES.find((t) => t.id === inquiry.siteType)?.label ?? inquiry.siteType} ·{" "}
                          {new Date(inquiry.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              );
            })()
          )}
        </Card>
      )}

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
                placeholder={requirementsPlaceholder}
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
              disabled={isSubmitting || isAutoContinuing || missingFields.length > 0}
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
            {!isSubmitting && !isAutoContinuing && missingFields.length > 0 && (
              <StatusMessage tone="error">
                {missingFields.join(", ")}이(가) 비어있어 생성할 수 없습니다 — 위 회색 예시 문구는
                실제 입력값이 아닙니다. 직접 입력해주세요.
              </StatusMessage>
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
          {deleteError && (
            <StatusMessage tone="error" className="mb-2">
              {deleteError}
            </StatusMessage>
          )}
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
                <li key={plan.id} className="flex items-stretch gap-2">
                  <button
                    onClick={() => setSelectedId(plan.id)}
                    className={`flex-1 min-w-0 text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedId === plan.id ? "bg-blue-600/20 border border-blue-600" : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{plan.input.projectName}</span>
                      {plan.simulated && <Badge tone="warning">Simulated</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(plan.createdAt).toLocaleString()}</span>
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan)}
                    disabled={deletingId === plan.id}
                    className="shrink-0 self-center rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {deletingId === plan.id ? "삭제 중..." : "삭제"}
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
