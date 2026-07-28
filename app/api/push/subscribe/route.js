import { supabase } from "../../../../lib/supabaseClient";

export async function POST(req) {
  try {
    const { subscription, role, phone } = await req.json();
    if (!subscription?.endpoint || !role) {
      return Response.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        role,
        phone: phone || null,
      },
      { onConflict: "endpoint" }
    );

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
