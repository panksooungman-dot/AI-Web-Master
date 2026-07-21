import fs from "fs";
import path from "path";

export interface CiWorkflowSummary {
  file: string;
  name: string | null;
  triggers: string[];
}

const TRIGGER_KEYS = ["push", "pull_request", "schedule", "workflow_dispatch", "release"];

/** 최상위 `on:` 블록에 속한 자식 키만 추출한다(예: `jobs:\n  release:`처럼 다른 블록의
 * 동일 들여쓰기 키를 트리거로 오인하지 않도록 `on:` 블록 범위로 한정). */
function extractOnBlockTriggers(raw: string): string[] {
  const lines = raw.split("\n");
  const onLineIndex = lines.findIndex((line) => /^on:/.test(line));
  if (onLineIndex === -1) return [];

  const triggers: string[] = [];
  for (let i = onLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) break; // 들여쓰기 없는 다음 최상위 키를 만나면 on: 블록 종료

    const childMatch = line.match(/^\s{2}(\w+):/);
    if (childMatch && TRIGGER_KEYS.includes(childMatch[1])) {
      triggers.push(childMatch[1]);
    }
  }
  return triggers;
}

/** .github/workflows/*.yml을 정적으로 읽어 name·트리거만 뽑아낸다. YAML 파서·새 실행
 * 로직 없음 — 순수 텍스트 스캔(이미 존재하는 CI 정의 파일을 그대로 나열하기 위함). */
export function readCiWorkflows(repoRoot: string): CiWorkflowSummary[] {
  const dir = path.join(repoRoot, ".github", "workflows");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const nameMatch = raw.match(/^name:\s*(.+)$/m);

      return {
        file,
        name: nameMatch ? nameMatch[1].trim() : null,
        triggers: extractOnBlockTriggers(raw),
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}
