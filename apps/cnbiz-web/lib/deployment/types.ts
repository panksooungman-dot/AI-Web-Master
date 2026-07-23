import type { GitHubRepository } from "@/lib/github/types";
import type { VercelDeployment } from "@/lib/vercel/types";
import type { DeploymentStatus } from "@/lib/websites/registry";

export interface DeploymentPipelineInput {
  /** lib/websites/registry.ts의 WebsiteRecord.id — 결과가 저장될 대상. */
  websiteId: string;
  /** Website Builder 산출물이 실제로 있는 로컬 경로(WebsiteRecord.outDir과 동일). */
  outDir: string;
  /** 저장소/프로젝트 이름의 기반이 되는 사람이 읽을 수 있는 이름(예: siteType). 내부에서
   *  슬러그화 + websiteId 접미사를 붙여 고유하게 만든다. */
  repoBaseName: string;
}

export interface DeploymentStepLog {
  step: string;
  success: boolean;
  message: string;
  at: string;
}

export interface DeploymentPipelineResult {
  success: boolean;
  status: DeploymentStatus;
  logs: DeploymentStepLog[];
  repository: GitHubRepository | null;
  deployment: VercelDeployment | null;
  error?: string;
  /** 실패 시 롤백을 시도했는지와 그 결과. 성공 시 항상 false(롤백할 것이 없었음을 의미). */
  rolledBack: boolean;
}
