self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "Sympto",
      body: "You have a new notification.",
    };
  }

  const title = String(payload.title || "Sympto");
  const body = String(payload.body || "You have a new notification.");
  const url = String(payload.url || payload.actionUrl || "/notifications");

  const notificationOptions = {
    body,
    icon: "/favicon-96x96.png",
    badge: "/favicon-96x96.png",
    tag: payload.notificationId
      ? "sympto-" + String(payload.notificationId)
      : "sympto-notification",
    renotify: true,
    data: { url },
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = String(
    event.notification?.data?.url || "/notifications",
  );

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          try {
            const targetUrl = new URL(target, self.location.origin);
            if (targetUrl.origin !== self.location.origin) continue;
            if ("focus" in client) {
              client.navigate(targetUrl.href);
              return client.focus();
            }
          } catch {
            // Fall through to opening a new window.
          }
        }

        try {
          const targetUrl = new URL(target, self.location.origin);
          if (targetUrl.origin !== self.location.origin) {
            return self.clients.openWindow("/notifications");
          }
          return self.clients.openWindow(targetUrl.href);
        } catch {
          return self.clients.openWindow("/notifications");
        }
      }),
  );
});
