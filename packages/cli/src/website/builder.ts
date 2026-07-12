import path from "path";
import { ensureWebsiteAgents } from "./agents.js";
import { ensureWebsiteWorkflow, WEBSITE_WORKFLOW_NAME } from "./workflow.js";
import { scaffoldWebsiteProject, slugify, type WebsiteInputs } from "./scaffold.js";
import { runWorkflow } from "../workflow/runtime.js";
import type { WorkflowRunResult } from "../workflow/types.js";

export interface BuildWebsiteOptions {
  cwd?: string;
  outDir?: string;
  providerId?: string;
  inputs: WebsiteInputs;
}

export interface BuildWebsiteResult {
  workflowResult: WorkflowRunResult;
  targetDir: string;
  files: string[];
}

/**
 * `ai website create` 오케스트레이션. 새로운 실행 로직을 만들지 않고 기존 아키텍처를
 * 조합만 한다(요구사항: 재사용, 중복 없음):
 * 1) Generator로 8개 Agent·website-builder Workflow를 준비(이미 있으면 그대로 재사용)
 * 2) Workflow Engine(runWorkflow)으로 8단계 파이프라인을 실행 — Prompt Engine·
 *    Provider Layer·Memory Manager는 Workflow/Agent Runtime 내부에서 이미 재사용됨
 * 3) Memory Manager로 결과를 읽고 Generator + Tool System으로 실제 Next.js 프로젝트를 생성
 */
export async function buildWebsite(options: BuildWebsiteOptions): Promise<BuildWebsiteResult> {
  const { cwd = process.cwd(), providerId, inputs } = options;
  const outDir = options.outDir ?? path.join(cwd, slugify(inputs.projectName));

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
      language: inputs.language
    }
  });

  if (!workflowResult.success) {
    return { workflowResult, targetDir: outDir, files: [] };
  }

  const { targetDir, files } = await scaffoldWebsiteProject(cwd, outDir, inputs);

  return { workflowResult, targetDir, files };
}
