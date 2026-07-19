import fs from "fs";
import path from "path";
import { execute } from "@/lib/commandEngine/engine";
import { resolveRepoRoot } from "@/lib/paths/repoRoot";
import { getAiJob } from "./registry";
import { getWebsiteOrder, addWebsiteToOrder } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import { createWebsiteRecord } from "@/lib/websites/registry";
import { WEBSITE_TYPES } from "@/lib/websites/types";

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
