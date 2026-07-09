const { spawn, execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/**
 * 새 터미널 창에서 npm run dev를 실행하고, 출력에서 실제 바인딩된 포트를
 * 감지해 반환한다. Windows에서는 새 PowerShell 창을 띄워 사용자가 로그를
 * 직접 볼 수 있게 하면서, 동시에 로그를 파일로 tee해 이 프로세스가 포트를
 * 감지할 수 있게 한다.
 */
// Tee-Object(Windows PowerShell)가 쓰는 로그 파일은 기본적으로 UTF-16LE(BOM:
// FF FE)이다. 이를 "utf-8"로 읽으면 각 문자가 널 바이트와 뒤섞여 포트 정규식이
// 매칭되지 않는다. BOM 유무로 인코딩을 판별해 올바르게 디코딩한다.
function readLogFile(logFile) {
  if (!fs.existsSync(logFile)) return "";
  const buffer = fs.readFileSync(logFile);
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le", 2);
  }
  return buffer.toString("utf-8");
}

// Development OS(lib/devserver/manager.ts)는 이 CLI와 완전히 별도의
// 프로세스라서 서로 메모리를 공유하지 않는다. CLI가 시작한 dev 서버를
// Development OS 화면(Status/Port/PID/URL)에서도 동일하게 볼 수 있도록,
// 워크스페이스(projectPath) 안의 파일에 상태를 함께 남긴다. 스키마는
// lib/devserver/manager.ts의 PersistedDevServerState와 반드시 일치해야 한다.
function normalizeWorkspaceKey(workspacePath) {
  return path.resolve(workspacePath).replace(/\\/g, "/").toLowerCase();
}

function stateFilePath(projectPath) {
  return path.join(projectPath, "lib", "data", "devservers.json");
}

function persistDevServerState(projectPath, state) {
  try {
    const file = stateFilePath(projectPath);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let all = {};
    if (fs.existsSync(file)) {
      try {
        all = JSON.parse(fs.readFileSync(file, "utf-8"));
      } catch {
        all = {};
      }
    }

    const key = normalizeWorkspaceKey(projectPath);
    if (state) all[key] = state;
    else delete all[key];

    fs.writeFileSync(file, JSON.stringify(all, null, 2), "utf-8");
  } catch {
    // 상태 공유는 best-effort다 — 파일 쓰기 실패가 devmode 흐름 자체를
    // 막아서는 안 된다.
  }
}

// CLI는 새 콘솔 창(start)에서 npm run dev를 실행하므로, 그 창을 띄운
// launcher의 pid는 실제 서버 프로세스의 pid가 아니다. 감지된 포트를 실제로
// 리슨 중인 프로세스의 pid를 netstat으로 역으로 찾는다.
function findPidByPort(port) {
  if (process.platform !== "win32") return null;
  try {
    const output = execSync("netstat -ano -p tcp", { encoding: "utf-8" });
    for (const line of output.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      if (!new RegExp(`[:.]${port}\\s`).test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isInteger(pid)) return pid;
    }
  } catch {
    // ignore
  }
  return null;
}

function startDevServer(projectPath) {
  return new Promise((resolve) => {
    const logFile = path.join(os.tmpdir(), `ai-devmode-${Date.now()}.log`);
    const startedAt = new Date().toISOString();
    let fallbackPid = null;

    persistDevServerState(projectPath, { pid: null, port: null, status: "starting", startedAt });

    if (process.platform === "win32") {
      const inner = `Set-Location '${projectPath}'; npm run dev *>&1 | Tee-Object -FilePath '${logFile}'`;
      // detached:true + stdio:"ignore"로 powershell.exe를 직접 spawn하면
      // 콘솔이 제대로 할당되지 않아 명령을 한 줄도 실행하지 못한 채 즉시
      // 종료된다(exit code 0, 실제 재현 확인). cmd.exe의 start로 새 콘솔
      // 창을 명시적으로 띄우면 정상적으로 콘솔이 할당되어 실행된다.
      const command = `start "AI Business OS Dev Server" powershell.exe -NoExit -Command "${inner.replace(/"/g, '\\"')}"`;
      spawn(command, {
        shell: true,
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      const logStream = fs.createWriteStream(logFile);
      const child = spawn("npm", ["run", "dev"], {
        cwd: projectPath,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.pipe(logStream);
      child.stderr.pipe(logStream);
      fallbackPid = child.pid ?? null;
      child.unref();
    }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(interval);
        persistDevServerState(projectPath, null);
        resolve({ port: null, logFile });
      }
    }, 30000);

    const interval = setInterval(() => {
      if (resolved) return;
      const content = readLogFile(logFile);
      const match = content.match(/https?:\/\/localhost:(\d+)/);
      if (match) {
        resolved = true;
        clearTimeout(timeout);
        clearInterval(interval);
        const port = Number(match[1]);
        const pid = findPidByPort(port) ?? fallbackPid;
        persistDevServerState(projectPath, { pid, port, status: "running", startedAt });
        resolve({ port, logFile });
      }
    }, 500);
  });
}

module.exports = { startDevServer };
