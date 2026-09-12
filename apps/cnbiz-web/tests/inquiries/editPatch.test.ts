import { describe, expect, it } from "vitest";
import {
  BRAND_COLOR_SURVEY_KEY,
  DOMAIN_SURVEY_KEY,
  mergeSurveyPatch,
  mergeUploadedFiles,
  pickReferenceUrls,
} from "../../lib/inquiries/editPatch";

describe("pickReferenceUrls() — lib/inquiries/editPatch.ts", () => {
  it("문자열 배열이면 공백을 다듬고 빈 값은 제거한다", () => {
    expect(pickReferenceUrls({ referenceUrls: [" https://a.com ", "", "https://b.com"] })).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("배열이 아니면 undefined를 반환해 기존 값을 건드리지 않는다", () => {
    expect(pickReferenceUrls({})).toBeUndefined();
    expect(pickReferenceUrls({ referenceUrls: "https://a.com" })).toBeUndefined();
  });
});

describe("mergeSurveyPatch() — lib/inquiries/editPatch.ts", () => {
  it("brandColor/domain이 없으면 undefined를 반환한다(수정할 필드 없음으로 처리됨)", () => {
    expect(mergeSurveyPatch({ 기존질문: "답" }, {})).toBeUndefined();
  });

  it("brandColor/domain을 기존 survey에 병합하고 다른 키는 보존한다", () => {
    const result = mergeSurveyPatch({ 기존질문: "답" }, { brandColor: "#005BAC", domain: "cnbiz.kr" });
    expect(result).toEqual({ 기존질문: "답", [BRAND_COLOR_SURVEY_KEY]: "#005BAC", [DOMAIN_SURVEY_KEY]: "cnbiz.kr" });
  });

  it("빈 문자열을 보내면 해당 키를 제거한다", () => {
    const current = { [BRAND_COLOR_SURVEY_KEY]: "#005BAC", [DOMAIN_SURVEY_KEY]: "cnbiz.kr" };
    expect(mergeSurveyPatch(current, { brandColor: "" })).toEqual({ [DOMAIN_SURVEY_KEY]: "cnbiz.kr" });
  });

  it("current가 없어도(최초 survey) 정상적으로 새 객체를 만든다", () => {
    expect(mergeSurveyPatch(undefined, { domain: "cnbiz.kr" })).toEqual({ [DOMAIN_SURVEY_KEY]: "cnbiz.kr" });
  });
});

describe("mergeUploadedFiles() — lib/inquiries/editPatch.ts", () => {
  it("기존 첨부파일을 보존한 채 새 URL을 추가한다", () => {
    expect(mergeUploadedFiles(["https://a.com/existing.png"], { addUploadedFiles: ["https://a.com/logo.png"] })).toEqual(
      ["https://a.com/existing.png", "https://a.com/logo.png"],
    );
  });

  it("이미 있는 URL은 중복 추가하지 않는다", () => {
    expect(mergeUploadedFiles(["https://a.com/logo.png"], { addUploadedFiles: ["https://a.com/logo.png"] })).toEqual([
      "https://a.com/logo.png",
    ]);
  });

  it("addUploadedFiles가 없거나 빈 배열이면 undefined를 반환한다(기존 값 유지)", () => {
    expect(mergeUploadedFiles(["https://a.com/x.png"], {})).toBeUndefined();
    expect(mergeUploadedFiles(["https://a.com/x.png"], { addUploadedFiles: [] })).toBeUndefined();
  });

  it("기존 첨부파일이 없어도(최초 업로드) 정상적으로 새 배열을 만든다", () => {
    expect(mergeUploadedFiles(undefined, { addUploadedFiles: ["https://a.com/logo.png"] })).toEqual([
      "https://a.com/logo.png",
    ]);
  });
});
