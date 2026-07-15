/**
 * `{{key}}` 치환 regex — packages/cli/src/prompt/renderer.ts의 VARIABLE_PATTERN과
 * 동일한 형태로 의도적으로 유지한다(경계 너머 재사용 대신 작은 순수 유틸을 복제하는
 * 이 저장소의 관례). 이 파일은 Prompt Library의 **미리보기 전용**이며, 실제 실행은
 * lib/prompts/executor.ts → taskQueue 경로를 그대로 사용한다(수정하지 않음).
 */
const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function renderPromptContent(content: string, variables: Record<string, string>): string {
  return content.replace(VARIABLE_PATTERN, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : "";
  });
}
