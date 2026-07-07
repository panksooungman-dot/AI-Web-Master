const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/**
 * 새 터미널 창에서 npm run dev를 실행하고, 출력에서 실제 바인딩된 포트를
 * 감지해 반환한다. Windows에서는 새 PowerShell 창을 띄워 사용자가 로그를
 * 직접 볼 수 있게 하면서, 동시에 로그를 파일로 tee해 이 프로세스가 포트를
 * 감지할 수 있게 한다.
 */
function startDevServer(projectPath) {
  return new Promise((resolve) => {
    const logFile = path.join(os.tmpdir(), `ai-devmode-${Date.now()}.log`);

    if (process.platform === "win32") {
      const psCommand = `Set-Location '${projectPath}'; npm run dev *>&1 | Tee-Object -FilePath '${logFile}'`;
      spawn("powershell.exe", ["-NoExit", "-Command", psCommand], {
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
      child.unref();
    }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(interval);
        resolve({ port: null, logFile });
      }
    }, 30000);

    const interval = setInterval(() => {
      if (resolved) return;
      const content = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf-8") : "";
      const match = content.match(/https?:\/\/localhost:(\d+)/);
      if (match) {
        resolved = true;
        clearTimeout(timeout);
        clearInterval(interval);
        resolve({ port: Number(match[1]), logFile });
      }
    }, 500);
  });
}

module.exports = { startDevServer };
