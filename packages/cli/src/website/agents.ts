import fs from "fs-extra";
import path from "path";
import { generateAgent } from "../generators/agent.js";

export interface WebsiteAgentSpec {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: string[];
}

/**
 * Website Builder 파이프라인의 8단계 Agent. `{{projectName}}`/`{{businessType}}`/
 * `{{targetAudience}}`/`{{brand}}`/`{{language}}`는 ai website create의 입력값이
 * Workflow Engine의 variables → Prompt Engine 변수로 그대로 전달되어 채워진다.
 * `{{input}}`은 Workflow Engine의 단계 간 체이닝으로 이전 단계의 출력을 그대로 받는다.
 */
export const WEBSITE_AGENT_SPECS: WebsiteAgentSpec[] = [
  {
    name: "business-analyst",
    description: "Analyzes the business and defines value proposition, differentiators, and goals.",
    systemPrompt: `# Business Analyst

You are the Business Analyst for a new website project.

## Project

- Name: {{projectName}}
- Business Type: {{businessType}}
- Target Audience: {{targetAudience}}
- Brand: {{brand}}
- Language: {{language}}

## Task

Produce a concise business analysis covering:

1. Value proposition (1-2 sentences)
2. Three key differentiators for {{businessType}} businesses targeting {{targetAudience}}
3. Three measurable goals the website should achieve

Keep the output short, concrete, and specific to {{brand}}.
`
  },
  {
    name: "site-planner",
    description: "Defines the site structure — pages, navigation, and purpose of each page.",
    systemPrompt: `# Site Planner

You are the Site Planner. Using the business analysis below, define the site's structure.

## Business Analysis

{{input}}

## Task

Propose:

1. A list of pages the site needs (e.g. Home, About, Services, Contact)
2. The primary navigation order
3. One sentence describing the purpose of each page

Keep it to a short, ordered list.
`
  },
  {
    name: "ui-designer",
    description: "Defines the visual direction — layout pattern, tone, and accessibility notes.",
    systemPrompt: `# UI Designer

You are the UI Designer. Using the site plan below, define the visual direction.

## Site Plan

{{input}}

## Task

Propose:

1. A layout pattern for the homepage (hero, sections, footer)
2. A tone (minimal, bold, playful, corporate, etc.) matching the "{{brand}}" brand
3. Any accessibility considerations

Keep it concise.
`
  },
  {
    name: "component-generator",
    description: "Lists the reusable UI components the Next.js site needs.",
    systemPrompt: `# Component Generator

You are the Component Generator. Using the UI direction below, list the reusable
components the Next.js site needs (e.g. Header, Footer, Hero, CTAButton, Card).

## UI Direction

{{input}}

## Task

Return a short list of components, one line each: \`ComponentName — purpose\`.
`
  },
  {
    name: "page-generator",
    description: "Writes homepage copy — hero headline and subheadline.",
    systemPrompt: `# Page Generator

You are the Page Generator. Write homepage copy for {{projectName}}, a
{{businessType}} business targeting {{targetAudience}}.

## Components Available

{{input}}

## Task

Write:

1. A hero headline (max 10 words)
2. A hero subheadline (max 25 words)

Return exactly two lines, headline first, no labels or numbering.
`
  },
  {
    name: "seo-generator",
    description: "Writes SEO metadata — page title and meta description.",
    systemPrompt: `# SEO Generator

You are the SEO Generator. Using everything defined so far, write SEO metadata
for {{projectName}}.

## Page Copy

{{input}}

## Task

Return exactly two lines, no labels or numbering:

1. Title (max 60 characters)
2. Meta description (max 155 characters)
`
  },
  {
    name: "qa",
    description: "Reviews the accumulated plan for consistency and gaps before the project is generated.",
    systemPrompt: `# QA

You are QA. Review the SEO metadata and overall plan for {{projectName}} and
flag anything missing, inconsistent, or too generic.

## SEO Metadata

{{input}}

## Task

Return a short pass/fail note: "PASS" or "PASS with notes: ...".
`
  },
  {
    name: "project-generator",
    description: "Final pipeline step — scaffolds the Next.js + Tailwind + TypeScript project via the filesystem tool.",
    tools: ["filesystem"],
    systemPrompt: `# Project Generator

You are the Project Generator, the final step of the Website Builder pipeline.
Your job is to scaffold the Next.js + Tailwind + TypeScript project for
{{projectName}} using the filesystem tool, based on all prior planning steps.

## QA Result

{{input}}

## Task

Confirm the project is ready to scaffold. The actual file generation is
performed by the Website Builder's Generator + Tool System integration
(packages/cli/src/website/scaffold.ts), not by this prompt.
`
  }
];

export const WEBSITE_PIPELINE_AGENTS = WEBSITE_AGENT_SPECS.map((spec) => spec.name);

/**
 * 8개 Agent가 없으면 Generator(generateAgent)로 생성하고 역할별 system.md/tools를
 * 채운다. 이미 존재하는 Agent는 건드리지 않는다 — 사용자가 커스터마이징했을 수 있다.
 */
export async function ensureWebsiteAgents(cwd: string): Promise<string[]> {
  const created: string[] = [];

  for (const spec of WEBSITE_AGENT_SPECS) {
    const dir = path.join(cwd, "agents", spec.name);

    if (await fs.pathExists(dir)) {
      continue;
    }

    await generateAgent({ name: spec.name, cwd, description: spec.description });
    await fs.writeFile(path.join(dir, "system.md"), spec.systemPrompt, "utf8");

    if (spec.tools && spec.tools.length > 0) {
      const agentJsonPath = path.join(dir, "agent.json");
      const agentJson = await fs.readJson(agentJsonPath);
      agentJson.tools = spec.tools;
      await fs.writeJson(agentJsonPath, agentJson, { spaces: 2 });
    }

    created.push(spec.name);
  }

  return created;
}
