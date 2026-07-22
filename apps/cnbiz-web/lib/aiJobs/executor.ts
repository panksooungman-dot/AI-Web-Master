import fs from "fs";
import path from "path";
import { execute } from "@/lib/commandEngine/engine";
import { resolveRepoRoot } from "@/lib/paths/repoRoot";
import { getAiJob, updateAiJobStatus } from "./registry";
import type { AiJobRecord } from "./types";
import { getWebsiteOrder, addWebsiteToOrder } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { createWebsiteRecord } from "@/lib/websites/registry";
import { WEBSITE_TYPES } from "@/lib/websites/types";
import { getInquiry } from "@/lib/inquiries/registry";
import { generatePlanning } from "@/lib/planning/generator";

/**
 * AI Business OS Phase 3(Planning) — "generate_planning" Job 전용 실행기. 새 저장소를 만들지
 * 않고 이 Job이 이미 갖고 있는 기존 `result` 필드(AiJobRecord, lib/aiJobs/types.ts)에
 * PlanningContent를 그대로 담는다. lib/ai-analysis(AI Analysis Engine)는 호출만 하고 전혀
 * 수정하지 않는다 — job.payload.inquiryId로 Inquiry를 다시 조회해 이미 저장되어 있는
 * `inquiry.analysis`(AIAnalysisResult)를 그대로 입력으로 사용한다.
 */
async function executePlanningJob(job: AiJobRecord): Promise<void> {
  const inquiryId = typeof job.payload.inquiryId === "string" ? job.payload.inquiryId : undefined;
  if (!inquiryId) {
    throw new Error('"generate_planning" Job은 payload.inquiryId가 필요합니다.');
  }

  const inquiry = await getInquiry(inquiryId);
  if (!inquiry) {
    throw new Error(`Inquiry를 찾을 수 없습니다: ${inquiryId}`);
  }
  if (!inquiry.analysis) {
    throw new Error(`Inquiry "${inquiryId}"에 AI Analysis 결과가 없어 Planning을 생성할 수 없습니다.`);
  }

  const { content, simulated, provider, model } = await generatePlanning({
    companyName: inquiry.companyName,
    siteType: inquiry.siteType,
    requirements: inquiry.requirements,
    analysis: inquiry.analysis,
  });

  // status는 그대로 두고(worker.ts가 이 함수 이후 곧바로 Success로 전이) result만 채운다 —
  // updateAiJobStatus()는 patch에 없는 필드를 보존하므로 안전하다.
  await updateAiJobStatus(job.id, job.status, {
    result: { ...content, simulated, provider: provider ?? null, model: model ?? null },
  });
}

/**
 * AI Job 1건을 처리한다 — worker.ts가 Running/Completed/Failed 상태 전이를 담당하므로,
 * 여기서는 순수 실행만 하고 성공 시 정상 반환, 실패 시 예외를 던진다(worker.ts의 try/catch가
 * 그대로 처리).
 *
 * Website Builder 실행은 app/api/websites/route.ts와 동일한 방식(commandEngine의 execute()로
 * `node packages/cli/dist/index.js website create ...`를 shell-out)을 그대로 재사용한다 —
 * 별도의 "Website Builder 실행 함수"는 이 저장소에 따로 존재하지 않는다.
 */
export async function executeJob(jobId: string): Promise<void> {
  const job = await getAiJob(jobId);
  if (!job) {
    throw new Error(`AI Job을 찾을 수 없습니다: ${jobId}`);
  }

  if (job.type === "generate_planning") {
    await executePlanningJob(job);
    return;
  }

  const websiteOrder = await getWebsiteOrder(job.websiteOrderId);
  if (!websiteOrder) {
    throw new Error(`WebsiteOrder를 찾을 수 없습니다: ${job.websiteOrderId}`);
  }

  const client = await getClient(websiteOrder.clientId);

  const repoRoot = resolveRepoRoot();
  const cliEntry = path.join(repoRoot, "packages", "cli", "dist", "index.js");

  if (!fs.existsSync(cliEntry)) {
    throw new Error("packages/cli가 아직 빌드되지 않았습니다.");
  }

  // app/api/websites/route.ts의 필드 매핑과 동일한 원칙: WebsiteOrder/Client에 이미 있는
  // 값만 사용하고, 그 라우트 자신의 기본값(language "Korean", 미인식 siteType은 "website")도
  // 그대로 따른다.
  const name = websiteOrder.name;
  const businessType = websiteOrder.siteType;
  const audience = websiteOrder.requirements;
  const brand = client?.companyName || client?.contactName || name;
  const language = "Korean";
  const siteType = WEBSITE_TYPES.some((t) => t.id === websiteOrder.siteType)
    ? websiteOrder.siteType
    : "website";
  // websiteOrder.id 대신 job.id를 쓰는 이유: 하나의 WebsiteOrder가 여러 AiJob(재시도 등)을
  // 가질 수 있어(WebsiteOrderRecord.aiJobIds가 배열) 실행마다 고유 출력 폴더가 필요하다.
  const outDir = path.join(repoRoot, ".generated-websites", job.id);

  const args = [
    `"${cliEntry}"`,
    "website",
    "create",
    `--name "${name}"`,
    `--type "${businessType}"`,
    `--audience "${audience}"`,
    `--brand "${brand}"`,
    `--language "${language}"`,
    `--site-type "${siteType}"`,
    `--out "${outDir}"`,
  ];

  const result = await execute(`node ${args.join(" ")}`, { cwd: repoRoot, category: "development" });

  const simulatedContent = /No LLM provider connected/i.test(result.stdout);

  const website = await createWebsiteRecord({
    name,
    siteType,
    outDir,
    status: result.success ? "Success" : "Failed",
    simulatedContent,
    error: result.success ? undefined : result.error ?? (result.stderr.trim() || "생성 실패"),
  });

  await addWebsiteToOrder(websiteOrder.id, website.id);

  if (!result.success) {
    throw new Error(website.error ?? "Website Builder 실행 실패");
  }
}
