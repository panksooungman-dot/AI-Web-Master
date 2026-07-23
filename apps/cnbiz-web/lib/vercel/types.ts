export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface VercelProject {
  id: string;
  name: string;
}

export interface VercelDeployment {
  id: string;
  /** 항상 "https://"로 시작하는 완전한 URL(Vercel API는 호스트명만 반환한다). */
  url: string;
  readyState: string;
}

export interface VercelOperationResult {
  success: boolean;
  error?: string;
}
