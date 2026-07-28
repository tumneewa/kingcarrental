// Service Worker สำหรับรับ Push Notification
// ไม่ต้องแก้ไฟล์นี้เอง

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "แจ้งเตือน", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "แจ้งเตือนจากร้าน";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon.png",
    badge: data.icon || "/icon.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
