import { describe, expect, it } from "vitest";
import { buildAutostartBat } from "@/lib/contract/server/autostart";

describe("포스기 자동 실행 설정 파일", () => {
  it("시작프로그램에 크롬 앱 창 바로가기를 만들고 입금 화면 주소를 담는다", () => {
    const bat = buildAutostartBat("https://www.saseokchanmi.com")!;
    expect(bat).toContain('set "URL=https://www.saseokchanmi.com/deposits"');
    expect(bat).toContain("GetFolderPath('Startup')");
    expect(bat).toContain("'--app='+$env:URL");
    expect(bat.includes("\r\n")).toBe(true);
    expect(/[^\x00-\x7f]/.test(bat)).toBe(false); // 코드페이지 문제를 피하려고 ASCII만 쓴다
  });

  it("배치 파일을 깨뜨릴 수 있는 주소는 거부한다", () => {
    for (const bad of ['https://a.com" & calc', "https://a.com/x%PATH%", "javascript:alert(1)", "https://a.com/path"]) {
      expect(buildAutostartBat(bad)).toBeNull();
    }
    expect(buildAutostartBat("http://localhost:4100")).not.toBeNull();
  });
});
