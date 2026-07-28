import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ส่ง push notification ไปยังผู้สมัครรับแจ้งเตือน 1 คน (ตัดทิ้งอัตโนมัติถ้าเลิกติดตาม/หมดอายุ)
export async function sendPush(subscription, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    // 410/404 = ผู้ใช้เลิกติดตามหรือ subscription หมดอายุแล้ว ไม่ต้อง throw error
    console.error("ส่ง push ไม่สำเร็จ:", err.statusCode || err.message);
    return false;
  }
}
