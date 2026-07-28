import { supabase } from "../../../../lib/supabaseClient";
import { sendPush } from "../../../../lib/webpush";

// รันทุกวันโดย Vercel Cron (ตั้งเวลาไว้ใน vercel.json)
// เช็กว่ามีการจองไหนที่ "วันรับรถ" คือวันพรุ่งนี้ แล้วส่งแจ้งเตือนให้ลูกค้าคนนั้น
export async function GET(req) {
  // ป้องกันคนนอกยิงมาเรียกเอง (Vercel Cron จะแนบ header นี้มาด้วยอัตโนมัติ)
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, start_date, start_time, member_id, members(name, phone), cars(brand, model)")
      .eq("start_date", tomorrowStr)
      .in("status", ["pending", "active"]);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    let sentCount = 0;
    for (const b of bookings || []) {
      const phone = b.members?.phone;
      if (!phone) continue;

      const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("role", "customer").eq("phone", phone);
      if (!subs || subs.length === 0) continue;

      const carLabel = b.cars ? `${b.cars.brand} ${b.cars.model}` : "รถที่จอง";
      const payload = {
        title: "อย่าลืม! พรุ่งนี้ถึงวันรับรถแล้ว",
        body: `คุณมีนัดรับ ${carLabel} เวลา ${b.start_time || ""} น. พรุ่งนี้`,
        url: `/booking/${b.id}`,
      };

      for (const s of subs) {
        const ok = await sendPush(s, payload);
        if (ok) sentCount++;
      }
    }

    return Response.json({ ok: true, bookingsChecked: bookings?.length || 0, notificationsSent: sentCount });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
