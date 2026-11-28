import { describe, expect, it } from "vitest";
import { buildRaiseBat, buildRaisePs1, toUnicodeEscapes, RAISE_WINDOW_TITLE } from "@/lib/contract/server/raise-script";

const decode = (bat: string) => Buffer.from(/FromBase64String\('([A-Za-z0-9+/=]+)'\)/.exec(bat)![1], "base64").toString("ascii");

describe("포스기 큰 알림 올리기 도우미", () => {
  it("한글을 \\uXXXX 로 바꾼다", () => {
    expect(toUnicodeEscapes("abc")).toBe("abc");
    expect(toUnicodeEscapes("입금")).toBe("\\uc785\\uae08");
  });

  it("배치 파일과 스크립트 모두 ASCII만 쓰고 CRLF 줄바꿈이다", () => {
    const bat = buildRaiseBat();
    expect(/[^\x00-\x7f]/.test(bat)).toBe(false);
    expect(bat.includes("\r\n")).toBe(true);
    expect(/[^\x00-\x7f]/.test(buildRaisePs1())).toBe(false);
  });

  it("스크립트는 '입금 알림' 제목 창을 맨 위(TOPMOST)로 올리고 중복 실행을 막는다", () => {
    const ps1 = decode(buildRaiseBat());
    expect(ps1).toContain("SetWindowPos(h, (IntPtr)(-1), 0, 0, 0, 0, 0x53)");
    expect(ps1).toContain(`[regex]::Unescape('${toUnicodeEscapes(RAISE_WINDOW_TITLE)}')`);
    expect(ps1).toContain("System.Threading.Mutex");
    expect(ps1).toContain("Start-Sleep -Milliseconds 1000");
  });

  it("창 제목이 입금 화면(입금 확인)과 겹치지 않는다", () => {
    expect("입금 확인".includes(RAISE_WINDOW_TITLE)).toBe(false);
    expect("(1) 확인 안 된 입금".includes(RAISE_WINDOW_TITLE)).toBe(false);
  });

  it("시작프로그램에 바로가기를 만들고 그 자리에서 바로 실행한다", () => {
    const bat = buildRaiseBat();
    expect(bat).toContain("GetFolderPath('Startup')");
    expect(bat).toContain("Deposit Raise.lnk");
    expect(bat).toContain('start "" powershell -WindowStyle Hidden');
  });

  it("외부로 연결하거나 다운로드하는 명령을 넣지 않는다", () => {
    const all = buildRaiseBat() + decode(buildRaiseBat());
    for (const word of ["http", "Invoke-WebRequest", "curl", "DownloadString", "WebClient"]) expect(all).not.toContain(word);
  });
});
