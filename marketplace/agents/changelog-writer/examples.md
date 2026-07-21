# Examples

Few-shot examples for the `changelog-writer` agent. This file is optional — `AGENT.md`
documents it as "omitted from the prompt if empty" — but a single worked example makes the
expected output format unambiguous.

---

## Example 1 — feature addition with verification

**Input** (`user.md` rendering):

```
Step: draft-entry

Input:
Added a `retry()` method to lib/agents/taskQueue.ts so a Failed task can be re-enqueued from
the Dashboard without re-running the whole pipeline. Wired it to POST /api/agents/tasks/[id]/retry
and a Retry button on /developer/ai/tasks. Ran npx tsc --noEmit (0 errors) and npm test (188/188
passed, no regressions).
```

**Expected output:**

```markdown
## 2026-07-14

### 추가 (Added)

- `taskQueue.retry(id)`(신규, Failed Task만 재-enqueue) + `POST /api/agents/tasks/[id]/retry`(신규)
  + `/developer/ai/tasks`(신규, 전체 이력 테이블)

### 검증 (Verified)

- `npx tsc --noEmit`(0 errors) · `npm run test` 188/188 통과, 회귀 없음
```

Notes on why this is correct:

- Only `추가`/`검증` are present — no `변경`/`수정` claimed, since none were reported.
- The `검증` section restates only checks the input actually mentioned running.
- File paths are backticked, matching the surrounding CHANGELOG's formatting.
