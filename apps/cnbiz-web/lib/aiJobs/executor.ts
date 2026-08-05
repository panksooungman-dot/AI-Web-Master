import { execute } from "@/lib/commandEngine/engine";
import { resolveCliEntry, resolveCliWorkingDir, resolveGeneratedWebsitesDir } from "@/lib/paths/repoRoot";
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

  const cliEntry = resolveCliEntry();

  if (!cliEntry) {
    throw new Error("packages/cli가 아직 빌드되지 않았습니다.");
  }

  // app/api/websites/route.ts의 필드 매핑과 동일한 원칙: WebsiteOrder/Client에 이미 있는
  // 값만 사용하고, 그 라우트 자신의 기본값(language "Korean", 미인식 siteType은 "website")도
  // 그대로 따른다. websiteOrder.name/siteType/requirements는 TS 타입상 string(필수)이지만,
  // 공개 /contact 폼처럼 구조화된 siteType·상세 requirements를 받지 않는 접수 경로도 있어
  // 실제로는 빈 문자열일 수 있다 — packages/cli의 website create는 이 값들이 비어 있으면
  // 즉시 거부한다("Project Name, Business Type, Target Audience, Brand, and Language are all
  // required.", 프로덕션 로그로 확인, 2026-08-05). 빈 값을 그대로 흘려보내지 않고 항상 유효한
  // 기본값으로 채운다.
  const siteType = WEBSITE_TYPES.some((t) => t.id === websiteOrder.siteType)
    ? websiteOrder.siteType
    : "website";
  const siteTypeLabel = WEBSITE_TYPES.find((t) => t.id === siteType)?.label ?? "범용 웹사이트";

  const name = websiteOrder.name.trim() || client?.companyName || client?.contactName || "웹사이트 프로젝트";
  const businessType = websiteOrder.siteType.trim() || siteTypeLabel;
  const audience = websiteOrder.requirements.trim() || "일반 고객";
  const brand = client?.companyName || client?.contactName || name;
  const language = "Korean";
  // websiteOrder.id 대신 job.id를 쓰는 이유: 하나의 WebsiteOrder가 여러 AiJob(재시도 등)을
  // 가질 수 있어(WebsiteOrderRecord.aiJobIds가 배열) 실행마다 고유 출력 폴더가 필요하다.
  const outDir = resolveGeneratedWebsitesDir(job.id);

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

  const result = await execute(`node ${args.join(" ")}`, { cwd: resolveCliWorkingDir(), category: "development" });

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
