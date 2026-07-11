import { spawnSync } from "node:child_process";

function run(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function isGitRepo(cwd) {
  return run(cwd, ["rev-parse", "--is-inside-work-tree"]).ok;
}

function getBranch(cwd) {
  const r = run(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (r.ok) return r.stdout;
  // 커밋이 하나도 없는 갓 init된 저장소는 HEAD가 아직 아무 커밋도 가리키지
  // 않아 rev-parse가 실패한다(예: `ai new` 직후). symbolic-ref는 커밋 없이도
  // HEAD가 가리키는 브랜치 이름을 알려준다.
  const fallback = run(cwd, ["symbolic-ref", "--short", "HEAD"]);
  return fallback.ok ? fallback.stdout : null;
}

function getStatusSummary(cwd) {
  const summary = { branch: null, changed: 0, ahead: 0, behind: 0 };
  if (!isGitRepo(cwd)) return summary;

  summary.branch = getBranch(cwd);

  const status = run(cwd, ["status", "--porcelain"]);
  if (status.ok && status.stdout) {
    summary.changed = status.stdout.split("\n").filter(Boolean).length;
  }

  const upstream = run(cwd, ["rev-parse", "--abbrev-ref", "@{u}"]);
  if (upstream.ok && upstream.stdout) {
    const counts = run(cwd, ["rev-list", "--left-right", "--count", `HEAD...${upstream.stdout}`]);
    if (counts.ok && counts.stdout) {
      const [ahead, behind] = counts.stdout.split(/\s+/).map(Number);
      summary.ahead = ahead || 0;
      summary.behind = behind || 0;
    }
  }

  return summary;
}

export { run, isGitRepo, getBranch, getStatusSummary };
