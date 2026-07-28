import { supabase } from "../../../../lib/supabaseClient";
import { sendPush } from "../../../../lib/webpush";

export async function POST(req) {
  try {
    const { title, body, url } = await req.json();

    const { data: subs, error } = await supabase.from("push_subscriptions").select("*").eq("role", "staff");
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await Promise.all(
      (subs || []).map((s) => sendPush(s, { title, body, url }))
    );

    return Response.json({ ok: true, sent: subs?.length || 0 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
