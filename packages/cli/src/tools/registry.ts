import type { Tool } from "./types.js";
import { filesystemTool } from "./filesystem.js";
import { terminalTool } from "./terminal.js";
import { gitTool } from "./git.js";
import { githubTool } from "./github.js";
import { browserTool } from "./browser.js";
import { httpTool } from "./http.js";

/** 새 도구 추가 시 이 registry에만 등록하면 된다. */
const TOOLS: Record<string, Tool> = {
  filesystem: filesystemTool,
  terminal: terminalTool,
  git: gitTool,
  github: githubTool,
  browser: browserTool,
  http: httpTool
};

export function listToolIds(): string[] {
  return Object.keys(TOOLS);
}

export function getTool(id: string): Tool | undefined {
  return TOOLS[id];
}
