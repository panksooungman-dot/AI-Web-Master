import path from "path";
import { ensureWebsiteAgents } from "./agents.js";
import { ensureWebsiteWorkflow, WEBSITE_WORKFLOW_NAME } from "./workflow.js";
import { scaffoldWebsiteProject, resolveSiteType, slugify } from "./scaffold.js";
import { siteTypeLabel, type WebsiteInputs } from "./types.js";
import { runWorkflow } from "../workflow/runtime.js";
import type { WorkflowRunResult } from "../workflow/types.js";
import type { DesignDocument } from "@cnbiz/design-system/types/design";
import { applyDesignDocumentPages } from "./design-pages.js";

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
  /**
   * Design 체인이 만든 DesignDocument. 주어지면 스캐폴딩 직후 React Generator로 변환해
   * 해당 페이지들을 덮어쓴다. 생략하면 기존 동작(고정 템플릿) 그대로다.
   */
  designDocument?: DesignDocument;
}

export interface BuildWebsiteResult {
  workflowResult: WorkflowRunResult;
  targetDir: string;
  files: string[];
  siteType: WebsiteInputs["siteType"];
  contentSimulated: boolean;
  /** DesignDocument로부터 생성해 덮어쓴 페이지 경로. 미사용 시 빈 배열. */
  designPages: string[];
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
    return { workflowResult, targetDir: outDir, files: [], siteType, contentSimulated: true, designPages: [] };
  }

  const scaffolded = await scaffoldWebsiteProject(cwd, outDir, websiteInputs, providerId);

  // 4) Design 체인 산출물이 있으면 그 페이지들을 React Generator로 변환해 덮어쓴다.
  //    스캐폴딩을 대체하는 게 아니라 그 위에 얹는다 — DesignDocument가 다루지 않는 페이지·
  //    레이아웃·컴포넌트·설정은 그대로 남아야 사이트가 계속 빌드되기 때문이다.
  const designPages = options.designDocument
    ? (await applyDesignDocumentPages(scaffolded.targetDir, options.designDocument)).written
    : [];

  return {
    workflowResult,
    targetDir: scaffolded.targetDir,
    files: scaffolded.files,
    siteType,
    contentSimulated: scaffolded.contentSimulated,
    designPages
  };
}
