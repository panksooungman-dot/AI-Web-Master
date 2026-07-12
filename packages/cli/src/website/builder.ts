import path from "path";
import { ensureWebsiteAgents } from "./agents.js";
import { ensureWebsiteWorkflow, WEBSITE_WORKFLOW_NAME } from "./workflow.js";
import { scaffoldWebsiteProject, resolveSiteType, slugify } from "./scaffold.js";
import { siteTypeLabel, type WebsiteInputs } from "./types.js";
import { runWorkflow } from "../workflow/runtime.js";
import type { WorkflowRunResult } from "../workflow/types.js";

export interface WebsiteRawInputs {
  projectName: string;
  businessType: string;
  targetAudience: string;
  brand: string;
  language: string;
}

export interface BuildWebsiteOptions {
  cwd?: string;
  outDir?: string;
  providerId?: string;
  /** `--site-type` 원본 값. 목록에 없거나 생략되면 "website"(범용)로 폴백한다. */
  siteType?: string;
  inputs: WebsiteRawInputs;
}

export interface BuildWebsiteResult {
  workflowResult: WorkflowRunResult;
  targetDir: string;
  files: string[];
  siteType: WebsiteInputs["siteType"];
  contentSimulated: boolean;
}

/**
 * `ai website create` 오케스트레이션. 새로운 실행 로직을 만들지 않고 기존 아키텍처를
 * 조합만 한다(요구사항: 재사용, 중복 없음):
 * 1) Generator로 8개 Agent·website-builder Workflow를 준비(이미 있으면 그대로 재사용)
 * 2) Workflow Engine(runWorkflow)으로 8단계 계획 파이프라인을 실행 — Prompt Engine·
 *    Provider Layer·Memory Manager는 Workflow/Agent Runtime 내부에서 이미 재사용됨
 * 3) Content Engine(Provider Layer 재사용)으로 페이지별 콘텐츠를 생성하고,
 *    Generator + Tool System으로 실제 Next.js 프로젝트를 생성
 */
export async function buildWebsite(options: BuildWebsiteOptions): Promise<BuildWebsiteResult> {
  const { cwd = process.cwd(), providerId, inputs } = options;
  const projectSlug = slugify(inputs.projectName);
  const siteType = resolveSiteType(options.siteType);
  const outDir = options.outDir ?? path.join(cwd, projectSlug);

  const websiteInputs: WebsiteInputs = { ...inputs, projectSlug, siteType };

  await ensureWebsiteAgents(cwd);
  await ensureWebsiteWorkflow(cwd);

  const workflowResult = await runWorkflow(WEBSITE_WORKFLOW_NAME, {
    cwd,
    providerId,
    variables: {
      projectName: inputs.projectName,
      businessType: inputs.businessType,
      targetAudience: inputs.targetAudience,
      brand: inputs.brand,
      language: inputs.language,
      siteType,
      siteTypeLabel: siteTypeLabel(siteType)
    }
  });

  if (!workflowResult.success) {
    return { workflowResult, targetDir: outDir, files: [], siteType, contentSimulated: true };
  }

  const scaffolded = await scaffoldWebsiteProject(cwd, outDir, websiteInputs, providerId);

  return {
    workflowResult,
    targetDir: scaffolded.targetDir,
    files: scaffolded.files,
    siteType,
    contentSimulated: scaffolded.contentSimulated
  };
}
