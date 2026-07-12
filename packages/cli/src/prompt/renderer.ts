import type { PromptVariables } from "./types.js";

function getPath(source: unknown, keyPath: string): unknown {
  const segments = keyPath.split(".");
  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * system.md/user.md/examples.md의 `{{key}}`·`{{a.b.c}}`(dot-path) 플레이스홀더를 치환한다.
 * 값이 없으면 빈 문자열로 치환한다 — 코드 스캐폴딩용 generators/template.ts와 달리,
 * 자연어 프롬프트에 `{{...}}` 텍스트가 그대로 남아 LLM에 전달되는 것을 피한다.
 */
export function renderPromptTemplate(content: string, variables: PromptVariables): string {
  return content.replace(VARIABLE_PATTERN, (_match, keyPath: string) => {
    const value = getPath(variables, keyPath);
    return stringifyValue(value);
  });
}
