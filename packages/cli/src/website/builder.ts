import path from "path";
import type { DesignDocument } from "@cnbiz/design-system/types/design";
import { generateReactComponentTree } from "../generators/react/index.js";
import { FileSystem } from "../utils/filesystem.js";
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
  /**
   * 선택 — 주어지면 스캐폴딩 이후 기존 React Generator(generators/react)를 그대로 호출해
   * 페이지 TSX를 기록한다. 생략하면 기존 동작과 100% 동일하다.
   */
  designDocument?: DesignDocument;
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

  // React Generator 실행 경로(Glue) — 새 렌더링 로직 없음. 무엇을 그릴지(page.tsx)와 어디에 둘지
  // (page.route, 예: "app/about/page.tsx")는 전부 기존 generateReactComponentTree()가 이미
  // 계산해서 넘겨준다. 여기서는 그 둘을 기존 FileSystem.writeText()로 옮기기만 한다.
  // designDocument가 없으면 루프 자체가 실행되지 않아 기존 동작이 그대로 유지된다.
  const designFiles: string[] = [];

  if (options.designDocument) {
    for (const page of generateReactComponentTree(options.designDocument).pages) {
      const target = FileSystem.join(scaffolded.targetDir, page.route);
      await FileSystem.ensureDirectory(path.dirname(target));
      await FileSystem.writeText(target, page.tsx);
      designFiles.push(target);
    }
  }

  return {
    workflowResult,
    targetDir: scaffolded.targetDir,
    files: [...scaffolded.files, ...designFiles.filter((file) => !scaffolded.files.includes(file))],
    siteType,
    contentSimulated: scaffolded.contentSimulated
  };
}
