/*
 * 입금 알림용 서비스 워커.
 * 윈도우 알림창을 누르거나 알림창의 '확인' 버튼을 누르면, 사이트를 열지 않고 곧바로 그 입금을 "확인 완료"로 처리한다.
 * 확인 요청이 실패하면(로그인·기기 등록 문제, 인터넷 끊김 등) 대신 입금 확인 화면을 열어 직원이 직접 확인할 수 있게 한다.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function confirmDeposit(id) {
  return fetch("/api/deposits", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: id, confirmed: true }),
    credentials: "same-origin",
  })
    .then((r) => r.ok)
    .catch(() => false);
}

function openBoard() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.indexOf("/deposits") !== -1 && "focus" in c) return c.focus();
    }
    return self.clients.openWindow("/deposits");
  });
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const id = n.data && n.data.id;
  n.close();
  if (!id) return;
  event.waitUntil(confirmDeposit(id).then((ok) => (ok ? null : openBoard())));
});
