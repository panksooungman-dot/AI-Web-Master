"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Textarea } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import { componentMarker } from "@/lib/dev/component-marker";

/**
 * "디자인쪽에서 수정할 게 있으면 실제 화면으로 봐야지 개발을 하는 거 아냐" (2026-09-11) —
 * Storyboard(화면 구성 기획 문서)를 개발 착수 전에 의뢰자가 직접 보고 승인하거나 수정을
 * 요청할 수 있게 하는 공개 페이지. app/launch-request/[id]/page.tsx와 동일하게 로그인 없이
 * 링크로 열린다. 실제 화면 디자인(색상·이미지 등)은 아직 이 단계(Storyboard)에서 만들어지지
 * 않으므로(Design Automation Phase 2, 텍스트 기획 문서), 여기서 보여주는 것도 화면 구성·
 * 흐름·순서다 — "예쁜 시안"이 아니라 "이 순서·구성이 맞는지"를 확인받는 용도.
 */

interface ScreenFlowNode {
  screen: string;
  path: string;
  description: string;
}

interface UserJourneyStep {
  step: number;
  screen: string;
  goal: string;
  emotion?: string;
}

interface UserJourney {
  persona: string;
  goal: string;
  steps: UserJourneyStep[];
}

interface NavigationFlowEdge {
  from: string;
  to: string;
  trigger: string;
}

interface ScreenDescription {
  screen: string;
  path: string;
  purpose: string;
  keyElements: string[];
}

interface PublicShare {
  id: string;
  status: "pending" | "approved" | "revision_requested";
  comment: string | null;
  createdAt: string;
  respondedAt: string | null;
}

interface PublicStoryboard {
  screenFlow: ScreenFlowNode[];
  userJourneys: UserJourney[];
  navigationFlow: NavigationFlowEdge[];
  screenDescriptions: ScreenDescription[];
}

interface LoadedData {
  share: PublicShare;
  projectName: string;
  storyboard: PublicStoryboard;
}

export default function DesignReviewPublicPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<LoadedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approved" | "revision_requested" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    fetch(`/api/design/storyboard-shares/public/${params.id}`)
      .then((res) => res.json())
      .then((json: LoadedData & { error?: string }) => {
        if (!json.share) {
          setLoadError(json.error ?? "링크를 찾을 수 없습니다.");
          return;
        }
        setData(json);
      })
      .catch(() => setLoadError("불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function respond(status: "approved" | "revision_requested") {
    setIsSubmitting(status);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/design/storyboard-shares/public/${params.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment: comment.trim() || undefined }),
      });
      const json: { success: boolean; error?: string } = await res.json();
      if (!json.success) {
        setSubmitError(json.error ?? "제출에 실패했습니다.");
        return;
      }
      load();
    } catch {
      setSubmitError("제출 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(null);
    }
  }

  if (isLoading) {
    return (
      <Section background="white">
        <Container className="max-w-3xl py-12 text-center text-slate-500">불러오는 중입니다...</Container>
      </Section>
    );
  }

  if (loadError || !data) {
    return (
      <Section background="white">
        <Container className="max-w-3xl py-12 text-center text-slate-500">
          {loadError ?? "링크를 찾을 수 없습니다."}
        </Container>
      </Section>
    );
  }

  const { share, projectName, storyboard } = data;

  return (
    <Section
      background="white"
      {...componentMarker("DesignReviewPublicPage", "app/design-review/[id]/page.tsx", "디자인 문서 확인")}
    >
      <Container className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-primary">DESIGN REVIEW</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          {projectName}
          <br />
          화면 구성 확인 요청
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          개발 착수 전, 저희가 기획한 화면 구성·흐름을 확인해 주세요. 아래 내용을 보시고 문제가 없으면
          &ldquo;승인&rdquo;을, 수정이 필요하면 &ldquo;수정 요청&rdquo;을 눌러 의견을 남겨주세요.
        </p>

        {share.status !== "pending" && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {share.status === "approved" ? "✅ 이미 승인해 주셨습니다." : "✏️ 수정을 요청해 주셨습니다."}
            </p>
            {share.comment && <p className="mt-1 text-sm text-slate-600">&ldquo;{share.comment}&rdquo;</p>}
            {share.respondedAt && (
              <p className="mt-1 text-xs text-slate-400">{new Date(share.respondedAt).toLocaleString()}</p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-6">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">화면 구성 (Screen Flow)</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {storyboard.screenFlow.map((node) => (
                <li key={node.screen} className="border-l-2 border-primary/30 pl-3">
                  <p className="font-semibold text-slate-900">
                    {node.screen} <span className="font-normal text-slate-400">({node.path})</span>
                  </p>
                  <p className="text-sm text-slate-600">{node.description}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">화면 이동 흐름 (Navigation Flow)</h2>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600">
              {storyboard.navigationFlow.map((edge, i) => (
                <li key={i}>
                  {edge.from} → {edge.to} <span className="text-slate-400">({edge.trigger})</span>
                </li>
              ))}
            </ul>
          </Card>

          {storyboard.userJourneys.map((journey) => (
            <Card key={journey.persona}>
              <h2 className="text-lg font-bold text-slate-900">사용자 시나리오 — {journey.persona}</h2>
              <p className="text-sm text-slate-500">목표: {journey.goal}</p>
              <ol className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600">
                {journey.steps.map((step) => (
                  <li key={step.step}>
                    {step.step}. {step.screen} — {step.goal}
                  </li>
                ))}
              </ol>
            </Card>
          ))}

          <Card>
            <h2 className="text-lg font-bold text-slate-900">화면별 상세 (Screen Descriptions)</h2>
            <ul className="mt-3 flex flex-col gap-4">
              {storyboard.screenDescriptions.map((screen) => (
                <li key={screen.screen}>
                  <p className="font-semibold text-slate-900">{screen.screen}</p>
                  <p className="text-sm text-slate-600">{screen.purpose}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    구성 요소: {screen.keyElements.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mt-10 rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900">확인 결과를 남겨주세요</h2>
          <div className="mt-4">
            <Textarea
              id="comment"
              label="수정 요청 시 남길 의견 (선택)"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="예: 메인 화면에 회사 소개보다 서비스 소개를 먼저 보여주세요."
            />
          </div>
          {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => respond("approved")} disabled={isSubmitting !== null}>
              {isSubmitting === "approved" ? "제출 중..." : "승인합니다"}
            </Button>
            <Button variant="secondary" onClick={() => respond("revision_requested")} disabled={isSubmitting !== null}>
              {isSubmitting === "revision_requested" ? "제출 중..." : "수정 요청"}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
