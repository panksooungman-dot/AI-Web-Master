/**
 * 실제 LLM 응답에서 JSON 페이로드를 최대한 안정적으로 "찾아내는" 유틸리티 — malformed JSON을
 * 고쳐주는(관대한 파싱) 역할은 절대 하지 않는다. 추출된 문자열은 이후 호출자가 여전히
 * `JSON.parse()`로 엄격하게 검증하고, 실패하면 그대로 결정론적 폴백으로 넘어간다(all-or-nothing
 * 원칙 유지 — lib/estimates/generator.ts 등 6개 Generator가 공유하는 원칙과 동일).
 *
 * 기존에는 각 Generator가 `stripCodeFence()`를 파일마다 복붙해 두고 있었고, 그 정규식이
 * `^```(?:json)?...```$`로 응답 "전체"가 코드펜스 하나여야만 매칭됐다. 실제 모델 응답은 시스템
 * 프롬프트가 "no prose"를 명시해도 종종 앞뒤에 짧은 문장을 덧붙이거나("Here is the JSON:\n```json\n
 * {...}\n```"), 코드펜스 없이 순수 JSON 앞뒤에만 설명을 붙이는 경우가 있다 — 이런 경우 기존
 * 정규식은 매칭에 실패해 원문 그대로를 JSON.parse()에 넘기게 되고, 그러면 파싱이 실패해
 * 불필요하게 폴백된다(실제로는 JSON 자체는 유효했음에도).
 */
export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();

  // 1) 응답 전체가 코드펜스 하나로만 이루어진 가장 흔한 케이스.
  const wholeFence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (wholeFence) {
    return wholeFence[1];
  }

  // 2) 코드펜스는 있지만 앞/뒤에 설명 문장이 붙어있는 케이스 — 첫 번째 펜스 블록만 취한다.
  const anyFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (anyFence) {
    return anyFence[1];
  }

  // 3) 코드펜스 자체가 없는 케이스 — 첫 `{`부터 depth가 0으로 돌아오는 지점까지 균형 잡힌 객체를
  //    직접 스캔한다(문자열 리터럴 안의 `{`/`}`/이스케이프는 건너뛴다). 못 찾으면 원문을 그대로
  //    반환해 기존 동작(JSON.parse 실패 → 폴백)을 유지한다.
  const braceStart = trimmed.indexOf("{");
  if (braceStart === -1) {
    return trimmed;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = braceStart; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(braceStart, i + 1);
      }
    }
  }

  return trimmed;
}
