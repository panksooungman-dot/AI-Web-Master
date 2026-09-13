/**
 * Kakao Link SDK(카카오링크) — 관리자가 `/developer/inquiries/[id]`에서 "카카오톡 공유" 버튼을
 * 누르면 브라우저에서 직접 카카오톡 공유 시트를 열어, 버튼("바로가기")이 포함된 Feed 템플릿으로
 * `/quote/[token]` 링크를 보낸다. 클립보드 복사(`handleCopyShareLink`)·SOLAPI 문자
 * (`handleShareWithCustomer`)와 달리 서버를 거치지 않고 브라우저에서 Kakao SDK를 직접 호출한다.
 *
 * 필요 사전 설정(코드로 대신할 수 없음, 관리자가 Kakao Developers 콘솔에서 직접 해야 함):
 * 1. https://developers.kakao.com 에서 앱 생성
 * 2. 앱 설정 > 앱 키의 "JavaScript 키"를 `NEXT_PUBLIC_KAKAO_JS_KEY`로 설정
 * 3. 제품 설정 > 카카오 로그인 > 플랫폼에 사용할 도메인(예: https://cnbiz.kr, 로컬 개발 시
 *    http://localhost:3000)을 "Web" 플랫폼으로 등록 — 등록되지 않은 도메인에서는 SDK가 거부됨
 * 4. 제품 설정 > 카카오톡 공유가 활성화되어 있어야 함(기본적으로 앱 생성 시 활성화됨)
 *
 * `NEXT_PUBLIC_KAKAO_JS_KEY`가 없으면 버튼은 비활성화 상태로 남아있지 않고, 클릭 시 "설정되지
 * 않았습니다" 오류를 반환한다(다른 채널들과 동일하게 조용히 실패하지 않고 이유를 알려줌).
 */

const KAKAO_SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";

interface KakaoShareButton {
  title: string;
  link: { mobileWebUrl: string; webUrl: string };
}

interface KakaoSdk {
  isInitialized(): boolean;
  init(key: string): void;
  Share: {
    sendDefault(options: {
      objectType: "feed";
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: { mobileWebUrl: string; webUrl: string };
      };
      buttons: KakaoShareButton[];
    }): void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

let sdkLoadPromise: Promise<KakaoSdk> | null = null;

function loadKakaoSdk(): Promise<KakaoSdk> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 사용할 수 있습니다."));
  }

  if (window.Kakao) {
    return Promise.resolve(window.Kakao);
  }

  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  const promise: Promise<KakaoSdk> = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${KAKAO_SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Kakao) resolve(window.Kakao);
        else reject(new Error("카카오 SDK 로드에 실패했습니다."));
      });
      existing.addEventListener("error", () => reject(new Error("카카오 SDK 로드에 실패했습니다.")));
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Kakao) resolve(window.Kakao);
      else reject(new Error("카카오 SDK 로드에 실패했습니다."));
    };
    script.onerror = () => reject(new Error("카카오 SDK 로드에 실패했습니다. 네트워크 상태를 확인해주세요."));
    document.head.appendChild(script);
  });

  sdkLoadPromise = promise.catch((err: unknown) => {
    sdkLoadPromise = null; // 실패 시 다음 클릭에서 재시도할 수 있도록 캐시를 비움
    throw err;
  });

  return sdkLoadPromise;
}

export interface ShareQuoteLinkInput {
  /** 예: "테스트 컴퍼니 프로젝트 문서" — opengraph-image.tsx와 동일한 제목 규칙 */
  title: string;
  description: string;
  /** `/quote/[token]` 절대 URL */
  shareUrl: string;
  /** `${shareUrl}/opengraph-image` — Kakao Feed 카드에 쓰이는 미리보기 이미지 (HTTPS 필수) */
  imageUrl: string;
}

/**
 * 카카오톡 공유 시트를 연다. `NEXT_PUBLIC_KAKAO_JS_KEY` 미설정 시 즉시 reject한다(SDK를 로드하지
 * 않음 — 앱 키 없이 로드해봐야 init()에서 어차피 실패하므로 네트워크 요청을 아낀다).
 */
export async function shareQuoteLink(input: ShareQuoteLinkInput): Promise<void> {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!jsKey) {
    throw new Error(
      "카카오 앱 키(NEXT_PUBLIC_KAKAO_JS_KEY)가 설정되지 않았습니다. Kakao Developers 콘솔에서 발급 후 환경 변수로 등록해주세요."
    );
  }

  const kakao = await loadKakaoSdk();
  if (!kakao.isInitialized()) {
    kakao.init(jsKey);
  }

  kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      link: { mobileWebUrl: input.shareUrl, webUrl: input.shareUrl },
    },
    buttons: [
      {
        title: "바로가기",
        link: { mobileWebUrl: input.shareUrl, webUrl: input.shareUrl },
      },
    ],
  });
}
