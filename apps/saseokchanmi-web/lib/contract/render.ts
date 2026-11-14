import { calc, holidayLine, monthHours, schedOf, wageStr } from "./calc";
import { DAYS, INSK, INS_CONFIRM, INS_REASON, makeDefaultConfig } from "./defaults";
import { dateKo, esc, fT, nh, num, safeImg, won } from "./format";
import type { ContractConfig, ContractSubmissionView, InsKey } from "./types";

/**
 * 계약서 본문 HTML 생성 (표준근로계약서 2025 양식, contract.html의 contractHTML 포팅).
 * 계약서 문구는 기준 구현과 같게 유지한다. 모든 사용자 입력은 esc(), 이미지는 safeImg()를 거친다.
 * 서버(스냅샷 렌더링)와 클라이언트(미리보기·PDF)가 이 함수를 함께 쓴다.
 * 스타일은 lib/contract/paper.css 의 `.paper` 클래스 기준이다.
 */

export interface RenderOptions {
  /** 워터마크 이미지 경로. 같은 출처 이미지여야 PDF 캡처에서 안전하다. */
  watermarkSrc?: string;
}

const DEFAULT_WATERMARK = "/images/logo.png";

const blank = (v: unknown, n?: number): string =>
  v ? esc(v) : '<span class="bl" style="min-width:' + (n || 6) + 'em"></span>';

const circ = (on: boolean): string => '<span class="ck">' + (on ? "○" : "&nbsp;") + "</span>";

const sub = (x: string): string => '<div class="sub">' + x + "</div>";

/** 4대 사회보험 중 "미적용"인 항목. */
export const insOff = (C: Pick<ContractConfig, "ins"> | null | undefined): ReadonlyArray<readonly [InsKey, string]> => {
  const v = (C && C.ins) || ({} as Partial<Record<InsKey, string>>);
  return INSK.filter((x) => v[x[0]] === "n");
};

/** 계약서 6번 임금 항목 */
function wageHTML(C: ContractConfig, hl: string[]): string {
  if (C.wageType === "월급") {
    return (
      sub("- 월(일, 시간)급 : " + esc(wageStr(C))) +
      sub("- 기본급 : " + (num(C.basePay) ? esc(won(num(C.basePay))) : "＿＿＿＿＿원")) +
      (Array.isArray(C.allow) ? C.allow : [])
        .filter((x) => x && (x.n || num(x.a)))
        .map((x) => sub("- " + esc(x.n || "고정수당") + " : " + esc(won(num(x.a)))))
        .join("") +
      sub("- 월 소정근로시간 : " + monthHours(C) + "시간 (주휴시간 포함)") +
      sub("- 월급에는 주휴수당이 포함되어 있음")
    );
  }
  return sub("- 월(일, 시간)급 : " + esc(wageStr(C))) + hl.map((x) => sub(esc(x))).join("");
}

/** 계약서 8번 사회보험 적용여부 */
function insHTML(C: ContractConfig): string {
  const v: Record<InsKey, string> = Object.assign({ emp: "y", acc: "y", pen: "y", hlt: "y" }, C.ins || {});
  const all = INSK.every((x) => v[x[0]] === "y");
  let h = "<p>8. 사회보험 적용여부</p>";
  if (all) {
    h += sub("- 4대 사회보험(고용보험, 산재보험, 국민연금, 건강보험) 적용(가입)을 원칙으로 함");
  } else {
    h += INSK.map((x) => sub("- " + x[1] + " : 적용 [" + circ(v[x[0]] === "y") + "], 미적용 [" + circ(v[x[0]] !== "y") + "]")).join("");
  }
  if (C.insNote) h += sub("- " + (all ? "적용 예외 : " : "미적용 사유 : ") + esc(C.insNote));
  return h;
}

/** 서명일에서 연도만 뽑는다. 서명 전 미리보기의 빈칸 날짜에 쓴다. */
const yearOf = (v: unknown): string => {
  const m = String(v ?? "").match(/(\d{4})/);
  return m ? m[1] : "";
};

/** 4대 사회보험 미적용 사유서 (계약서 뒤 별도 쪽, 요청서 6장). */
function insFormHTML(d: ContractSubmissionView, C: ContractConfig, sig: string, osig: string): string {
  const f = d && d.insForm;
  if (!f) return "";
  const off = insOff(C);
  if (!off.length) return "";
  const K = calc(C);
  const wh = K.weekMin / 60;
  const ck = (on: boolean) => (on ? "☑" : "□");
  const ownerOk = !!(d.countersignedAt || osig);
  const dt = d.signedAt
    ? new Date(d.signedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" })
    : "";
  const td = "border:1px solid #888;padding:4px 6px;text-align:center;font-size:.92em";
  const NUMS = ["", "①", "②", "③", "④"];
  const rows = INSK.map((x) => {
    const on = (C.ins || {})[x[0]] === "n";
    const r = on ? (f.r || {})[x[0]] || "" : "";
    return (
      "<tr><td style=\"" + td + '">' + x[1] + "</td><td style=\"" + td + '">' + ck(on) + " 미적용</td><td style=\"" + td + ';text-align:left">' +
      (r ? NUMS[+r] + (r === "4" && f.other ? " " + esc(f.other) : "") : "") +
      "</td></tr>"
    );
  }).join("");
  const used = Object.values(f.r || {});
  const rn = (n: number, t: string) =>
    '<div class="sub">' + (used.includes(String(n)) ? "<b>" : "") + NUMS[n] + " " + t + (used.includes(String(n)) ? "</b>" : "") + "</div>";
  const year = yearOf(C.date) || yearOf(d.signedAt);

  return (
    '<div class="insapp" style="margin-top:30px;padding-top:6px">' +
    '<p class="gap" style="font-weight:700;text-align:center;font-size:1.35em;margin-bottom:0">4대 사회보험 미적용 사유서</p><p style="text-align:center;margin-bottom:8px">(법정 제외 대상 확인서)</p>' +
    '<div class="ln">사업체명 : ' + esc(C.biz) + " &nbsp; 대표자 : " + esc(C.owner) + " &nbsp; 전화 : " + esc(C.tel) + '</div><div class="ln">사업장 주소 : ' + esc(C.addr) + "</div>" +
    '<p style="margin-top:8px;font-weight:700">1. 근로자 인적사항</p>' +
    '<div class="sub">성 명 : ' + blank(d.name, 6) + " &nbsp; 생년월일 : " + blank(f.birth, 8) + "</div>" +
    '<div class="sub">연 락 처 : ' + blank(d.phone, 8) + " &nbsp; 입사일 : " + blank(dateKo(C.start), 9) + "</div>" +
    '<div class="sub">주 소 : ' + blank(d.address, 16) + "</div>" +
    '<p style="margin-top:8px;font-weight:700">2. 근로조건</p>' +
    '<div class="sub">담당 업무 : ' + blank(C.duty, 6) + " &nbsp; 1주 소정근로시간 : " +
    (wh > 0 ? nh(wh) + "시간 (월 " + Math.round(wh * 4.345) + "시간)" : "＿＿＿시간") + "</div>" +
    '<p style="margin-top:8px;font-weight:700">3. 미적용 항목 및 사유</p>' +
    '<table style="width:100%;border-collapse:collapse;margin:4px 0 8px"><tr><td style="' + td + ';background:#eee;font-weight:700;width:22%">보험 종류</td><td style="' + td +
    ';background:#eee;font-weight:700;width:22%">미적용 여부</td><td style="' + td + ';background:#eee;font-weight:700">미적용 사유 (사유 번호 또는 내용)</td></tr>' + rows + "</table>" +
    '<div class="sub">[사유 번호]</div>' + rn(1, INS_REASON["1"]) + rn(2, INS_REASON["2"] + " (예: 국민연금 18세 미만·60세 이상 등)") + rn(3, INS_REASON["3"]) +
    '<div class="sub">' + (used.includes("4") ? "<b>" : "") + "④ 기타 법령상 제외 사유 : " + (f.other ? esc(f.other) : "＿＿＿＿＿＿＿＿") + (used.includes("4") ? "</b>" : "") + "</div>" +
    '<div class="sub">[구체적 내용]</div><div class="sub">' + esc(f.detail || "").replace(/\n/g, "<br>") + "</div>" +
    '<p style="margin-top:8px;font-weight:700">4. 근로자 확인</p>' + INS_CONFIRM.map((x, i) => '<div class="sub">' + ck(!!(f.c || [])[i]) + " " + esc(x) + "</div>").join("") +
    '<p style="margin-top:8px;font-weight:700">5. 사업주 확인</p><div class="sub">' + ck(ownerOk) + " 위 근로자가 법정 제외 대상임을 확인하였으며, 가입 요건에 해당하게 된 때에는 지체 없이 가입 신고를 하겠습니다.</div>" +
    '<p class="gap">' + (dt ? esc(dt) : (year ? esc(year) : "&nbsp; &nbsp; &nbsp;") + "년 &nbsp; 월 &nbsp; 일") + "</p>" +
    '<div class="ln"><b>(사업주)</b> ' + esc(C.biz) + " 대표자 " + esc(C.owner) + ' <span class="sgw">(서명 또는 인)' + osig + "</span></div>" +
    '<div class="ln"><b>(근로자)</b> 성명 ' + blank(d.name, 6) + ' <span class="sgw">(서명 또는 인)' + sig + "</span></div>" +
    '<div class="sub" style="font-size:.82em;color:#555;margin-top:8px">※ 이 사유서는 사업주의 가입 의무를 면제하지 않습니다. 법정 제외 대상이 아닌 경우에는 근로자가 원하더라도 가입해야 하며, 제외 여부는 근로복지공단·국민연금공단·국민건강보험공단 또는 4대사회보험 정보연계센터에서 확인하세요. 근로계약서와 함께 보관하세요.</div></div>'
  );
}

/**
 * 계약서 전문. `d`는 근로자 쪽 데이터(없으면 빈칸), `C0`는 서명 시점의 계약 설정(스냅샷)이다.
 * 제출 건을 다시 열 때는 항상 그 제출의 스냅샷을 넘겨야 한다(현재 설정이 아니라).
 */
export function contractHTML(d?: ContractSubmissionView | null, C0?: Partial<ContractConfig> | null, opts: RenderOptions = {}): string {
  const dd: ContractSubmissionView = d || {};
  const C: ContractConfig = { ...makeDefaultConfig(), ...(C0 || {}) };
  const sig = safeImg(dd.sig) ? '<img class="sg" alt="근로자 서명" src="' + dd.sig + '">' : "";
  const os = safeImg(dd.ownerSig) || safeImg(C.ownerSig);
  const osig = os ? '<img class="sg" alt="사업주 서명" src="' + os + '">' : "";
  const wm = C.watermark !== false ? '<img class="wm" alt="" src="' + esc(opts.watermarkSrc ?? DEFAULT_WATERMARK) + '">' : "";
  const bonus = C.bonus === "has";
  const other = C.other === "has";
  const bAmt = bonus && num(C.bonusAmt) ? won(num(C.bonusAmt)) : "＿＿＿＿＿원";
  const extra = String(C.extra || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const k = calc(C);
  const sc = schedOf(C);
  const brkTxt = C.brkS && C.brkE ? "휴게 : " + fT(C.brkS) + " ~ " + fT(C.brkE) : "";
  let t4: string;
  let t5: string;
  if (C.useSched) {
    t4 =
      "<p>4. 소정근로시간 : 요일별 근로시간은 아래와 같음 (1주 " + nh(k.weekMin / 60) + "시간)</p>" +
      sc
        .map((x, i) =>
          x.t === "work"
            ? '<div class="sub">- ' + DAYS[i] + "요일 " + fT(x.s) + " ~ " + fT(x.e) + (x.bs && x.be ? " (휴게 " + fT(x.bs) + " ~ " + fT(x.be) + ")" : "") + "</div>"
            : "",
        )
        .join("") +
      (C.brkNote ? '<div class="sub">(' + esc(C.brkNote) + ")</div>" : "");
    t5 =
      "<p>5. 근무일/휴일</p><div class=\"sub\">- 매주 " + k.days + "일 근무(근무요일 " + esc(k.workDays.join(", ")) + "), 주휴일 매주 " +
      (k.weekOff.length ? esc(k.weekOff.join(", ")) + "요일" : blank("", 3) + "요일") + (C.weekRule ? ", " + esc(C.weekRule) : "") + "</div>" +
      (C.weekRule2 ? '<div class="sub">- ' + esc(C.weekRule2) + "</div>" : "");
  } else {
    t4 =
      "<p>4. 소정근로시간 : " + fT(C.workS) + " ~ " + fT(C.workE) + (brkTxt ? " (" + brkTxt + ")" : "") +
      " (1일 " + nh(k.perDay / 60) + "시간, 1주 " + nh(k.weekMin / 60) + "시간)</p>" +
      (C.brkNote ? '<div class="sub">(' + esc(C.brkNote) + ")</div>" : "");
    t5 =
      "<p>5. 근무일/휴일</p><div class=\"sub\">- 매주 " + esc(C.days) + "일 근무" + (C.weekRule ? ", " + esc(C.weekRule) : "") + "</div>" +
      (C.weekRule2 ? '<div class="sub">- ' + esc(C.weekRule2) + "</div>" : "");
  }
  t5 += '<div class="sub">- 공휴일(대체공휴일 포함)은 근로기준법이 정하는 바에 따르며, 근로자의 날은 유급휴일로 함</div>';
  const start = esc(dateKo(C.start));
  const t1 =
    C.termType === "fixed"
      ? "<p>1. 근로계약기간 : " + start + "부터 " + (C.end ? esc(dateKo(C.end)) : blank("", 7)) + "까지</p>"
      : "<p>1. 근로개시일 : " + start + "부터</p>";
  const hl = holidayLine(C);
  return (
    wm +
    '<h2 class="ct">표 준 근 로 계 약 서</h2>' +
    "<p><b>" + esc(C.biz) + '</b>(이하 "사업주"라 함)과(와) ' + blank(dd.name, 9) + '(이하 "근로자"라 함)은 다음과 같이 근로계약을 체결한다.</p>' +
    t1 +
    "<p>2. 근 무 장 소 : " + esc(C.addr) + " (" + esc(C.biz) + ")</p>" +
    "<p>3. 업무의 내용 : " + esc(C.duty) + "</p>" +
    t4 + t5 +
    "<p>6. 임 금</p>" +
    wageHTML(C, hl) +
    '<div class="sub">- 상여금 : 있음 (' + circ(bonus) + ") " + bAmt + ", 없음 (" + circ(!bonus) + ")</div>" +
    '<div class="sub">- 그 밖의 수당(약정수당) : 있음 [' + circ(other) + "], 없음 [" + circ(!other) + "]</div>" +
    (other && C.otherText ? '<div class="sub">· ' + esc(C.otherText) + "</div>" : "") +
    '<div class="sub">- 임금지급일 : 매월(매주 또는 매일) ' + blank(C.payDay, 2.5) + "일 (휴일의 경우는 전날 지급)</div>" +
    '<div class="sub">- 지급방법 : 근로자에게 직접(현금)지급 [' + circ(C.payMethod === "direct") + "], 근로자 명의 계좌에 입금 [" + circ(C.payMethod === "bank") + "]</div>" +
    '<p>7. 연차유급휴가</p><div class="sub">- 연차유급휴가는 근로기준법에서 정하는 바에 따라 부여함</div>' +
    insHTML(C) +
    '<p>9. 근로계약서 교부</p><div class="sub">- 사업주는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의 교부요구와 관계없이 근로자에게 교부함(근로기준법 제17조 이행)</div>' +
    '<p>10. 근로계약, 취업규칙 등의 성실한 이행의무</p><div class="sub">- 사업주와 근로자는 각자가 근로계약, 취업규칙, 단체협약을 지키고 성실하게 이행하여야 함</div>' +
    '<p>11. 그 밖의 사항</p><div class="sub">- 이 계약에 정함이 없는 사항은 근로관계법령에 따름</div>' +
    (extra.length ? "<p>12. 특약사항</p>" + extra.map((x) => '<div class="sub">- ' + esc(x) + "</div>").join("") : "") +
    '<p class="gap">' + esc(dateKo(C.date)) + "</p>" +
    '<div class="who"><b>(사업주)</b> 사업체명 : ' + esc(C.biz) + " (전화 : " + esc(C.tel) + ")</div>" +
    '<div class="ln">주 소 : ' + esc(C.addr) + "</div>" +
    '<div class="ln">대 표 자 : ' + esc(C.owner) + ' <span class="sgw">(서명)' + osig + "</span></div>" +
    '<div class="who"><b>(근로자)</b> 주 소 : ' + blank(dd.address, 16) + "</div>" +
    '<div class="ln">연 락 처 : ' + blank(dd.phone, 9) + "</div>" +
    '<div class="ln">성 명 : ' + blank(dd.name, 6) + ' <span class="sgw">(서명)' + sig + "</span></div>" +
    insFormHTML(dd, C, sig, osig)
  );
}
