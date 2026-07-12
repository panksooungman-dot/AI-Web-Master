import { ToolError, type Tool } from "./types.js";
import { fetchWithTimeout } from "./http.js";

export interface GithubInput {
  action: "repo" | "issues" | "pulls";
  owner: string;
  repo: string;
}

const API_BASE = "https://api.github.com";

function isGithubInput(input: unknown): input is GithubInput {
  const value = input as Record<string, unknown>;
  return (
    typeof input === "object" &&
    input !== null &&
    typeof value.owner === "string" &&
    typeof value.repo === "string" &&
    typeof value.action === "string" &&
    ["repo", "issues", "pulls"].includes(value.action as string)
  );
}

/** 공개 저장소는 토큰 없이도 동작한다(낮은 rate limit). GITHUB_TOKEN이 있으면 사용한다. */
export const githubTool: Tool = {
  id: "github",
  name: "GitHub",
  description: 'Query the GitHub REST API, e.g. { action: "repo", owner: "octocat", repo: "Hello-World" }.',

  async execute(input: unknown): Promise<unknown> {
    if (!isGithubInput(input)) {
      throw new ToolError("INVALID_INPUT", "github", 'Expected { action: "repo"|"issues"|"pulls", owner, repo }');
    }

    const path = input.action === "repo" ? "" : `/${input.action}`;
    const url = `${API_BASE}/repos/${input.owner}/${input.repo}${path}`;

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    try {
      const response = await fetchWithTimeout("github", url, { headers });
      const text = await response.text();

      if (!response.ok) {
        throw new ToolError("EXECUTION_FAILED", "github", `GitHub API returned ${response.status}: ${text.slice(0, 300)}`);
      }

      return JSON.parse(text);
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError("EXECUTION_FAILED", "github", error instanceof Error ? error.message : String(error));
    }
  }
};
