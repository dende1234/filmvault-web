// Filmory service worker: push notifications only (no offline caching).
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Filmory", body: event.data.text(), url: "/meldingen" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Filmory", {
      body: data.body || "",
      icon: "/pwa-icon/192.png",
      badge: "/pwa-icon/192.png",
      data: { url: data.url || "/meldingen" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/meldingen", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
