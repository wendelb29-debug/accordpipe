/* Accord notification service worker.
 * Purpose: show native notifications (email + whatsapp) and handle clicks.
 * NOT an app-shell cache — no fetch caching, no offline. Safe to ship.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive show-notification requests from the page
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
