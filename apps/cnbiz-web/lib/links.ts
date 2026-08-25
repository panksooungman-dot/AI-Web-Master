/**
 * cnbiz.ai.kr is CNBIZ's separate AI website builder product. cnbiz.kr (this
 * site) leads with its own consulting/development inquiry flow (/contact) —
 * this URL is only surfaced as a secondary, opt-in link for visitors who
 * specifically want a fast AI-generated site, not as the site's primary CTA.
 */
export const CNBIZ_AI_URL = process.env.NEXT_PUBLIC_CNBIZ_AI_URL || "https://cnbiz.ai.kr";

/** cnbiz.ai.kr's quote/estimate flow — used by the shared CTASection's primary button. */
export const CNBIZ_QUOTE_URL = process.env.NEXT_PUBLIC_CNBIZ_QUOTE_URL || "https://cnbiz.ai.kr/quote";
