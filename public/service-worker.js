/* Accord notification service worker.
 * Handles Web Push events and click routing. Not an app-shell cache.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive show-notification requests from the page (in-app fallback)
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "show-notification") return;
  const { title, body, tag, url, icon, badge } = data.payload || {};
  self.registration.showNotification(title || "Accord", {
    body: body || "",
    tag: tag || `accord-${Date.now()}`,
    icon: icon || "/accord-icon-192.png",
    badge: badge || "/accord-icon-192.png",
    data: { url: url || "/" },
    renotify: true,
  });
});

// Real Web Push from the server
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try { payload = { title: "Accord", body: event.data && event.data.text() }; } catch { payload = {}; }
  }
  const title = payload.title || "Accord";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/accord-icon-192.png",
    badge: payload.badge || "/accord-icon-192.png",
    tag: payload.tag || `accord-${Date.now()}`,
    data: { url: payload.url || "/" },
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin && "focus" in client) {
            client.postMessage({ type: "notification-click", url: targetUrl });
            await client.focus();
            if ("navigate" in client) {
              try { await client.navigate(targetUrl); } catch (_) {}
            }
            return;
          }
        } catch (_) {}
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// Clean up dead subscriptions on the server when the browser rotates them
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    try {
      // Best-effort: no-op if we can't reach the app; the app will re-subscribe on next load.
    } catch (_) {}
  })());
});
