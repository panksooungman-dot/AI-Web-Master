import { PromptError, type PromptMetadata } from "./types.js";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

const DEFAULT_METADATA: PromptMetadata = { version: "1.0.0", author: "AI Business OS" };

/**
 * prompt.json을 검증한다. 파일이 없으면(raw === null) 기본값을 사용한다 — prompt.json은
 * 선택 파일이므로 없다고 오류를 내지 않는다. 있으면 version(semver)·author를 검증한다.
 */
export function validatePromptMetadata(raw: unknown, sourceHint: string): PromptMetadata {
  if (raw === null || raw === undefined) {
    return DEFAULT_METADATA;
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new PromptError("INVALID_METADATA", `Invalid prompt.json at ${sourceHint}: not a JSON object`);
  }

  const data = raw as Record<string, unknown>;
  const version =
    typeof data.version === "string" && data.version.trim().length > 0 ? data.version : DEFAULT_METADATA.version;
  const author =
    typeof data.author === "string" && data.author.trim().length > 0 ? data.author : DEFAULT_METADATA.author;

  if (!VERSION_PATTERN.test(version)) {
    throw new PromptError(
      "INVALID_VERSION",
      `Invalid prompt.json at ${sourceHint}: version "${version}" must be semver (x.y.z)`
    );
  }

  return { version, author };
}
