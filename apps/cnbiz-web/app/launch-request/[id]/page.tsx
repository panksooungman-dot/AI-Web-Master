"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Input } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import { LAUNCH_REQUEST_CATALOG, type LaunchRequestCatalogItem } from "@/lib/launchRequests/catalog";
import type { LaunchRequestServiceSelection } from "@/lib/launchRequests/types";
import { componentMarker } from "@/lib/dev/component-marker";

/**
 * 정보 요청서 공개 페이지 — 로그인 없이 링크로 열리는 페이지. 개발 착수 후 의뢰자에게 계정 생성·
 * API 키 발급을 안내하고 입력을 받는다. AskUserQuestion에서 확정한 대로 입력값은 서버에 저장하지
 * 않는다 — 이 컴포넌트의 React state에만 존재하며, "복사"·"이메일로 전송" 버튼은 그 값을 텍스트로
 * 조립해 클립보드/mailto로만 전달한다(백엔드 전송 없음).
 */

interface PublicLaunchRequest {
  id: string;
  companyName: string;
  services: LaunchRequestServiceSelection[];
  createdAt: string;
}

type FieldValues = Record<string, string>;

function fieldStateKey(serviceId: string, fieldKey: string): string {
  return `${serviceId}.${fieldKey}`;
}

function buildSummaryText(
  launchRequest: PublicLaunchRequest,
  services: Array<{ item: LaunchRequestCatalogItem; required: boolean }>,
  values: FieldValues
): string {
  const lines: string[] = [
    `${launchRequest.companyName} — 서비스 런칭 정보 요청서`,
    `작성일: ${new Date().toLocaleDateString()}`,
    "",
  ];

  for (const { item, required } of services) {
    lines.push(`■ ${item.name} (${required ? "필수" : "선택"})`);
    for (const field of item.fields) {
      const value = values[fieldStateKey(item.id, field.key)] ?? "";
      lines.push(`  - ${field.label}: ${value.trim() || "(미입력)"}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export default function LaunchRequestPublicPage() {
  const params = useParams<{ id: string }>();
  const [launchRequest, setLaunchRequest] = useState<PublicLaunchRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<FieldValues>({});
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    fetch(`/api/launch-requests/public/${params.id}`)
      .then((res) => res.json())
      .then((data: { launchRequest?: PublicLaunchRequest; error?: string }) => {
        if (!data.launchRequest) {
          setLoadError(data.error ?? "정보 요청서를 찾을 수 없습니다.");
          return;
        }
        setLaunchRequest(data.launchRequest);
      })
      .catch(() => setLoadError("정보 요청서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const services = useMemo(() => {
    if (!launchRequest) return [];
    return launchRequest.services
      .map((selection) => {
        const item = LAUNCH_REQUEST_CATALOG.find((catalogItem) => catalogItem.id === selection.serviceId);
        return item ? { item, required: selection.required } : null;
      })
      .filter((entry): entry is { item: LaunchRequestCatalogItem; required: boolean } => entry !== null);
  }, [launchRequest]);

  const requiredCount = services.filter((s) => s.required).length;
  const optionalCount = services.length - requiredCount;

  function handleFieldChange(serviceId: string, fieldKey: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldStateKey(serviceId, fieldKey)]: value }));
  }

  async function handleCopy() {
    if (!launchRequest) return;
    const text = buildSummaryText(launchRequest, services, values);

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    } finally {
      setTimeout(() => setCopyStatus("idle"), 2500);
    }
  }

  function handleEmailSend() {
    if (!launchRequest) return;
    const text = buildSummaryText(launchRequest, services, values);
    const subject = encodeURIComponent(`[${launchRequest.companyName}] 서비스 런칭 정보 요청서 회신`);
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  if (isLoading) {
    return (
      <Section background="white">
        <Container className="max-w-3xl py-12 text-center text-slate-500">불러오는 중입니다...</Container>
      </Section>
    );
  }

  if (loadError || !launchRequest) {
    return (
      <Section background="white">
        <Container className="max-w-3xl py-12 text-center text-slate-500">
          {loadError ?? "정보 요청서를 찾을 수 없습니다."}
        </Container>
      </Section>
    );
  }

  return (
    <Section background="white" {...componentMarker("LaunchRequestPublicPage", "app/launch-request/[id]/page.tsx", "정보 요청서")}>
      <Container className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-primary">SERVICE LAUNCH REQUEST</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
          서비스 런칭을 위한
          <br />
          정보 요청서
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          아래 항목별 안내를 따라 필요한 정보를 직접 입력해 주세요. 입력한 내용은 이 페이지 밖으로
          자동 전송되지 않습니다 — 입력 완료 후 하단의 &ldquo;복사&rdquo; 또는 &ldquo;이메일로
          전송&rdquo; 버튼으로 개발팀에 직접 전달해 주시면 됩니다.
        </p>

        <Card className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">수신: {launchRequest.companyName} 담당자 · 발신: 개발팀</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              필수 항목 {requiredCount}개
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              선택 항목 {optionalCount}개
            </span>
          </div>
        </Card>

        <div className="mt-8 flex flex-col gap-6">
          {services.map(({ item, required }) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-slate-900">
                  {item.icon} {item.name}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    required ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {required ? "필수" : "선택"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
              <p className="mt-1 text-xs text-slate-400">
                💰 {item.costLabel}
                {item.costDetail !== "-" ? ` · ${item.costDetail}` : ""}
              </p>

              <div className="mt-4 flex flex-col gap-3">
                {item.fields.map((field) => (
                  <div key={field.key}>
                    <Input
                      id={fieldStateKey(item.id, field.key)}
                      label={field.label}
                      value={values[fieldStateKey(item.id, field.key)] ?? ""}
                      onChange={(event) => handleFieldChange(item.id, field.key, event.target.value)}
                      autoComplete="off"
                    />
                    <p className="mt-1 text-xs text-slate-400">{field.helpText}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">🚀 가입 및 설정 방법</p>
                <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4 text-xs text-slate-600">
                  {item.setupSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              {item.notes && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">⚠️ {item.notes}</p>
              )}
            </Card>
          ))}
        </div>

        <Card className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-600">입력을 마쳤다면 아래 버튼으로 개발팀에 전달해 주세요.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={handleCopy} type="button">
              📋 입력 내용 복사
            </Button>
            <Button onClick={handleEmailSend} type="button">
              ✉️ 이메일로 전송
            </Button>
          </div>
          {copyStatus === "copied" && <p className="text-xs text-green-600">복사되었습니다.</p>}
          {copyStatus === "failed" && <p className="text-xs text-red-600">복사에 실패했습니다.</p>}
        </Card>
      </Container>
    </Section>
  );
}
