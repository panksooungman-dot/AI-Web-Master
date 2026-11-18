import { SITE_URL } from "@/lib/site-config";
import { postSolapiMessages, type Env, type NotifyResult } from "./notify";

/**
 * 카카오 알림톡(SOLAPI). 알림톡은 SOLAPI에 승인된 템플릿의 문구 그대로만 보낼 수 있어서,
 * 아래 `body`가 곧 템플릿 등록 문구다(`#{변수}` 자리만 보낼 때 바뀐다). 문구를 바꾸면 SOLAPI 템플릿도 같이 다시 승인받아야 한다.
 * - 변수 값에는 이름·월·일자 같은 최소한만 넣는다. 금액·주소·전화번호는 넣지 않는다.
 * - 환경변수가 없으면 보내지 않고 이유를 돌려준다. 실패해도 예외를 던지지 않는다.
 */

export type AlimtalkKind = "contract" | "payslip" | "missing";

export interface AlimtalkTemplate {
  label: string;
  /** 템플릿 ID를 담는 환경변수 이름 */
  env: string;
  body: string;
  /** 웹링크 버튼 이름(템플릿에 등록한 것과 같아야 한다) */
  button: string;
}

export const ALIMTALK: Record<AlimtalkKind, AlimtalkTemplate> = {
  contract: {
    label: "근로계약서 작성 요청",
    env: "SOLAPI_TPL_CONTRACT",
    body: "[사색찬미한정식]\n#{이름}님, 근로계약서 작성을 요청드립니다.\n\n아래 버튼에서 계약 내용을 확인하고 서명해 주세요.\n문의는 매장으로 연락 부탁드립니다.",
    button: "계약서 작성하기",
  },
  payslip: {
    label: "급여명세서 확정 안내",
    env: "SOLAPI_TPL_PAYSLIP",
    body: "[사색찬미한정식]\n#{이름}님, #{귀속월} 급여명세서가 확정되었습니다.\n\n임금 지급일: #{지급일}\n명세서 내용은 매장으로 문의해 주세요.",
    button: "매장 안내 보기",
  },
  missing: {
    label: "퇴근 기록 누락 안내(사장님)",
    env: "SOLAPI_TPL_MISSING",
    body: "[사색찬미한정식]\n퇴근 기록이 없는 직원이 #{인원}명 있습니다.\n\n#{직원}\n\n월간 기록부에서 퇴근 시각을 정정해 주세요. 정정 전에는 해당 직원이 출근을 기록할 수 없습니다.",
    button: "출퇴근 관리",
  },
};

/** 카카오가 변수 값에 허용하는 길이(40자)를 넘지 않게 자른다. */
export const clipVar = (s: string, max = 40): string => (s.length > max ? s.slice(0, max - 1) + "…" : s);

/** 템플릿 문구에 변수를 채운 결과(미리보기·시험용). 실제 발송 문구는 SOLAPI가 같은 방식으로 만든다. */
export function renderAlimtalk(kind: AlimtalkKind, vars: Record<string, string>): string {
  return ALIMTALK[kind].body.replace(/#\{([^}]+)\}/g, (_, k: string) => vars[k] ?? "");
}

/** 휴대전화 번호면 숫자만, 아니면 null. */
export function mobileOf(raw: string): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(d) ? d : null;
}

/** 알림톡을 보내려면 필요한데 비어 있는 환경변수 이름들. 비어 있으면 보낼 수 있다. */
export function alimtalkMissing(kind: AlimtalkKind, env: Env = process.env): string[] {
  const need = ["SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_FROM", "SOLAPI_KAKAO_PFID", ALIMTALK[kind].env];
  return need.filter((k) => !env[k]?.trim());
}

export type AlimtalkResult = NotifyResult & { skipped?: boolean };

/** 알림톡 한 건 발송. `link`는 버튼이 여는 주소다. */
export async function sendAlimtalk(
  kind: AlimtalkKind,
  args: { to: string; vars: Record<string, string>; link: string },
  env: Env = process.env,
  fetchFn: typeof fetch = fetch,
): Promise<AlimtalkResult> {
  const missing = alimtalkMissing(kind, env);
  if (missing.length) return { channel: "kakao", ok: false, skipped: true, error: `알림톡 설정이 비어 있습니다: ${missing.join(", ")}` };
  const to = mobileOf(args.to);
  if (!to) return { channel: "kakao", ok: false, error: "휴대전화 번호를 확인해 주세요." };
  const variables = Object.fromEntries(Object.entries(args.vars).map(([k, v]) => [`#{${k}}`, clipVar(v)]));
  const r = await postSolapiMessages(
    env,
    [
      {
        to,
        from: env.SOLAPI_FROM!.replace(/\D/g, ""),
        type: "ATA",
        kakaoOptions: {
          pfId: env.SOLAPI_KAKAO_PFID!.trim(),
          templateId: env[ALIMTALK[kind].env]!.trim(),
          variables,
          // 카카오톡을 쓰지 않는 번호에 문자로 대신 보내지 않는다(요금·내용 노출 방지).
          disableSms: true,
          buttons: [{ buttonType: "WL", buttonName: ALIMTALK[kind].button, linkMo: args.link, linkPc: args.link }],
        },
      },
    ],
    fetchFn,
  );
  return { channel: "kakao", ...r };
}

export const contractLink = (token: string) => `${SITE_URL}/contract/${token}`;
