/**
 * 포스기(Windows)용 "입금 알림 큰 창을 포스 프로그램 위로 올려 주는" 도우미 설치 파일(.bat).
 * 포스 프로그램이 항상 맨 위에 고정된 전체 화면이라 크롬 창이 그 뒤에 가려지므로, 1초마다 제목이 "입금 알림"인 창을 찾아 맨 위로 올린다.
 * 하는 일은 창 위치(맨 위 여부) 변경뿐이다. 포스 프로그램은 건드리지 않고, 인터넷에 연결하지 않으며, 창 내용을 읽지 않는다.
 * - 한글이 코드페이지에 따라 깨지지 않도록 배치 파일은 ASCII만 쓴다. 스크립트는 base64로 넣고, 한글 제목은 \uXXXX 로 적는다.
 * - 창 제목은 DepositPopup의 POPUP_TITLE과 같아야 한다.
 */
export const RAISE_WINDOW_TITLE = "입금 알림";

/** 한글 등 ASCII가 아닌 글자를 \uXXXX 로 바꾼다(PowerShell의 [regex]::Unescape로 되돌린다). */
export function toUnicodeEscapes(text: string): string {
  return [...text].map((ch) => (ch.charCodeAt(0) > 127 ? "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0") : ch)).join("");
}

/** 포스기에서 계속 돌아가는 PowerShell 스크립트 본문(ASCII). */
export function buildRaisePs1(title: string = RAISE_WINDOW_TITLE): string {
  const lines = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$m = New-Object System.Threading.Mutex($false, 'Local\\DepositRaise')",
    "if (-not $m.WaitOne(0)) { exit }",
    "Add-Type @'",
    "using System;",
    "using System.Text;",
    "using System.Runtime.InteropServices;",
    "public class DepositWin {",
    "  public delegate bool EnumProc(IntPtr h, IntPtr l);",
    '  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);',
    '  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);',
    '  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);',
    '  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);',
    '  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);',
    '  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);',
    "  public static int Raise(string key) {",
    "    int n = 0;",
    "    EnumWindows((h, l) => {",
    "      if (!IsWindowVisible(h)) return true;",
    "      StringBuilder s = new StringBuilder(256);",
    "      GetWindowText(h, s, 256);",
    "      if (s.ToString().Contains(key)) {",
    "        if (IsIconic(h)) ShowWindow(h, 9);",
    "        SetWindowPos(h, (IntPtr)(-1), 0, 0, 0, 0, 0x53);", // TOPMOST, NOSIZE|NOMOVE|NOACTIVATE|SHOWWINDOW
    "        n++;",
    "      }",
    "      return true;",
    "    }, IntPtr.Zero);",
    "    return n;",
    "  }",
    "}",
    "'@",
    `$key = [regex]::Unescape('${toUnicodeEscapes(title)}')`,
    "while ($true) { [void][DepositWin]::Raise($key); Start-Sleep -Milliseconds 1000 }",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function buildRaiseBat(): string {
  const b64 = Buffer.from(buildRaisePs1(), "ascii").toString("base64");
  const run = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File";
  const lines = [
    "@echo off",
    "setlocal",
    'set "DIR=%LocalAppData%\\DepositRaise"',
    'if not exist "%DIR%" mkdir "%DIR%"',
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "[IO.File]::WriteAllBytes($env:DIR+'\\raise.ps1',[Convert]::FromBase64String('${b64}'))"`,
    "if errorlevel 1 (",
    "  echo Setup failed. Please ask the developer for help.",
    "  pause",
    "  exit /b 1",
    ")",
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "$q=[char]34; $s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\\Deposit Raise.lnk'); $s.TargetPath='powershell.exe'; $s.Arguments='${run} '+$q+$env:DIR+'\\raise.ps1'+$q; $s.WindowStyle=7; $s.Save()"`,
    "if errorlevel 1 (",
    "  echo Setup failed. Please ask the developer for help.",
    "  pause",
    "  exit /b 1",
    ")",
    `start "" powershell ${run} "%DIR%\\raise.ps1"`,
    "echo.",
    "echo Done. The deposit alert window will now appear above the POS program.",
    "echo It also starts automatically when this PC starts.",
    "echo To turn it off: press Win+R, type shell:startup, and delete 'Deposit Raise'.",
    "pause",
  ];
  return lines.join("\r\n") + "\r\n";
}
