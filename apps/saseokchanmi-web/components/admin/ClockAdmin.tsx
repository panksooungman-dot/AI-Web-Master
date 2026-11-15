"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/contract/client/api";
import { fmtClockDateTime } from "@/lib/contract/client/clock-format";
import { Badge, btnDanger, btnOutline, btnPrimary, inputCls, Notice, Panel } from "./ui";

type Employee = { id: string; name: string; hasPin: boolean; status: "in" | "out"; stale: boolean; lastAt: string | null };
type Ev = { id: string; name: string; kind: "in" | "out"; at: string; source: "device" | "admin" };

/** 출퇴근 관리: 기기 등록, 직원 PIN 발급, 최근 기록. */
export function ClockAdmin() {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [d, e] = await Promise.all([adminApi<{ registered: boolean }>("/api/admin/clock/device"), adminApi<{ employees: Employee[]; events: Ev[] }>("/api/admin/clock/employees")]);
    if (d.ok) setRegistered(d.registered);
    if (e.ok) {
      setEmployees(e.employees);
      setEvents(e.events);
    } else setNotice({ tone: "error", text: e.error });
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function device(method: "POST" | "DELETE") {
    setBusy(true);
    const r = await adminApi<{ registered: boolean }>("/api/admin/clock/device", { method });
    setBusy(false);
    if (r.ok) {
      setRegistered(r.registered);
      setNotice({ tone: "ok", text: r.registered ? "이 기기를 출퇴근 기기로 등록했습니다. 이제 이 기기에서 /clock 화면을 열면 됩니다." : "이 기기의 등록을 해제했습니다." });
    } else setNotice({ tone: "error", text: r.error });
  }

  async function savePin(id: string, generate: boolean) {
    const pin = pins[id] ?? "";
    if (!generate && !/^\d{4}$/.test(pin)) return setNotice({ tone: "error", text: "PIN은 숫자 4자리로 입력해 주세요." });
    setBusy(true);
    const r = await adminApi<{ pin?: string }>(`/api/admin/clock/employees/${id}/pin`, { method: "PUT", body: generate ? { generate: true } : { pin } });
    setBusy(false);
    if (!r.ok) return setNotice({ tone: "error", text: r.error });
    const name = employees.find((x) => x.id === id)?.name ?? "";
    setNotice({ tone: "ok", text: r.pin ? `${name}님의 새 PIN은 ${r.pin} 입니다. 이 화면을 벗어나면 다시 볼 수 없으니 지금 직원에게 알려 주세요.` : `${name}님의 PIN을 저장했습니다.` });
    setPins((p) => ({ ...p, [id]: "" }));
    void load();
  }

  async function removePin(id: string, name: string) {
    if (!window.confirm(`${name}님의 PIN을 삭제할까요? 삭제하면 출퇴근 화면의 직원 목록에서 빠집니다. 기존 기록은 그대로 남습니다.`)) return;
    setBusy(true);
    const r = await adminApi<{ deleted: boolean }>(`/api/admin/clock/employees/${id}/pin`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) return setNotice({ tone: "error", text: r.error });
    setNotice({ tone: "ok", text: `${name}님의 PIN을 삭제했습니다.` });
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">출퇴근</h1>
        <p className="mt-1 text-sm text-muted">매장 기기(포스·태블릿)에서 직원이 이름과 PIN으로 출근·퇴근을 기록합니다. 시각은 서버 시각으로 저장됩니다.</p>
      </div>

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <Panel title="출퇴근 기기" aside={registered === null ? null : <Badge tone={registered ? "ok" : "warn"}>{registered ? "이 기기는 등록됨" : "이 기기는 미등록"}</Badge>}>
        <div className="space-y-3 text-sm leading-relaxed text-foreground">
          <p>출퇴근은 <b>등록된 기기에서만</b> 할 수 있어서, 직원이 집이나 다른 곳에서 대신 찍을 수 없습니다. 매장 기기의 브라우저로 이 관리자 화면에 로그인해 아래 버튼을 누르세요.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => device("POST")}>
              이 기기를 출퇴근 기기로 등록
            </button>
            {registered ? (
              <button type="button" className={btnOutline} disabled={busy} onClick={() => device("DELETE")}>
                이 기기 등록 해제
              </button>
            ) : null}
            <a href="/clock" target="_blank" rel="noreferrer" className={btnOutline}>
              출퇴근 화면 열기
            </a>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>등록은 이 브라우저에 180일간 유지됩니다. 기기를 바꾸면 새 기기에서 다시 등록하세요.</li>
            <li>앱처럼 쓰려면 출퇴근 화면(/clock)을 연 뒤 Edge는 메뉴(⋯) → 앱 → &lsquo;이 사이트를 앱으로 설치&rsquo;, Chrome은 주소창 오른쪽의 설치 아이콘을 누르세요.</li>
            <li>등록한 기기를 잃어버렸다면 Vercel의 CONTRACT_SESSION_SECRET을 바꾸고 재배포하면 모든 기기의 등록이 풀립니다(관리자 로그인도 풀립니다).</li>
          </ul>
        </div>
      </Panel>

      <Panel title="직원 PIN">
        {employees.length === 0 ? (
          <p className="text-sm text-muted">사업주 서명까지 끝나 확정된 계약의 직원이 아직 없습니다.</p>
        ) : (
          <ul className="divide-y divide-secondary">
            {employees.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="flex min-w-40 items-center gap-2">
                  <span className="font-semibold text-foreground">{e.name}</span>
                  <Badge tone={e.status === "in" ? "ok" : e.stale ? "warn" : "neutral"}>{e.status === "in" ? "출근 중" : e.stale ? "전 근무 퇴근 기록 없음" : "퇴근"}</Badge>
                  <Badge tone={e.hasPin ? "ok" : "warn"}>{e.hasPin ? "PIN 있음" : "PIN 없음"}</Badge>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    id={`pin-${e.id}`}
                    aria-label={`${e.name} PIN 4자리`}
                    className={`${inputCls} max-w-28`}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    placeholder="PIN 4자리"
                    value={pins[e.id] ?? ""}
                    onChange={(ev) => setPins((p) => ({ ...p, [e.id]: ev.target.value.replace(/\D/g, "") }))}
                  />
                  <button type="button" className={btnOutline} disabled={busy} onClick={() => savePin(e.id, false)}>
                    저장
                  </button>
                  <button type="button" className={btnOutline} disabled={busy} onClick={() => savePin(e.id, true)}>
                    자동 발급
                  </button>
                  {e.hasPin ? (
                    <button type="button" className={btnDanger} disabled={busy} onClick={() => removePin(e.id, e.name)}>
                      PIN 삭제
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">PIN은 암호화해서 저장하므로 나중에 다시 볼 수 없습니다. 잊어버리면 새로 만들어 주세요. 5번 틀리면 10분간 잠기고, PIN을 새로 만들면 잠금이 풀립니다.</p>
      </Panel>

      <Panel title="최근 7일 기록">
        {events.length === 0 ? (
          <p className="text-sm text-muted">아직 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-80 text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-4 font-semibold">시각</th>
                  <th className="py-2 pr-4 font-semibold">직원</th>
                  <th className="py-2 font-semibold">구분</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary">
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2 pr-4 tabular-nums">{fmtClockDateTime(ev.at)}</td>
                    <td className="py-2 pr-4 font-semibold">{ev.name}</td>
                    <td className="py-2">
                      <Badge tone={ev.kind === "in" ? "ok" : "neutral"}>{ev.kind === "in" ? "출근" : "퇴근"}</Badge>
                      {ev.source === "admin" ? <span className="ml-2 text-xs text-muted">(관리자 입력)</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
