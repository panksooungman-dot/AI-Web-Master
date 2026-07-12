import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dev(tsx, src/generators) → ../templates = src/templates
// build(dist/generators)   → ../templates = dist/templates (build 스크립트가 복사)
const TEMPLATES_ROOT = path.join(__dirname, "..", "templates");

const NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".txt",
  ".yml",
  ".yaml",
  ".svg"
]);

export interface TemplateVariables {
  [key: string]: string;
}

export interface GenerateFromTemplateOptions {
  templateType: string;
  targetDir: string;
  variables: TemplateVariables;
}

/**
 * 생성 이름이 경로 순회(`..`, 절대경로 등)에 사용될 수 없도록 검증한다.
 */
export function assertValidName(name: string): void {
  if (!name || !NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid name "${name}". Use letters, numbers, "-", "_", "." only, starting with a letter or number.`
    );
  }
}

export function toPascalCase(value: string): string {
  return value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function getTemplateDir(templateType: string): string {
  return path.join(TEMPLATES_ROOT, templateType);
}

export async function templateExists(templateType: string): Promise<boolean> {
  return fs.pathExists(getTemplateDir(templateType));
}

function renderString(content: string, variables: TemplateVariables): string {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
  });
}

async function copyAndRenderDir(
  sourceDir: string,
  targetDir: string,
  variables: TemplateVariables
): Promise<string[]> {
  const createdFiles: string[] = [];
  await fs.ensureDir(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetName = renderString(entry.name, variables);
    const targetPath = path.join(targetDir, targetName);

    if (entry.isDirectory()) {
      const nested = await copyAndRenderDir(sourcePath, targetPath, variables);
      createdFiles.push(...nested);
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      const raw = await fs.readFile(sourcePath, "utf8");
      await fs.writeFile(targetPath, renderString(raw, variables), "utf8");
    } else {
      await fs.copy(sourcePath, targetPath);
    }

    createdFiles.push(targetPath);
  }

  return createdFiles;
}

/**
 * 템플릿 디렉터리(`templates/<templateType>`)를 대상 경로로 복사하며
 * 파일 내용과 파일명의 `{{variable}}` 플레이스홀더를 치환한다.
 * 대상 경로가 이미 존재하면 중복 생성을 막기 위해 오류를 던진다.
 */
export async function generateFromTemplate(
  options: GenerateFromTemplateOptions
): Promise<string[]> {
  const { templateType, targetDir, variables } = options;
  const templateDir = getTemplateDir(templateType);

  if (!(await fs.pathExists(templateDir))) {
    throw new Error(`Template not found: "${templateType}" (expected at ${templateDir})`);
  }

  if (await fs.pathExists(targetDir)) {
    throw new Error(`Target already exists: ${targetDir}`);
  }

  return copyAndRenderDir(templateDir, targetDir, variables);
}
