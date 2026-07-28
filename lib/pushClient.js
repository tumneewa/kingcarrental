function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// ขอสิทธิ์แจ้งเตือน + สมัครรับ push notification แล้วบันทึกไว้ในฐานข้อมูล
// role: "staff" หรือ "customer" | phone: ใส่เฉพาะ role="customer" เพื่อจับคู่กับการจอง
export async function subscribeToPush(role, phone = null) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน (ลองเปิดด้วย Chrome บน Android ดูครับ)");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("คุณไม่ได้อนุญาตการแจ้งเตือน กรุณาอนุญาตแล้วลองใหม่");
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription, role, phone }),
  });
  if (!res.ok) throw new Error("บันทึกการสมัครรับแจ้งเตือนไม่สำเร็จ");
  return true;
}
