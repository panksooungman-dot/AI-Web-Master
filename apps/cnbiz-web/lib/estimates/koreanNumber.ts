const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const BIG_UNITS = ["", "만", "억", "조"];

function readFourDigits(n: number): string {
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;

  let result = "";
  if (thousands > 0) result += (thousands > 1 ? DIGITS[thousands] : "") + "천";
  if (hundreds > 0) result += (hundreds > 1 ? DIGITS[hundreds] : "") + "백";
  if (tens > 0) result += (tens > 1 ? DIGITS[tens] : "") + "십";
  if (ones > 0) result += DIGITS[ones];
  return result;
}

/** 정수 금액을 "일금 ___원" 형태의 견적서용 한글 금액 문구로 변환한다. 0 이하는 "일금 영원". */
export function toKoreanAmountPhrase(amount: number): string {
  const value = Math.round(Math.max(0, amount));
  if (value === 0) return "일금 영원";

  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    groups.push(remaining % 10000);
    remaining = Math.floor(remaining / 10000);
  }

  let words = "";
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (groups[i] === 0) continue;
    words += readFourDigits(groups[i]) + BIG_UNITS[i];
  }

  return `일금 ${words}원`;
}
