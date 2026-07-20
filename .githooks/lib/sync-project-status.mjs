#!/usr/bin/env node
// PROJECT_STATUS.md SSOT auto-sync.
//
// Invoked by .githooks/pre-commit. This script — not the AI — decides
// whether an update is even attempted: it inspects the staged diff itself
// (apps/** or packages/** present?) before ever calling the AI provider.
// Once it does call the provider, the AI's only job is "how should the
// whitelisted sections read now" — it returns a JSON patch, never full
// Markdown, and it never decides whether to run at all.
//
// State (the "have we already synced this exact diff" cache) lives under
// the git directory (.git/.ssot-cache/), never inside PROJECT_STATUS.md
// itself — the document stays free of implementation metadata.
//
// Exit 0 = safe to commit (nothing to do, or update applied + staged).
// Exit 1 = abort the commit (see stderr for the reason).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateProjectStatusUpdate, AIProviderError } from "./ai-provider.mjs";

const STATUS_FILE = "PROJECT_STATUS.md";
const SUBSTANTIVE_PREFIXES = ["apps/", "packages/"];

// heading text (exact, as it appears in PROJECT_STATUS.md) <- JSON key the AI must use
const SECTION_MAP = [
  { key: "전체 진행률", heading: "## 전체 진행률", mode: "replace" },
  { key: "완료된 기능", heading: "## ✅ 완료된 기능", mode: "replace" },
  { key: "진행 중인 기능", heading: "## 🚧 진행 중인 기능 (일부 구현)", mode: "replace" },
  { key: "예정된 기능", heading: "## ⏳ 예정된 기능 (미구현)", mode: "replace" },
  { key: "최근 완료 작업", heading: "## 최근 완료 작업", mode: "prepend" },
  { key: "다음 작업 우선순위", heading: "## 다음 작업 우선순위", mode: "replace" },
];
const ALLOWED_KEYS = new Set(SECTION_MAP.map((s) => s.key));

class SyncError extends Error {}

function git(args) {
  return execFileSync("git", args, { encoding: "utf-8" }).trim();
}

function gitAllowFail(args) {
  try {
    return execFileSync("git", args, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function log(msg) {
  process.stderr.write(`[ssot-sync] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Step 1: does this commit even touch apps/** or packages/**?
// This is the ONLY gate for "should we call the AI at all" — decided here,
// in code, from the actual staged diff. The AI is never asked this question.
// ---------------------------------------------------------------------------
function getSubstantiveStagedFiles() {
  const staged = gitAllowFail(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  if (!staged) return [];
  return staged
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f && SUBSTANTIVE_PREFIXES.some((p) => f.startsWith(p)));
}

// ---------------------------------------------------------------------------
// Idempotency cache — lives under the git dir, never in PROJECT_STATUS.md.
// ---------------------------------------------------------------------------
function getCachePath() {
  const gitDir = git(["rev-parse", "--absolute-git-dir"]);
  return path.join(gitDir, ".ssot-cache", "last-sync.json");
}

function readCache() {
  const cachePath = getCachePath();
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return null; // corrupt/partial cache is treated as "no cache", never fatal
  }
}

function writeCache(entry) {
  const cachePath = getCachePath();
  mkdirSync(path.dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(entry, null, 2), "utf-8");
}

function computeDiffHash() {
  const patch = gitAllowFail(["diff", "--cached", "--", "apps", "packages"]);
  return createHash("sha256").update(patch, "utf-8").digest("hex");
}

// ---------------------------------------------------------------------------
// Section splicing
// ---------------------------------------------------------------------------
function findHeadingIndex(lines, heading) {
  return lines.findIndex((l) => l.trim() === heading.trim());
}

function findSectionEnd(lines, startIdx) {
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return i;
  }
  return lines.length;
}

function replaceSection(fileText, heading, newBody) {
  const lines = fileText.split("\n");
  const headingIdx = findHeadingIndex(lines, heading);
  if (headingIdx === -1) {
    throw new SyncError(`PROJECT_STATUS.md에서 섹션을 찾을 수 없습니다: "${heading}"`);
  }
  const endIdx = findSectionEnd(lines, headingIdx);
  const before = lines.slice(0, headingIdx + 1);
  const after = lines.slice(endIdx);
  const body = newBody.trim().split("\n");
  return [...before, "", ...body, "", ...after].join("\n");
}

function prependToSection(fileText, heading, newBulletText) {
  const lines = fileText.split("\n");
  const headingIdx = findHeadingIndex(lines, heading);
  if (headingIdx === -1) {
    throw new SyncError(`PROJECT_STATUS.md에서 섹션을 찾을 수 없습니다: "${heading}"`);
  }
  let bodyStart = headingIdx + 1;
  while (bodyStart < lines.length && lines[bodyStart].trim() === "") bodyStart++;
  const before = lines.slice(0, bodyStart);
  const after = lines.slice(bodyStart);
  const newLines = newBulletText.trim().split("\n");
  return [...before, ...newLines, ...after].join("\n");
}

function extractSectionBody(fileText, heading) {
  const lines = fileText.split("\n");
  const headingIdx = findHeadingIndex(lines, heading);
  if (headingIdx === -1) return "";
  const endIdx = findSectionEnd(lines, headingIdx);
  return lines
    .slice(headingIdx + 1, endIdx)
    .join("\n")
    .trim();
}

function updateHeaderLine(fileText) {
  const today = new Date().toISOString().slice(0, 10);
  const parentCommit = gitAllowFail(["rev-parse", "--short", "HEAD"]) || "(초기 커밋)";
  const lines = fileText.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("> 최종 분석:"));
  if (idx === -1) return fileText; // header format changed upstream; leave as-is, not fatal
  lines[idx] =
    `> 최종 분석: ${today} (Claude Code, apps/**·packages/** 변경 자동 반영 — 커밋 \`${parentCommit}\` 기준)`;
  return lines.join("\n");
}

// All top-level "## " heading lines in the doc — used as a structural sanity
// check after patching (every heading that existed before must still exist).
function allHeadings(fileText) {
  return fileText
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.trim());
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------
const DIFF_CHAR_LIMIT = 8000;

function buildPrompt(currentDoc, changedFiles) {
  const stat = gitAllowFail(["diff", "--cached", "--stat", "--", "apps", "packages"]);
  let patch = gitAllowFail(["diff", "--cached", "--", "apps", "packages"]);
  let truncatedNote = "";
  if (patch.length > DIFF_CHAR_LIMIT) {
    patch = patch.slice(0, DIFF_CHAR_LIMIT);
    truncatedNote = "\n\n(diff가 길어 일부만 표시됨 — 위 파일 목록/통계를 함께 참고)";
  }
  const today = new Date().toISOString().slice(0, 10);

  const currentSections = SECTION_MAP.map(
    ({ key, heading }) => `### ${key}\n${extractSectionBody(currentDoc, heading) || "(비어있음)"}`
  ).join("\n\n");

  return `당신은 저장소의 PROJECT_STATUS.md(SSOT 문서)를 최신 상태로 유지하는 역할만 수행합니다.
이번 커밋에 스테이징된 apps/**, packages/** 변경사항을 근거로, 필요한 섹션만 갱신하십시오.
오늘 날짜: ${today}

## 변경된 파일
${changedFiles.join("\n")}

## git diff --stat
${stat}

## git diff (patch)
${patch}${truncatedNote}

## 현재 PROJECT_STATUS.md의 각 섹션 내용 (컨텍스트용)
${currentSections}

## 지시사항
- 위 diff에 실제로 드러난 변경사항만 반영하십시오. 추측하거나 지어내지 마십시오.
- 반드시 아래 6개 키만 사용 가능한 JSON 객체 하나만 응답하십시오. 그 외 설명, 코드펜스, 마크다운 텍스트를 절대 포함하지 마십시오.
  ["전체 진행률","완료된 기능","진행 중인 기능","예정된 기능","최근 완료 작업","다음 작업 우선순위"]
- 실제로 갱신이 필요한 섹션의 키만 포함하십시오. 값은 해당 섹션의 "## " heading을 포함하지 않은 본문 Markdown입니다.
- apps/**, packages/** 변경이 실제로 있으므로 최소 하나 이상의 섹션(보통 "전체 진행률"과 "완료된 기능")은 반드시 갱신해야 합니다. 완전히 빈 JSON({}) 은 허용되지 않습니다.
- "최근 완료 작업"은 기존 항목을 절대 반복하지 말고, 이번 diff에 대한 새 bullet 1~2개만 작성하십시오(스크립트가 목록 맨 위에 자동으로 추가합니다). 형식: "- **요약**(${today}) — 설명"
- 응답은 순수 JSON이어야 합니다 (예: {"전체 진행률": "...", "완료된 기능": "..."}).`;
}

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------
function parseAndValidateResponse(rawText) {
  let text = rawText.trim();
  // tolerate a stray ```json ... ``` fence even though we asked for bare JSON
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) text = fenceMatch[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new SyncError(`AI 응답이 유효한 JSON이 아닙니다: ${err.message}\n---응답 원문(앞부분)---\n${text.slice(0, 500)}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SyncError("AI 응답이 JSON 객체가 아닙니다.");
  }

  // Accept either {"sections": {...}} or a flat {"<섹션명>": "...", ...} object —
  // both are unambiguous once we intersect keys against the whitelist, and
  // being liberal here avoids failing a perfectly good update over pure
  // response-shape variance.
  const sections =
    "sections" in parsed && typeof parsed.sections === "object" && parsed.sections !== null
      ? parsed.sections
      : parsed;
  const providedKeys = Object.keys(sections).filter((k) => {
    const v = sections[k];
    return typeof v === "string" && v.trim().length > 0;
  });

  const unknownKeys = providedKeys.filter((k) => !ALLOWED_KEYS.has(k));
  if (unknownKeys.length > 0) {
    log(`화이트리스트에 없는 섹션 키 무시: ${unknownKeys.join(", ")}`);
  }

  const validKeys = providedKeys.filter((k) => ALLOWED_KEYS.has(k));
  if (validKeys.length === 0) {
    throw new SyncError(
      "AI가 반환한 sections에 화이트리스트 섹션 갱신 내용이 하나도 없습니다 (빈 응답은 실패로 처리)."
    );
  }

  const result = {};
  for (const k of validKeys) result[k] = sections[k].trim();
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const changedFiles = getSubstantiveStagedFiles();
  if (changedFiles.length === 0) {
    // Not our concern — docs-only / README-only / hook-only commits, etc.
    // No AI call, no file touched, no overhead beyond this process start.
    return 0;
  }

  const diffHash = computeDiffHash();
  const cache = readCache();
  if (cache && cache.diffHash === diffHash) {
    log(`이미 반영된 변경분입니다 (diffHash 일치). AI 재호출 없이 재사용합니다.`);
    // Defensive re-stage in case something unstaged it between attempts.
    gitAllowFail(["add", "--", STATUS_FILE]);
    return 0;
  }

  if (!existsSync(STATUS_FILE)) {
    throw new SyncError(`${STATUS_FILE} 파일이 존재하지 않습니다.`);
  }

  // Base off the INDEX version (respects any manual staged edits already made).
  const stagedBlob = gitAllowFail(["show", `:${STATUS_FILE}`]);
  const currentDoc = stagedBlob || readFileSync(STATUS_FILE, "utf-8");
  const originalHeadings = allHeadings(currentDoc);

  log(`apps/**, packages/** 변경 감지 (${changedFiles.length}개 파일). AI로 PROJECT_STATUS.md 갱신을 요청합니다...`);

  const prompt = buildPrompt(currentDoc, changedFiles);
  const rawResponse = await generateProjectStatusUpdate(prompt);
  if (process.env.SSOT_SYNC_DEBUG) {
    log(`--- RAW AI RESPONSE (debug) ---\n${rawResponse}\n--- END RAW AI RESPONSE ---`);
  }
  const sections = parseAndValidateResponse(rawResponse);

  let newDoc = currentDoc;
  for (const { key, heading, mode } of SECTION_MAP) {
    if (!(key in sections)) continue;
    newDoc =
      mode === "prepend"
        ? prependToSection(newDoc, heading, sections[key])
        : replaceSection(newDoc, heading, sections[key]);
  }
  newDoc = updateHeaderLine(newDoc);

  // Structural sanity checks before writing anything to disk.
  const newHeadings = allHeadings(newDoc);
  const missingHeadings = originalHeadings.filter((h) => !newHeadings.includes(h));
  if (missingHeadings.length > 0) {
    throw new SyncError(`패치 후 일부 섹션 heading이 사라졌습니다: ${missingHeadings.join(", ")}`);
  }
  if (newDoc.length < currentDoc.length * 0.5) {
    throw new SyncError("패치 결과 파일 길이가 절반 이하로 줄어들어 안전을 위해 중단합니다.");
  }

  writeFileSync(STATUS_FILE, newDoc, "utf-8");
  git(["add", "--", STATUS_FILE]);
  writeCache({ diffHash, headCommit: gitAllowFail(["rev-parse", "HEAD"]), updatedAt: new Date().toISOString() });

  log(`PROJECT_STATUS.md 갱신 완료 (섹션: ${Object.keys(sections).join(", ")}). git add 완료.`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    if (err instanceof AIProviderError) {
      log(`AI 호출 실패 [${err.code}]: ${err.message}`);
    } else if (err instanceof SyncError) {
      log(`갱신 검증 실패: ${err.message}`);
    } else {
      log(`예상하지 못한 오류: ${err.stack || err.message}`);
    }
    log("PROJECT_STATUS.md는 변경되지 않았습니다. 커밋을 중단합니다.");
    log("건너뛰려면: git commit --no-verify (이 경우 PROJECT_STATUS.md는 수동으로 갱신해야 합니다)");
    process.exit(1);
  });
