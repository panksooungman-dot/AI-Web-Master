"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Textarea } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import { componentMarker } from "@/lib/dev/component-marker";

/**
 * "의뢰자한테 실제화면으로 보여줘야지 의뢰자도 이해를 할 수가 있지" (2026-09-11) —
 * app/design-review/[id]/page.tsx(Storyboard 텍스트 문서 공유)만으로는 부족하다는 후속 요청.
 * 이 페이지는 AI가 실제로 생성한 웹사이트의 Preview 배포(진짜 동작하는 화면)를 iframe으로 그대로
 * 보여주고, 의뢰자가 보고 승인하거나 수정을 요청할 수 있게 한다. 운영 도메인에는 아직 반영되지
 * 않은 상태(lib/websites/registry.ts의 "PreviewReady")에서만 공유 가능하다.
 */

interface PublicShare {
  id: string;
  status: "pending" | "approved" | "revision_requested";
  comment: string | null;
  createdAt: string;
  respondedAt: string | null;
}

interface LoadedData {
  share: PublicShare;
  projectName: string;
  previewUrl: string;
}

export default function PreviewReviewPublicPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<LoadedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approved" | "revision_requested" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    fetch(`/api/websites/preview-shares/public/${params.id}`)
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
      const res = await fetch(`/api/websites/preview-shares/public/${params.id}/respond`, {
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
        <Container className="max-w-4xl py-12 text-center text-slate-500">불러오는 중입니다...</Container>
      </Section>
    );
  }

  if (loadError || !data) {
    return (
      <Section background="white">
        <Container className="max-w-4xl py-12 text-center text-slate-500">
          {loadError ?? "링크를 찾을 수 없습니다."}
        </Container>
      </Section>
    );
  }

  const { share, projectName, previewUrl } = data;

  return (
    <Section
      background="white"
      {...componentMarker("PreviewReviewPublicPage", "app/preview-review/[id]/page.tsx", "실제 화면 확인")}
    >
      <Container className="max-w-4xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-primary">PREVIEW REVIEW</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{projectName} 실제 화면 확인</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          아래는 저희가 실제로 만든 웹사이트 화면입니다. 직접 눌러보시고 확인해 주세요. 문제가 없으면
          &ldquo;승인&rdquo;을, 수정이 필요하면 &ldquo;수정 요청&rdquo;을 눌러 의견을 남겨주세요. 아직 정식
          주소로는 연결되지 않은 확인용 화면입니다.
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

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-2 truncate text-xs text-slate-500">{previewUrl}</span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto shrink-0 text-xs text-primary hover:underline"
            >
              새 창에서 열기 →
            </a>
          </div>
          <iframe
            src={previewUrl}
            title={`${projectName} 미리보기`}
            className="h-[70vh] w-full bg-white"
          />
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
              placeholder="예: 메인 화면 색상을 더 밝게 바꿔주세요."
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
