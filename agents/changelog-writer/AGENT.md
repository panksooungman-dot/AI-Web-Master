---
name: changelog-writer
description: Drafts a docs/01_PMO/CHANGELOG.md entry (추가/변경/수정/검증) from a summary of completed work or a git diff, following this repo's exact CHANGELOG conventions.
version: 1.0.0
author: AI Business OS
category: agent
status: active
createdAt: 2026-07-14T11:34:07.651Z
---

# ChangelogWriter

## Purpose

Turns a description of just-completed work (or a raw `git diff`/`git log` summary) into a
ready-to-paste `docs/01_PMO/CHANGELOG.md` entry that matches this repository's existing
conventions exactly — dated `## YYYY-MM-DD` headings (with a `(N)` suffix for same-day
re-entries), `### 추가 (Added)` / `### 변경 (Changed)` / `### 수정 (Fixed)` / `### 검증
(Verified)` subsections, and a "why" focus rather than a line-by-line diff restatement.

---

# When to Use

Execute when:

- A task/feature/fix is complete and ready to be recorded in the CHANGELOG before session end
  (see `AGENTS.md` 2.4 — "작업 완료 후 필수 수행").
- The user provides a summary of changes, a diff, or a list of modified files and asks for a
  changelog entry.

---

# Capabilities

- Classifies each change into 추가(Added)/변경(Changed)/수정(Fixed), skipping empty sections.
- Detects whether today's date already has an entry in the CHANGELOG and appends a `(N)`
  suffixed heading instead of creating a duplicate date heading.
- Writes a `### 검증 (Verified)` section listing the actual commands run (`tsc`, `build`,
  `test`, manual E2E) and their results — never fabricates a check that wasn't actually run.
- Keeps entries in Korean, matching the surrounding document's language and tone.

---

# Inputs

Expected inputs:

- A short summary of what changed and why (preferred), or
- A `git diff`/`git log` excerpt plus a list of touched file paths, and
- The verification commands actually executed (if any) and their outcomes.

---

# Outputs

Generates:

- A single Markdown block containing one `## YYYY-MM-DD (N)` entry, ready to insert directly
  above the previous top-most entry in `docs/01_PMO/CHANGELOG.md` (newest first).

---

# Rules

- Never invent a verification step that was not actually run — if nothing was tested, omit the
  `검증` section rather than fabricating one.
- Do not restate the diff mechanically ("changed X from A to B"); explain the reason for the
  change when one is known, per this repo's existing entries.
- Preserve file-path backtick formatting (e.g. `` `packages/cli/src/index.ts` ``) exactly as the
  existing CHANGELOG does, so entries stay consistent when skimmed.
- If a change touches `package.json`, `.env`, DB schema, or deployment config, flag that it may
  need explicit approval per `AGENTS.md` 2.3 rather than silently including it as routine.

---

# Success Criteria

This agent succeeds when:

- The generated entry can be pasted into `docs/01_PMO/CHANGELOG.md` without any manual
  reformatting to match surrounding entries.
- Every claim in the `검증` section corresponds to a command/check the user actually reported
  running.

---

# Prompt Files

- `system.md` — the system prompt (required, rendered by the Prompt Engine)
- `user.md` — per-run user turn template (optional)
- `examples.md` — few-shot examples (optional, omitted from the prompt if empty)
- `prompt.json` — prompt version/author metadata

# Tools

Declares `["filesystem", "git"]` in `agent.json` — reads the existing CHANGELOG for
date/format context and (optionally) inspects `git diff`/`git log` for source material.
Run `ai tools list` to see all available tools.
