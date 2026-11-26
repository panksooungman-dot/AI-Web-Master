/**
 * 포스기(Windows)에서 한 번 더블클릭하면 "부팅할 때 입금 확인 화면이 자동으로 열리는" 설정을 해 주는 배치 파일.
 * 웹페이지는 PC가 켜질 때 스스로 실행될 수 없으므로, 시작프로그램 폴더에 크롬 바로가기를 만들어 주는 방식이다.
 * 한글을 쓰면 명령 프롬프트 코드페이지에 따라 깨질 수 있어 안내 문구는 영문으로 둔다.
 */
export function buildAutostartBat(origin: string): string | null {
  // 따옴표·% 등 배치 파일을 깨뜨릴 문자가 들어간 주소는 만들지 않는다.
  if (!/^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(origin)) return null;
  const url = `${origin}/deposits`;
  const lines = [
    "@echo off",
    "setlocal",
    `set "URL=${url}"`,
    'set "CHROME="',
    'if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
    'if not defined CHROME if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
    'if not defined CHROME if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "CHROME=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"',
    "if not defined CHROME (",
    "  echo Google Chrome was not found. Please install Chrome first.",
    "  pause",
    "  exit /b 1",
    ")",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\\Deposit Check.lnk'); $s.TargetPath=$env:CHROME; $s.Arguments='--app='+$env:URL; $s.Save()"`,
    "if errorlevel 1 (",
    "  echo Setup failed. Please ask the developer for help.",
    "  pause",
    "  exit /b 1",
    ")",
    'start "" "%CHROME%" --app=%URL%',
    "echo.",
    "echo Done. The deposit screen will open automatically when this PC starts.",
    "pause",
  ];
  return lines.join("\r\n") + "\r\n";
}
