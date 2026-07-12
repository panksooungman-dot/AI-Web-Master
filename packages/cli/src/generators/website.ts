import { generateFromTemplate } from "./template.js";

export interface GenerateWebsiteOptions {
  targetDir: string;
  variables: Record<string, string>;
}

export interface GenerateWebsiteResult {
  targetDir: string;
  files: string[];
}

/**
 * Next.js + Tailwind + TypeScript 스타터를 targetDir에 스캐폴딩한다.
 * Generator 엔진(generateFromTemplate)을 그대로 재사용한다 — agent/workflow/skill과
 * 동일한 템플릿 복사·변수 치환·중복 디렉터리 검증 로직을 공유한다.
 */
export async function generateWebsiteProject(options: GenerateWebsiteOptions): Promise<GenerateWebsiteResult> {
  const { targetDir, variables } = options;

  const files = await generateFromTemplate({
    templateType: "website",
    targetDir,
    variables
  });

  return { targetDir, files };
}
