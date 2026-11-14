/** 관리자 화면에서 쓰는 API 호출 도우미. 세션이 끝났으면(401) 로그인 화면으로 보낸다. */

export interface ApiFailure {
  ok: false;
  status: number;
  error: string;
  errors?: string[];
  fields?: Record<string, string>;
}
export type ApiResult<T> = ({ ok: true } & T) | ApiFailure;

export async function adminApi<T extends object>(path: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? "GET",
      headers: { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/admin/login";
      return { ok: false, status: 401, error: "로그인이 필요합니다." };
    }
    if (res.ok && data && data.ok) return data as unknown as { ok: true } & T;
    return {
      ok: false,
      status: res.status,
      error: typeof data?.error === "string" ? data.error : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      errors: Array.isArray(data?.errors) ? (data.errors as string[]) : undefined,
      fields: data?.fields && typeof data.fields === "object" ? (data.fields as Record<string, string>) : undefined,
    };
  } catch {
    return { ok: false, status: 0, error: "네트워크 오류가 발생했습니다. 연결을 확인해 주세요." };
  }
}
