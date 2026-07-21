import type { AIAnalysisInput, MissingItem } from "./types";

/**
 * Completeness — 100점 만점, 10개 필수 항목 × 10점의 순수 규칙 기반(결정론적) 계산이다.
 * AI 호출과 무관하게 항상 같은 입력에 같은 결과를 내며, Provider 미설정 여부와 무관하게 항상
 * 신뢰 가능하다(analysis.ts의 detectedBusinessType/summary 등 AI 판단 영역과 의도적으로 분리).
 *
 * `survey`는 챗봇이 자유 형식(Record<string, unknown>, 질문 문구가 고정되지 않음)으로 보내므로
 * "브랜드컬러"/"참고사이트"/"도메인" 같은 항목은 키·값에 대한 느슨한 패턴 매칭으로 존재 여부를
 * 추정한다 — 완벽한 감지가 아니라 최선의 추정이며, 실제 챗봇의 설문 키 명명 규칙이 확정되면
 * 이 패턴만 좁혀서 정교화하면 된다(CHECKLIST 구조 자체는 바뀔 필요 없음).
 */

const LOGO_PATTERN = /logo/i;
const URL_PATTERN = /https?:\/\/\S+/i;
const COLOR_PATTERN = /브랜드|컬러|색상|color/i;
const DOMAIN_PATTERN = /도메인|domain/i;
const REFERENCE_PATTERN = /참고|레퍼런스|reference/i;

function surveyMatches(survey: Record<string, unknown> | undefined, pattern: RegExp): boolean {
  if (!survey) return false;
  return Object.entries(survey).some(
    ([key, value]) => pattern.test(key) || (typeof value === "string" && pattern.test(value))
  );
}

interface ChecklistItem {
  id: string;
  title: string;
  reason: string;
  check: (input: AIAnalysisInput) => boolean;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "company_name",
    title: "회사명",
    reason: "주요 화면에 표기할 회사/브랜드명이 필요합니다.",
    check: (input) => Boolean(input.companyName?.trim()),
  },
  {
    id: "contact_name",
    title: "담당자명",
    reason: "확인·연락을 위한 담당자 정보가 필요합니다.",
    check: (input) => Boolean(input.contactName?.trim()),
  },
  {
    id: "contact_info",
    title: "연락처",
    reason: "고객 문의 대응을 위한 이메일 또는 전화번호가 필요합니다.",
    check: (input) => Boolean(input.email?.trim() || input.phone?.trim()),
  },
  {
    id: "service_description",
    title: "서비스 설명",
    reason: "홈페이지 콘텐츠 작성을 위해 제공 서비스에 대한 설명이 필요합니다.",
    check: (input) => (input.requirements ?? "").trim().length >= 10,
  },
  {
    id: "company_intro",
    title: "회사소개/업종",
    reason: "회사소개 섹션 작성을 위한 업종 정보가 필요합니다.",
    check: (input) => Boolean(input.industry?.trim()),
  },
  {
    id: "company_logo",
    title: "회사 로고",
    reason: "브랜드 아이덴티티 제작을 위해 로고 파일이 필요합니다.",
    check: (input) => (input.uploadedFiles ?? []).some((file) => LOGO_PATTERN.test(file)),
  },
  {
    id: "service_images",
    title: "서비스/제품 사진",
    reason: "메인·서비스 페이지 제작을 위한 사진 자료가 필요합니다.",
    check: (input) => (input.uploadedFiles ?? []).some((file) => !LOGO_PATTERN.test(file)),
  },
  {
    id: "reference_site",
    title: "참고 사이트",
    reason: "원하는 디자인 방향을 파악하기 위한 참고 사이트가 필요합니다.",
    check: (input) => surveyMatches(input.survey, REFERENCE_PATTERN) || surveyMatches(input.survey, URL_PATTERN),
  },
  {
    id: "brand_color",
    title: "브랜드 컬러",
    reason: "디자인 시스템 색상 설정을 위해 브랜드 컬러 정보가 필요합니다.",
    check: (input) => surveyMatches(input.survey, COLOR_PATTERN),
  },
  {
    id: "domain",
    title: "도메인",
    reason: "배포·연동을 위한 도메인 정보가 필요합니다.",
    check: (input) => surveyMatches(input.survey, DOMAIN_PATTERN),
  },
];

export interface CompletenessResult {
  completeness: number;
  missingItems: MissingItem[];
}

export function computeCompleteness(input: AIAnalysisInput): CompletenessResult {
  const missingItems: MissingItem[] = [];
  let presentCount = 0;

  for (const item of CHECKLIST) {
    if (item.check(input)) {
      presentCount += 1;
    } else {
      missingItems.push({ id: item.id, title: item.title, required: true, reason: item.reason });
    }
  }

  return {
    completeness: Math.round((presentCount / CHECKLIST.length) * 100),
    missingItems,
  };
}
